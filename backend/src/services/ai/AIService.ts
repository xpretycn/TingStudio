import crypto from "node:crypto";

export interface AIModelConfig {
  name: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  visionModel?: string;
  visionMaxTokens?: number;
  description: string;
  supportsVision: boolean;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | MessageContent[];
}

export interface MessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface ChatCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" };
  useVision?: boolean;
  callType?: string;
  userId?: string;
  requestSummary?: string;
  overrideModel?: string;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  fallbackFrom?: string;
}

export interface ModelVersionOption {
  value: string;
  label: string;
}

const PROVIDER_VERSIONS: Record<string, ModelVersionOption[]> = {
  dashscope: [
    { value: "qwen-plus", label: "Qwen Plus（通用）" },
    { value: "qwen-turbo", label: "Qwen Turbo（快速）" },
    { value: "qwen-max", label: "Qwen Max（旗舰）" },
    { value: "qwen-long", label: "Qwen Long（长文本）" },
  ],
  zhipu: [
    { value: "glm-4-flash", label: "GLM-4 Flash（快速）" },
    { value: "glm-4-air", label: "GLM-4 Air（均衡）" },
    { value: "glm-4-plus", label: "GLM-4 Plus（专业）" },
    { value: "glm-5", label: "GLM-5（最新）" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "V3 Chat（通用）" },
    { value: "deepseek-v4-flash", label: "V4 Flash（快速）" },
    { value: "deepseek-v4-pro", label: "V4 Pro（专业）" },
    { value: "deepseek-reasoner", label: "R1 推理（深度思考）" },
  ],
};

const DEFAULT_MODELS: AIModelConfig[] = [
  {
    name: "通义千问",
    provider: "dashscope",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey: process.env.AI_DASHSCOPE_API_KEY || "",
    model: process.env.AI_DASHSCOPE_MODEL || "qwen-plus",
    visionModel: process.env.AI_DASHSCOPE_VISION_MODEL || "qwen-vl-plus",
    description: "阿里云通义千问大模型",
    supportsVision: true,
  },
  {
    name: "智谱GLM",
    provider: "zhipu",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    apiKey: process.env.AI_ZHIPU_API_KEY || "",
    model: process.env.AI_ZHIPU_MODEL || "glm-4-flash",
    visionModel: process.env.AI_ZHIPU_VISION_MODEL || "glm-4v-flash",
    visionMaxTokens: 1024,
    description: "智谱AI GLM系列大模型",
    supportsVision: true,
  },
  {
    name: "DeepSeek",
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: process.env.AI_DEEPSEEK_API_KEY || "",
    model: process.env.AI_DEEPSEEK_MODEL || "deepseek-chat",
    description: "DeepSeek深度求索大模型",
    supportsVision: false,
  },
];

export class AIService {
  private models: AIModelConfig[];

  constructor(models?: AIModelConfig[]) {
    this.models = models || DEFAULT_MODELS;
  }

  getAvailableModels(): AIModelConfig[] {
    return this.models.filter(m => m.apiKey);
  }

  getAllModels(): AIModelConfig[] {
    return this.models.map(m => ({
      ...m,
      apiKey: m.apiKey ? "***configured***" : "",
    }));
  }

  getModel(provider: string): AIModelConfig | undefined {
    return this.models.find(m => m.provider === provider);
  }

  getAvailableVersions(provider: string): ModelVersionOption[] {
    if (PROVIDER_VERSIONS[provider]) {
      return PROVIDER_VERSIONS[provider];
    }
    const model = this.getModel(provider);
    if (model) {
      return [{ value: model.model, label: model.model }];
    }
    return [];
  }

  reloadModels(): void {
    try {
      const { getDb } = require("../config/database-better-sqlite3.js");
      const db = getDb();
      const rows = db
        .prepare(
          `
        SELECT m.*, f.fallback_provider
        FROM ai_models m
        LEFT JOIN ai_fallback_configs f ON m.id = f.model_id AND f.fallback_priority = 1 AND f.enabled = 1
        ORDER BY m.sort_order
      `,
        )
        .all();

      if (rows && rows.length > 0) {
        this.models = (rows as any[]).map(row => ({
          name: row.name,
          provider: row.provider,
          baseUrl: row.base_url,
          apiKey: row.api_key || "",
          model: row.model,
          visionModel: row.vision_model || undefined,
          visionMaxTokens: row.vision_max_tokens || undefined,
          description: row.description || "",
          supportsVision: !!row.supports_vision,
          _fallbackProvider: row.fallback_provider || undefined,
        }));
        console.log(`[AI] 已从数据库加载 ${this.models.length} 个模型配置`);
      }
    } catch (err) {
      console.warn("[AI] 从数据库加载模型失败，使用默认配置:", err);
    }
  }

  private async getFallbackProvider(provider: string): Promise<string | null> {
    try {
      const { getDb } = require("../config/database-better-sqlite3.js");
      const db = getDb();
      const row = db
        .prepare(
          `
        SELECT f.fallback_provider
        FROM ai_fallback_configs f
        JOIN ai_models m ON f.model_id = m.id
        WHERE m.provider = ? AND f.enabled = 1
        ORDER BY f.fallback_priority
        LIMIT 1
      `,
        )
        .get(provider) as any;
      return row?.fallback_provider || null;
    } catch {
      return null;
    }
  }

  private recordUsage(params: {
    provider: string;
    model: string;
    callType: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
    status: string;
    errorMessage?: string;
    requestSummary?: string;
    fallbackFrom?: string;
    userId?: string;
  }): void {
    try {
      const { getDb } = require("../config/database-better-sqlite3.js");
      const db = getDb();
      const id = `ul_${crypto.randomUUID().slice(0, 8)}`;
      db.prepare(
        `
        INSERT INTO ai_usage_logs (id, provider, model, call_type, prompt_tokens, completion_tokens, total_tokens, latency_ms, status, error_message, request_summary, fallback_from, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `,
      ).run(
        id,
        params.provider,
        params.model,
        params.callType,
        params.promptTokens,
        params.completionTokens,
        params.totalTokens,
        params.latencyMs,
        params.status,
        params.errorMessage || null,
        params.requestSummary || null,
        params.fallbackFrom || null,
        params.userId || null,
      );

      const { checkAndFireAlerts } = require("../controllers/modelController.js");
      checkAndFireAlerts(params.provider, params.totalTokens, db);
    } catch (err) {
      console.warn("[AI] 记录用量失败:", err);
    }
  }

  async chatCompletion(
    provider: string,
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {
    const modelConfig = this.getModel(provider);
    if (!modelConfig) {
      throw new Error(`未知的 AI 模型: ${provider}`);
    }
    if (!modelConfig.apiKey || modelConfig.apiKey === "***configured***") {
      throw new Error(`AI 模型 "${modelConfig.name}" 未配置 API Key，请在模型管理中配置`);
    }

    const start = Date.now();
    let result: ChatCompletionResult;
    let fallbackFrom: string | undefined;

    try {
      result = await this._doChatCompletion(modelConfig, messages, options);
    } catch (primaryError) {
      const fallbackProvider = await this.getFallbackProvider(provider);
      if (fallbackProvider && fallbackProvider !== provider) {
        const fallbackConfig = this.getModel(fallbackProvider);
        if (fallbackConfig && fallbackConfig.apiKey) {
          console.warn(`[AI] 主模型 ${provider} 失败，自动切换到备用模型 ${fallbackProvider}`);
          try {
            result = await this._doChatCompletion(fallbackConfig, messages, options);
            fallbackFrom = provider;
            provider = fallbackProvider;
          } catch {
            this.recordUsage({
              provider,
              model: modelConfig.model,
              callType: options?.callType || "unknown",
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
              latencyMs: Date.now() - start,
              status: "error",
              errorMessage: (primaryError as Error).message,
              requestSummary: options?.requestSummary,
              userId: options?.userId,
            });
            throw primaryError;
          }
        } else {
          throw primaryError;
        }
      } else {
        this.recordUsage({
          provider,
          model: modelConfig.model,
          callType: options?.callType || "unknown",
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          latencyMs: Date.now() - start,
          status: "error",
          errorMessage: (primaryError as Error).message,
          requestSummary: options?.requestSummary,
          userId: options?.userId,
        });
        throw primaryError;
      }
    }

    const latencyMs = Date.now() - start;
    const effectiveConfig = fallbackFrom ? this.getModel(provider)! : modelConfig;

    this.recordUsage({
      provider,
      model: result.model || effectiveConfig.model,
      callType: options?.callType || "unknown",
      promptTokens: result.usage?.promptTokens || 0,
      completionTokens: result.usage?.completionTokens || 0,
      totalTokens: result.usage?.totalTokens || 0,
      latencyMs,
      status: fallbackFrom ? "fallback" : "success",
      requestSummary: options?.requestSummary,
      fallbackFrom: fallbackFrom || undefined,
      userId: options?.userId,
    });

    if (fallbackFrom) {
      result.fallbackFrom = fallbackFrom;
    }

    return result;
  }

  private async _doChatCompletion(
    modelConfig: AIModelConfig,
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {
    const url = `${modelConfig.baseUrl}/chat/completions`;
    const useVisionModel = options?.useVision && modelConfig.visionModel;
    const effectiveModel = options?.overrideModel || (useVisionModel ? modelConfig.visionModel : modelConfig.model);

    const body: Record<string, unknown> = {
      model: effectiveModel,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens:
        options?.maxTokens ?? (useVisionModel && modelConfig.visionMaxTokens ? modelConfig.visionMaxTokens : 4096),
    };

    if (options?.responseFormat && !useVisionModel) {
      body.response_format = options.responseFormat;
    }

    const requestId = crypto.randomUUID();
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120_000);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${modelConfig.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          if (response.status === 429 && attempt < maxRetries) {
            await response.text();
            const retryAfter = response.headers.get("Retry-After");
            const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 3000 * Math.pow(2, attempt);
            console.warn(`[AI] 429 速率限制，第 ${attempt + 1}/${maxRetries} 次重试，等待 ${waitMs / 1000}s`);
            await new Promise(r => setTimeout(r, waitMs));
            continue;
          }
          const errorText = await response.text();
          throw new Error(`AI API 请求失败 (${response.status}): ${errorText}`);
        }

        const data = (await response.json()) as {
          id: string;
          choices: { message: { content: string } }[];
          model: string;
          usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
        };

        return {
          content: data.choices[0]?.message?.content || "",
          model: data.model,
          usage: data.usage
            ? {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
              }
            : undefined,
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error(`AI 请求超时 (requestId: ${requestId})，请稍后重试或切换模型`);
        }
        throw error;
      }
    }

    throw new Error(`AI 请求失败 (requestId: ${requestId})：已达最大重试次数`);
  }

  static parseJSONResponse(text: string): unknown {
    let cleaned = text.trim();

    const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      cleaned = jsonBlockMatch[1].trim();
    } else {
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
    }

    return JSON.parse(cleaned);
  }
}

export const aiService = new AIService();
