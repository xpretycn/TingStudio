import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { query, execute } from '../config/database-adapter.js';
import { aiService } from "../services/ai/AIService.js";
import { fail, fixGarbledText, generateId, success } from "../utils/helpers.js";
import crypto from "node:crypto";


interface ModelRow {
  id: string;
  provider: string;
  name: string;
  base_url: string;
  api_key: string;
  model: string;
  vision_model: string;
  vision_max_tokens: number | null;
  description: string;
  supports_vision: number;
  health_status: string;
  health_check_interval_days: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  today_calls: number;
  today_tokens: number;
  month_tokens: number;
}

interface CountRow {
  cnt: number;
}

interface MaxSortRow {
  max_sort: number | null;
}

interface FallbackRow {
  provider: string;
  fallback_provider: string;
}

interface UsageLogRow {
  id: string;
  provider: string;
  model: string;
  call_type: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  latency_ms: number | null;
  status: string;
  error_message: string | null;
  request_summary: string | null;
  user_id: string | null;
  fallback_from: string | null;
  application_name: string | null;
  application_location: string | null;
  created_at: string;
  model_name?: string;
}

interface AlertConfigRow {
  id: string;
  model_id: string;
  provider: string;
  model_name: string;
  daily_call_limit: number;
  monthly_token_limit: number;
  warning_threshold: number;
  critical_threshold: number;
  enabled: number;
}

interface AlertRecordRow {
  id: string;
  provider: string;
  model_name: string;
  alert_type: string;
  level: string;
  threshold: number;
  current_value: number;
  limit_value: number;
  message: string;
  is_read: number;
  created_at: string;
}

interface ModelProviderRow {
  provider: string;
  name: string;
  model: string;
}

interface ActivityItem {
  type: "success" | "warning" | "error" | "info";
  title: string;
  desc: string;
  time: string;
  provider?: string;
}

interface UsageLogSmartRow {
  id: string;
  provider: string;
  model: string;
  call_type: string;
  total_tokens: number;
  latency_ms: number | null;
  status: string;
  error_message: string | null;
  request_summary: string | null;
  created_at: string;
}

interface TotalRow {
  total: number;
}

interface PromptTemplateRow {
  id: string;
  module: string;
  name: string;
  type: string;
  system_prompt: string;
  user_prompt_template: string;
  variables: string;
  is_default: number;
  enabled: number;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface UsageRecordRow {
  id: string;
  user_id: string | null;
}

function isAdmin(req: Request): boolean {
  return (req as AuthRequest).user?.role === "admin";
}

function getUserId(req: Request): string {
  return (req as AuthRequest).user?.userId || "";
}

export async function getModelsList(req: Request, res: Response) {
  try {
    
    const models = (await query(
        `
      SELECT m.*,
        COALESCE(today_stats.calls, 0) as today_calls,
        COALESCE(today_stats.tokens, 0) as today_tokens,
        COALESCE(month_stats.tokens, 0) as month_tokens
      FROM ai_models m
      LEFT JOIN (
        SELECT provider, COUNT(*) as calls, SUM(total_tokens) as tokens
        FROM ai_usage_logs
        WHERE DATE(created_at) = CURDATE()
        GROUP BY provider
      ) today_stats ON m.provider = today_stats.provider
      LEFT JOIN (
        SELECT provider, SUM(total_tokens) as tokens
        FROM ai_usage_logs
        WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        GROUP BY provider
      ) month_stats ON m.provider = month_stats.provider
      ORDER BY m.sort_order
    `,
        []
      )).rows as ModelRow[];

    const totalModels = models.length;
    const configuredModels = models.filter((m) => m.api_key).length;
    const todayCalls = models.reduce((sum, m) => sum + (m.today_calls || 0), 0);
    const todayTokens = models.reduce((sum, m) => sum + (m.today_tokens || 0), 0);
    const monthTokens = models.reduce((sum, m) => sum + (m.month_tokens || 0), 0);

    const activeAlerts = ((await query(
          `
      SELECT COUNT(*) as cnt FROM ai_alert_records WHERE is_read = 0
    `,
          []
        )).rows[0] as CountRow).cnt;

    const fallbackRows = (await query("SELECT provider, fallback_provider FROM ai_fallback_configs WHERE enabled = 1", [])).rows as FallbackRow[];
    const fallbackMap: Record<string, string> = {};
    for (const row of fallbackRows) {
      fallbackMap[row.provider] = row.fallback_provider;
    }

    const result = models.map((m) => ({
      id: m.id,
      provider: m.provider,
      name: m.name,
      baseUrl: m.base_url,
      apiKeyConfigured: !!m.api_key,
      model: m.model,
      visionModel: m.vision_model || "",
      visionMaxTokens: m.vision_max_tokens,
      description: m.description || "",
      supportsVision: !!m.supports_vision,
      healthStatus: m.health_status,
      healthCheckIntervalDays: m.health_check_interval_days,
      fallbackProvider: fallbackMap[m.provider] || "",
      todayCalls: m.today_calls || 0,
      todayTokens: m.today_tokens || 0,
      monthTokens: m.month_tokens || 0,
      sortOrder: m.sort_order,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    }));

    res.json({
      success: true,
      data: {
        models: result,
        stats: { totalModels, configuredModels, todayCalls, todayTokens, monthTokens, activeAlerts },
      },
    });
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function createModel(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      res.status(403).json(fail("仅管理员可操作", "FORBIDDEN"));
      return;
    }

    const {
      provider,
      name,
      baseUrl,
      apiKey,
      model,
      visionModel,
      visionMaxTokens,
      description,
      supportsVision,
      fallbackProvider,
    } = req.body;

    if (!provider || !name || !baseUrl || !model) {
      res.status(400).json(fail("缺少必填字段: provider, name, baseUrl, model", "VALIDATION_ERROR"));
      return;
    }

    
    const existing = (await query("SELECT id FROM ai_models WHERE provider = ?", [provider])).rows[0];
    if (existing) {
      res.status(400).json(fail(`provider "${provider}" 已存在`, "DUPLICATE_ENTRY"));
      return;
    }

    const id = `model_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const maxSort = ((await query("SELECT MAX(sort_order) as max_sort FROM ai_models", [])).rows[0] as MaxSortRow)?.max_sort || 0;

    await execute(`
      INSERT INTO ai_models (id, provider, name, base_url, api_key, model, vision_model, vision_max_tokens, description, supports_vision, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [id,
      provider,
      name,
      baseUrl,
      apiKey || "",
      model,
      visionModel || "",
      visionMaxTokens || null,
      description || "",
      supportsVision ? 1 : 0,
      maxSort + 1,
      now,
      now,
    ]);

    await execute(`
      INSERT INTO ai_alert_configs (id, model_id, provider, daily_call_limit, monthly_token_limit, warning_threshold, critical_threshold, enabled, created_at, updated_at)
      VALUES (?, ?, ?, 500, 5000000, 80, 95, 1, ?, ?)
    `, [`alert_${id}`, id, provider, now, now]);

    if (fallbackProvider) {
      await execute(`
        INSERT INTO ai_fallback_configs (id, model_id, provider, fallback_provider, fallback_priority, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, 1, ?, ?)
      `, [`fb_${crypto.randomUUID().slice(0, 8)}`, id, provider, fallbackProvider, now, now]);
    }

    aiService.reloadModels();

    res.json({
      success: true,
      data: { id, provider, name, apiKeyConfigured: !!apiKey, model, healthStatus: "unknown", createdAt: now },
    });
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function updateModel(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      res.status(403).json(fail("仅管理员可操作", "FORBIDDEN"));
      return;
    }

    const { id } = req.params;
    
    const existing = (await query("SELECT * FROM ai_models WHERE id = ?", [id])).rows[0] as ModelRow | undefined;
    if (!existing) {
      res.status(404).json(fail("模型不存在", "NOT_FOUND"));
      return;
    }

    const {
      name,
      baseUrl,
      apiKey,
      model,
      visionModel,
      visionMaxTokens,
      description,
      supportsVision,
      fallbackProvider,
      healthCheckIntervalDays,
    } = req.body;
    const now = new Date().toISOString();

    const sets: string[] = [];
    const vals: unknown[] = [];

    if (name !== undefined) {
      sets.push("name = ?");
      vals.push(name);
    }
    if (baseUrl !== undefined) {
      sets.push("base_url = ?");
      vals.push(baseUrl);
    }
    if (apiKey !== undefined) {
      sets.push("api_key = ?");
      vals.push(apiKey);
    }
    if (model !== undefined) {
      sets.push("model = ?");
      vals.push(model);
    }
    if (visionModel !== undefined) {
      sets.push("vision_model = ?");
      vals.push(visionModel);
    }
    if (visionMaxTokens !== undefined) {
      sets.push("vision_max_tokens = ?");
      vals.push(visionMaxTokens);
    }
    if (description !== undefined) {
      sets.push("description = ?");
      vals.push(description);
    }
    if (supportsVision !== undefined) {
      sets.push("supports_vision = ?");
      vals.push(supportsVision ? 1 : 0);
    }
    if (healthCheckIntervalDays !== undefined) {
      sets.push("health_check_interval_days = ?");
      vals.push(healthCheckIntervalDays);
    }

    sets.push("updated_at = ?");
    vals.push(now);

    if (sets.length > 1) {
      vals.push(id);
      await execute(`UPDATE ai_models SET ${sets.join(", ")} WHERE id = ?`, [...vals]);
    }

    if (fallbackProvider !== undefined) {
      await execute("DELETE FROM ai_fallback_configs WHERE model_id = ? AND fallback_priority = 1", [id]);
      if (fallbackProvider) {
        await execute(`
          INSERT INTO ai_fallback_configs (id, model_id, provider, fallback_provider, fallback_priority, enabled, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, 1, ?, ?)
        `, [`fb_${crypto.randomUUID().slice(0, 8)}`, id, existing.provider, fallbackProvider, now, now]);
      }
    }

    aiService.reloadModels();

    res.json({ success: true, data: { id, updatedAt: now } });
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function deleteModel(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      res.status(403).json(fail("仅管理员可操作", "FORBIDDEN"));
      return;
    }

    const { id } = req.params;
    
    const existing = (await query("SELECT * FROM ai_models WHERE id = ?", [id])).rows[0] as ModelRow | undefined;
    if (!existing) {
      res.status(404).json(fail("模型不存在", "NOT_FOUND"));
      return;
    }

    const usageCount = (
      (await query("SELECT COUNT(*) as cnt FROM ai_usage_logs WHERE provider = ?", [existing.provider])).rows[0] as CountRow
    ).cnt;
    if (usageCount > 0) {
      res.status(400).json(fail("该模型存在调用记录，无法移除", "VALIDATION_ERROR"));
      return;
    }

    await execute("DELETE FROM ai_fallback_configs WHERE model_id = ?", [id]);
    await execute("DELETE FROM ai_alert_configs WHERE model_id = ?", [id]);
    await execute("DELETE FROM ai_models WHERE id = ?", [id]);

    aiService.reloadModels();

    res.json({ success: true, message: "模型已移除" });
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function testModelConnection(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      res.status(403).json(fail("仅管理员可操作", "FORBIDDEN"));
      return;
    }

    const { id } = req.params;
    
    const model = (await query("SELECT * FROM ai_models WHERE id = ?", [id])).rows[0] as ModelRow | undefined;
    if (!model) {
      res.status(404).json(fail("模型不存在", "NOT_FOUND"));
      return;
    }

    const start = Date.now();
    try {
      const result = await aiService.chatCompletion(model.provider, [{ role: "user", content: "hi" }], {
        maxTokens: 5,
        temperature: 0,
        callType: "health_check",
        requestSummary: `健康检测: ${model.name}`,
      });

      const latencyMs = Date.now() - start;
      const now = new Date().toISOString();

      await execute("UPDATE ai_models SET health_status = 'healthy', last_health_check = ?, last_health_latency = ?, updated_at = ? WHERE id = ?", [now, latencyMs, now, id]);

      await execute(`
        INSERT INTO ai_health_records (id, provider, status, latency_ms, checked_at)
        VALUES (?, ?, 'healthy', ?, ?)
      `, [`hr_${crypto.randomUUID().slice(0, 8)}`, model.provider, latencyMs, now]);

      res.json({
        success: true,
        data: { provider: model.provider, status: "healthy", latencyMs, model: model.model, testedAt: now },
      });
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      const now = new Date().toISOString();
      const errMsg = err instanceof Error ? err.message : "连接失败";

      await execute("UPDATE ai_models SET health_status = 'unhealthy', last_health_check = ?, last_health_latency = ?, updated_at = ? WHERE id = ?", [now, latencyMs, now, id]);

      await execute(`
        INSERT INTO ai_health_records (id, provider, status, latency_ms, error_message, checked_at)
        VALUES (?, ?, 'unhealthy', ?, ?, ?)
      `, [`hr_${crypto.randomUUID().slice(0, 8)}`, model.provider, latencyMs, errMsg, now]);

      res.json({
        success: false,
        data: { provider: model.provider, status: "unhealthy", error: errMsg, testedAt: now },
      });
    }
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function getModelVersions(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const model = (await query("SELECT * FROM ai_models WHERE id = ?", [id])).rows[0] as ModelRow | undefined;
    if (!model) {
      res.status(404).json(fail("模型不存在", "NOT_FOUND"));
      return;
    }

    const versions = aiService.getAvailableVersions(model.provider);

    res.json({
      success: true,
      data: { provider: model.provider, currentModel: model.model, versions },
    });
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function getModelVersionsByProvider(req: Request, res: Response) {
  try {
    const { provider } = req.params;
    const versions = aiService.getAvailableVersions(provider);
    
    const model = (await query("SELECT model FROM ai_models WHERE provider = ?", [provider])).rows[0] as ModelProviderRow | undefined;
    res.json({
      success: true,
      data: { provider, currentModel: model?.model || "", versions },
    });
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function switchModelVersion(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      res.status(403).json(fail("仅管理员可操作", "FORBIDDEN"));
      return;
    }
    const { provider } = req.params;
    const { model } = req.body;
    if (!model || typeof model !== "string") {
      res.status(400).json(fail("请提供有效的模型版本", "VALIDATION_ERROR"));
      return;
    }
    
    const existing = (await query("SELECT id FROM ai_models WHERE provider = ?", [provider])).rows[0];
    if (!existing) {
      res.status(404).json(fail("模型不存在", "NOT_FOUND"));
      return;
    }
    await execute("UPDATE ai_models SET model = ?, updated_at = CURRENT_TIMESTAMP WHERE provider = ?", [model, provider]);
    aiService.reloadModels();
    res.json({ success: true, data: { provider, model } });
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function getUsageStats(req: Request, res: Response) {
  try {
    
    const { startDate, endDate, provider } = req.query;

    const start = (startDate as string) || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const end = (endDate as string) || new Date().toISOString().slice(0, 10);

    let providerFilter = "";
    const params: unknown[] = [start, end];

    if (provider) {
      providerFilter = "AND provider = ?";
      params.push(provider);
    }

    const summary = (await query(
        `
      SELECT m.provider, m.name,
        COALESCE(u.total_calls, 0) as total_calls,
        COALESCE(u.total_tokens, 0) as total_tokens,
        COALESCE(today.calls, 0) as today_calls,
        COALESCE(today.tokens, 0) as today_tokens,
        COALESCE(month.calls, 0) as month_calls,
        COALESCE(month.tokens, 0) as month_tokens,
        COALESCE(u.avg_latency, 0) as avg_latency_ms
      FROM ai_models m
      LEFT JOIN (
        SELECT provider, COUNT(*) as total_calls, SUM(total_tokens) as total_tokens, AVG(latency_ms) as avg_latency
        FROM ai_usage_logs WHERE DATE(created_at) BETWEEN ? AND ? ${providerFilter}
        GROUP BY provider
      ) u ON m.provider = u.provider
      LEFT JOIN (
        SELECT provider, COUNT(*) as calls, SUM(total_tokens) as tokens
        FROM ai_usage_logs WHERE DATE(created_at) = CURDATE()
        GROUP BY provider
      ) today ON m.provider = today.provider
      LEFT JOIN (
        SELECT provider, COUNT(*) as calls, SUM(total_tokens) as tokens
        FROM ai_usage_logs WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        GROUP BY provider
      ) month ON m.provider = month.provider
      ORDER BY m.sort_order
    `,
        [...params]
      )).rows;

    const trendParams: unknown[] = [start, end];
    let trendFilter = "";
    if (provider) {
      trendFilter = "AND provider = ?";
      trendParams.push(provider);
    }

    const trendRows = (await query(
        `
      SELECT DATE(created_at) as date, provider, SUM(total_tokens) as tokens
      FROM ai_usage_logs
      WHERE DATE(created_at) BETWEEN ? AND ? ${trendFilter}
      GROUP BY DATE(created_at), provider
      ORDER BY date
    `,
        [...trendParams]
      )).rows;

    const allProviders = (await query("SELECT provider, name FROM ai_models ORDER BY sort_order", [])).rows as ModelProviderRow[];
    const trendMap: Record<string, Record<string, number>> = {};
    for (const row of trendRows as { date: string; provider: string; tokens: number }[]) {
      if (!trendMap[row.date]) trendMap[row.date] = {};
      trendMap[row.date][row.provider] = row.tokens;
    }

    const trend = Object.entries(trendMap).map(([date, tokens]) => {
      const entry: Record<string, string | number> = { date };
      for (const p of allProviders) {
        entry[p.provider] = tokens[p.provider] || 0;
      }
      return entry;
    });

    const distribution = (await query(
        `
      SELECT m.provider, m.name, COALESCE(u.tokens, 0) as tokens, COALESCE(u.calls, 0) as calls
      FROM ai_models m
      LEFT JOIN (
        SELECT provider, SUM(total_tokens) as tokens, COUNT(*) as calls
        FROM ai_usage_logs WHERE DATE(created_at) BETWEEN ? AND ?
        GROUP BY provider
      ) u ON m.provider = u.provider
      ORDER BY m.sort_order
    `,
        [start, end]
      )).rows;

    res.json({ success: true, data: { summary, trend, distribution } });
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function getUsageLogs(req: Request, res: Response) {
  try {
    
    const { page = "1", pageSize = "20", provider, callType, status, startDate, endDate } = req.query;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (provider) {
      conditions.push("l.provider = ?");
      params.push(provider);
    }
    if (callType) {
      conditions.push("l.call_type = ?");
      params.push(callType);
    }
    if (status) {
      conditions.push("l.status = ?");
      params.push(status);
    }
    if (startDate) {
      conditions.push("date(l.created_at) >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conditions.push("date(l.created_at) <= ?");
      params.push(endDate);
    }

    if (!isAdmin(req)) {
      conditions.push("l.user_id = ?");
      params.push(getUserId(req));
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const total = ((await query(`SELECT COUNT(*) as cnt FROM ai_usage_logs l ${where}`, [...params])).rows[0] as CountRow).cnt;

    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const logs = (await query(
        `
      SELECT l.*, m.name as model_name
      FROM ai_usage_logs l
      LEFT JOIN ai_models m ON l.provider = m.provider
      ${where}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `,
        [...params, parseInt(pageSize as string), offset]
      )).rows as UsageLogRow[];

    res.json({
      success: true,
      data: {
        logs: logs.map((l) => ({
          id: l.id,
          provider: l.provider,
          modelName: l.model_name || l.provider,
          model: l.model,
          callType: l.call_type,
          promptTokens: l.prompt_tokens,
          completionTokens: l.completion_tokens,
          totalTokens: l.total_tokens,
          latencyMs: l.latency_ms,
          status: l.status,
          errorMessage: l.error_message,
          requestSummary: l.request_summary,
          userId: l.user_id,
          fallbackFrom: l.fallback_from,
          applicationName: l.application_name,
          applicationLocation: l.application_location,
          createdAt: l.created_at ? (l.created_at.includes('T') ? l.created_at : l.created_at.replace(' ', 'T') + 'Z') : l.created_at,
        })),
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
    });
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function getAlertConfigs(req: Request, res: Response) {
  try {
    
    const configs = (await query(
        `
      SELECT ac.*, m.name as model_name
      FROM ai_alert_configs ac
      JOIN ai_models m ON ac.model_id = m.id
      ORDER BY m.sort_order
    `,
        []
      )).rows;

    res.json({ success: true, data: { configs } });
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function updateAlertConfig(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      res.status(403).json(fail("仅管理员可操作", "FORBIDDEN"));
      return;
    }

    const { id } = req.params;
    const { dailyCallLimit, monthlyTokenLimit, warningThreshold, criticalThreshold, enabled } = req.body;
    
    const now = new Date().toISOString();

    await execute(`
      UPDATE ai_alert_configs
      SET daily_call_limit = ?, monthly_token_limit = ?, warning_threshold = ?, critical_threshold = ?, enabled = ?, updated_at = ?
      WHERE id = ?
    `,
      [dailyCallLimit ?? 0,
      monthlyTokenLimit ?? 0,
      warningThreshold ?? 80,
      criticalThreshold ?? 95,
      enabled !== undefined ? (enabled ? 1 : 0) : 1,
      now,
      id,
    ]);

    res.json({ success: true, data: { id, updatedAt: now } });
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function getAlertRecords(req: Request, res: Response) {
  try {
    
    const { page = "1", pageSize = "20", level } = req.query;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (level) {
      conditions.push("level = ?");
      params.push(level);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const total = ((await query(`SELECT COUNT(*) as cnt FROM ai_alert_records ${where}`, [...params])).rows[0] as CountRow).cnt;
    const activeAlerts = ((await query(`SELECT COUNT(*) as cnt FROM ai_alert_records WHERE is_read = 0`, [])).rows[0] as CountRow)
      .cnt;

    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const records = (await query(
        `
      SELECT * FROM ai_alert_records ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
        [...params, parseInt(pageSize as string), offset]
      )).rows as AlertRecordRow[];

    res.json({
      success: true,
      data: {
        records: records.map((r) => ({
          ...r,
          created_at: r.created_at ? (r.created_at.includes('T') ? r.created_at : r.created_at.replace(' ', 'T') + 'Z') : r.created_at,
        })),
        total,
        activeAlerts,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
    });
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function getHealthStatus(req: Request, res: Response) {
  try {
    
    const models = (await query(
        `
      SELECT provider, name, health_status, last_health_check as lastCheckAt, last_health_latency as latencyMs
      FROM ai_models
      ORDER BY sort_order
    `,
        []
      )).rows;

    res.json({ success: true, data: { models } });
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function getHealthHistory(req: Request, res: Response) {
  try {
    const { provider } = req.params;
    const days = parseInt((req.query.days as string) || "7");

    
    const history = (await query(
        `
      SELECT DATE(checked_at) as date,
        COUNT(*) as checks,
        SUM(CASE WHEN status = 'healthy' THEN 1 ELSE 0 END) as healthy,
        SUM(CASE WHEN status = 'degraded' THEN 1 ELSE 0 END) as degraded,
        SUM(CASE WHEN status = 'unhealthy' THEN 1 ELSE 0 END) as unhealthy,
        AVG(latency_ms) as avg_latency_ms
      FROM ai_health_records
      WHERE provider = ? AND checked_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(checked_at)
      ORDER BY date
    `,
        [provider, days]
      )).rows;

    res.json({ success: true, data: { provider, history } });
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function setFallback(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      res.status(403).json(fail("仅管理员可操作", "FORBIDDEN"));
      return;
    }

    const { id } = req.params;
    const { fallbackProvider } = req.body;
    
    const model = (await query("SELECT * FROM ai_models WHERE id = ?", [id])).rows[0] as ModelRow | undefined;
    if (!model) {
      res.status(404).json(fail("模型不存在", "NOT_FOUND"));
      return;
    }

    const now = new Date().toISOString();
    await execute("DELETE FROM ai_fallback_configs WHERE model_id = ? AND fallback_priority = 1", [id]);

    if (fallbackProvider) {
      await execute(`
        INSERT INTO ai_fallback_configs (id, model_id, provider, fallback_provider, fallback_priority, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, 1, ?, ?)
      `, [`fb_${crypto.randomUUID().slice(0, 8)}`, id, model.provider, fallbackProvider, now, now]);
    }

    res.json({
      success: true,
      data: { modelId: id, provider: model.provider, fallbackProvider: fallbackProvider || null },
    });
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function checkAndFireAlerts(provider: string, totalTokens: number, _db?: unknown) {
  const config = ((await query(
      `
    SELECT ac.*, m.name as model_name
    FROM ai_alert_configs ac
    JOIN ai_models m ON ac.model_id = m.id
    WHERE ac.provider = ? AND ac.enabled = 1
  `,
      [provider]
    )).rows[0]) as AlertConfigRow | undefined;

  if (!config) return;

  const now = new Date().toISOString();

  if (config.daily_call_limit > 0) {
    const todayCalls = (
      (await query(
          `
      SELECT COUNT(*) as cnt FROM ai_usage_logs
      WHERE provider = ? AND DATE(created_at) = CURDATE()
    `,
          [provider]
        )).rows[0] as CountRow
    ).cnt;

    const pct = Math.round((todayCalls / config.daily_call_limit) * 100);
    if (pct >= config.critical_threshold) {
      await execute(`
        INSERT INTO ai_alert_records (id, provider, model_name, alert_type, level, threshold, current_value, limit_value, message, created_at)
        VALUES (?, ?, ?, 'daily_call', 'critical', ?, ?, ?, ?, ?)
      `, [`ar_${crypto.randomUUID().slice(0, 8)}`,
        provider,
        config.model_name,
        config.critical_threshold,
        todayCalls,
        config.daily_call_limit,
        `${config.model_name}今日调用次数已达${pct}%，超过严重阈值`,
        now,]);
    } else if (pct >= config.warning_threshold) {
      await execute(`
        INSERT INTO ai_alert_records (id, provider, model_name, alert_type, level, threshold, current_value, limit_value, message, created_at)
        VALUES (?, ?, ?, 'daily_call', 'warning', ?, ?, ?, ?, ?)
      `, [`ar_${crypto.randomUUID().slice(0, 8)}`,
        provider,
        config.model_name,
        config.warning_threshold,
        todayCalls,
        config.daily_call_limit,
        `${config.model_name}今日调用次数已达${pct}%，接近预警阈值`,
        now,]);
    }
  }

  if (config.monthly_token_limit > 0) {
    const monthTokens =
      (
        (await query(
            `
      SELECT SUM(total_tokens) as total FROM ai_usage_logs
      WHERE provider = ? AND created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
    `,
            [provider]
          )).rows[0] as TotalRow
      ).total || 0;

    const pct = Math.round((monthTokens / config.monthly_token_limit) * 100);
    if (pct >= config.critical_threshold) {
      await execute(`
        INSERT INTO ai_alert_records (id, provider, model_name, alert_type, level, threshold, current_value, limit_value, message, created_at)
        VALUES (?, ?, ?, 'monthly_token', 'critical', ?, ?, ?, ?, ?)
      `, [`ar_${crypto.randomUUID().slice(0, 8)}`,
        provider,
        config.model_name,
        config.critical_threshold,
        monthTokens,
        config.monthly_token_limit,
        `${config.model_name}本月Token用量已达${pct}%，超过严重阈值`,
        now,]);
    } else if (pct >= config.warning_threshold) {
      await execute(`
        INSERT INTO ai_alert_records (id, provider, model_name, alert_type, level, threshold, current_value, limit_value, message, created_at)
        VALUES (?, ?, ?, 'monthly_token', 'warning', ?, ?, ?, ?, ?)
      `, [`ar_${crypto.randomUUID().slice(0, 8)}`,
        provider,
        config.model_name,
        config.warning_threshold,
        monthTokens,
        config.monthly_token_limit,
        `${config.model_name}本月Token用量已达${pct}%，接近预警阈值`,
        now,]);
    }
  }
}

async function ensureModelApplicationsTable() {
  try {
    const tableExists = (await query(
        "SELECT TABLE_NAME as name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'model_applications'",
        []
      )).rows[0];
    if (!tableExists) {
      await execute(`
        CREATE TABLE IF NOT EXISTS model_applications (
          id VARCHAR(36) PRIMARY KEY,
          module VARCHAR(100) NOT NULL UNIQUE,
          module_name VARCHAR(255) NOT NULL,
          provider VARCHAR(100) NOT NULL,
          model VARCHAR(255) NOT NULL,
          description TEXT DEFAULT '',
          enabled TINYINT NOT NULL DEFAULT 1,
          created_by VARCHAR(36) DEFAULT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_model_app_module (module),
          INDEX idx_model_app_provider (provider)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("✅ 数据库迁移: 创建表 model_applications");
    }
  } catch (err: unknown) {
    console.error("创建 model_applications 表失败:", err instanceof Error ? err.message : "操作失败");
  }
}

export async function getModelApplications(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json(fail("仅管理员可访问", "FORBIDDEN"));
    }

    
    await ensureModelApplicationsTable();
    const applications = (await query(
        `
        SELECT * FROM model_applications ORDER BY created_at DESC
      `,
        []
      )).rows;

    return res.json({ success: true, data: applications });
  } catch (error: unknown) {
    console.error("获取模型应用配置失败:", error);
    return res.status(500).json(fail("获取配置失败"));
  }
}

export async function createModelApplication(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json(fail("仅管理员可操作", "FORBIDDEN"));
    }

    const { module: moduleName, provider, model, description, enabled } = req.body;

    if (!moduleName || !provider || !model) {
      return res.status(400).json(fail("缺少必要字段", "VALIDATION_ERROR"));
    }

    
    const existing = (await query("SELECT id FROM model_applications WHERE module = ?", [moduleName])).rows[0];

    if (existing) {
      return res.status(400).json({ success: false, message: "该功能模块已存在配置" });
    }

    const id = `ma_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const userId = getUserId(req);

    const moduleNames: Record<string, string> = {
      "weekly-report": "周报AI分析",
      "monthly-report": "月报AI分析",
      "smart-form": "智能配方解析",
      "smart-import": "智能原料导入",
      "smart-search": "智能数据检索",
      "smart-generate": "智能生成",
    };

    await execute(`
      INSERT INTO model_applications (id, module, module_name, provider, model, description, enabled, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id,
      moduleName,
      moduleNames[moduleName] || moduleName,
      provider,
      model,
      description || "",
      enabled !== false ? 1 : 0,
      userId,
      now,
      now,]);

    const newApp = (await query("SELECT * FROM model_applications WHERE id = ?", [id])).rows[0];
    return res.status(201).json({ success: true, data: newApp, message: "创建成功" });
  } catch (error: unknown) {
    console.error("创建模型应用配置失败:", error);
    return res.status(500).json(fail("创建失败"));
  }
}

export async function updateModelApplication(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json(fail("仅管理员可操作", "FORBIDDEN"));
    }

    const { id } = req.params;
    const { provider, model, description, enabled } = req.body;

    if (!provider || !model) {
      return res.status(400).json(fail("缺少必要字段", "VALIDATION_ERROR"));
    }

    
    const existing = (await query("SELECT * FROM model_applications WHERE id = ?", [id])).rows[0];

    if (!existing) {
      return res.status(404).json(fail("配置不存在", "NOT_FOUND"));
    }

    const now = new Date().toISOString();

    await execute(`
      UPDATE model_applications SET provider = ?, model = ?, description = ?, enabled = ?, updated_at = ?
      WHERE id = ?
    `, [provider, model, description || "", enabled !== false ? 1 : 0, now, id]);

    const updated = (await query("SELECT * FROM model_applications WHERE id = ?", [id])).rows[0];
    return res.json({ success: true, data: updated, message: "更新成功" });
  } catch (error: unknown) {
    console.error("更新模型应用配置失败:", error);
    return res.status(500).json(fail("更新失败"));
  }
}

export async function patchModelApplication(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json(fail("仅管理员可操作", "FORBIDDEN"));
    }

    const { id } = req.params;
    const { enabled } = req.body;

    
    const existing = (await query("SELECT * FROM model_applications WHERE id = ?", [id])).rows[0];

    if (!existing) {
      return res.status(404).json(fail("配置不存在", "NOT_FOUND"));
    }

    const now = new Date().toISOString();

    await execute(`
      UPDATE model_applications SET enabled = ?, updated_at = ? WHERE id = ?
    `, [enabled !== false ? 1 : 0, now, id]);

    return res.json({ success: true, message: "状态更新成功" });
  } catch (error: unknown) {
    console.error("更新模型应用状态失败:", error);
    return res.status(500).json(fail("更新失败"));
  }
}

export async function deleteModelApplication(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json(fail("仅管理员可操作", "FORBIDDEN"));
    }

    const { id } = req.params;

    
    const existing = (await query("SELECT * FROM model_applications WHERE id = ?", [id])).rows[0];

    if (!existing) {
      return res.status(404).json(fail("配置不存在", "NOT_FOUND"));
    }

    await execute("DELETE FROM model_applications WHERE id = ?", [id]);

    return res.json({ success: true, message: "删除成功" });
  } catch (error: unknown) {
    console.error("删除模型应用配置失败:", error);
    return res.status(500).json(fail("删除失败"));
  }
}

export async function getRecentActivity(req: Request, res: Response) {
  try {
    
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const logs = (await query(`SELECT id, provider, model, call_type, total_tokens, status, error_message, request_summary, created_at
       FROM ai_usage_logs
       ORDER BY created_at DESC
       LIMIT ?`, [limit])).rows as UsageLogSmartRow[];

    const alerts = (await query(`SELECT id, provider, alert_type, level, threshold, current_value, created_at
       FROM ai_alert_records
       ORDER BY created_at DESC
       LIMIT ?`, [limit])).rows as { id: string; provider: string; alert_type: string; level: string; threshold: number; current_value: number; created_at: string }[];

    const modelNameMap: Record<string, string> = {};
    const models = (await query("SELECT provider, name FROM ai_models", [])).rows as ModelProviderRow[];
    for (const m of models) {
      modelNameMap[m.provider] = m.name;
    }

    const items: ActivityItem[] = [];

    for (const log of logs) {
      const name = modelNameMap[log.provider] || log.provider;
      if (log.status === "success") {
        items.push({
          type: "success",
          title: `${name} 调用成功`,
          desc: `${log.call_type} · ${log.total_tokens} tokens${log.request_summary ? ' · ' + log.request_summary : ''}`,
          time: log.created_at,
          provider: log.provider,
        });
      } else {
        items.push({
          type: "error",
          title: `${name} 调用失败`,
          desc: log.error_message || `${log.call_type} 请求异常`,
          time: log.created_at,
          provider: log.provider,
        });
      }
    }

    for (const alert of alerts) {
      const name = modelNameMap[alert.provider] || alert.provider;
      items.push({
        type: alert.level === "critical" ? "error" : "warning",
        title: `${name} ${alert.alert_type === "monthly_token" ? "月Token" : "日调用"}预警`,
        desc: `阈值 ${alert.threshold}${alert.alert_type === "monthly_token" ? " tokens" : " 次"}，当前 ${alert.current_value}${alert.alert_type === "monthly_token" ? " tokens" : " 次"}`,
        time: alert.created_at,
        provider: alert.provider,
      });
    }

    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    res.json({ success: true, data: { items: items.slice(0, limit) } });
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

const SMART_TOOL_CALL_TYPES = ["parse_formula", "parse_nutrition", "natural_search"];

const CALL_TYPE_LABELS: Record<string, string> = {
  parse_formula: "智能填单",
  parse_nutrition: "智能导入",
  natural_search: "智能查询",
};

export async function getSmartToolHistory(req: Request, res: Response) {
  try {
    
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize as string) || 20, 1), 100);
    const offset = (page - 1) * pageSize;
    const callType = req.query.callType as string | undefined;

    let whereClause = `WHERE call_type IN (${SMART_TOOL_CALL_TYPES.map(() => "?").join(", ")})`;
    const params: unknown[] = [...SMART_TOOL_CALL_TYPES];

    if (callType && SMART_TOOL_CALL_TYPES.includes(callType)) {
      whereClause += " AND call_type = ?";
      params.push(callType);
    }

    const totalResult = (await query(`SELECT COUNT(*) as total FROM ai_usage_logs ${whereClause}`, [...params])).rows[0] as TotalRow;

    const logs = (await query(`SELECT id, provider, model, call_type, total_tokens, latency_ms, status, error_message, request_summary, created_at
       FROM ai_usage_logs ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`, [...params, pageSize, offset])).rows as UsageLogSmartRow[];

    const modelInfoMap: Record<string, { name: string; model: string }> = {};
    const models = (await query("SELECT provider, name, model FROM ai_models", [])).rows as ModelProviderRow[];
    for (const m of models) {
      modelInfoMap[m.provider] = { name: m.name, model: m.model };
    }

    const items = logs.map((log) => {
      const modelInfo = modelInfoMap[log.provider] || { name: log.provider, model: log.model || "" };
      const toolLabel = CALL_TYPE_LABELS[log.call_type] || log.call_type;
      
      let requestSummary = log.request_summary;
      if (requestSummary) {
        requestSummary = fixGarbledText(requestSummary);
      }

      return {
        id: log.id,
        callType: log.call_type,
        toolLabel,
        provider: log.provider,
        modelName: modelInfo.name,
        modelVersion: log.model || modelInfo.model,
        totalTokens: log.total_tokens,
        latencyMs: log.latency_ms,
        status: log.status,
        errorMessage: log.error_message,
        requestSummary,
        createdAt: log.created_at,
      };
    });

    res.json({
      success: true,
      data: {
        list: items,
        pagination: {
          page,
          pageSize,
          total: totalResult.total,
          totalPages: Math.ceil(totalResult.total / pageSize),
        },
      },
    });
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function deleteSmartToolHistory(req: Request, res: Response) {
  try {
    
    const { id } = req.params;

    if (!id) {
      return res.status(400).json(fail("缺少记录 ID", "VALIDATION_ERROR"));
    }

    const userId = (req as AuthRequest).user?.userId;
    const record = (await query("SELECT id, user_id FROM ai_usage_logs WHERE id = ?", [id])).rows[0] as UsageRecordRow | undefined;
    
    if (!record) {
      return res.status(404).json(fail("记录不存在", "NOT_FOUND"));
    }

    if (record.user_id && record.user_id !== userId && !isAdmin(req)) {
      return res.status(403).json(fail("无权删除该记录", "FORBIDDEN"));
    }

    await execute("DELETE FROM ai_usage_logs WHERE id = ?", [id]);

    console.log(`[SmartTools] 已删除历史记录: id=${id}, operator=${userId}`);

    res.json({ success: true, message: "删除成功" });
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function getPromptTemplates(req: Request, res: Response) {
  try {
    
    const { module, type } = req.query;
    let sql = "SELECT * FROM ai_prompt_templates WHERE 1=1";
    const params: unknown[] = [];
    if (module) { sql += " AND module = ?"; params.push(module); }
    if (type) { sql += " AND type = ?"; params.push(type); }
    sql += " ORDER BY sort_order ASC, created_at DESC";
    const rows = (await query(sql, params)).rows as PromptTemplateRow[];
    const result = rows.map(row => ({
      ...row,
      variables: JSON.parse(row.variables || "[]"),
      isDefault: !!row.is_default,
      enabled: !!row.enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    }));
    res.json(success(result));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function createPromptTemplate(req: Request, res: Response) {
  try {
    
    const userId = (req as AuthRequest).user?.userId;
    const { module, name, type, systemPrompt, userPromptTemplate, variables, isDefault, enabled, sortOrder } = req.body;
    if (!module || !name) {
      return res.status(400).json(fail("模块和名称不能为空", "VALIDATION_ERROR"));
    }
    const id = generateId();
    const now = new Date().toISOString();
    await execute(`INSERT INTO ai_prompt_templates (id, module, name, type, system_prompt, user_prompt_template, variables, is_default, enabled, sort_order, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, module, name, type || "description", systemPrompt || "", userPromptTemplate || "",
        JSON.stringify(variables || []), isDefault ? 1 : 0, enabled !== false ? 1 : 0,
        sortOrder || 0, userId || null, now, now
    ]);
    res.json(success({ id, module, name }));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function updatePromptTemplate(req: Request, res: Response) {
  try {
    
    const { id } = req.params;
    const { module, name, type, systemPrompt, userPromptTemplate, variables, isDefault, enabled, sortOrder } = req.body;
    const existing = (await query("SELECT id FROM ai_prompt_templates WHERE id = ?", [id])).rows[0] as PromptTemplateRow | undefined;
    if (!existing) {
      return res.status(404).json(fail("模板不存在", "NOT_FOUND"));
    }
    const now = new Date().toISOString();
    await execute(`UPDATE ai_prompt_templates SET module = COALESCE(?, module), name = COALESCE(?, name), type = COALESCE(?, type),
      system_prompt = COALESCE(?, system_prompt), user_prompt_template = COALESCE(?, user_prompt_template),
      variables = COALESCE(?, variables), is_default = COALESCE(?, is_default), enabled = COALESCE(?, enabled),
      sort_order = COALESCE(?, sort_order), updated_at = ? WHERE id = ?`, [module || null, name || null, type || null, systemPrompt ?? null, userPromptTemplate ?? null,
        variables != null ? JSON.stringify(variables) : null, isDefault != null ? (isDefault ? 1 : 0) : null,
        enabled != null ? (enabled ? 1 : 0) : null, sortOrder ?? null, now, id
    ]);
    res.json(success({ id }));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}

export async function deletePromptTemplate(req: Request, res: Response) {
  try {
    
    const { id } = req.params;
    const existing = (await query("SELECT id FROM ai_prompt_templates WHERE id = ?", [id])).rows[0] as PromptTemplateRow | undefined;
    if (!existing) {
      return res.status(404).json(fail("模板不存在", "NOT_FOUND"));
    }
    await execute("DELETE FROM ai_prompt_templates WHERE id = ?", [id]);
    res.json(success({ id }));
  } catch (error: unknown) {
    res.status(500).json(fail("操作失败"));
  }
}
