import { Request, Response } from "express";
import { llmAgentService } from "./llmService.js";
import { toolRegistry } from "./toolRegistry.js";
import { promptEngine } from "./promptEngine.js";
import { DialogManager, PendingConfirmation } from "./dialogManager.js";
import { sessionStore } from "./sessionStore.js";
import type { ToolContext, ToolResult } from "../../../types/ai.js";
import { getDb } from "../../../config/database-better-sqlite3.js";
import crypto from "node:crypto";

const MAX_REACT_ITERATIONS = 5;
const MAX_CONTEXT_MESSAGES = 18;
const MAX_INTENT_CONTEXT_MESSAGES = 6;
const MAX_TOOL_RESULT_LENGTH = 2000;
const MAX_SESSION_TITLE_LENGTH = 20;

interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
}

const pendingConfirmations = new Map<string, PendingConfirmation>();

function savePendingConfirmation(sessionId: string, pending: PendingConfirmation): void {
  try {
    const db = getDb();
    db.prepare("INSERT OR REPLACE INTO agent_pending_confirmations (session_id, tool_name, params_json, confirm_message) VALUES (?, ?, ?, ?)").run(
      sessionId, pending.toolName, JSON.stringify(pending.params), pending.confirmMessage
    );
  } catch (error) {
    console.error("[AIAgent] 保存确认状态失败:", error);
  }
}

function loadPendingConfirmation(sessionId: string): PendingConfirmation | null {
  try {
    const db = getDb();
    const row = db.prepare("SELECT * FROM agent_pending_confirmations WHERE session_id = ?").get(sessionId) as any;
    if (!row) return null;
    return {
      toolName: row.tool_name,
      params: JSON.parse(row.params_json),
      confirmMessage: row.confirm_message,
    };
  } catch (error) {
    console.error("[AIAgent] 加载确认状态失败:", error);
    return pendingConfirmations.get(sessionId) || null;
  }
}

function deletePendingConfirmation(sessionId: string): void {
  try {
    const db = getDb();
    db.prepare("DELETE FROM agent_pending_confirmations WHERE session_id = ?").run(sessionId);
  } catch (error) {
    console.error("[AIAgent] 删除确认状态失败:", error);
  }
  pendingConfirmations.delete(sessionId);
}

let cachedSystemPrompt: string | null = null;

function getSystemPrompt(): string {
  if (!cachedSystemPrompt) {
    cachedSystemPrompt = promptEngine.buildSystemPrompt(
      JSON.stringify(toolRegistry.getToolsForLLM(), null, 2)
    );
  }
  return cachedSystemPrompt;
}

function invalidateSystemPromptCache(): void {
  cachedSystemPrompt = null;
}

class AIAgentController {
  async handleChat(req: Request, res: Response): Promise<void> {
    const { message, sessionId, stream = true, confirmed = false, model } = req.body;
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "认证信息缺失，请重新登录" });
      return;
    }
    const selectedModel = model || "deepseek";

    if (!message || typeof message !== "string") {
      res.status(400).json({
        success: false,
        error: "消息不能为空且必须是字符串",
      });
      return;
    }

    let session = sessionId ? sessionStore.getSession(sessionId) : null;
    if (!session) {
      const title = message.slice(0, MAX_SESSION_TITLE_LENGTH) + (message.length > MAX_SESSION_TITLE_LENGTH ? "..." : "");
      session = sessionStore.createSession(userId, title);
    }

    sessionStore.addMessage(session.id, "user", message);

    if (confirmed) {
      const pending = loadPendingConfirmation(session.id);
      if (pending) {
        await this.handleConfirmedAction(req, res, session.id, userId, selectedModel);
        return;
      }
    }

    if (stream) {
      await this.handleReActStream(req, res, session.id, userId, message, selectedModel);
    } else {
      await this.handleNormalChat(res, session.id, userId, message);
    }
  }

  private setupSSE(res: Response): AbortController {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const abortController = new AbortController();
    req_on_close(res, () => {
      abortController.abort();
      console.log("[AIAgent] 客户端断开SSE连接");
    });

    return abortController;
  }

  private async handleReActStream(
    req: Request,
    res: Response,
    sessionId: string,
    userId: string,
    userMessage: string,
    selectedModel: string = "deepseek"
  ): Promise<void> {
    const abortController = this.setupSSE(res);

    try {
      const recentMessages = sessionStore.getRecentMessages(sessionId, 10);
      const contextMessages: Array<{ role: "user" | "assistant"; content: string }> = recentMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const systemPrompt = getSystemPrompt();
      let messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...contextMessages.slice(-MAX_CONTEXT_MESSAGES),
        { role: "user", content: userMessage },
      ];

      let iteration = 0;
      let finalContent = "";
      const allToolCalls: any[] = [];
      const allToolResults: any[] = [];

      while (iteration < MAX_REACT_ITERATIONS) {
        if (abortController.signal.aborted) break;
        iteration++;

        const llmResponse = await this.callLLMWithTools(messages, selectedModel, abortController);

        if (!llmResponse.tool_calls || llmResponse.tool_calls.length === 0) {
          finalContent = llmResponse.content || "";
          break;
        }

        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: llmResponse.content || "",
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

          if (toolRegistry.requiresConfirmation(toolName)) {
            const confirmMessage = this.buildConfirmMessage(toolName, params);
            const pending: PendingConfirmation = {
              toolName,
              params,
              confirmMessage,
            };
            pendingConfirmations.set(sessionId, pending);
            savePendingConfirmation(sessionId, pending);

            this.sendSSEEvent(res, "confirm", {
              message: confirmMessage,
              toolName,
              params,
            });

            sessionStore.addMessage(sessionId, "assistant", confirmMessage, {
              toolCalls: [{ name: toolName, arguments: params }],
            });
            sessionStore.updateSessionActivity(sessionId);

            this.sendSSEEvent(res, "done", { sessionId });
            res.end();
            return;
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

      if (!finalContent) {
        const summaryMessages: ChatMessage[] = [
          ...messages,
          { role: "user", content: "请根据以上工具调用结果，生成简洁的中文总结回复。" },
        ];
        let streamContent = "";
        await llmAgentService.streamChat(
          { messages: summaryMessages },
          (chunk) => {
            if (abortController.signal.aborted) return;
            streamContent += chunk;
            this.sendSSEEvent(res, "chunk", { content: chunk });
          },
          undefined,
          selectedModel,
        );
        finalContent = streamContent || "已完成工具调用，但未生成最终回复。";
      } else {
        const chunkSize = 2;
        for (let i = 0; i < finalContent.length; i += chunkSize) {
          const chunk = finalContent.slice(i, i + chunkSize);
          this.sendSSEEvent(res, "chunk", { content: chunk });
        }
      }

      sessionStore.addMessage(sessionId, "assistant", finalContent, {
        toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
        toolResults: allToolResults.length > 0 ? allToolResults : undefined,
        displayType: allToolResults.length > 0 ? this.inferDisplayType(allToolCalls[0]?.name || "", allToolResults[0]) : undefined,
      });
      sessionStore.updateSessionActivity(sessionId);

      this.sendSSEEvent(res, "done", { sessionId });
      res.end();
    } catch (error) {
      console.error("[AIAgent] ReAct stream error:", error);
      if (!res.writableEnded) {
        this.sendSSEEvent(res, "error", { message: (error as Error).message });
        res.end();
      }
    }
  }

  private async callLLMWithTools(
    messages: ChatMessage[],
    provider: string,
    abortController: AbortController
  ): Promise<{ content: string; tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }> }> {
    if (abortController.signal.aborted) {
      return { content: "" };
    }

    const tools = toolRegistry.getToolsForLLM();
    const toolCallResults: Array<{ id: string; name: string; arguments: string }> = [];

    const result = await llmAgentService.streamChat(
      { messages, tools },
      (chunk) => {},
      (toolCall) => {
        toolCallResults.push(toolCall);
      },
      provider,
    );

    return {
      content: result.content,
      tool_calls: toolCallResults.length > 0 ? toolCallResults.map(tc => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.name, arguments: tc.arguments },
      })) : undefined,
    };
  }

  private buildConfirmMessage(toolName: string, params: Record<string, any>): string {
    const actionMap: Record<string, string> = {
      create_formula: "创建配方",
      create_material: "创建原料",
      create_salesperson: "创建业务员",
      update_formula: "修改配方",
      update_material: "修改原料",
      update_salesperson: "修改业务员",
      delete_formula: "删除配方",
      delete_material: "删除原料",
      delete_salesperson: "删除业务员",
    };
    const action = actionMap[toolName] || toolName;
    const paramSummary = Object.entries(params)
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join("、");
    const isDelete = toolName.startsWith("delete");
    return `确认${action}？${paramSummary ? `参数：${paramSummary}。` : ""}${isDelete ? "此操作不可撤销。" : ""}`;
  }

  private async handleConfirmedAction(
    req: Request,
    res: Response,
    sessionId: string,
    userId: string,
    selectedModel: string = "deepseek"
  ): Promise<void> {
    const abortController = this.setupSSE(res);

    try {
      const pending = loadPendingConfirmation(sessionId);
      if (!pending) {
        this.sendSSEEvent(res, "error", { message: "没有待确认的操作" });
        res.end();
        return;
      }
      deletePendingConfirmation(sessionId);

      sessionStore.addMessage(sessionId, "user", "确认");

      this.sendSSEEvent(res, "tool_calls", {
        calls: [{ name: pending.toolName, arguments: JSON.stringify(pending.params) }],
      });

      const context: ToolContext = {
        userId,
        userRole: "user",
        sessionId,
        requestId: `req_${crypto.randomUUID().substring(0, 9)}`,
      };

      let toolResult: ToolResult;
      try {
        toolResult = await toolRegistry.execute(pending.toolName, pending.params, context);
      } catch (error) {
        toolResult = {
          success: false,
          error: error instanceof Error ? error.message : "工具执行失败",
        };
      }

      const displayType = this.inferDisplayType(pending.toolName, toolResult);

      this.sendSSEEvent(res, "tool_result", {
        name: pending.toolName,
        success: toolResult.success,
        data: toolResult.data || toolResult.error,
        displayType,
      });

      const recentMessages = sessionStore.getRecentMessages(sessionId, 10);
      const contextMessages: Array<{ role: "user" | "assistant"; content: string }> = recentMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const systemPrompt = getSystemPrompt();
      const toolResultStr = JSON.stringify(toolResult.data || toolResult.error).slice(0, MAX_TOOL_RESULT_LENGTH);
      const finalMessages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...contextMessages.slice(-MAX_CONTEXT_MESSAGES),
        {
          role: "user",
          content: `工具 ${pending.toolName} 执行${toolResult.success ? "成功" : "失败"}。结果：${toolResultStr}\n\n请根据以上结果，用中文生成简洁的回复。`,
        },
      ];

      let fullContent = "";
      await llmAgentService.streamChat(
        { messages: finalMessages },
        (chunk) => {
          if (abortController.signal.aborted) return;
          fullContent += chunk;
          this.sendSSEEvent(res, "chunk", { content: chunk });
        },
        undefined,
        selectedModel,
      );

      sessionStore.addMessage(sessionId, "assistant", fullContent, {
        toolCalls: [{ name: pending.toolName, arguments: pending.params }],
        toolResults: [toolResult],
        displayType,
      });
      sessionStore.updateSessionActivity(sessionId);

      this.sendSSEEvent(res, "done", { sessionId });
      res.end();
    } catch (error) {
      console.error("[AIAgent] Confirmed action error:", error);
      if (!res.writableEnded) {
        this.sendSSEEvent(res, "error", { message: (error as Error).message });
        res.end();
      }
    }
  }

  private inferDisplayType(toolName: string, result: ToolResult): string {
    if (toolName.includes("query") || toolName.includes("search") || toolName.includes("analyze") || toolName.includes("nl2sql")) {
      return "table";
    }
    if (toolName.includes("calculate") || toolName.includes("validate")) {
      return "card";
    }
    if (toolName.includes("create") || toolName.includes("update") || toolName.includes("delete")) {
      return "toast";
    }
    if (result.data && (Array.isArray(result.data) || (Array.isArray((result.data as any)?.rows)))) {
      return "table";
    }
    return "card";
  }

  async getSessions(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "认证信息缺失" });
      return;
    }
    const sessions = sessionStore.getSessionsByUser(userId);
    res.json({ success: true, data: sessions });
  }

  async getSessionMessages(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    const { sessionId } = req.params;
    const session = sessionStore.getSession(sessionId);
    if (!session) {
      res.status(404).json({ success: false, error: "会话不存在" });
      return;
    }
    if (session.user_id !== userId) {
      res.status(403).json({ success: false, error: "无权访问此会话" });
      return;
    }
    const messages = sessionStore.getMessages(sessionId);
    res.json({ success: true, data: { ...session, messages } });
  }

  async deleteSession(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    const { sessionId } = req.params;
    const session = sessionStore.getSession(sessionId);
    if (!session) {
      res.status(404).json({ success: false, error: "会话不存在" });
      return;
    }
    if (session.user_id !== userId) {
      res.status(403).json({ success: false, error: "无权删除此会话" });
      return;
    }
    const deleted = sessionStore.deleteSession(sessionId);
    if (deleted) {
      deletePendingConfirmation(sessionId);
      res.json({ success: true, message: "会话已删除" });
    } else {
      res.status(404).json({ success: false, error: "会话不存在" });
    }
  }

  private async handleNormalChat(
    res: Response,
    sessionId: string,
    userId: string,
    userMessage: string
  ): Promise<void> {
    try {
      const systemPrompt = getSystemPrompt();
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
        const toolResults = await this.executeToolCalls(
          result.tool_calls,
          userId,
          sessionId
        );

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
    sessionId: string
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
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    }
  }
}

function req_on_close(res: Response, callback: () => void): void {
  (res as any).req?.on?.("close", callback);
}

export const aiAgentController = new AIAgentController();
