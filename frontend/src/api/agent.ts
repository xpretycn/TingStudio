import http from "./http";

export interface AgentSession {
  id: string;
  user_id: string;
  title: string;
  message_count: number;
  last_intent: string | null;
  last_active_at: string;
  created_at: string;
}

export interface AgentMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  intent: string | null;
  tool_calls: any[] | null;
  tool_results: any[] | null;
  display_type: string | null;
  metadata: any;
  created_at: string;
}

export interface ChatRequest {
  message: string;
  sessionId?: string | null;
  stream?: boolean;
  confirmed?: boolean;
  model?: string;
}

export interface ChatResponse {
  success: boolean;
  type?: string;
  content?: string;
  sessionId?: string;
  usage?: any;
  model?: string;
  toolCalls?: any[];
  toolResults?: any[];
  assistantMessage?: string;
  error?: string;
}

export const agentApi = {
  getSessions() {
    return http.get<any, { success: boolean; data: AgentSession[] }>("/agent/sessions");
  },

  getSessionMessages(sessionId: string) {
    return http.get<any, { success: boolean; data: { id: string; messages: AgentMessage[] } }>(
      `/agent/sessions/${sessionId}`
    );
  },

  deleteSession(sessionId: string) {
    return http.delete<any, { success: boolean }>(`/agent/sessions/${sessionId}`);
  },

  chat(params: ChatRequest) {
    return http.post<any, ChatResponse>("/agent/chat", {
      message: params.message,
      sessionId: params.sessionId,
      stream: params.stream ?? false,
      confirmed: params.confirmed ?? false,
      model: params.model,
    });
  },
};
