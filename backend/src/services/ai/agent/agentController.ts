import { Request, Response } from "express";
import { llmAgentService } from "./llmService.js";
import { toolRegistry } from "./toolRegistry.js";
import { promptEngine } from "./promptEngine.js";
import { DialogManager, PendingConfirmation, FormSchema } from "./dialogManager.js";
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
const pendingForms = new Map<string, FormSchema>();

function savePendingForm(sessionId: string, formSchema: FormSchema): void {
  try {
    const db = getDb();
    db.prepare(
      "INSERT OR REPLACE INTO agent_pending_forms (session_id, form_id, tool_name, form_json) VALUES (?, ?, ?, ?)",
    ).run(sessionId, formSchema.formId, formSchema.toolName, JSON.stringify(formSchema));
  } catch (error) {
    console.error("[AIAgent] 保存表单状态失败:", error);
  }
}

function loadPendingForm(sessionId: string): FormSchema | null {
  try {
    const db = getDb();
    const row = db.prepare("SELECT * FROM agent_pending_forms WHERE session_id = ?").get(sessionId) as any;
    if (!row) return null;
    return JSON.parse(row.form_json);
  } catch (error) {
    console.error("[AIAgent] 加载表单状态失败:", error);
    return pendingForms.get(sessionId) || null;
  }
}

function deletePendingForm(sessionId: string): void {
  try {
    const db = getDb();
    db.prepare("DELETE FROM agent_pending_forms WHERE session_id = ?").run(sessionId);
  } catch (error) {
    console.error("[AIAgent] 删除表单状态失败:", error);
  }
  pendingForms.delete(sessionId);
}

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
    }, 15000);

    (res as any)._sseHeartbeat = heartbeat;

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
    const startTime = Date.now();

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

          console.log(`[AIAgent-Form] No tool calls. Trying form generation. userMessage="${userMessage.substring(0, 50)}", llmContent="${finalContent.substring(0, 80)}"`);

          const formResult = this.tryGenerateFormFromResponse(userMessage, finalContent, sessionId, res);
          if (formResult) {
            this.sendSSEEvent(res, "done", { sessionId });
            clearInterval((res as any)._sseHeartbeat);
            res.end();
            return;
          }

          break;
        }

        console.log(`[AIAgent-Form] LLM called tools: ${llmResponse.tool_calls.map((tc: any) => tc.function.name).join(", ")}`);

        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: iterationContent || llmResponse.content || "",
          tool_calls: llmResponse.tool_calls,
        };
        messages.push(assistantMsg);

        for (const toolCall of llmResponse.tool_calls) {
          console.log(`[AIAgent-Form] Processing tool call, aborted=${abortController.signal.aborted}`);

          const toolName = toolCall.function.name;
          console.log(`[AIAgent-Form] Tool name: ${toolName}`);
          let params: Record<string, any>;
          try {
            params = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            console.log(`[AIAgent-Form] JSON parse error for tool args:`, e);
            params = {};
          }
          console.log(`[AIAgent-Form] Parsed params:`, JSON.stringify(params).substring(0, 200));

          const requiresConfirm = toolRegistry.requiresConfirmation(toolName);
          console.log(`[AIAgent-Form] requiresConfirmation(${toolName}) = ${requiresConfirm}`);

          if (requiresConfirm) {
            console.log(`[AIAgent-Form] Tool ${toolName} requires confirmation. Params:`, JSON.stringify(params).substring(0, 200));

            try {
              const dialogManager = new DialogManager();
              const missingParams = this.findMissingParams(toolName, params);
              console.log(`[AIAgent-Form] Missing params for ${toolName}:`, missingParams);

              const formSchema = dialogManager.generateFormSchema({
                intent: "create_data" as any,
                targetTable: this.inferTargetTable(toolName),
                targetAction: toolName,
                params,
                missingParams,
                confidence: 1,
              });

              if (formSchema) {
                console.log(`[AIAgent-Form] ✅ Form generated! formId=${formSchema.formId}, fields=${formSchema.fields.length}`);
                pendingForms.set(sessionId, formSchema);
                savePendingForm(sessionId, formSchema);

                this.sendSSEEvent(res, "form", {
                  formSchema,
                  message: "",
                });

                sessionStore.addMessage(sessionId, "assistant", finalContent || iterationContent || "请填写以下信息：", {
                  toolCalls: [{ name: toolName, arguments: params }],
                });
                sessionStore.updateSessionActivity(sessionId);

                this.sendSSEEvent(res, "done", { sessionId });
                clearInterval((res as any)._sseHeartbeat);
                res.end();
                return;
              }

              console.log(`[AIAgent-Form] Form generation returned null, falling back to confirm dialog`);
            } catch (formError) {
              console.error(`[AIAgent-Form] Error generating form:`, formError);
            }

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
            clearInterval((res as any)._sseHeartbeat);
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
      clearInterval((res as any)._sseHeartbeat);
      res.end();
    } catch (error) {
      console.error("[AIAgent] ReAct stream error:", error);
      clearInterval((res as any)._sseHeartbeat);
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
    const startTime = Date.now();

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
        metadata: {
          model: selectedModel,
          latency: Date.now() - startTime,
          tokenUsage: confirmTokenUsage,
        },
      });
      sessionStore.updateSessionActivity(sessionId);

      this.sendSSEEvent(res, "done", {
        sessionId,
        usage: confirmTokenUsage,
        model: selectedModel,
        latency: Date.now() - startTime,
      });
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

  private tryGenerateFormFromResponse(
    userMessage: string,
    llmContent: string,
    sessionId: string,
    res: Response,
  ): boolean {
    const allText = (userMessage + " " + llmContent).toLowerCase();

    const intentRules: Array<{
      toolName: string;
      exactKeywords: string[];
      looseKeywords: string[][];
    }> = [
      {
        toolName: "create_formula",
        exactKeywords: ["创建配方", "新建配方", "添加配方", "新增配方"],
        looseKeywords: [["配方", "创建"], ["配方", "新建"], ["配方", "添加"], ["配方", "表单"]],
      },
      {
        toolName: "update_formula",
        exactKeywords: ["修改配方", "更新配方", "编辑配方"],
        looseKeywords: [["配方", "修改"], ["配方", "更新"], ["配方", "编辑"]],
      },
      {
        toolName: "delete_formula",
        exactKeywords: ["删除配方"],
        looseKeywords: [["配方", "删除"]],
      },
      {
        toolName: "create_material",
        exactKeywords: ["创建原料", "新建原料", "添加原料", "新增原料"],
        looseKeywords: [["原料", "创建"], ["原料", "新建"], ["原料", "添加"], ["原料", "表单"]],
      },
      {
        toolName: "update_material",
        exactKeywords: ["修改原料", "更新原料", "编辑原料"],
        looseKeywords: [["原料", "修改"], ["原料", "更新"]],
      },
      {
        toolName: "delete_material",
        exactKeywords: ["删除原料"],
        looseKeywords: [["原料", "删除"]],
      },
      {
        toolName: "create_salesperson",
        exactKeywords: ["创建业务员", "新建业务员", "添加业务员"],
        looseKeywords: [["业务员", "创建"], ["业务员", "新建"], ["业务员", "添加"], ["业务员", "表单"]],
      },
      {
        toolName: "update_salesperson",
        exactKeywords: ["修改业务员", "更新业务员", "编辑业务员"],
        looseKeywords: [["业务员", "修改"], ["业务员", "更新"]],
      },
      {
        toolName: "delete_salesperson",
        exactKeywords: ["删除业务员"],
        looseKeywords: [["业务员", "删除"]],
      },
    ];

    let matchedTool: string | null = null;

    for (const rule of intentRules) {
      if (rule.exactKeywords.some(kw => allText.includes(kw))) {
        matchedTool = rule.toolName;
        break;
      }
    }

    if (!matchedTool) {
      for (const rule of intentRules) {
        if (rule.looseKeywords.some(wordPair => wordPair.every(w => allText.includes(w)))) {
          matchedTool = rule.toolName;
          break;
        }
      }
    }

    if (!matchedTool) return false;

    console.log(`[AIAgent-Form] Matched tool: ${matchedTool} from allText="${allText.substring(0, 100)}"`);

    const tool = toolRegistry.getTool(matchedTool);
    if (!tool) {
      console.log(`[AIAgent-Form] Tool not found: ${matchedTool}`);
      return false;
    }

    const missingParams = this.findMissingParams(matchedTool, {});
    console.log(`[AIAgent-Form] Missing params for ${matchedTool}:`, missingParams);

    const dialogManager = new DialogManager();
    const formSchema = dialogManager.generateFormSchema({
      intent: "create_data" as any,
      targetTable: this.inferTargetTable(matchedTool),
      targetAction: matchedTool,
      params: {},
      missingParams,
      confidence: 1,
    });

    if (!formSchema) {
      console.log(`[AIAgent-Form] generateFormSchema returned null for ${matchedTool}`);
      return false;
    }

    console.log(`[AIAgent-Form] ✅ Form generated via post-processing! formId=${formSchema.formId}, fields=${formSchema.fields.length}`);

    pendingForms.set(sessionId, formSchema);
    savePendingForm(sessionId, formSchema);

    this.sendSSEEvent(res, "form", {
      formSchema,
      message: "",
    });

    sessionStore.addMessage(sessionId, "assistant", llmContent || "请填写以下信息：", {
      toolCalls: [{ name: matchedTool, arguments: {} }],
    });
    sessionStore.updateSessionActivity(sessionId);

    return true;
  }

  private inferTargetTable(toolName: string): string {
    if (toolName.includes("formula")) return "formula";
    if (toolName.includes("material")) return "material";
    if (toolName.includes("salesperson") || toolName.includes("salesman")) return "salesperson";
    return "";
  }

  private findMissingParams(toolName: string, params: Record<string, any>): string[] {
    const tool = toolRegistry.getTool(toolName);
    if (!tool) return [];
    const missing: string[] = [];
    try {
      const schemaDef = (tool.paramsSchema as any)?._def || (tool.paramsSchema as any)?.def;
      const shape = schemaDef?.shape;
      if (shape) {
        for (const [key, fieldSchema] of Object.entries(shape)) {
          const f = fieldSchema as any;
          const fieldType = f.type || f._def?.typeName || "";
          const fieldDefType = f.def?.type || f._def?.typeName || "";
          const isOptional = fieldType === "optional" || fieldDefType === "optional";
          if (!isOptional && (params[key] === undefined || params[key] === null || params[key] === "")) {
            missing.push(key);
          }
        }
      }
    } catch {
      // schema parsing failed, return empty
    }
    return missing;
  }

  async getPendingForm(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    const { sessionId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, error: "认证信息缺失" });
      return;
    }

    const formSchema = loadPendingForm(sessionId);
    if (!formSchema) {
      res.json({ success: true, data: null });
      return;
    }

    res.json({ success: true, data: formSchema });
  }

  async submitForm(req: Request, res: Response): Promise<void> {
    const { sessionId, formId, formData } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: "认证信息缺失" });
      return;
    }

    if (!sessionId || !formId || !formData) {
      res.status(400).json({ success: false, error: "缺少必要参数" });
      return;
    }

    const formSchema = loadPendingForm(sessionId);
    if (!formSchema || formSchema.formId !== formId) {
      res.status(400).json({ success: false, error: "表单已过期或不存在，请重新发起操作" });
      return;
    }

    const validationErrors = this.validateFormData(formSchema, formData);
    if (validationErrors.length > 0) {
      res.json({
        success: false,
        error: "表单校验失败",
        validationErrors,
      });
      return;
    }

    deletePendingForm(sessionId);

    const toolName = formSchema.toolName;
    const context: ToolContext = {
      userId,
      userRole: "user",
      sessionId,
      requestId: `req_${crypto.randomUUID().substring(0, 9)}`,
    };

    let toolResult: ToolResult;
    try {
      toolResult = await toolRegistry.execute(toolName, formData, context);
    } catch (error) {
      toolResult = {
        success: false,
        error: error instanceof Error ? error.message : "工具执行失败",
      };
    }

    const displayType = this.inferDisplayType(toolName, toolResult);

    sessionStore.addMessage(sessionId, "user", `[表单提交] ${formSchema.title}`);
    sessionStore.addMessage(
      sessionId,
      "assistant",
      toolResult.success ? `${formSchema.title}操作成功` : `操作失败：${toolResult.error}`,
      {
        toolCalls: [{ name: toolName, arguments: formData }],
        toolResults: [toolResult],
        displayType,
      },
    );
    sessionStore.updateSessionActivity(sessionId);

    res.json({
      success: toolResult.success,
      data: toolResult.data || toolResult.error,
      displayType,
      toolName,
    });
  }

  private validateFormData(
    formSchema: FormSchema,
    formData: Record<string, any>,
  ): Array<{ field: string; message: string }> {
    const errors: Array<{ field: string; message: string }> = [];

    for (const field of formSchema.fields) {
      const value = formData[field.name];

      if (field.required && (value === undefined || value === null || value === "")) {
        errors.push({ field: field.name, message: `${field.label}不能为空` });
        continue;
      }

      if (value === undefined || value === null || value === "") continue;

      if (field.type === "number") {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push({ field: field.name, message: `${field.label}必须是数字` });
          continue;
        }
        if (field.validation?.min !== undefined && num < field.validation.min) {
          errors.push({
            field: field.name,
            message: field.validation.message || `${field.label}不能小于${field.validation.min}`,
          });
        }
        if (field.validation?.max !== undefined && num > field.validation.max) {
          errors.push({
            field: field.name,
            message: field.validation.message || `${field.label}不能大于${field.validation.max}`,
          });
        }
      }

      if (field.validation?.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(String(value))) {
          errors.push({ field: field.name, message: field.validation.message || `${field.label}格式不正确` });
        }
      }
    }

    return errors;
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
      deletePendingForm(sessionId);
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
    if (!res.writableEnded && !res.destroyed) {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
      if (typeof (res as any).flush === "function") {
        (res as any).flush();
      }
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

export const aiAgentController = new AIAgentController();
