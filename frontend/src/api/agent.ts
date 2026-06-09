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
  tool_calls: Record<string, unknown>[] | null;
  tool_results: Record<string, unknown>[] | null;
  display_type: string | null;
  metadata: Record<string, unknown>;
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
  usage?: Record<string, unknown>;
  model?: string;
  toolCalls?: Record<string, unknown>[];
  toolResults?: Record<string, unknown>[];
  assistantMessage?: string;
  error?: string;
}

export interface AgentRoleConfig {
  id: string;
  user_id: string;
  agent_name: string;
  user_title: string;
  greeting: string;
  tone_style: string;
  custom_instructions: string;
  updated_at: string;
  created_at: string;
}

export interface AgentFloatConfig {
  id: string;
  userId: string;
  enabled: boolean;
  model: string;
  modelName: string;
  fallbackModel: string;
  fallbackModelName: string;
  position: "right" | "left";
  drawerWidth: number;
  themeColor: string;
  showPulse: boolean;
  enabledPages: string[];
  maxRounds: number;
  fillStrategy: "overwrite" | "preserve";
  contextMode: "page" | "clear";
  updatedAt: string;
  createdAt: string;
}

export interface ParseFormRequest {
  pageId: string;
  utterance: string;
  context?: Array<{ role: "user" | "assistant"; content: string }>;
  sessionId?: string;
}

export interface ParseFormResponse {
  fields: Record<string, unknown>;
  missingFields: string[];
  message: string;
  sessionId: string;
}

interface FieldHintsResult {
  missingFields: string[];
  hints: Record<string, unknown>[];
  count: number;
}

export const agentApi = {
  getSessions() {
    return http.get<unknown, AgentSession[]>("/agent/sessions");
  },

  getSessionMessages(sessionId: string) {
    return http.get<unknown, { id: string; messages: AgentMessage[] }>(
      `/agent/sessions/${sessionId}`,
    );
  },

  deleteSession(sessionId: string) {
    return http.delete<unknown, { success: boolean }>(`/agent/sessions/${sessionId}`);
  },

  chat(params: ChatRequest) {
    return http.post<unknown, ChatResponse>("/agent/chat", {
      message: params.message,
      sessionId: params.sessionId,
      stream: params.stream ?? false,
      confirmed: params.confirmed ?? false,
      model: params.model,
    });
  },

  getRoleConfig() {
    return http.get<unknown, AgentRoleConfig>("/agent/role-config");
  },

  updateRoleConfig(data: Partial<AgentRoleConfig>) {
    return http.put<unknown, AgentRoleConfig>("/agent/role-config", data);
  },

  getFloatConfig() {
    return http.get<unknown, AgentFloatConfig>("/agent/float-config");
  },

  updateFloatConfig(data: Partial<AgentFloatConfig>) {
    const payload: Record<string, unknown> = {};
    if (data.enabled !== undefined) payload.enabled = data.enabled;
    if (data.model !== undefined) payload.model = data.model;
    if (data.modelName !== undefined) payload.model_name = data.modelName;
    if (data.fallbackModel !== undefined) payload.fallback_model = data.fallbackModel;
    if (data.fallbackModelName !== undefined) payload.fallback_model_name = data.fallbackModelName;
    if (data.position !== undefined) payload.position = data.position;
    if (data.drawerWidth !== undefined) payload.drawer_width = data.drawerWidth;
    if (data.themeColor !== undefined) payload.theme_color = data.themeColor;
    if (data.showPulse !== undefined) payload.show_pulse = data.showPulse;
    if (data.enabledPages !== undefined) payload.enabled_pages = data.enabledPages;
    if (data.maxRounds !== undefined) payload.max_rounds = data.maxRounds;
    if (data.fillStrategy !== undefined) payload.fill_strategy = data.fillStrategy;
    if (data.contextMode !== undefined) payload.context_mode = data.contextMode;
    return http.put<unknown, AgentFloatConfig>("/agent/float-config", payload);
  },
  parseForm(params: ParseFormRequest) {
    return http.post<unknown, ParseFormResponse>("/agent/parse-form", params);
  },

  floatChat(params: ParseFormRequest) {
    return http.post<unknown, Record<string, unknown>>("/agent/float-chat", params);
  },

  generateDescription(data: {
    formulaName: string;
    materials?: Record<string, unknown>[];
    finishedWeight?: number;
    revisionReason?: string;
    existingDescription?: string;
    type?: "description" | "preparation" | "version_reason";
  }) {
    return http.post<unknown, { content: string; type: string }>(
      "/agent/generate-description", data,
    );
  },

  getFieldHints(pageId: string) {
    return http.get<unknown, FieldHintsResult>(
      "/agent/field-hints", { params: { pageId } },
    );
  },

  getHealth() {
    return http.get<unknown, { status: string }>("/agent/health");
  },
};
