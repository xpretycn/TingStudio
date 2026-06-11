import http from "./http";

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
  updatedAt: string;
  createdAt: string;
}

interface FieldHintsResult {
  missingFields: string[];
  hints: Record<string, unknown>[];
  count: number;
}

export const agentApi = {
  getFloatConfig() {
    return http.get<unknown, AgentFloatConfig>("/agent/float-config");
  },

  updateFloatConfig(data: Record<string, unknown>) {
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
    return http.put<unknown, AgentFloatConfig>("/agent/float-config", payload);
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
