import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { getDb } from "../config/database-better-sqlite3.js";
import { aiService } from "../services/ai/AIService.js";
import { fixGarbledText, formatFriendlyErrorMessage, generateId, success } from "../utils/helpers.js";
import crypto from "node:crypto";

function isAdmin(req: Request): boolean {
  return (req as AuthRequest).user?.role === "admin";
}

function getUserId(req: Request): string {
  return (req as AuthRequest).user?.userId || "";
}

export async function getModelsList(req: Request, res: Response) {
  try {
    const db = getDb();
    const models = db
      .prepare(
        `
      SELECT m.*,
        COALESCE(today_stats.calls, 0) as today_calls,
        COALESCE(today_stats.tokens, 0) as today_tokens,
        COALESCE(month_stats.tokens, 0) as month_tokens
      FROM ai_models m
      LEFT JOIN (
        SELECT provider, COUNT(*) as calls, SUM(total_tokens) as tokens
        FROM ai_usage_logs
        WHERE date(created_at) = date('now')
        GROUP BY provider
      ) today_stats ON m.provider = today_stats.provider
      LEFT JOIN (
        SELECT provider, SUM(total_tokens) as tokens
        FROM ai_usage_logs
        WHERE created_at >= strftime('%Y-%m-01', 'now')
        GROUP BY provider
      ) month_stats ON m.provider = month_stats.provider
      ORDER BY m.sort_order
    `,
      )
      .all();

    const totalModels = models.length;
    const configuredModels = models.filter((m: any) => m.api_key).length;
    const todayCalls = models.reduce((sum: number, m: any) => sum + (m.today_calls || 0), 0);
    const todayTokens = models.reduce((sum: number, m: any) => sum + (m.today_tokens || 0), 0);
    const monthTokens = models.reduce((sum: number, m: any) => sum + (m.month_tokens || 0), 0);

    const activeAlerts = (
      db
        .prepare(
          `
      SELECT COUNT(*) as cnt FROM ai_alert_records WHERE is_read = 0
    `,
        )
        .get() as any
    ).cnt;

    const fallbackRows = db
      .prepare("SELECT provider, fallback_provider FROM ai_fallback_configs WHERE enabled = 1")
      .all();
    const fallbackMap: Record<string, string> = {};
    for (const row of fallbackRows as any[]) {
      fallbackMap[row.provider] = row.fallback_provider;
    }

    const result = models.map((m: any) => ({
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createModel(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ success: false, message: "仅管理员可操作" });
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
      res.status(400).json({ success: false, message: "缺少必填字段: provider, name, baseUrl, model" });
      return;
    }

    const db = getDb();
    const existing = db.prepare("SELECT id FROM ai_models WHERE provider = ?").get(provider);
    if (existing) {
      res.status(400).json({ success: false, message: `provider "${provider}" 已存在` });
      return;
    }

    const id = `model_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const maxSort = (db.prepare("SELECT MAX(sort_order) as max_sort FROM ai_models").get() as any)?.max_sort || 0;

    db.prepare(
      `
      INSERT INTO ai_models (id, provider, name, base_url, api_key, model, vision_model, vision_max_tokens, description, supports_vision, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      id,
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
    );

    db.prepare(
      `
      INSERT INTO ai_alert_configs (id, model_id, provider, daily_call_limit, monthly_token_limit, warning_threshold, critical_threshold, enabled, created_at, updated_at)
      VALUES (?, ?, ?, 500, 5000000, 80, 95, 1, ?, ?)
    `,
    ).run(`alert_${id}`, id, provider, now, now);

    if (fallbackProvider) {
      db.prepare(
        `
        INSERT INTO ai_fallback_configs (id, model_id, provider, fallback_provider, fallback_priority, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, 1, ?, ?)
      `,
      ).run(`fb_${crypto.randomUUID().slice(0, 8)}`, id, provider, fallbackProvider, now, now);
    }

    aiService.reloadModels();

    res.json({
      success: true,
      data: { id, provider, name, apiKeyConfigured: !!apiKey, model, healthStatus: "unknown", createdAt: now },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateModel(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ success: false, message: "仅管理员可操作" });
      return;
    }

    const { id } = req.params;
    const db = getDb();
    const existing = db.prepare("SELECT * FROM ai_models WHERE id = ?").get(id);
    if (!existing) {
      res.status(404).json({ success: false, message: "模型不存在" });
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
    const vals: any[] = [];

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
      db.prepare(`UPDATE ai_models SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    }

    if (fallbackProvider !== undefined) {
      const row = existing as any;
      db.prepare("DELETE FROM ai_fallback_configs WHERE model_id = ? AND fallback_priority = 1").run(id);
      if (fallbackProvider) {
        db.prepare(
          `
          INSERT INTO ai_fallback_configs (id, model_id, provider, fallback_provider, fallback_priority, enabled, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, 1, ?, ?)
        `,
        ).run(`fb_${crypto.randomUUID().slice(0, 8)}`, id, row.provider, fallbackProvider, now, now);
      }
    }

    aiService.reloadModels();

    res.json({ success: true, data: { id, updatedAt: now } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteModel(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ success: false, message: "仅管理员可操作" });
      return;
    }

    const { id } = req.params;
    const db = getDb();
    const existing = db.prepare("SELECT * FROM ai_models WHERE id = ?").get(id);
    if (!existing) {
      res.status(404).json({ success: false, message: "模型不存在" });
      return;
    }

    const row = existing as any;
    const usageCount = (
      db.prepare("SELECT COUNT(*) as cnt FROM ai_usage_logs WHERE provider = ?").get(row.provider) as any
    ).cnt;
    if (usageCount > 0) {
      res.status(400).json({ success: false, message: "该模型存在调用记录，无法移除" });
      return;
    }

    db.prepare("DELETE FROM ai_fallback_configs WHERE model_id = ?").run(id);
    db.prepare("DELETE FROM ai_alert_configs WHERE model_id = ?").run(id);
    db.prepare("DELETE FROM ai_models WHERE id = ?").run(id);

    aiService.reloadModels();

    res.json({ success: true, message: "模型已移除" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function testModelConnection(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ success: false, message: "仅管理员可操作" });
      return;
    }

    const { id } = req.params;
    const db = getDb();
    const model = db.prepare("SELECT * FROM ai_models WHERE id = ?").get(id) as any;
    if (!model) {
      res.status(404).json({ success: false, message: "模型不存在" });
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

      db.prepare(
        "UPDATE ai_models SET health_status = 'healthy', last_health_check = ?, last_health_latency = ?, updated_at = ? WHERE id = ?",
      ).run(now, latencyMs, now, id);

      db.prepare(
        `
        INSERT INTO ai_health_records (id, provider, status, latency_ms, checked_at)
        VALUES (?, ?, 'healthy', ?, ?)
      `,
      ).run(`hr_${crypto.randomUUID().slice(0, 8)}`, model.provider, latencyMs, now);

      res.json({
        success: true,
        data: { provider: model.provider, status: "healthy", latencyMs, model: model.model, testedAt: now },
      });
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      const now = new Date().toISOString();

      db.prepare(
        "UPDATE ai_models SET health_status = 'unhealthy', last_health_check = ?, last_health_latency = ?, updated_at = ? WHERE id = ?",
      ).run(now, latencyMs, now, id);

      db.prepare(
        `
        INSERT INTO ai_health_records (id, provider, status, latency_ms, error_message, checked_at)
        VALUES (?, ?, 'unhealthy', ?, ?, ?)
      `,
      ).run(`hr_${crypto.randomUUID().slice(0, 8)}`, model.provider, latencyMs, err.message, now);

      res.json({
        success: false,
        data: { provider: model.provider, status: "unhealthy", error: err.message, testedAt: now },
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getModelVersions(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const db = getDb();
    const model = db.prepare("SELECT * FROM ai_models WHERE id = ?").get(id) as any;
    if (!model) {
      res.status(404).json({ success: false, message: "模型不存在" });
      return;
    }

    const versions = aiService.getAvailableVersions(model.provider);

    res.json({
      success: true,
      data: { provider: model.provider, currentModel: model.model, versions },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getModelVersionsByProvider(req: Request, res: Response) {
  try {
    const { provider } = req.params;
    const versions = aiService.getAvailableVersions(provider);
    const db = getDb();
    const model = db.prepare("SELECT model FROM ai_models WHERE provider = ?").get(provider) as any;
    res.json({
      success: true,
      data: { provider, currentModel: model?.model || "", versions },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function switchModelVersion(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ success: false, message: "仅管理员可操作" });
      return;
    }
    const { provider } = req.params;
    const { model } = req.body;
    if (!model || typeof model !== "string") {
      res.status(400).json({ success: false, message: "请提供有效的模型版本" });
      return;
    }
    const db = getDb();
    const existing = db.prepare("SELECT id FROM ai_models WHERE provider = ?").get(provider);
    if (!existing) {
      res.status(404).json({ success: false, message: "模型不存在" });
      return;
    }
    db.prepare("UPDATE ai_models SET model = ?, updated_at = datetime('now') WHERE provider = ?").run(model, provider);
    aiService.reloadModels();
    res.json({ success: true, data: { provider, model } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getUsageStats(req: Request, res: Response) {
  try {
    const db = getDb();
    const { startDate, endDate, provider } = req.query;

    const start = (startDate as string) || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const end = (endDate as string) || new Date().toISOString().slice(0, 10);

    let providerFilter = "";
    const params: any[] = [start, end];

    if (provider) {
      providerFilter = "AND provider = ?";
      params.push(provider);
    }

    const summary = db
      .prepare(
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
        FROM ai_usage_logs WHERE date(created_at) BETWEEN ? AND ? ${providerFilter}
        GROUP BY provider
      ) u ON m.provider = u.provider
      LEFT JOIN (
        SELECT provider, COUNT(*) as calls, SUM(total_tokens) as tokens
        FROM ai_usage_logs WHERE date(created_at) = date('now')
        GROUP BY provider
      ) today ON m.provider = today.provider
      LEFT JOIN (
        SELECT provider, COUNT(*) as calls, SUM(total_tokens) as tokens
        FROM ai_usage_logs WHERE created_at >= strftime('%Y-%m-01', 'now')
        GROUP BY provider
      ) month ON m.provider = month.provider
      ORDER BY m.sort_order
    `,
      )
      .all(...params);

    const trendParams: any[] = [start, end];
    let trendFilter = "";
    if (provider) {
      trendFilter = "AND provider = ?";
      trendParams.push(provider);
    }

    const trendRows = db
      .prepare(
        `
      SELECT date(created_at) as date, provider, SUM(total_tokens) as tokens
      FROM ai_usage_logs
      WHERE date(created_at) BETWEEN ? AND ? ${trendFilter}
      GROUP BY date(created_at), provider
      ORDER BY date
    `,
      )
      .all(...trendParams);

    const allProviders = db.prepare("SELECT provider, name FROM ai_models ORDER BY sort_order").all() as any[];
    const trendMap: Record<string, Record<string, number>> = {};
    for (const row of trendRows as any[]) {
      if (!trendMap[row.date]) trendMap[row.date] = {};
      trendMap[row.date][row.provider] = row.tokens;
    }

    const trend = Object.entries(trendMap).map(([date, tokens]) => {
      const entry: Record<string, any> = { date };
      for (const p of allProviders) {
        entry[p.provider] = tokens[p.provider] || 0;
      }
      return entry;
    });

    const distribution = db
      .prepare(
        `
      SELECT m.provider, m.name, COALESCE(u.tokens, 0) as tokens, COALESCE(u.calls, 0) as calls
      FROM ai_models m
      LEFT JOIN (
        SELECT provider, SUM(total_tokens) as tokens, COUNT(*) as calls
        FROM ai_usage_logs WHERE date(created_at) BETWEEN ? AND ?
        GROUP BY provider
      ) u ON m.provider = u.provider
      ORDER BY m.sort_order
    `,
      )
      .all(start, end);

    res.json({ success: true, data: { summary, trend, distribution } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getUsageLogs(req: Request, res: Response) {
  try {
    const db = getDb();
    const { page = "1", pageSize = "20", provider, callType, status, startDate, endDate } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

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

    const total = (db.prepare(`SELECT COUNT(*) as cnt FROM ai_usage_logs l ${where}`).get(...params) as any).cnt;

    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const logs = db
      .prepare(
        `
      SELECT l.*, m.name as model_name
      FROM ai_usage_logs l
      LEFT JOIN ai_models m ON l.provider = m.provider
      ${where}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `,
      )
      .all(...params, parseInt(pageSize as string), offset);

    res.json({
      success: true,
      data: {
        logs: logs.map((l: any) => ({
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getAlertConfigs(req: Request, res: Response) {
  try {
    const db = getDb();
    const configs = db
      .prepare(
        `
      SELECT ac.*, m.name as model_name
      FROM ai_alert_configs ac
      JOIN ai_models m ON ac.model_id = m.id
      ORDER BY m.sort_order
    `,
      )
      .all();

    res.json({ success: true, data: { configs } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateAlertConfig(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ success: false, message: "仅管理员可操作" });
      return;
    }

    const { id } = req.params;
    const { dailyCallLimit, monthlyTokenLimit, warningThreshold, criticalThreshold, enabled } = req.body;
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `
      UPDATE ai_alert_configs
      SET daily_call_limit = ?, monthly_token_limit = ?, warning_threshold = ?, critical_threshold = ?, enabled = ?, updated_at = ?
      WHERE id = ?
    `,
    ).run(
      dailyCallLimit ?? 0,
      monthlyTokenLimit ?? 0,
      warningThreshold ?? 80,
      criticalThreshold ?? 95,
      enabled !== undefined ? (enabled ? 1 : 0) : 1,
      now,
      id,
    );

    res.json({ success: true, data: { id, updatedAt: now } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getAlertRecords(req: Request, res: Response) {
  try {
    const db = getDb();
    const { page = "1", pageSize = "20", level } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (level) {
      conditions.push("level = ?");
      params.push(level);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const total = (db.prepare(`SELECT COUNT(*) as cnt FROM ai_alert_records ${where}`).get(...params) as any).cnt;
    const activeAlerts = (db.prepare(`SELECT COUNT(*) as cnt FROM ai_alert_records WHERE is_read = 0`).get() as any)
      .cnt;

    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const records = db
      .prepare(
        `
      SELECT * FROM ai_alert_records ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
      )
      .all(...params, parseInt(pageSize as string), offset);

    res.json({
      success: true,
      data: {
        records: (records as any[]).map((r: any) => ({
          ...r,
          created_at: r.created_at ? (r.created_at.includes('T') ? r.created_at : r.created_at.replace(' ', 'T') + 'Z') : r.created_at,
        })),
        total,
        activeAlerts,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getHealthStatus(req: Request, res: Response) {
  try {
    const db = getDb();
    const models = db
      .prepare(
        `
      SELECT provider, name, health_status, last_health_check as lastCheckAt, last_health_latency as latencyMs
      FROM ai_models
      ORDER BY sort_order
    `,
      )
      .all();

    res.json({ success: true, data: { models } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getHealthHistory(req: Request, res: Response) {
  try {
    const { provider } = req.params;
    const days = parseInt((req.query.days as string) || "7");

    const db = getDb();
    const history = db
      .prepare(
        `
      SELECT date(checked_at) as date,
        COUNT(*) as checks,
        SUM(CASE WHEN status = 'healthy' THEN 1 ELSE 0 END) as healthy,
        SUM(CASE WHEN status = 'degraded' THEN 1 ELSE 0 END) as degraded,
        SUM(CASE WHEN status = 'unhealthy' THEN 1 ELSE 0 END) as unhealthy,
        AVG(latency_ms) as avg_latency_ms
      FROM ai_health_records
      WHERE provider = ? AND checked_at >= date('now', '-' || ? || ' days')
      GROUP BY date(checked_at)
      ORDER BY date
    `,
      )
      .all(provider, days);

    res.json({ success: true, data: { provider, history } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function setFallback(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ success: false, message: "仅管理员可操作" });
      return;
    }

    const { id } = req.params;
    const { fallbackProvider } = req.body;
    const db = getDb();
    const model = db.prepare("SELECT * FROM ai_models WHERE id = ?").get(id) as any;
    if (!model) {
      res.status(404).json({ success: false, message: "模型不存在" });
      return;
    }

    const now = new Date().toISOString();
    db.prepare("DELETE FROM ai_fallback_configs WHERE model_id = ? AND fallback_priority = 1").run(id);

    if (fallbackProvider) {
      db.prepare(
        `
        INSERT INTO ai_fallback_configs (id, model_id, provider, fallback_provider, fallback_priority, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, 1, ?, ?)
      `,
      ).run(`fb_${crypto.randomUUID().slice(0, 8)}`, id, model.provider, fallbackProvider, now, now);
    }

    res.json({
      success: true,
      data: { modelId: id, provider: model.provider, fallbackProvider: fallbackProvider || null },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function checkAndFireAlerts(provider: string, totalTokens: number, db: any) {
  const config = db
    .prepare(
      `
    SELECT ac.*, m.name as model_name
    FROM ai_alert_configs ac
    JOIN ai_models m ON ac.model_id = m.id
    WHERE ac.provider = ? AND ac.enabled = 1
  `,
    )
    .get(provider) as any;

  if (!config) return;

  const now = new Date().toISOString();

  if (config.daily_call_limit > 0) {
    const todayCalls = (
      db
        .prepare(
          `
      SELECT COUNT(*) as cnt FROM ai_usage_logs
      WHERE provider = ? AND date(created_at) = date('now')
    `,
        )
        .get(provider) as any
    ).cnt;

    const pct = Math.round((todayCalls / config.daily_call_limit) * 100);
    if (pct >= config.critical_threshold) {
      db.prepare(
        `
        INSERT INTO ai_alert_records (id, provider, model_name, alert_type, level, threshold, current_value, limit_value, message, created_at)
        VALUES (?, ?, ?, 'daily_call', 'critical', ?, ?, ?, ?, ?)
      `,
      ).run(
        `ar_${crypto.randomUUID().slice(0, 8)}`,
        provider,
        config.model_name,
        config.critical_threshold,
        todayCalls,
        config.daily_call_limit,
        `${config.model_name}今日调用次数已达${pct}%，超过严重阈值`,
        now,
      );
    } else if (pct >= config.warning_threshold) {
      db.prepare(
        `
        INSERT INTO ai_alert_records (id, provider, model_name, alert_type, level, threshold, current_value, limit_value, message, created_at)
        VALUES (?, ?, ?, 'daily_call', 'warning', ?, ?, ?, ?, ?)
      `,
      ).run(
        `ar_${crypto.randomUUID().slice(0, 8)}`,
        provider,
        config.model_name,
        config.warning_threshold,
        todayCalls,
        config.daily_call_limit,
        `${config.model_name}今日调用次数已达${pct}%，接近预警阈值`,
        now,
      );
    }
  }

  if (config.monthly_token_limit > 0) {
    const monthTokens =
      (
        db
          .prepare(
            `
      SELECT SUM(total_tokens) as total FROM ai_usage_logs
      WHERE provider = ? AND created_at >= strftime('%Y-%m-01', 'now')
    `,
          )
          .get(provider) as any
      ).total || 0;

    const pct = Math.round((monthTokens / config.monthly_token_limit) * 100);
    if (pct >= config.critical_threshold) {
      db.prepare(
        `
        INSERT INTO ai_alert_records (id, provider, model_name, alert_type, level, threshold, current_value, limit_value, message, created_at)
        VALUES (?, ?, ?, 'monthly_token', 'critical', ?, ?, ?, ?, ?)
      `,
      ).run(
        `ar_${crypto.randomUUID().slice(0, 8)}`,
        provider,
        config.model_name,
        config.critical_threshold,
        monthTokens,
        config.monthly_token_limit,
        `${config.model_name}本月Token用量已达${pct}%，超过严重阈值`,
        now,
      );
    } else if (pct >= config.warning_threshold) {
      db.prepare(
        `
        INSERT INTO ai_alert_records (id, provider, model_name, alert_type, level, threshold, current_value, limit_value, message, created_at)
        VALUES (?, ?, ?, 'monthly_token', 'warning', ?, ?, ?, ?, ?)
      `,
      ).run(
        `ar_${crypto.randomUUID().slice(0, 8)}`,
        provider,
        config.model_name,
        config.warning_threshold,
        monthTokens,
        config.monthly_token_limit,
        `${config.model_name}本月Token用量已达${pct}%，接近预警阈值`,
        now,
      );
    }
  }
}

function ensureModelApplicationsTable(db: any) {
  try {
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='model_applications'")
      .get();
    if (!tableExists) {
      db.exec(`
        CREATE TABLE model_applications (
          id TEXT PRIMARY KEY,
          module TEXT NOT NULL UNIQUE,
          module_name TEXT NOT NULL,
          provider TEXT NOT NULL,
          model TEXT NOT NULL,
          description TEXT DEFAULT '',
          enabled INTEGER NOT NULL DEFAULT 1,
          created_by TEXT DEFAULT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_model_app_module ON model_applications(module);
        CREATE INDEX IF NOT EXISTS idx_model_app_provider ON model_applications(provider)
      `);
      console.log("✅ 数据库迁移: 创建表 model_applications");
    }
  } catch (err: any) {
    console.error("创建 model_applications 表失败:", err.message);
  }
}

export async function getModelApplications(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: "仅管理员可访问" });
    }

    const db = getDb();
    ensureModelApplicationsTable(db);
    const applications = db
      .prepare(
        `
        SELECT * FROM model_applications ORDER BY created_at DESC
      `,
      )
      .all();

    return res.json({ success: true, data: applications });
  } catch (error: any) {
    console.error("获取模型应用配置失败:", error);
    return res.status(500).json({ success: false, message: "获取配置失败", error: error.message });
  }
}

export async function createModelApplication(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: "仅管理员可操作" });
    }

    const { module: moduleName, provider, model, description, enabled } = req.body;

    if (!moduleName || !provider || !model) {
      return res.status(400).json({ success: false, message: "缺少必要字段" });
    }

    const db = getDb();
    const existing = db.prepare("SELECT id FROM model_applications WHERE module = ?").get(moduleName);

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

    db.prepare(
      `
      INSERT INTO model_applications (id, module, module_name, provider, model, description, enabled, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      id,
      moduleName,
      moduleNames[moduleName] || moduleName,
      provider,
      model,
      description || "",
      enabled !== false ? 1 : 0,
      userId,
      now,
      now,
    );

    const newApp = db.prepare("SELECT * FROM model_applications WHERE id = ?").get(id);
    return res.status(201).json({ success: true, data: newApp, message: "创建成功" });
  } catch (error: any) {
    console.error("创建模型应用配置失败:", error);
    return res.status(500).json({ success: false, message: "创建失败", error: error.message });
  }
}

export async function updateModelApplication(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: "仅管理员可操作" });
    }

    const { id } = req.params;
    const { provider, model, description, enabled } = req.body;

    if (!provider || !model) {
      return res.status(400).json({ success: false, message: "缺少必要字段" });
    }

    const db = getDb();
    const existing = db.prepare("SELECT * FROM model_applications WHERE id = ?").get(id);

    if (!existing) {
      return res.status(404).json({ success: false, message: "配置不存在" });
    }

    const now = new Date().toISOString();

    db.prepare(
      `
      UPDATE model_applications SET provider = ?, model = ?, description = ?, enabled = ?, updated_at = ?
      WHERE id = ?
    `,
    ).run(provider, model, description || "", enabled !== false ? 1 : 0, now, id);

    const updated = db.prepare("SELECT * FROM model_applications WHERE id = ?").get(id);
    return res.json({ success: true, data: updated, message: "更新成功" });
  } catch (error: any) {
    console.error("更新模型应用配置失败:", error);
    return res.status(500).json({ success: false, message: "更新失败", error: error.message });
  }
}

export async function patchModelApplication(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: "仅管理员可操作" });
    }

    const { id } = req.params;
    const { enabled } = req.body;

    const db = getDb();
    const existing = db.prepare("SELECT * FROM model_applications WHERE id = ?").get(id);

    if (!existing) {
      return res.status(404).json({ success: false, message: "配置不存在" });
    }

    const now = new Date().toISOString();

    db.prepare(
      `
      UPDATE model_applications SET enabled = ?, updated_at = ? WHERE id = ?
    `,
    ).run(enabled !== false ? 1 : 0, now, id);

    return res.json({ success: true, message: "状态更新成功" });
  } catch (error: any) {
    console.error("更新模型应用状态失败:", error);
    return res.status(500).json({ success: false, message: "更新失败", error: error.message });
  }
}

export async function deleteModelApplication(req: Request, res: Response) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: "仅管理员可操作" });
    }

    const { id } = req.params;

    const db = getDb();
    const existing = db.prepare("SELECT * FROM model_applications WHERE id = ?").get(id);

    if (!existing) {
      return res.status(404).json({ success: false, message: "配置不存在" });
    }

    db.prepare("DELETE FROM model_applications WHERE id = ?").run(id);

    return res.json({ success: true, message: "删除成功" });
  } catch (error: any) {
    console.error("删除模型应用配置失败:", error);
    return res.status(500).json({ success: false, message: "删除失败", error: error.message });
  }
}

export async function getRecentActivity(req: Request, res: Response) {
  try {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const logs = db.prepare(
      `SELECT id, provider, model, call_type, total_tokens, status, error_message, request_summary, created_at
       FROM ai_usage_logs
       ORDER BY created_at DESC
       LIMIT ?`,
    ).all(limit) as any[];

    const alerts = db.prepare(
      `SELECT id, provider, alert_type, level, threshold, current_value, created_at
       FROM ai_alert_records
       ORDER BY created_at DESC
       LIMIT ?`,
    ).all(limit) as any[];

    const modelNameMap: Record<string, string> = {};
    const models = db.prepare("SELECT provider, name FROM ai_models").all() as any[];
    for (const m of models) {
      modelNameMap[m.provider] = m.name;
    }

    const items: any[] = [];

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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
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
    const db = getDb();
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize as string) || 20, 1), 100);
    const offset = (page - 1) * pageSize;
    const callType = req.query.callType as string | undefined;

    let whereClause = `WHERE call_type IN (${SMART_TOOL_CALL_TYPES.map(() => "?").join(", ")})`;
    const params: any[] = [...SMART_TOOL_CALL_TYPES];

    if (callType && SMART_TOOL_CALL_TYPES.includes(callType)) {
      whereClause += " AND call_type = ?";
      params.push(callType);
    }

    const totalResult = db.prepare(
      `SELECT COUNT(*) as total FROM ai_usage_logs ${whereClause}`,
    ).get(...params) as any;

    const logs = db.prepare(
      `SELECT id, provider, model, call_type, total_tokens, latency_ms, status, error_message, request_summary, created_at
       FROM ai_usage_logs ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
    ).all(...params, pageSize, offset) as any[];

    const modelInfoMap: Record<string, { name: string; model: string }> = {};
    const models = db.prepare("SELECT provider, name, model FROM ai_models").all() as any[];
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteSmartToolHistory(req: Request, res: Response) {
  try {
    const db = getDb();
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "缺少记录 ID" });
    }

    const userId = (req as AuthRequest).user?.userId;
    const record = db.prepare("SELECT id, user_id FROM ai_usage_logs WHERE id = ?").get(id) as any;
    
    if (!record) {
      return res.status(404).json({ success: false, message: "记录不存在" });
    }

    if (record.user_id && record.user_id !== userId && !isAdmin(req)) {
      return res.status(403).json({ success: false, message: "无权删除该记录" });
    }

    db.prepare("DELETE FROM ai_usage_logs WHERE id = ?").run(id);

    console.log(`[SmartTools] 已删除历史记录: id=${id}, operator=${userId}`);

    res.json({ success: true, message: "删除成功" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getPromptTemplates(req: Request, res: Response) {
  try {
    const db = getDb();
    const { module, type } = req.query;
    let sql = "SELECT * FROM ai_prompt_templates WHERE 1=1";
    const params: any[] = [];
    if (module) { sql += " AND module = ?"; params.push(module); }
    if (type) { sql += " AND type = ?"; params.push(type); }
    sql += " ORDER BY sort_order ASC, created_at DESC";
    const rows = db.prepare(sql).all(...params) as any[];
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createPromptTemplate(req: Request, res: Response) {
  try {
    const db = getDb();
    const userId = (req as AuthRequest).user?.userId;
    const { module, name, type, systemPrompt, userPromptTemplate, variables, isDefault, enabled, sortOrder } = req.body;
    if (!module || !name) {
      return res.status(400).json({ success: false, message: "模块和名称不能为空" });
    }
    const id = generateId();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO ai_prompt_templates (id, module, name, type, system_prompt, user_prompt_template, variables, is_default, enabled, sort_order, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        id, module, name, type || "description", systemPrompt || "", userPromptTemplate || "",
        JSON.stringify(variables || []), isDefault ? 1 : 0, enabled !== false ? 1 : 0,
        sortOrder || 0, userId || null, now, now
    );
    res.json(success({ id, module, name }));
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updatePromptTemplate(req: Request, res: Response) {
  try {
    const db = getDb();
    const { id } = req.params;
    const { module, name, type, systemPrompt, userPromptTemplate, variables, isDefault, enabled, sortOrder } = req.body;
    const existing = db.prepare("SELECT id FROM ai_prompt_templates WHERE id = ?").get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, message: "模板不存在" });
    }
    const now = new Date().toISOString();
    db.prepare(`UPDATE ai_prompt_templates SET module = COALESCE(?, module), name = COALESCE(?, name), type = COALESCE(?, type),
      system_prompt = COALESCE(?, system_prompt), user_prompt_template = COALESCE(?, user_prompt_template),
      variables = COALESCE(?, variables), is_default = COALESCE(?, is_default), enabled = COALESCE(?, enabled),
      sort_order = COALESCE(?, sort_order), updated_at = ? WHERE id = ?`).run(
        module || null, name || null, type || null, systemPrompt ?? null, userPromptTemplate ?? null,
        variables != null ? JSON.stringify(variables) : null, isDefault != null ? (isDefault ? 1 : 0) : null,
        enabled != null ? (enabled ? 1 : 0) : null, sortOrder ?? null, now, id
    );
    res.json(success({ id }));
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deletePromptTemplate(req: Request, res: Response) {
  try {
    const db = getDb();
    const { id } = req.params;
    const existing = db.prepare("SELECT id FROM ai_prompt_templates WHERE id = ?").get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, message: "模板不存在" });
    }
    db.prepare("DELETE FROM ai_prompt_templates WHERE id = ?").run(id);
    res.json(success({ id }));
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
