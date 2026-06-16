import { Request, Response } from "express";
import { llmAgentService } from "./llmService.js";
import { sessionStore } from "./sessionStore.js";
import { query, execute } from "../../../config/database-adapter.js";
import { checkWriteIntentFromText } from "./agentWriteGuard.js";
import crypto from "node:crypto";

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
  async getFloatConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "认证信息缺失" });
        return;
      }
      let result = await query("SELECT * FROM agent_float_config WHERE user_id = ?", [userId]);
      let row = result.rows[0] as Record<string, unknown> | undefined;
      if (!row) {
        const id = crypto.randomUUID();
        await execute("INSERT INTO agent_float_config (id, user_id) VALUES (?, ?)", [id, userId]);
        result = await query("SELECT * FROM agent_float_config WHERE user_id = ?", [userId]);
        row = result.rows[0] as Record<string, unknown>;
      }
      const config = this.deserializeFloatConfig(row!);
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
        "enabled", "model", "model_name", "fallback_model", "fallback_model_name",
        "position", "drawer_width", "theme_color", "show_pulse", "enabled_pages", "max_rounds",
      ];
      const existingResult = await query("SELECT id FROM agent_float_config WHERE user_id = ?", [userId]);
      const existing = existingResult.rows[0];

      if (!existing) {
        const id = crypto.randomUUID();
        const defaults: Record<string, unknown> = {
          enabled: 1, model: "deepseek", model_name: "", fallback_model: "", fallback_model_name: "",
          position: "right", drawer_width: 400, theme_color: "", show_pulse: 1, enabled_pages: "[]", max_rounds: 10,
        };
        const merged = { ...defaults };
        for (const field of allowedFields) {
          if (req.body[field] !== undefined) {
            merged[field] = this.serializeFieldValue(field, req.body[field]);
          }
        }
        await execute(
          `INSERT INTO agent_float_config (id, user_id, enabled, model, model_name, fallback_model, fallback_model_name, position, drawer_width, theme_color, show_pulse, enabled_pages, max_rounds)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, userId, merged.enabled, merged.model, merged.model_name, merged.fallback_model,
           merged.fallback_model_name, merged.position, merged.drawer_width, merged.theme_color,
           merged.show_pulse, merged.enabled_pages, merged.max_rounds]
        );
      } else {
        const setClauses: string[] = [];
        const sqlParams: unknown[] = [];
        for (const field of allowedFields) {
          if (req.body[field] !== undefined) {
            setClauses.push(`${field} = ?`);
            sqlParams.push(this.serializeFieldValue(field, req.body[field]));
          }
        }
        if (setClauses.length > 0) {
          setClauses.push("updated_at = CURRENT_TIMESTAMP");
          sqlParams.push(userId);
          await execute(`UPDATE agent_float_config SET ${setClauses.join(", ")} WHERE user_id = ?`, sqlParams);
        }
      }

      const rowResult = await query("SELECT * FROM agent_float_config WHERE user_id = ?", [userId]);
      const config = this.deserializeFloatConfig(rowResult.rows[0] as Record<string, unknown>);
      res.json({ success: true, data: config });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "更新悬浮球配置失败" });
    }
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

    const configResult = await query("SELECT * FROM agent_float_config WHERE user_id = ?", [userId]);
    const configRow = configResult.rows[0] as Record<string, unknown> | undefined;
    const selectedModel = (configRow?.model as string) || "deepseek";
    const selectedModelName = (configRow?.model_name as string) || undefined;

    let session = sessionId ? await sessionStore.getSession(sessionId) : null;
    if (!session) {
      const title = utterance.slice(0, MAX_SESSION_TITLE_LENGTH) + (utterance.length > MAX_SESSION_TITLE_LENGTH ? "..." : "");
      session = await sessionStore.createSession(userId, title);
    }
    await sessionStore.addMessage(session.id, "user", utterance);

    const { agentChatController } = await import("./agentChatController.js");
    const contextMessages: Array<{ role: "user" | "assistant"; content: string }> = (context || []).slice(-6);
    await agentChatController.handleFloatReActStream(
      res, session.id, userId, utterance, selectedModel, selectedModelName, pageId, contextMessages,
    );
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
      const result = await query("SELECT status FROM ai_health_records ORDER BY checked_at DESC LIMIT 1", []);
      const row = result.rows[0] as Record<string, unknown> | undefined;
      const status = (row?.status as string) || "unknown";
      const modelStatus =
        status === "healthy" ? "online" :
        status === "degraded" ? "degraded" :
        status === "down" ? "error" : "unknown";
      res.json({ success: true, data: { status: modelStatus } });
    } catch {
      res.json({ success: true, data: { status: "online" } });
    }
  }

  private deserializeFloatConfig(row: Record<string, unknown>): Record<string, unknown> {
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
      enabledPages: JSON.parse((row.enabled_pages as string) || "[]"),
      maxRounds: row.max_rounds,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    };
  }

  private serializeFieldValue(field: string, value: unknown): unknown {
    if (field === "enabled" || field === "show_pulse") return value ? 1 : 0;
    if (field === "enabled_pages") return JSON.stringify(value);
    return value;
  }

  private getPageFieldMap(pageId: string): Record<string, string> {
    const maps: Record<string, Record<string, string>> = {
      "formula-add": { name: "配方名称", finished_weight: "成品重量(g)", ratio_factor: "系数", salesman_name: "业务员", description: "描述", materials: "原料列表" },
      "formula-edit": { name: "配方名称", finished_weight: "成品重量(g)", ratio_factor: "系数", salesman_name: "业务员", description: "描述", materials: "原料列表" },
      "material-add": { name: "原料名称", code: "编码", material_type: "原料类型(herb=药材,supplement=辅料)", unit: "单位", stock: "库存", unit_price: "单价(元/kg)", description: "描述" },
      "material-edit": { name: "原料名称", code: "编码", material_type: "原料类型(herb=药材,supplement=辅料)", unit: "单位", stock: "库存", unit_price: "单价(元/kg)", description: "描述" },
      "salesman-add": { name: "业务员姓名", phone: "手机号", region: "区域", department: "部门", email: "邮箱", code: "工号" },
      "salesman-edit": { name: "业务员姓名", phone: "手机号", region: "区域", department: "部门", email: "邮箱", code: "工号" },
    };
    return maps[pageId] || {};
  }
}

export const aiAgentController = new AIAgentController();
