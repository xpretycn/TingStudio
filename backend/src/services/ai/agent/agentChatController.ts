import { Request, Response } from "express";
import { llmAgentService } from "./llmService.js";
import { toolRegistry } from "./toolRegistry.js";
import { promptEngine } from "./promptEngine.js";
import { sessionStore } from "./sessionStore.js";
import type { ToolContext, ToolResult } from "../../../types/ai.js";
import { getDb } from "../../../config/database-better-sqlite3.js";
import crypto from "node:crypto";

const MAX_REACT_ITERATIONS = 5;
const MAX_CONTEXT_MESSAGES = 18;
const MAX_TOOL_RESULT_LENGTH = 2000;
const MAX_SESSION_TITLE_LENGTH = 20;
const SSE_HEARTBEAT_INTERVAL = 8000;
const SSE_CONNECTION_TIMEOUT = 300000;

interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

let cachedSystemPrompt: string | null = null;

function getSystemPrompt(userId?: string): string {
  if (!userId) {
    if (!cachedSystemPrompt) {
      cachedSystemPrompt = promptEngine.buildSystemPrompt(JSON.stringify(toolRegistry.getToolsForLLM(), null, 2));
    }
    return cachedSystemPrompt;
  }
  try {
    const db = getDb();
    const roleRow = db
      .prepare(
        "SELECT agent_name, user_title, greeting, tone_style, custom_instructions FROM agent_role_config WHERE user_id = ?",
      )
      .get(userId) as any;
    if (roleRow) {
      return promptEngine.buildSystemPrompt(JSON.stringify(toolRegistry.getToolsForLLM(), null, 2), roleRow);
    }
  } catch (error) {
    console.error("[AIAgent] 读取身份配置失败，使用默认:", error);
  }
  if (!cachedSystemPrompt) {
    cachedSystemPrompt = promptEngine.buildSystemPrompt(JSON.stringify(toolRegistry.getToolsForLLM(), null, 2));
  }
  return cachedSystemPrompt;
}

export function invalidateChatSystemPromptCache(): void {
  cachedSystemPrompt = null;
}

class AgentChatController {
  async handleChat(req: Request, res: Response): Promise<void> {
    const { message, sessionId, stream = true, model, modelVersion } = req.body;
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "认证信息缺失，请重新登录" });
      return;
    }
    const selectedModel = model || "deepseek";
    const selectedModelVersion = modelVersion || undefined;

    if (!message || typeof message !== "string") {
      res.status(400).json({
        success: false,
        error: "消息不能为空且必须是字符串",
      });
      return;
    }

    let session = sessionId ? sessionStore.getSession(sessionId) : null;
    if (!session) {
      const title =
        message.slice(0, MAX_SESSION_TITLE_LENGTH) + (message.length > MAX_SESSION_TITLE_LENGTH ? "..." : "");
      session = sessionStore.createSession(userId, title);
    }

    sessionStore.addMessage(session.id, "user", message);

    if (stream) {
      await this.handleReActStream(req, res, session.id, userId, message, selectedModel, selectedModelVersion);
    } else {
      await this.handleNormalChat(res, session.id, userId, message);
    }
  }

  private setupSSE(res: Response): AbortController {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const abortController = new AbortController();
    const onClose = () => {
      if (!abortController.signal.aborted) {
        abortController.abort();
        console.log("[AIAgent] 客户端断开SSE连接");
      }
    };
    (res as any).req?.on?.("close", onClose);
    res.on?.("close", onClose);

    const heartbeat = setInterval(() => {
      if (!res.writableEnded && !res.destroyed) {
        res.write(": heartbeat\n\n");
      } else {
        clearInterval(heartbeat);
      }
    }, SSE_HEARTBEAT_INTERVAL);

    const connectionTimeout = setTimeout(() => {
      if (!res.writableEnded) {
        this.sendSSEEvent(res, "error", { message: "连接超时" });
        this.cleanupSSE(res);
        res.end();
      }
    }, SSE_CONNECTION_TIMEOUT);

    (res as any)._sseHeartbeat = heartbeat;
    (res as any)._sseConnectionTimeout = connectionTimeout;

    return abortController;
  }

  private cleanupSSE(res: Response): void {
    clearInterval((res as any)._sseHeartbeat);
    clearTimeout((res as any)._sseConnectionTimeout);
  }

  private async handleReActStream(
    req: Request,
    res: Response,
    sessionId: string,
    userId: string,
    userMessage: string,
    selectedModel: string = "deepseek",
    selectedModelVersion?: string,
  ): Promise<void> {
    const abortController = this.setupSSE(res);
    const startTime = Date.now();

    try {
      const recentMessages = sessionStore.getRecentMessages(sessionId, 10);
      const contextMessages: Array<{ role: "user" | "assistant"; content: string }> = recentMessages
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      const systemPrompt = getSystemPrompt(userId);
      let messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...contextMessages.slice(-MAX_CONTEXT_MESSAGES),
        { role: "user", content: userMessage },
      ];

      let iteration = 0;
      let finalContent = "";
      let streamedContent = "";
      const allToolCalls: any[] = [];
      const allToolResults: any[] = [];
      let totalTokenUsage = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };

      while (iteration < MAX_REACT_ITERATIONS) {
        iteration++;

        let iterationContent = "";
        const llmResponse = await this.callLLMWithTools(
          messages,
          selectedModel,
          abortController,
          selectedModelVersion,
          chunk => {
            iterationContent += chunk;
            streamedContent += chunk;
            this.sendSSEEvent(res, "chunk", { content: chunk });
          },
          iteration === 1, // 首次迭代强制工具调用
        );

        if (llmResponse.usage) {
          totalTokenUsage.prompt_tokens += llmResponse.usage.prompt_tokens || 0;
          totalTokenUsage.completion_tokens += llmResponse.usage.completion_tokens || 0;
          totalTokenUsage.total_tokens += llmResponse.usage.total_tokens || 0;
        }

        if (!llmResponse.tool_calls || llmResponse.tool_calls.length === 0) {
          finalContent = iterationContent || llmResponse.content || "";
          break;
        }

        if (iterationContent.trim()) {
          this.sendSSEEvent(res, "content_clear", {});
          streamedContent = "";
        }

        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: llmResponse.tool_calls?.length
            ? ""
            : iterationContent || llmResponse.content || "",
          tool_calls: llmResponse.tool_calls,
        };
        messages.push(assistantMsg);

        for (const toolCall of llmResponse.tool_calls) {
          if (abortController.signal.aborted) break;

          const toolName = toolCall.function.name;
          let params: Record<string, any>;
          try {
            params = JSON.parse(toolCall.function.arguments);
          } catch {
            params = {};
          }

          this.sendSSEEvent(res, "tool_calls", {
            calls: [{ name: toolName, arguments: JSON.stringify(params) }],
          });

          const context: ToolContext = {
            userId,
            userRole: "user",
            sessionId,
            requestId: `req_${crypto.randomUUID().substring(0, 9)}`,
          };

          let toolResult: ToolResult;
          try {
            toolResult = await toolRegistry.execute(toolName, params, context);
          } catch (error) {
            toolResult = {
              success: false,
              error: error instanceof Error ? error.message : "工具执行失败",
            };
          }

          const displayType = this.inferDisplayType(toolName, toolResult);

          this.sendSSEEvent(res, "tool_result", {
            name: toolName,
            toolName,
            success: toolResult.success,
            data: toolResult.data || toolResult.error,
            displayType,
          });

          allToolCalls.push({ name: toolName, arguments: params });
          allToolResults.push(toolResult);

          const toolResultStr = JSON.stringify(toolResult.data || toolResult.error).slice(0, MAX_TOOL_RESULT_LENGTH);
          messages.push({
            role: "tool",
            content: toolResultStr,
            tool_call_id: toolCall.id,
          });
        }
      }

      const hasToolCalls = allToolCalls.length > 0;
      const mainDisplayType =
        allToolResults.length > 0 ? this.inferDisplayType(allToolCalls[0]?.name || "", allToolResults[0]) : undefined;
      const isCardDisplay = ["compare", "quotation", "substitute"].includes(mainDisplayType || "");

      // 兜底：LLM未调用工具但回答涉及"没有数据"时，强制查询原料/配方
      const noDataPatterns = /暂无|没有(任何|找到|查询到|数据|记录|结果)|不存在|为空|数量为\s*0|0\s*(种|条|个|项)/;
      if (!hasToolCalls && finalContent && noDataPatterns.test(finalContent)) {
        console.log("[AIAgent] 检测到LLM未调用工具但返回'无数据'，触发兜底查询");
        this.sendSSEEvent(res, "content_clear", {});
        streamedContent = "";
        finalContent = "";

        const fallbackTools = this.detectFallbackTools(userMessage);
        for (const toolName of fallbackTools) {
          try {
            const context: ToolContext = { userId, userRole: "user", sessionId, requestId: `fallback_${Date.now()}` };
            const toolResult = await toolRegistry.execute(toolName, {}, context);
            allToolCalls.push({ name: toolName, arguments: {} });
            allToolResults.push(toolResult);
            this.sendSSEEvent(res, "tool_result", {
              name: toolName,
              toolName,
              success: toolResult.success,
              data: toolResult.data || toolResult.error,
              displayType: this.inferDisplayType(toolName, toolResult),
            });
            messages.push({
              role: "tool",
              content: JSON.stringify(toolResult.data || toolResult.error).slice(0, MAX_TOOL_RESULT_LENGTH),
              tool_call_id: `fallback_${toolName}`,
            });
          } catch (e) {
            console.error(`[AIAgent] 兜底工具 ${toolName} 执行失败:`, e);
          }
        }
      }

      const needsSummary =
        !isCardDisplay &&
        ((!finalContent && !streamedContent) || (allToolCalls.length > 0 && (!finalContent || finalContent.trim().length < 30)));

      if (needsSummary) {
        const summaryMessages: ChatMessage[] = [
          ...messages,
          {
            role: "user",
            content: allToolCalls.length > 0
              ? "请根据以上工具调用结果，生成简洁的中文总结。要求：1.用markdown表格展示关键数据；2.文字精简，不超过3句话；3.不要重复工具已返回的完整数据，只提炼要点；4.直接给出结论，不要重复说明查询过程。"
              : "请根据以上对话内容，生成简洁的中文回复。直接给出回答，不要重复之前的内容。",
          },
        ];
        let streamContent = "";
        const summaryResult = await llmAgentService.streamChat(
          { messages: summaryMessages },
          chunk => {
            streamContent += chunk;
            this.sendSSEEvent(res, "chunk", { content: chunk });
          },
          undefined,
          selectedModel,
          selectedModelVersion,
        );
        finalContent = streamContent || "已完成工具调用，但未生成最终回复。";
        if (summaryResult.usage) {
          totalTokenUsage.prompt_tokens += summaryResult.usage.prompt_tokens || 0;
          totalTokenUsage.completion_tokens += summaryResult.usage.completion_tokens || 0;
          totalTokenUsage.total_tokens += summaryResult.usage.total_tokens || 0;
        }
      } else {
        finalContent = finalContent || streamedContent;
      }

      if (finalContent && !streamedContent && !res.writableEnded) {
        this.sendSSEEvent(res, "chunk", { content: finalContent });
      }

      sessionStore.addMessage(sessionId, "assistant", finalContent, {
        toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
        toolResults: allToolResults.length > 0 ? allToolResults : undefined,
        displayType:
          allToolResults.length > 0 ? this.inferDisplayType(allToolCalls[0]?.name || "", allToolResults[0]) : undefined,
        metadata: {
          model: selectedModel,
          latency: Date.now() - startTime,
          tokenUsage: totalTokenUsage,
        },
      });
      sessionStore.updateSessionActivity(sessionId);

      this.sendSSEEvent(res, "done", {
        sessionId,
        usage: totalTokenUsage,
        model: selectedModel,
        latency: Date.now() - startTime,
      });
      this.cleanupSSE(res);
      res.end();
    } catch (error) {
      console.error("[AIAgent] ReAct stream error:", error);
      this.cleanupSSE(res);
      if (!res.writableEnded) {
        this.sendSSEEvent(res, "error", {
          message: (error as Error).message,
        });
        res.end();
      }
    }
  }

  private async callLLMWithTools(
    messages: ChatMessage[],
    provider: string,
    abortController: AbortController,
    modelVersion?: string,
    onChunk?: (chunk: string) => void,
    forceToolCall: boolean = false,
  ): Promise<{
    content: string;
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }>;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }> {
    if (abortController.signal.aborted) {
      return { content: "" };
    }

    const tools = toolRegistry.getToolsForLLM();
    const toolCallResults: Array<{ id: string; name: string; arguments: string }> = [];

    const result = await llmAgentService.streamChat(
      { messages, tools, tool_choice: forceToolCall ? "required" : "auto" },
      chunk => {
        if (onChunk) {
          onChunk(chunk);
        }
      },
      toolCall => {
        toolCallResults.push(toolCall);
      },
      provider,
      modelVersion,
    );

    return {
      content: result.content || "",
      tool_calls:
        toolCallResults.length > 0
          ? toolCallResults.map(tc => ({
              id: tc.id,
              type: "function" as const,
              function: { name: tc.name, arguments: tc.arguments },
            }))
          : undefined,
      usage: result.usage,
    };
  }

  private inferDisplayType(toolName: string, result: ToolResult): string {
    if (toolName === "nl2sql_query") {
      return "nl2sql";
    }
    if (toolName === "compare_formulas") {
      return "compare";
    }
    if (toolName === "generate_quotation") {
      return "quotation";
    }
    if (toolName === "suggest_material_substitute") {
      return "substitute";
    }
    if (toolName.includes("query") || toolName.includes("search") || toolName.includes("analyze")) {
      return "table";
    }
    if (toolName.includes("calculate") || toolName.includes("validate")) {
      return "card";
    }
    if (result.data && (Array.isArray(result.data) || Array.isArray((result.data as any)?.rows))) {
      return "table";
    }
    return "card";
  }

  /**
   * 根据用户消息检测应该兜底调用的工具
   * 当LLM未调用工具但返回"无数据"时，根据关键词匹配强制查询
   */
  private detectFallbackTools(userMessage: string): string[] {
    const msg = userMessage.toLowerCase();
    const tools: string[] = [];

    if (/原料|材料|material|有多少种|列表/.test(msg)) {
      tools.push("query_materials");
    }
    if (/配方|formula|方子|膏|茶|丸/.test(msg)) {
      tools.push("query_formulas");
    }
    if (/业务员|销售|salesman|salesperson/.test(msg)) {
      tools.push("query_salespersons");
    }

    // 如果没有匹配到任何具体工具，默认查询原料（最常见场景）
    if (tools.length === 0) {
      tools.push("query_materials");
    }

    return tools;
  }

  private async handleNormalChat(res: Response, sessionId: string, userId: string, userMessage: string): Promise<void> {
    try {
      const systemPrompt = getSystemPrompt(userId);
      const recentMessages = sessionStore.getRecentMessages(sessionId, 20);
      const chatHistory = sessionStore.messagesToChatHistory(recentMessages) as ChatMessage[];

      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...chatHistory.slice(-MAX_CONTEXT_MESSAGES),
        { role: "user", content: userMessage },
      ];

      const result = await llmAgentService.chat({
        messages,
        tools: toolRegistry.getToolsForLLM(),
      });

      if (result.tool_calls && result.tool_calls.length > 0) {
        const toolResults = await this.executeToolCalls(result.tool_calls, userId, sessionId);

        sessionStore.addMessage(sessionId, "assistant", result.content || "", {
          toolCalls: result.tool_calls,
          toolResults,
        });
        sessionStore.updateSessionActivity(sessionId);

        res.json({
          success: true,
          type: "tool_call_required",
          toolCalls: result.tool_calls,
          toolResults,
          assistantMessage: result.content,
          sessionId,
        });
      } else {
        sessionStore.addMessage(sessionId, "assistant", result.content || "");
        sessionStore.updateSessionActivity(sessionId);

        res.json({
          success: true,
          type: "text",
          content: result.content,
          usage: result.usage,
          model: result.model,
          sessionId,
        });
      }
    } catch (error) {
      console.error("[AIAgent] Normal chat error:", error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  private async executeToolCalls(
    toolCalls: Array<{ id: string; name: string; arguments: string }>,
    userId: string,
    sessionId: string,
  ): Promise<Array<{ id: string; name: string; result: ToolResult }>> {
    const results = [];

    for (const tc of toolCalls) {
      try {
        const params = JSON.parse(tc.arguments);

        const context: ToolContext = {
          userId,
          userRole: "user",
          sessionId,
          requestId: `req_${crypto.randomUUID().substring(0, 9)}`,
        };

        const result = await toolRegistry.execute(tc.name, params, context);
        results.push({ id: tc.id, name: tc.name, result });
      } catch (error) {
        results.push({
          id: tc.id,
          name: tc.name,
          result: {
            success: false,
            error: error instanceof Error ? error.message : "参数解析失败",
          },
        });
      }
    }

    return results;
  }

  private sendSSEEvent(res: Response, type: string, data: any): void {
    if (!res.writableEnded && !res.destroyed) {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
      if (typeof (res as any).flush === "function") {
        (res as any).flush();
      }
    }
  }

  async handleFloatReActStream(
    res: Response,
    sessionId: string,
    userId: string,
    userMessage: string,
    selectedModel: string,
    selectedModelVersion: string | undefined,
    pageId: string,
    contextMessages: Array<{ role: string; content: string }>,
  ): Promise<void> {
    const abortController = this.setupSSE(res);
    const startTime = Date.now();

    const systemPrompt = getSystemPrompt(userId);
    const pageContext = this.buildPageContext(pageId);

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt + (pageContext ? "\n\n" + pageContext : "") },
      ...contextMessages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: userMessage },
    ];

    let iteration = 0;
    let finalContent = "";
    let streamedContent = "";
    const allToolCalls: any[] = [];
    const allToolResults: any[] = [];
    let totalTokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    while (iteration < MAX_REACT_ITERATIONS) {
      iteration++;
      let iterationContent = "";

      const llmResponse = await this.callLLMWithTools(
        messages,
        selectedModel,
        abortController,
        selectedModelVersion,
        chunk => {
          iterationContent += chunk;
          streamedContent += chunk;
          this.sendSSEEvent(res, "chunk", { content: chunk });
        },
        iteration === 1, // 首次迭代强制工具调用
      );

      if (llmResponse.usage) {
        totalTokenUsage.prompt_tokens += llmResponse.usage.prompt_tokens || 0;
        totalTokenUsage.completion_tokens += llmResponse.usage.completion_tokens || 0;
        totalTokenUsage.total_tokens += llmResponse.usage.total_tokens || 0;
      }

      if (!llmResponse.tool_calls || llmResponse.tool_calls.length === 0) {
        finalContent = iterationContent || llmResponse.content || "";
        break;
      }

      if (iterationContent.trim()) {
        this.sendSSEEvent(res, "content_clear", {});
        streamedContent = "";
      }

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: llmResponse.tool_calls?.length
          ? ""
          : iterationContent || llmResponse.content || "",
        tool_calls: llmResponse.tool_calls,
      };
      messages.push(assistantMsg);

      for (const toolCall of llmResponse.tool_calls) {
        if (abortController.signal.aborted) break;

        const toolName = toolCall.function.name;
        let params: Record<string, any>;
        try {
          params = JSON.parse(toolCall.function.arguments);
        } catch {
          params = {};
        }

        this.sendSSEEvent(res, "tool_calls", { calls: [{ name: toolName, arguments: params }] });

        const context: ToolContext = {
          userId,
          userRole: "user",
          sessionId,
          requestId: `req_${crypto.randomUUID().substring(0, 9)}`,
        };
        let toolResult: ToolResult;
        try {
          toolResult = await toolRegistry.execute(toolName, params, context);
        } catch (error) {
          toolResult = { success: false, error: error instanceof Error ? error.message : "工具执行失败" };
        }

        allToolCalls.push({ name: toolName, arguments: params });
        allToolResults.push(toolResult);

        this.sendSSEEvent(res, "tool_result", {
          name: toolName,
          toolName,
          data: toolResult.data || toolResult.error,
          success: toolResult.success,
          displayType: this.inferDisplayType(toolName, toolResult),
        });

        messages.push({
          role: "tool",
          content: JSON.stringify(toolResult).slice(0, MAX_TOOL_RESULT_LENGTH),
          tool_call_id: toolCall.id,
        });
      }

      if (abortController.signal.aborted) break;
    }

    const hasToolCalls = allToolCalls.length > 0;
    const displayType =
      allToolResults.length > 0 ? this.inferDisplayType(allToolCalls[0]?.name || "", allToolResults[0]) : undefined;
    const isCardDisplay = ["compare", "quotation", "substitute"].includes(displayType || "");

    // 兜底：LLM未调用工具但回答涉及"没有数据"时，强制查询
    const noDataPatternsFloat = /暂无|没有(任何|找到|查询到|数据|记录|结果)|不存在|为空|数量为\s*0|0\s*(种|条|个|项)/;
    if (!hasToolCalls && finalContent && noDataPatternsFloat.test(finalContent)) {
      console.log("[AIAgent-Float] 检测到LLM未调用工具但返回'无数据'，触发兜底查询");
      this.sendSSEEvent(res, "content_clear", {});
      streamedContent = "";
      finalContent = "";

      const fallbackTools = this.detectFallbackTools(userMessage);
      for (const toolName of fallbackTools) {
        try {
          const context: ToolContext = { userId, userRole: "user", sessionId, requestId: `fallback_${Date.now()}` };
          const toolResult = await toolRegistry.execute(toolName, {}, context);
          allToolCalls.push({ name: toolName, arguments: {} });
          allToolResults.push(toolResult);
          this.sendSSEEvent(res, "tool_result", {
            name: toolName,
            toolName,
            success: toolResult.success,
            data: toolResult.data || toolResult.error,
            displayType: this.inferDisplayType(toolName, toolResult),
          });
          messages.push({
            role: "tool",
            content: JSON.stringify(toolResult.data || toolResult.error).slice(0, MAX_TOOL_RESULT_LENGTH),
            tool_call_id: `fallback_${toolName}`,
          });
        } catch (e) {
          console.error(`[AIAgent-Float] 兜底工具 ${toolName} 执行失败:`, e);
        }
      }
    }

    const needsSummary =
      !isCardDisplay &&
      ((!finalContent && !streamedContent) || (allToolCalls.length > 0 && (!finalContent || finalContent.trim().length < 30)));

    if (needsSummary) {
      const summaryMessages: ChatMessage[] = [
        ...messages,
        {
          role: "user",
          content: allToolCalls.length > 0
            ? "请根据以上工具调用结果，生成简洁的中文总结。要求：1.用markdown表格展示关键数据；2.文字精简，不超过3句话；3.不要重复工具已返回的完整数据，只提炼要点；4.直接给出结论，不要重复说明查询过程。"
            : "请根据以上对话内容，生成简洁的中文回复。直接给出回答，不要重复之前的内容。",
        },
      ];
      let streamContent = "";
      const summaryResult = await llmAgentService.streamChat(
        { messages: summaryMessages },
        chunk => {
          streamContent += chunk;
          this.sendSSEEvent(res, "chunk", { content: chunk });
        },
        undefined,
        selectedModel,
        selectedModelVersion,
      );
      finalContent = streamContent || "已完成工具调用";
      if (summaryResult.usage) {
        totalTokenUsage.prompt_tokens += summaryResult.usage.prompt_tokens || 0;
        totalTokenUsage.completion_tokens += summaryResult.usage.completion_tokens || 0;
        totalTokenUsage.total_tokens += summaryResult.usage.total_tokens || 0;
      }
    } else {
      finalContent = finalContent || streamedContent;
    }

    if (finalContent && !streamedContent && !res.writableEnded) {
      this.sendSSEEvent(res, "chunk", { content: finalContent });
    }

    sessionStore.addMessage(sessionId, "assistant", finalContent, {
      toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
      toolResults: allToolResults.length > 0 ? allToolResults : undefined,
      displayType,
      metadata: { model: selectedModel, latency: Date.now() - startTime, tokenUsage: totalTokenUsage },
    });
    sessionStore.updateSessionActivity(sessionId);

    this.sendSSEEvent(res, "done", {
      sessionId,
      usage: totalTokenUsage,
      model: selectedModel,
      latency: Date.now() - startTime,
      displayType,
    });
    this.cleanupSSE(res);
    res.end();
  }

  private buildPageContext(pageId: string): string {
    const contextMap: Record<string, string> = {
      "formula-add": "当前页面：新增配方表单。用户正在创建新配方。",
      "formula-edit": "当前页面：编辑配方表单。用户正在修改已有配方。",
      "material-add": "当前页面：新增原料表单。用户正在创建新原料。",
      "material-edit": "当前页面：编辑原料表单。用户正在修改已有原料。",
      "salesman-add": "当前页面：新增业务员表单。用户正在创建新业务员。",
      "salesman-edit": "当前页面：编辑业务员表单。用户正在修改已有业务员。",
    };
    return contextMap[pageId] || "";
  }
}

export const agentChatController = new AgentChatController();
