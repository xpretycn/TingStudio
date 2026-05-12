export interface LLMRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | MessageContent[];
    tool_call_id?: string;
    tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  }>;
  tools?: ToolDefinition[];
  temperature?: number;
  max_tokens?: number;
}

export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMResponse {
  id: string;
  content: string | null;
  tool_calls?: Array<{
    id: string;
    name: string;
    arguments: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export interface ToolContext {
  userId: string;
  userRole: string;
  sessionId: string;
  requestId: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}
