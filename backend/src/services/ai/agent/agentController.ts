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
    db.prepare(
      "INSERT OR REPLACE INTO agent_pending_confirmations (session_id, tool_name, params_json, confirm_message) VALUES (?, ?, ?, ?)",
    ).run(sessionId, pending.toolName, JSON.stringify(pending.params), pending.confirmMessage);
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

function invalidateSystemPromptCache(): void {
  cachedSystemPrompt = null;
}

class AIAgentController {
  async handleChat(req: Request, res: Response): Promise<void> {
    const { message, sessionId, stream = true, confirmed = false, model, modelVersion } = req.body;
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

    if (confirmed) {
      const pending = loadPendingConfirmation(session.id);
      if (pending) {
        await this.handleConfirmedAction(req, res, session.id, userId, selectedModel, selectedModelVersion);
        return;
      }
    }

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
    selectedModel: string = "deepseek",
    selectedModelVersion?: string,
  ): Promise<void> {
    const abortController = this.setupSSE(res);

    try {
      const recentMessages = sessionStore.getRecentMessages(sessionId, 10);
      const contextMessages: Array<{ role: "user" | "assistant"; content: string }> = recentMessages
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

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
      let totalTokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      while (iteration < MAX_REACT_ITERATIONS) {
        if (abortController.signal.aborted) break;
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

        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: iterationContent || llmResponse.content || "",
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

      if (!finalContent && !streamedContent) {
        const summaryMessages: ChatMessage[] = [
          ...messages,
          { role: "user", content: "请根据以上工具调用结果，生成简洁的中文总结回复。" },
        ];
        let streamContent = "";
        const summaryResult = await llmAgentService.streamChat(
          { messages: summaryMessages },
          chunk => {
            if (abortController.signal.aborted) return;
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

      sessionStore.addMessage(sessionId, "assistant", finalContent, {
        toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
        toolResults: allToolResults.length > 0 ? allToolResults : undefined,
        displayType:
          allToolResults.length > 0 ? this.inferDisplayType(allToolCalls[0]?.name || "", allToolResults[0]) : undefined,
      });
      sessionStore.updateSessionActivity(sessionId);

      this.sendSSEEvent(res, "done", { sessionId, usage: totalTokenUsage });
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
    abortController: AbortController,
    modelVersion?: string,
    onChunk?: (chunk: string) => void,
  ): Promise<{
    content: string;
    tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  }> {
    if (abortController.signal.aborted) {
      return { content: "" };
    }

    const tools = toolRegistry.getToolsForLLM();
    const toolCallResults: Array<{ id: string; name: string; arguments: string }> = [];

    const result = await llmAgentService.streamChat(
      { messages, tools },
      chunk => {
        if (onChunk && !abortController.signal.aborted) {
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
      content: result.content,
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
    selectedModel: string = "deepseek",
    selectedModelVersion?: string,
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
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

      const systemPrompt = getSystemPrompt(userId);
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
      const confirmResult = await llmAgentService.streamChat(
        { messages: finalMessages },
        chunk => {
          if (abortController.signal.aborted) return;
          fullContent += chunk;
          this.sendSSEEvent(res, "chunk", { content: chunk });
        },
        undefined,
        selectedModel,
        selectedModelVersion,
      );

      const confirmTokenUsage = confirmResult.usage
        ? {
            prompt_tokens: confirmResult.usage.prompt_tokens || 0,
            completion_tokens: confirmResult.usage.completion_tokens || 0,
            total_tokens: confirmResult.usage.total_tokens || 0,
          }
        : { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      sessionStore.addMessage(sessionId, "assistant", fullContent, {
        toolCalls: [{ name: pending.toolName, arguments: pending.params }],
        toolResults: [toolResult],
        displayType,
      });
      sessionStore.updateSessionActivity(sessionId);

      this.sendSSEEvent(res, "done", { sessionId, usage: confirmTokenUsage });
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
    if (
      toolName.includes("query") ||
      toolName.includes("search") ||
      toolName.includes("analyze") ||
      toolName.includes("nl2sql")
    ) {
      return "table";
    }
    if (toolName.includes("calculate") || toolName.includes("validate")) {
      return "card";
    }
    if (toolName.includes("create") || toolName.includes("update") || toolName.includes("delete")) {
      return "toast";
    }
    if (result.data && (Array.isArray(result.data) || Array.isArray((result.data as any)?.rows))) {
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
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    }
  }

  async getRoleConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "认证信息缺失" });
        return;
      }
      const db = getDb();
      let row = db.prepare("SELECT * FROM agent_role_config WHERE user_id = ?").get(userId) as any;
      if (!row) {
        const id = crypto.randomUUID();
        db.prepare(
          "INSERT INTO agent_role_config (id, user_id, agent_name, user_title, greeting, tone_style, custom_instructions) VALUES (?, ?, '小听', '老板', '', 'professional', '')",
        ).run(id, userId);
        row = db.prepare("SELECT * FROM agent_role_config WHERE user_id = ?").get(userId) as any;
      }
      res.json({ success: true, data: row });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "获取身份配置失败" });
    }
  }

  async updateRoleConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "认证信息缺失" });
        return;
      }
      const { agent_name, user_title, greeting, tone_style, custom_instructions } = req.body;

      const db = getDb();
      const existing = db.prepare("SELECT id FROM agent_role_config WHERE user_id = ?").get(userId) as any;
      if (!existing) {
        const id = crypto.randomUUID();
        db.prepare(
          "INSERT INTO agent_role_config (id, user_id, agent_name, user_title, greeting, tone_style, custom_instructions) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ).run(
          id,
          userId,
          agent_name || "小听",
          user_title || "老板",
          greeting || "",
          tone_style || "professional",
          custom_instructions || "",
        );
      } else {
        const setClauses: string[] = [];
        const sqlParams: any[] = [];
        if (agent_name !== undefined) {
          setClauses.push("agent_name = ?");
          sqlParams.push(agent_name);
        }
        if (user_title !== undefined) {
          setClauses.push("user_title = ?");
          sqlParams.push(user_title);
        }
        if (greeting !== undefined) {
          setClauses.push("greeting = ?");
          sqlParams.push(greeting);
        }
        if (tone_style !== undefined) {
          setClauses.push("tone_style = ?");
          sqlParams.push(tone_style);
        }
        if (custom_instructions !== undefined) {
          setClauses.push("custom_instructions = ?");
          sqlParams.push(custom_instructions);
        }
        if (setClauses.length > 0) {
          setClauses.push("updated_at = datetime('now')");
          sqlParams.push(userId);
          db.prepare(`UPDATE agent_role_config SET ${setClauses.join(", ")} WHERE user_id = ?`).run(...sqlParams);
        }
      }

      invalidateSystemPromptCache();
      const row = db.prepare("SELECT * FROM agent_role_config WHERE user_id = ?").get(userId) as any;
      res.json({ success: true, data: row });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "更新身份配置失败" });
    }
  }
}

function req_on_close(res: Response, callback: () => void): void {
  (res as any).req?.on?.("close", callback);
}

export const aiAgentController = new AIAgentController();
