import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { getDb } from "../config/database-better-sqlite3.js";
import { aiService } from "../services/ai/AIService.js";
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
          createdAt: l.created_at,
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
        records,
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
