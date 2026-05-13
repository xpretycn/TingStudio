import { Request, Response } from "express";
import { llmAgentService } from "./llmService.js";
import { DialogManager, PendingConfirmation, FormSchema } from "./dialogManager.js";
import { sessionStore } from "./sessionStore.js";
import type { ToolContext, ToolResult } from "../../../types/ai.js";
import { getDb } from "../../../config/database-better-sqlite3.js";
import crypto from "node:crypto";

const MAX_INTENT_CONTEXT_MESSAGES = 6;
const MAX_SESSION_TITLE_LENGTH = 20;

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
    const row = db
      .prepare("SELECT * FROM agent_pending_forms WHERE session_id = ?")
      .get(sessionId) as any;
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
    const row = db
      .prepare("SELECT * FROM agent_pending_confirmations WHERE session_id = ?")
      .get(sessionId) as any;
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

class AIAgentController {
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

  async getRoleConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "认证信息缺失" });
        return;
      }
      const db = getDb();
      let row = db
        .prepare("SELECT * FROM agent_role_config WHERE user_id = ?")
        .get(userId) as any;
      if (!row) {
        const id = crypto.randomUUID();
        db.prepare(
          "INSERT INTO agent_role_config (id, user_id, agent_name, user_title, greeting, tone_style, custom_instructions) VALUES (?, ?, '小听', '老板', '', 'professional', '')",
        ).run(id, userId);
        row = db
          .prepare("SELECT * FROM agent_role_config WHERE user_id = ?")
          .get(userId) as any;
      }
      res.json({ success: true, data: row });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, error: error instanceof Error ? error.message : "获取身份配置失败" });
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
      const existing = db
        .prepare("SELECT id FROM agent_role_config WHERE user_id = ?")
        .get(userId) as any;
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
          db.prepare(
            `UPDATE agent_role_config SET ${setClauses.join(", ")} WHERE user_id = ?`,
          ).run(...sqlParams);
        }
      }

      const { invalidateChatSystemPromptCache } = await import("./agentChatController.js");
      invalidateChatSystemPromptCache();

      const row = db
        .prepare("SELECT * FROM agent_role_config WHERE user_id = ?")
        .get(userId) as any;
      res.json({ success: true, data: row });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, error: error instanceof Error ? error.message : "更新身份配置失败" });
    }
  }

  async getFloatConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "认证信息缺失" });
        return;
      }
      const db = getDb();
      let row = db
        .prepare("SELECT * FROM agent_float_config WHERE user_id = ?")
        .get(userId) as any;
      if (!row) {
        const id = crypto.randomUUID();
        db.prepare("INSERT INTO agent_float_config (id, user_id) VALUES (?, ?)").run(id, userId);
        row = db
          .prepare("SELECT * FROM agent_float_config WHERE user_id = ?")
          .get(userId) as any;
      }
      const config = this.deserializeFloatConfig(row);
      res.json({ success: true, data: config });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, error: error instanceof Error ? error.message : "获取悬浮球配置失败" });
    }
  }

  async updateFloatConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "认证信息缺失" });
        return;
      }
      const userRole = (req as any).user?.role;
      if (userRole !== "admin") {
        res.status(403).json({ success: false, error: "仅管理员可修改悬浮球配置" });
        return;
      }

      const allowedFields = [
        "enabled",
        "model",
        "model_name",
        "fallback_model",
        "fallback_model_name",
        "position",
        "drawer_width",
        "theme_color",
        "show_pulse",
        "enabled_pages",
        "max_rounds",
        "fill_strategy",
        "context_mode",
      ];
      const db = getDb();
      const existing = db
        .prepare("SELECT id FROM agent_float_config WHERE user_id = ?")
        .get(userId) as any;

      if (!existing) {
        const id = crypto.randomUUID();
        const defaults: Record<string, any> = {
          enabled: 1,
          model: "deepseek",
          model_name: "",
          fallback_model: "",
          fallback_model_name: "",
          position: "right",
          drawer_width: 400,
          theme_color: "",
          show_pulse: 1,
          enabled_pages: "[]",
          max_rounds: 10,
          fill_strategy: "overwrite",
          context_mode: "page",
        };
        const merged = { ...defaults };
        for (const field of allowedFields) {
          if (req.body[field] !== undefined) {
            merged[field] = this.serializeFieldValue(field, req.body[field]);
          }
        }
        db.prepare(
          `INSERT INTO agent_float_config (id, user_id, enabled, model, model_name, fallback_model, fallback_model_name, position, drawer_width, theme_color, show_pulse, enabled_pages, max_rounds, fill_strategy, context_mode)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          id,
          userId,
          merged.enabled,
          merged.model,
          merged.model_name,
          merged.fallback_model,
          merged.fallback_model_name,
          merged.position,
          merged.drawer_width,
          merged.theme_color,
          merged.show_pulse,
          merged.enabled_pages,
          merged.max_rounds,
          merged.fill_strategy,
          merged.context_mode,
        );
      } else {
        const setClauses: string[] = [];
        const sqlParams: any[] = [];
        for (const field of allowedFields) {
          if (req.body[field] !== undefined) {
            setClauses.push(`${field} = ?`);
            sqlParams.push(this.serializeFieldValue(field, req.body[field]));
          }
        }
        if (setClauses.length > 0) {
          setClauses.push("updated_at = datetime('now')");
          sqlParams.push(userId);
          db.prepare(
            `UPDATE agent_float_config SET ${setClauses.join(", ")} WHERE user_id = ?`,
          ).run(...sqlParams);
        }
      }

      const row = db
        .prepare("SELECT * FROM agent_float_config WHERE user_id = ?")
        .get(userId) as any;
      const config = this.deserializeFloatConfig(row);
      res.json({ success: true, data: config });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, error: error instanceof Error ? error.message : "更新悬浮球配置失败" });
    }
  }

  async parseForm(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "认证信息缺失" });
        return;
      }
      const { pageId, utterance, context, sessionId } = req.body;
      if (!pageId || !utterance) {
        res.status(400).json({ code: 1, error: "pageId 和 utterance 不能为空" });
        return;
      }

      const db = getDb();
      const configRow = db
        .prepare("SELECT * FROM agent_float_config WHERE user_id = ?")
        .get(userId) as any;
      if (configRow && !configRow.enabled) {
        res.json({ code: 1, error: "悬浮球 Agent 已禁用" });
        return;
      }

      const enabledPages: string[] = configRow
        ? JSON.parse(configRow.enabled_pages || "[]")
        : [];
      if (enabledPages.length > 0 && !enabledPages.includes(pageId)) {
        res.json({ code: 1, error: "当前页面未启用 Agent" });
        return;
      }

      const selectedModel = configRow?.model || "deepseek";
      const selectedModelName = configRow?.model_name || undefined;

      let session = sessionId ? sessionStore.getSession(sessionId) : null;
      if (!session) {
        const title =
          utterance.slice(0, MAX_SESSION_TITLE_LENGTH) +
          (utterance.length > MAX_SESSION_TITLE_LENGTH ? "..." : "");
        session = sessionStore.createSession(userId, title);
      }

      const pageFieldMap = this.getPageFieldMap(pageId);
      const systemPrompt = this.buildParseFormPrompt(pageId, pageFieldMap);

      const contextMessages: Array<{ role: "user" | "assistant"; content: string }> = (
        context || []
      ).slice(-MAX_INTENT_CONTEXT_MESSAGES);
      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...contextMessages.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: utterance },
      ];

      const result = await llmAgentService.chat({ messages }, selectedModel, selectedModelName);
      let parsedFields: Record<string, any> = {};
      let missingFields: string[] = [];
      let aiMessage = "";

      try {
        const content = result.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          parsedFields = parsed.fields || {};
          missingFields = parsed.missingFields || [];
          aiMessage = parsed.message || "";
        } else {
          aiMessage = content;
        }
      } catch {
        aiMessage = result.content || "解析失败，请重新描述";
      }

      sessionStore.addMessage(session.id, "user", utterance);
      sessionStore.addMessage(
        session.id,
        "assistant",
        aiMessage || `已解析${Object.keys(parsedFields).length}个字段`,
      );
      sessionStore.updateSessionActivity(session.id);

      res.json({
        code: 0,
        data: {
          fields: parsedFields,
          missingFields,
          message:
            aiMessage ||
            `已解析${Object.keys(parsedFields).length}个字段${missingFields.length > 0 ? "，缺少" + missingFields.join("、") : ""}`,
          sessionId: session.id,
        },
      });
    } catch (error) {
      console.error("[AIAgent] parseForm error:", error);
      res
        .status(500)
        .json({ code: 1, error: error instanceof Error ? error.message : "表单解析失败" });
    }
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
      const { toolRegistry } = await import("./toolRegistry.js");
      toolResult = await toolRegistry.execute(toolName, formData, context);
    } catch (error) {
      toolResult = {
        success: false,
        error: error instanceof Error ? error.message : "工具执行失败",
      };
    }

    sessionStore.addMessage(sessionId, "user", `[表单提交] ${formSchema.title}`);
    sessionStore.addMessage(
      sessionId,
      "assistant",
      toolResult.success ? `${formSchema.title}操作成功` : `操作失败：${toolResult.error}`,
      {
        toolCalls: [{ name: toolName, arguments: formData }],
        toolResults: [toolResult],
      },
    );
    sessionStore.updateSessionActivity(sessionId);

    res.json({
      success: toolResult.success,
      data: toolResult.data || toolResult.error,
      toolName,
    });
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
          errors.push({
            field: field.name,
            message: field.validation.message || `${field.label}格式不正确`,
          });
        }
      }
    }

    return errors;
  }

  private deserializeFloatConfig(row: any): Record<string, any> {
    return {
      id: row.id,
      userId: row.user_id,
      enabled: !!row.enabled,
      model: row.model,
      modelName: row.model_name || "",
      fallbackModel: row.fallback_model,
      fallbackModelName: row.fallback_model_name || "",
      position: row.position,
      drawerWidth: row.drawer_width,
      themeColor: row.theme_color,
      showPulse: !!row.show_pulse,
      enabledPages: JSON.parse(row.enabled_pages || "[]"),
      maxRounds: row.max_rounds,
      fillStrategy: row.fill_strategy,
      contextMode: row.context_mode,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    };
  }

  private serializeFieldValue(field: string, value: any): any {
    if (field === "enabled" || field === "show_pulse") return value ? 1 : 0;
    if (field === "enabled_pages") return JSON.stringify(value);
    return value;
  }

  private getPageFieldMap(pageId: string): Record<string, string> {
    const maps: Record<string, Record<string, string>> = {
      "formula-add": {
        name: "配方名称",
        finished_weight: "成品重量(g)",
        ratio_factor: "系数",
        salesman_name: "业务员",
        description: "描述",
        materials: "原料列表(格式: 原料名:用量g,原料名:用量g)",
      },
      "formula-edit": {
        name: "配方名称",
        finished_weight: "成品重量(g)",
        ratio_factor: "系数",
        salesman_name: "业务员",
        description: "描述",
        materials: "原料列表(格式: 原料名:用量g,原料名:用量g)",
      },
      "material-add": {
        name: "原料名称",
        code: "编码",
        material_type: "类型",
        unit: "单位",
        stock: "库存",
        unit_price: "单价(元/kg)",
        description: "描述",
      },
      "material-edit": {
        name: "原料名称",
        code: "编码",
        material_type: "类型",
        unit: "单位",
        stock: "库存",
        unit_price: "单价(元/kg)",
        description: "描述",
      },
      "salesman-add": {
        name: "业务员姓名",
        phone: "手机号",
        region: "区域",
        department: "部门",
        email: "邮箱",
        code: "工号",
      },
      "salesman-edit": {
        name: "业务员姓名",
        phone: "手机号",
        region: "区域",
        department: "部门",
        email: "邮箱",
        code: "工号",
      },
    };
    return maps[pageId] || {};
  }

  private buildParseFormPrompt(pageId: string, fieldMap: Record<string, string>): string {
    const fieldDesc = Object.entries(fieldMap)
      .map(([key, label]) => `- ${key}: ${label}`)
      .join("\n");

    return `你是一个表单字段解析助手。用户会用自然语言描述需要填写的内容，你需要将其解析为结构化的表单字段。

当前页面标识: ${pageId}
可用字段:
${fieldDesc}

请严格按以下 JSON 格式返回结果，不要包含其他文字:
{
  "fields": { "字段名": "值", ... },
  "missingFields": ["未提供的必填字段名", ...],
  "message": "简短的中文解析说明"
}

规则:
1. 只返回 fields 中存在的字段名，不要编造字段
2. 数值类型字段请返回数字而非字符串
3. missingFields 列出用户未提及的必填字段
4. message 用中文简要说明解析结果
5. 如果用户描述含糊，将匹配度最高的字段填入 fields，并在 missingFields 中标注不确定的字段`;
  }
}

export const aiAgentController = new AIAgentController();
