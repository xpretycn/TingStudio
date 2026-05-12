import { AIService, type ChatMessage, type ChatCompletionOptions } from "../AIService.js";
import type { LLMRequest, LLMResponse } from "../../../types/ai.js";

export class LLMAgentService {
  private aiService: AIService;
  private fallbackChain: string[];

  constructor(aiService: AIService) {
    this.aiService = aiService;
    this.fallbackChain = ["deepseek", "dashscope", "zhipu"];
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    for (const provider of this.fallbackChain) {
      try {
        const modelConfig = this.aiService.getModel(provider);
        if (!modelConfig?.apiKey) continue;

        const options: ChatCompletionOptions = {
          temperature: request.temperature ?? 0.7,
          maxTokens: request.max_tokens ?? 2000,
          callType: "agent_chat",
          requestSummary: `Agent对话: ${((request.messages[request.messages.length - 1]?.content as string) || "").substring(0, 50)}`,
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
        }) as ChatMessage[];

        const result = await this.aiService.chatCompletion(provider, messages, options);

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
        console.error(`[LLMAgent] Provider ${provider} failed:`, error);
        continue;
      }
    }

    throw new Error("All LLM providers unavailable");
  }

  async streamChat(
    request: LLMRequest,
    onChunk: (chunk: string) => void,
    onToolCall?: (toolCall: { id: string; name: string; arguments: string }) => void,
    preferredProvider?: string,
    modelVersion?: string,
  ): Promise<LLMResponse> {
    const requestSummary = `Agent对话: ${((request.messages[request.messages.length - 1]?.content as string) || "").substring(0, 50)}`;

    const providers = preferredProvider
      ? [preferredProvider, ...this.fallbackChain.filter(p => p !== preferredProvider)]
      : this.fallbackChain;

    for (const provider of providers) {
      const startTime = Date.now();
      const modelConfig = this.aiService.getModel(provider);
      if (!modelConfig?.apiKey) continue;

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
        }) as ChatMessage[];

        const fullContent = await this.aiService.streamChat(
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
        );

        const latencyMs = Date.now() - startTime;
        const estimatedTokens = Math.ceil(fullContent.length / 4);
        this.aiService.recordUsage({
          provider,
          model: modelConfig.model,
          callType: "agent_chat",
          promptTokens: 0,
          completionTokens: estimatedTokens,
          totalTokens: estimatedTokens,
          latencyMs,
          status: "success",
          requestSummary,
        });

        return {
          id: `streamcmpl-${Date.now()}`,
          content: fullContent,
          usage: { prompt_tokens: 0, completion_tokens: estimatedTokens, total_tokens: estimatedTokens },
          model: modelConfig.model,
        };
      } catch (error) {
        const latencyMs = Date.now() - startTime;
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
        console.error(`[LLMAgent Stream] Provider ${provider} failed:`, error);
        continue;
      }
    }

    throw new Error("All LLM streaming providers unavailable");
  }

  setFallbackChain(chain: string[]): void {
    this.fallbackChain = chain;
  }

  getFallbackChain(): string[] {
    return [...this.fallbackChain];
  }
}

export let llmAgentService: LLMAgentService;

export function initializeLLMAgentService(aiService: AIService): void {
  llmAgentService = new LLMAgentService(aiService);
}
