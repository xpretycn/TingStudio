import { AIService, type ChatMessage, type ChatCompletionOptions } from "../AIService.js";
import type { LLMRequest, LLMResponse } from "../../../types/ai.js";

interface ProviderHealth {
  provider: string;
  consecutiveFailures: number;
  circuitOpen: boolean;
  circuitOpenUntil: number;
  lastError?: string;
}

class TimeoutError extends Error {
  constructor(provider: string, timeoutMs: number) {
    super(`Provider ${provider} timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, provider: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(provider, ms)), ms);
    promise.then(
      val => {
        clearTimeout(timer);
        resolve(val);
      },
      err => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export class LLMAgentService {
  private aiService: AIService;
  private fallbackChain: string[];
  private providerHealth: Map<string, ProviderHealth> = new Map();
  private readonly MAX_RETRIES = 2;
  private readonly TIMEOUT_MS = 30000;
  private readonly CIRCUIT_THRESHOLD = 3;
  private readonly CIRCUIT_RESET_MS = 300000;

  constructor(aiService: AIService) {
    this.aiService = aiService;
    this.fallbackChain = ["deepseek", "dashscope", "zhipu"];
  }

  private getOrCreateHealth(provider: string): ProviderHealth {
    if (!this.providerHealth.has(provider)) {
      this.providerHealth.set(provider, {
        provider,
        consecutiveFailures: 0,
        circuitOpen: false,
        circuitOpenUntil: 0,
      });
    }
    return this.providerHealth.get(provider)!;
  }

  private recordSuccess(provider: string): void {
    const health = this.getOrCreateHealth(provider);
    health.consecutiveFailures = 0;
    health.circuitOpen = false;
    health.circuitOpenUntil = 0;
  }

  private recordFailure(provider: string, error: any): void {
    const health = this.getOrCreateHealth(provider);
    health.consecutiveFailures++;
    health.lastError = error?.message || String(error);
    if (health.consecutiveFailures >= this.CIRCUIT_THRESHOLD) {
      health.circuitOpen = true;
      health.circuitOpenUntil = Date.now() + this.CIRCUIT_RESET_MS;
      console.warn(`[LLMAgent] Provider ${provider} 熔断开启，${this.CIRCUIT_RESET_MS / 1000}s后恢复`);
    }
  }

  private getHealthyProviders(preferred?: string): string[] {
    const all = preferred ? [preferred, ...this.fallbackChain.filter(p => p !== preferred)] : [...this.fallbackChain];

    return all.filter(p => {
      const health = this.providerHealth.get(p);
      if (!health) return true;
      if (health.circuitOpen && Date.now() < health.circuitOpenUntil) return false;
      if (health.circuitOpen && Date.now() >= health.circuitOpenUntil) {
        health.circuitOpen = false;
        health.circuitOpenUntil = 0;
        return true;
      }
      return true;
    });
  }

  async chat(request: LLMRequest, preferredProvider?: string, modelVersion?: string): Promise<LLMResponse> {
    const providers = this.getHealthyProviders(preferredProvider);

    for (const provider of providers) {
      for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          const modelConfig = this.aiService.getModel(provider);
          if (!modelConfig?.apiKey) break;

          const options: ChatCompletionOptions = {
            temperature: request.temperature ?? 0.7,
            maxTokens: request.max_tokens ?? 2000,
            callType: "agent_chat",
            requestSummary: `Agent对话: ${((request.messages[request.messages.length - 1]?.content as string) || "").substring(0, 50)}`,
            overrideModel: modelVersion,
          };

          const messages = request.messages.map((m: LLMRequest["messages"][number]) => {
            const msg: Record<string, unknown> = {
              role: m.role,
              content: typeof m.content === "string" ? m.content : m.content,
            };
            if (m.tool_calls) {
              msg.tool_calls = m.tool_calls;
            }
            if (m.tool_call_id) {
              msg.tool_call_id = m.tool_call_id;
            }
            return msg;
          }) as unknown as ChatMessage[];

          const result = await withTimeout(
            this.aiService.chatCompletion(provider, messages, options),
            this.TIMEOUT_MS,
            provider,
          );

          this.recordSuccess(provider);

          return {
            id: `chatcmpl-${Date.now()}`,
            content: result.content,
            usage: {
              prompt_tokens: result.usage?.promptTokens ?? 0,
              completion_tokens: result.usage?.completionTokens ?? 0,
              total_tokens: result.usage?.totalTokens ?? 0,
            },
            model: result.model || modelConfig.model,
          };
        } catch (error) {
          this.recordFailure(provider, error);
          if (attempt < this.MAX_RETRIES && error instanceof TimeoutError) {
            console.warn(`[LLMAgent] Provider ${provider} 超时，重试 ${attempt + 1}/${this.MAX_RETRIES}`);
            continue;
          }
          console.error(`[LLMAgent] Provider ${provider} failed:`, error);
          break;
        }
      }
    }

    throw new Error("所有LLM服务暂不可用，请稍后重试");
  }

  async streamChat(
    request: LLMRequest,
    onChunk: (chunk: string) => void,
    onToolCall?: (toolCall: { id: string; name: string; arguments: string }) => void,
    preferredProvider?: string,
    modelVersion?: string,
  ): Promise<LLMResponse> {
    const requestSummary = `Agent对话: ${((request.messages[request.messages.length - 1]?.content as string) || "").substring(0, 50)}`;
    const providers = this.getHealthyProviders(preferredProvider);

    for (const provider of providers) {
      const modelConfig = this.aiService.getModel(provider);
      if (!modelConfig?.apiKey) continue;

      for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
        const startTime = Date.now();
        try {
          const messages = request.messages.map((m: LLMRequest["messages"][number]) => {
            const msg: Record<string, unknown> = {
              role: m.role,
              content: typeof m.content === "string" ? m.content : m.content,
            };
            if (m.tool_calls) {
              msg.tool_calls = m.tool_calls;
            }
            if (m.tool_call_id) {
              msg.tool_call_id = m.tool_call_id;
            }
            return msg;
          }) as unknown as ChatMessage[];

          const streamResult = await withTimeout(
            this.aiService.streamChat(
              provider,
              messages,
              {
                temperature: request.temperature ?? 0.7,
                maxTokens: request.max_tokens ?? 2000,
                callType: "agent_chat",
                requestSummary,
                overrideModel: modelVersion,
                tools: request.tools,
              } as ChatCompletionOptions,
              onChunk,
              onToolCall,
            ),
            this.TIMEOUT_MS * 3,
            provider,
          );

          const fullContent = streamResult.content;
          const latencyMs = Date.now() - startTime;
          const usage = streamResult.usage;
          const promptTokens = usage?.promptTokens || 0;
          const completionTokens = usage?.completionTokens || Math.ceil(fullContent.length / 4);
          const totalTokens = usage?.totalTokens || promptTokens + completionTokens;

          this.recordSuccess(provider);

          this.aiService.recordUsage({
            provider,
            model: modelConfig.model,
            callType: "agent_chat",
            promptTokens,
            completionTokens,
            totalTokens,
            latencyMs,
            status: "success",
            requestSummary,
          });

          return {
            id: `streamcmpl-${Date.now()}`,
            content: fullContent,
            usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens },
            model: modelConfig.model,
          };
        } catch (error) {
          const latencyMs = Date.now() - startTime;
          this.recordFailure(provider, error);

          this.aiService.recordUsage({
            provider,
            model: modelConfig.model,
            callType: "agent_chat",
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            latencyMs,
            status: "error",
            errorMessage: (error as Error).message,
            requestSummary,
          });

          if (attempt < this.MAX_RETRIES && error instanceof TimeoutError) {
            console.warn(`[LLMAgent Stream] Provider ${provider} 超时，重试 ${attempt + 1}/${this.MAX_RETRIES}`);
            continue;
          }
          console.error(`[LLMAgent Stream] Provider ${provider} failed:`, error);
          break;
        }
      }
    }

    throw new Error("所有LLM服务暂不可用，请稍后重试");
  }

  setFallbackChain(chain: string[]): void {
    this.fallbackChain = chain;
  }

  getFallbackChain(): string[] {
    return [...this.fallbackChain];
  }

  getProviderHealthStatus(): Array<{
    provider: string;
    circuitOpen: boolean;
    consecutiveFailures: number;
    lastError?: string;
  }> {
    return Array.from(this.providerHealth.values()).map(h => ({
      provider: h.provider,
      circuitOpen: h.circuitOpen,
      consecutiveFailures: h.consecutiveFailures,
      lastError: h.lastError,
    }));
  }
}

export let llmAgentService: LLMAgentService;

export function initializeLLMAgentService(aiService: AIService): void {
  llmAgentService = new LLMAgentService(aiService);
}
