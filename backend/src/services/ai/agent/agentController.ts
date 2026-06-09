import { Request, Response } from "express";
import { llmAgentService } from "./llmService.js";
import { sessionStore } from "./sessionStore.js";
import { getDb } from "../../../config/database-better-sqlite3.js";
import { checkWriteIntentFromText } from "./agentWriteGuard.js";
import crypto from "node:crypto";

const MAX_INTENT_CONTEXT_MESSAGES = 6;
const MAX_SESSION_TITLE_LENGTH = 20;
const FORM_PAGE_IDS = ["formula-add", "formula-edit", "material-add", "material-edit", "salesman-add", "salesman-edit"];

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

      const { invalidateChatSystemPromptCache } = await import("./agentChatController.js");
      invalidateChatSystemPromptCache();

      const row = db.prepare("SELECT * FROM agent_role_config WHERE user_id = ?").get(userId) as any;
      res.json({ success: true, data: row });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "更新身份配置失败" });
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
      let row = db.prepare("SELECT * FROM agent_float_config WHERE user_id = ?").get(userId) as any;
      if (!row) {
        const id = crypto.randomUUID();
        db.prepare("INSERT INTO agent_float_config (id, user_id) VALUES (?, ?)").run(id, userId);
        row = db.prepare("SELECT * FROM agent_float_config WHERE user_id = ?").get(userId) as any;
      }
      const config = this.deserializeFloatConfig(row);
      res.json({ success: true, data: config });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "获取悬浮球配置失败" });
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
      const existing = db.prepare("SELECT id FROM agent_float_config WHERE user_id = ?").get(userId) as any;

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
          db.prepare(`UPDATE agent_float_config SET ${setClauses.join(", ")} WHERE user_id = ?`).run(...sqlParams);
        }
      }

      const row = db.prepare("SELECT * FROM agent_float_config WHERE user_id = ?").get(userId) as any;
      const config = this.deserializeFloatConfig(row);
      res.json({ success: true, data: config });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "更新悬浮球配置失败" });
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
      const configRow = db.prepare("SELECT * FROM agent_float_config WHERE user_id = ?").get(userId) as any;
      if (configRow && !configRow.enabled) {
        res.json({ code: 1, error: "悬浮球 Agent 已禁用" });
        return;
      }

      const enabledPages: string[] = configRow ? JSON.parse(configRow.enabled_pages || "[]") : [];
      if (enabledPages.length > 0 && !enabledPages.includes(pageId)) {
        res.json({ code: 1, error: "当前页面未启用 Agent" });
        return;
      }

      const selectedModel = configRow?.model || "deepseek";
      const selectedModelName = configRow?.model_name || undefined;

      let session = sessionId ? sessionStore.getSession(sessionId) : null;
      if (!session) {
        const title =
          utterance.slice(0, MAX_SESSION_TITLE_LENGTH) + (utterance.length > MAX_SESSION_TITLE_LENGTH ? "..." : "");
        session = sessionStore.createSession(userId, title);
      }

      const pageFieldMap = this.getPageFieldMap(pageId);
      const systemPrompt = this.buildParseFormPrompt(pageId, pageFieldMap);

      const contextMessages: Array<{ role: "user" | "assistant"; content: string }> = (context || []).slice(
        -MAX_INTENT_CONTEXT_MESSAGES,
      );
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
      sessionStore.addMessage(session.id, "assistant", aiMessage || `已解析${Object.keys(parsedFields).length}个字段`);
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
      res.status(500).json({ code: 1, error: error instanceof Error ? error.message : "表单解析失败" });
    }
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
        material_type: "原料类型(herb=药材,supplement=辅料)",
        unit: "单位",
        stock: "库存",
        unit_price: "单价(元/kg)",
        description: "描述",
      },
      "material-edit": {
        name: "原料名称",
        code: "编码",
        material_type: "原料类型(herb=药材,supplement=辅料)",
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
5. 如果用户描述含糊，将匹配度最高的字段填入 fields，并在 missingFields 中标注不确定的字段
6. 对话历史中可能包含之前的问答，你需要结合上下文理解用户当前输入的含义
7. 如果用户在回答之前的问题（如确认类型、补充信息等），请将回答内容解析为对应字段值
8. 对于原料类型(material_type)，"药材"对应"herb"，"辅料"对应"supplement"
9. 对于业务员名称(salesman_name)，直接使用用户提供的名称字符串
10. 当用户表达"创建/新建/添加"意图但未提供具体字段值时，将所有必填字段放入 missingFields，并在 message 中给出引导文案，格式如："您想创建新{资源名}，请提供：{字段1}、{字段2}(单位)、{字段3}(格式说明)"`;
  }

  private classifyFloatIntent(utterance: string): "fill" | "consult" | "calculate" | "compare" | "substitute" | "quotation" | "generate" {
    const text = utterance.toLowerCase();

    if (/对比|比较|vs| versus|区别|差异/.test(text)) return "compare";
    if (/替代|替换|代替|换掉|替补/.test(text)) return "substitute";
    if (/报价|报价单|多少钱|售价|定价|价格/.test(text)) return "quotation";
    if (/生成描述|生成制法|智能生成|写描述|写制法|帮我写/.test(text)) return "generate";
    if (/算|计算|校验|合规|营养|成本|含量比|系数/.test(text)) return "calculate";
    if (/什么意思|合规吗|范围|规范|单位|标准|规则|是什么|怎么填|能不能|可以吗/.test(text)) return "consult";

    return "fill";
  }

  async floatChat(req: Request, res: Response): Promise<void> {
    const { pageId, utterance, context, sessionId } = req.body;
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "认证信息缺失" });
      return;
    }
    if (!utterance || !pageId) {
      res.status(400).json({ success: false, error: "pageId 和 utterance 不能为空" });
      return;
    }

    const writeGuard = checkWriteIntentFromText(utterance);
    if (writeGuard && writeGuard.blocked) {
      const isOnFormPage = FORM_PAGE_IDS.includes(pageId);
      if (!isOnFormPage) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        const guidanceMessage = writeGuard.guidanceMessage || "此操作需要前往对应页面完成";

        res.write(`data: ${JSON.stringify({ type: "write_guidance", toolName: writeGuard.toolName, message: guidanceMessage, navigationLink: writeGuard.navigationLink })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "done", sessionId: "", model: "" })}\n\n`);
        res.end();
        return;
      }
    }

    const intent = this.classifyFloatIntent(utterance);

    if (intent === "fill") {
      return this.parseForm(req, res);
    }

    if (intent === "generate") {
      return this.handleGenerateIntent(req, res, utterance, pageId, context, sessionId, userId);
    }

    const db = getDb();
    const configRow = db.prepare("SELECT * FROM agent_float_config WHERE user_id = ?").get(userId) as any;
    const selectedModel = configRow?.model || "deepseek";
    const selectedModelName = configRow?.model_name || undefined;

    let session = sessionId ? sessionStore.getSession(sessionId) : null;
    if (!session) {
      const title = utterance.slice(0, MAX_SESSION_TITLE_LENGTH) + (utterance.length > MAX_SESSION_TITLE_LENGTH ? "..." : "");
      session = sessionStore.createSession(userId, title);
    }
    sessionStore.addMessage(session.id, "user", utterance);

    const { agentChatController } = await import("./agentChatController.js");
    const contextMessages: Array<{ role: "user" | "assistant"; content: string }> = (context || []).slice(-6);
    await agentChatController.handleFloatReActStream(
      res, session.id, userId, utterance, selectedModel, selectedModelName, pageId, contextMessages,
    );
  }

  private async handleGenerateIntent(
    req: Request, res: Response, utterance: string,
    pageId: string, context: any, sessionId: string | undefined, userId: string,
  ): Promise<void> {
    const type = /制法|工艺|制备|流程|制作方法/.test(utterance) ? "preparation" : "description";

    const db = getDb();
    const configRow = db.prepare("SELECT * FROM agent_float_config WHERE user_id = ?").get(userId) as any;
    const selectedModel = configRow?.model || "deepseek";
    const selectedModelName = configRow?.model_name || undefined;

    let formulaName = "";
    let materials: any[] = [];
    let finishedWeight: number | undefined;

    const pageFieldMap = this.getPageFieldMap(pageId);
    if (context && Array.isArray(context)) {
      const historyText = context.map((m: any) => m.content).join(" ");
      const nameMatch = historyText.match(/(?:配方名称?|叫|名为?|名称?)[：:]\s*(\S+)/);
      if (nameMatch) formulaName = nameMatch[1];
    }

    if (!formulaName) formulaName = "未命名配方";

    const prompt = `你是一个专业的膏方配方${type === "preparation" ? "制法" : "描述"}生成助手。

配方名称：${formulaName}

请根据配方名称生成专业的配方${type}。要求：
1. ${type === "preparation" ? "描述制取工艺流程，包括浸泡、提取、浓缩、收膏等关键步骤" : "简述该配方的研发目标和主要功效特点"}
2. 结合配方名称的含义和原料特性推导
3. ${type === "preparation" ? "150字以内" : "100字以内"}
4. 只输出${type === "preparation" ? "制法" : "描述"}文本，不要其他内容`;

    try {
      const messages: ChatMessage[] = [
        { role: "system", content: `你是TingStudio的专业配方${type === "preparation" ? "制法" : "描述"}生成助手，只输出纯文本内容。` },
        { role: "user", content: prompt },
      ];
      const result = await llmAgentService.chat({ messages }, selectedModel, selectedModelName);
      const content = (result.content || "").trim();

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      res.write(`data: ${JSON.stringify({ type: "chunk", content })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "done", sessionId: "", model: selectedModel })}\n\n`);
      res.end();
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "生成失败" });
    }
  }

  async generateDescription(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "认证信息缺失" });
      return;
    }
    const { formulaName, materials, finishedWeight, revisionReason, existingDescription, type } = req.body;
    if (!formulaName) {
      res.status(400).json({ success: false, error: "配方名称不能为空" });
      return;
    }

    const db = getDb();
    const appRow = db.prepare("SELECT * FROM model_applications WHERE module = ? AND enabled = 1").get("smart-generate") as any;
    let selectedModel = "deepseek";
    let selectedModelName: string | undefined = undefined;
    if (appRow) {
      selectedModel = appRow.provider;
      selectedModelName = appRow.model;
    } else {
      const configRow = db.prepare("SELECT * FROM agent_float_config WHERE user_id = ?").get(userId) as any;
      selectedModel = configRow?.model || "deepseek";
      selectedModelName = configRow?.model_name || undefined;
    }

    const templateType = type === "version_reason" ? "version_reason" : (revisionReason && existingDescription ? "revision" : (type || "description"));
    const templateRow = db.prepare("SELECT * FROM ai_prompt_templates WHERE module = ? AND type = ? AND enabled = 1 ORDER BY is_default DESC, sort_order ASC LIMIT 1").get("smart-generate", templateType) as any;

    const materialList = materials && materials.length > 0
      ? materials.map((m: any) => `${m.name}${m.quantity ? ' ' + m.quantity + 'g' : ''}`).join("、")
      : "未指定";

    let systemPrompt = "你是TingStudio的专业配方描述生成助手，只输出纯文本内容。";
    let userPrompt = "";

    if (templateRow) {
      systemPrompt = templateRow.system_prompt || systemPrompt;
      userPrompt = templateRow.user_prompt_template
        .replace(/\{\{formulaName\}\}/g, formulaName)
        .replace(/\{\{materials\}\}/g, materialList)
        .replace(/\{\{finishedWeight\}\}/g, String(finishedWeight || "未指定"))
        .replace(/\{\{revisionReason\}\}/g, revisionReason || "")
        .replace(/\{\{existingDescription\}\}/g, existingDescription || "");
    } else if (revisionReason && existingDescription) {
      userPrompt = `你是一个专业的膏方配方描述生成助手。

当前配方名称：${formulaName}
原料：${materialList}
成品重量：${finishedWeight || '未指定'}g
现有描述：${existingDescription}
升版原因：${revisionReason}

请根据升版原因，识别新旧配方的差异，生成更新后的配方描述。要求：
1. 保留原描述中仍有效的部分
2. 补充升版原因导致的变化
3. 描述应专业、简洁，100字以内
4. 只输出描述文本，不要其他内容`;
    } else {
      const targetType = type === "preparation" ? "制法" : (type === "version_reason" ? "升版原因" : "描述");
      const placeholder = type === "preparation"
        ? "制取方法、工艺流程或特殊操作要求"
        : (type === "version_reason" ? "本次配方调整的原因和变更内容" : "研发目标和主要特点");
      userPrompt = `你是一个专业的膏方配方${targetType}生成助手。

当前配方名称：${formulaName}
原料：${materialList}
成品重量：${finishedWeight || '未指定'}g

请根据配方名称和原料信息，生成专业的配方${targetType}。要求：
1. ${type === "preparation" ? "描述制取工艺流程，包括提取、浓缩、收膏等关键步骤" : (type === "version_reason" ? "分析原料组成，推测可能的调整原因" : "简述研发目标和主要功效特点")}
2. 结合配方名称的含义和原料特性
3. ${type === "preparation" ? "200字以内" : "100字以内"}
4. 只输出${targetType}文本，不要其他内容`;
    }

    try {
      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ];
      const result = await llmAgentService.chat({ messages }, selectedModel, selectedModelName);
      const content = (result.content || "").trim();
      res.json({ success: true, data: { content, type: type || "description" } });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "生成失败" });
    }
  }

  async getFieldHints(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "认证信息缺失" });
      return;
    }
    const { pageId } = req.query;
    if (!pageId) {
      res.json({ success: true, data: { missingFields: [], hints: [], count: 0 } });
      return;
    }

    const fieldMap = this.getPageFieldMap(pageId as string);
    const requiredFields: Record<string, string[]> = {
      "formula-add": ["name", "finished_weight", "salesman_name"],
      "formula-edit": ["name", "finished_weight", "salesman_name"],
      "material-add": ["name", "material_type", "unit"],
      "material-edit": ["name", "material_type", "unit"],
      "salesman-add": ["name", "phone"],
      "salesman-edit": ["name", "phone"],
    };

    const required = requiredFields[pageId as string] || [];
    const hints = required.map(f => ({
      field: f,
      label: fieldMap[f] || f,
      hint: `请提供${fieldMap[f] || f}`,
    }));

    res.json({ success: true, data: { missingFields: required, hints, count: required.length } });
  }

  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const db = getDb();
      const row = db.prepare("SELECT status FROM ai_health_records ORDER BY checked_at DESC LIMIT 1").get() as any;
      const status = row?.status || "unknown";
      const modelStatus = status === "healthy" ? "online" : status === "degraded" ? "loading" : "error";
      res.json({ success: true, data: { status: modelStatus } });
    } catch {
      res.json({ success: true, data: { status: "online" } });
    }
  }
}

export const aiAgentController = new AIAgentController();
