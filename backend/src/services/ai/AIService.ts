import crypto from 'node:crypto'

// ─── AI 配置类型 ───

export interface AIModelConfig {
  name: string
  provider: 'dashscope' | 'zhipu' | 'deepseek'
  baseUrl: string
  apiKey: string
  model: string
  /** 多模态视觉模型（仅当 supportsVision=true 时有效） */
  visionModel?: string
  /** 视觉模型最大输出 token 数（部分免费视觉模型限制较低） */
  visionMaxTokens?: number
  description: string
  supportsVision: boolean
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | MessageContent[]
}

export interface MessageContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

export interface ChatCompletionOptions {
  temperature?: number
  maxTokens?: number
  responseFormat?: { type: 'json_object' }
  /** 强制使用视觉模型（多模态图片输入时） */
  useVision?: boolean
}

export interface ChatCompletionResult {
  content: string
  model: string
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
}

// ─── 默认模型配置（通过环境变量覆盖） ───

const DEFAULT_MODELS: AIModelConfig[] = [
  {
    name: '通义千问',
    provider: 'dashscope',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: process.env.AI_DASHSCOPE_API_KEY || '',
    model: process.env.AI_DASHSCOPE_MODEL || 'qwen-plus',
    visionModel: process.env.AI_DASHSCOPE_VISION_MODEL || 'qwen-vl-plus',
    description: '阿里云通义千问大模型',
    supportsVision: true,
  },
  {
    name: '智谱GLM',
    provider: 'zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKey: process.env.AI_ZHIPU_API_KEY || '',
    model: process.env.AI_ZHIPU_MODEL || 'glm-4-flash',
    visionModel: process.env.AI_ZHIPU_VISION_MODEL || 'glm-4v-flash',
    visionMaxTokens: 1024,
    description: '智谱AI GLM系列大模型',
    supportsVision: true,
  },
  {
    name: 'DeepSeek',
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: process.env.AI_DEEPSEEK_API_KEY || '',
    model: process.env.AI_DEEPSEEK_MODEL || 'deepseek-chat',
    description: 'DeepSeek深度求索大模型',
    supportsVision: false,
  },
]

// ─── AI 服务核心类 ───

export class AIService {
  private models: AIModelConfig[]

  constructor(models?: AIModelConfig[]) {
    this.models = models || DEFAULT_MODELS
  }

  /** 获取所有可用模型（有 API Key 的） */
  getAvailableModels(): AIModelConfig[] {
    return this.models.filter(m => m.apiKey)
  }

  /** 获取所有模型（含未配置的，前端用于展示） */
  getAllModels(): AIModelConfig[] {
    return this.models.map(m => ({
      ...m,
      apiKey: m.apiKey ? '***configured***' : '',
    }))
  }

  /** 按 provider 名称查找模型 */
  getModel(provider: string): AIModelConfig | undefined {
    return this.models.find(m => m.provider === provider)
  }

  /** 统一 OpenAI 兼容接口调用 */
  async chatCompletion(
    provider: string,
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {
    const modelConfig = this.getModel(provider)
    if (!modelConfig) {
      throw new Error(`未知的 AI 模型: ${provider}`)
    }
    if (!modelConfig.apiKey || modelConfig.apiKey === '***configured***') {
      throw new Error(`AI 模型 "${modelConfig.name}" 未配置 API Key，请在 .env 文件中设置 AI_${provider.toUpperCase()}_API_KEY`)
    }

    const url = `${modelConfig.baseUrl}/chat/completions`

    // 对视觉输入，切换到视觉模型（如 zhipu 的 glm-4v-flash）
    const useVisionModel = options?.useVision && modelConfig.visionModel
    const effectiveModel = useVisionModel ? modelConfig.visionModel : modelConfig.model

    const body: Record<string, unknown> = {
      model: effectiveModel,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens
        ?? (useVisionModel && modelConfig.visionMaxTokens
          ? modelConfig.visionMaxTokens
          : 4096),
    }

    // response_format: 视觉模型大多不支持，通过 prompt 引导即可
    if (options?.responseFormat && !useVisionModel) {
      body.response_format = options.responseFormat
    }

    const requestId = crypto.randomUUID()

    const maxRetries = 3
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 120_000)

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${modelConfig.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (!response.ok) {
          // 429 速率限制：指数退避重试（3s → 6s → 12s）
          if (response.status === 429 && attempt < maxRetries) {
            // 消费响应体，避免连接泄漏
            await response.text()
            const retryAfter = response.headers.get('Retry-After')
            const waitMs = retryAfter
              ? parseInt(retryAfter, 10) * 1000
              : 3000 * Math.pow(2, attempt) // 3s → 6s → 12s
            console.warn(`[AI] 429 速率限制，第 ${attempt + 1}/${maxRetries} 次重试，等待 ${waitMs / 1000}s`)
            await new Promise(r => setTimeout(r, waitMs))
            continue
          }
          const errorText = await response.text()
          throw new Error(`AI API 请求失败 (${response.status}): ${errorText}`)
        }

        const data = await response.json() as {
          id: string
          choices: { message: { content: string } }[]
          model: string
          usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
        }

        return {
          content: data.choices[0]?.message?.content || '',
          model: data.model,
          usage: data.usage
            ? {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
              }
            : undefined,
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`AI 请求超时 (requestId: ${requestId})，请稍后重试或切换模型`)
        }
        // 429 重试失败或非 429 错误，直接抛出
        throw error
      }
    }

    // 理论上不会到这里，但 TypeScript 需要
    throw new Error(`AI 请求失败 (requestId: ${requestId})：已达最大重试次数`)
  }

  /** 解析 AI 返回的 JSON（处理 markdown 代码块包裹、前后缀文字） */
  static parseJSONResponse(text: string): unknown {
    let cleaned = text.trim()

    // 1. 提取 markdown 代码块中的 JSON
    const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonBlockMatch) {
      cleaned = jsonBlockMatch[1].trim()
    } else {
      // 2. 尝试从混合文本中提取第一个完整的 JSON 对象
      const firstBrace = cleaned.indexOf('{')
      const lastBrace = cleaned.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1)
      }
    }

    return JSON.parse(cleaned)
  }
}

// 单例导出
export const aiService = new AIService()
