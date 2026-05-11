import { AIService, type ChatMessage, type ChatCompletionOptions } from "../AIService.js";
import type { LLMRequest, LLMResponse, ToolDefinition } from "../../types/ai.js";

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

        const messages = request.messages.map(m => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : m.content,
        }));

        const result = await this.aiService.chatCompletion(provider, messages as ChatMessage[], options);

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
  ): Promise<LLMResponse> {
    for (const provider of this.fallbackChain) {
      try {
        const modelConfig = this.aiService.getModel(provider);
        if (!modelConfig?.apiKey) continue;

        const messages = request.messages.map(m => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : m.content,
        }));

        const fullContent = await this.aiService.streamChat(
          provider,
          messages as ChatMessage[],
          {
            temperature: request.temperature ?? 0.7,
            maxTokens: request.max_tokens ?? 2000,
            callType: "agent_chat",
            requestSummary: `Agent对话: ${((request.messages[request.messages.length - 1]?.content as string) || "").substring(0, 50)}`,
          } as ChatCompletionOptions,
          onChunk,
          onToolCall,
        );

        return {
          id: `streamcmpl-${Date.now()}`,
          content: fullContent,
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          model: modelConfig.model,
        };
      } catch (error) {
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
