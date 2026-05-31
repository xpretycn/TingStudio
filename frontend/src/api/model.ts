import http from "./http";

export interface ModelItem {
  id: string;
  provider: string;
  name: string;
  baseUrl: string;
  apiKeyConfigured: boolean;
  model: string;
  visionModel: string;
  visionMaxTokens: number | null;
  description: string;
  supportsVision: boolean;
  healthStatus: "healthy" | "degraded" | "unhealthy" | "unknown";
  healthCheckIntervalDays: number;
  fallbackProvider: string;
  todayCalls: number;
  todayTokens: number;
  monthTokens: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ModelStats {
  totalModels: number;
  configuredModels: number;
  todayCalls: number;
  todayTokens: number;
  monthTokens: number;
  activeAlerts: number;
}

interface ModelListResponse {
  models: ModelItem[];
  stats: ModelStats;
}

export interface ModelVersionOption {
  value: string;
  label: string;
}

export interface UsageSummaryItem {
  provider: string;
  name: string;
  totalCalls: number;
  totalTokens: number;
  todayCalls: number;
  todayTokens: number;
  monthCalls: number;
  monthTokens: number;
  avgLatencyMs: number;
}

export interface UsageTrendItem {
  date: string;
  [provider: string]: string | number;
}

export interface UsageDistributionItem {
  provider: string;
  name: string;
  tokens: number;
  calls: number;
}

export interface UsageLogItem {
  id: string;
  provider: string;
  modelName: string;
  model: string;
  callType: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number | null;
  status: string;
  errorMessage: string | null;
  requestSummary: string | null;
  userId: string | null;
  fallbackFrom: string | null;
  applicationName: string | null;
  applicationLocation: string | null;
  createdAt: string;
}

export interface AlertConfigItem {
  id: string;
  modelId: string;
  provider: string;
  modelName: string;
  dailyCallLimit: number;
  monthlyTokenLimit: number;
  warningThreshold: number;
  criticalThreshold: number;
  enabled: number;
}

export interface AlertRecordItem {
  id: string;
  provider: string;
  modelName: string;
  alertType: string;
  level: string;
  threshold: number;
  currentValue: number;
  limitValue: number;
  message: string;
  isRead: number;
  createdAt: string;
}

export interface HealthHistoryItem {
  date: string;
  checks: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  avgLatencyMs: number;
}

export interface ActivityItem {
  type: "success" | "warning" | "error" | "info";
  title: string;
  desc: string;
  time: string;
  provider?: string;
}

export interface SmartToolHistoryItem {
  id: string;
  provider: string;
  callType: string;
  status: string;
  createdAt: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number | null;
  requestSummary?: string | null;
}

export interface ModelApplication {
  id: string;
  module: string;
  moduleName: string;
  provider: string;
  model: string;
  description: string;
  enabled: boolean | number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromptTemplate {
  id: string;
  module: string;
  name: string;
  type: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  isDefault: boolean;
  enabled: boolean;
  sortOrder: number;
}

function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function toCamelCase<T extends Record<string, unknown>>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toCamelCaseKey(key)] = value;
  }
  return result as T;
}

function toCamelCaseArray<T extends Record<string, unknown>>(arr: Record<string, unknown>[]): T[] {
  return arr.map(item => toCamelCase<T>(item));
}

export const modelApi = {
  getModels() {
    return http.get<unknown, ModelListResponse>("/ai/models-manage");
  },

  createModel(data: {
    provider: string;
    name: string;
    baseUrl: string;
    apiKey?: string;
    model: string;
    visionModel?: string;
    visionMaxTokens?: number;
    description?: string;
    supportsVision?: boolean;
    fallbackProvider?: string;
  }) {
    return http.post<unknown, ModelItem>("/ai/models-manage", data);
  },

  updateModel(
    id: string,
    data: {
      name?: string;
      baseUrl?: string;
      apiKey?: string;
      model?: string;
      visionModel?: string;
      visionMaxTokens?: number;
      description?: string;
      supportsVision?: boolean;
      fallbackProvider?: string;
      healthCheckIntervalDays?: number;
    },
  ) {
    return http.put<unknown, ModelItem>(`/ai/models-manage/${id}`, data);
  },

  deleteModel(id: string) {
    return http.delete<unknown, { success: boolean }>(`/ai/models-manage/${id}`);
  },

  testConnection(id: string) {
    return http.post<unknown, { success: boolean; message?: string }>(`/ai/models-manage/${id}/test`);
  },

  getVersions(id: string) {
    return http.get<unknown, { provider: string; currentModel: string; versions: ModelVersionOption[] }>(
      `/ai/models-manage/${id}/versions`,
    );
  },

  getVersionsByProvider(provider: string) {
    return http.get<unknown, { provider: string; currentModel: string; versions: ModelVersionOption[] }>(
      `/ai/models/${provider}/versions`,
    );
  },

  switchVersion(provider: string, model: string) {
    return http.put<unknown, { success: boolean }>(`/ai/models/${provider}/version`, { model });
  },

  setFallback(id: string, fallbackProvider: string) {
    return http.put<unknown, { success: boolean }>(`/ai/models-manage/${id}/fallback`, { fallbackProvider });
  },

  async getUsageStats(params?: { startDate?: string; endDate?: string; provider?: string }) {
    const res = await http.get<
      unknown,
      { summary: Record<string, unknown>[]; trend: UsageTrendItem[]; distribution: UsageDistributionItem[] }
    >("/ai/usage", { params });
    return {
      ...res,
      summary: toCamelCaseArray<UsageSummaryItem>(res.summary),
    };
  },

  getUsageLogs(params?: {
    page?: number;
    pageSize?: number;
    provider?: string;
    callType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return http.get<unknown, { logs: UsageLogItem[]; total: number; page: number; pageSize: number }>("/ai/usage/logs", {
      params,
    });
  },

  async getAlertConfigs() {
    const res = await http.get<unknown, { configs: Record<string, unknown>[] }>("/ai/alerts/configs");
    return { configs: toCamelCaseArray<AlertConfigItem>(res.configs) };
  },

  updateAlertConfig(
    id: string,
    data: {
      dailyCallLimit?: number;
      monthlyTokenLimit?: number;
      warningThreshold?: number;
      criticalThreshold?: number;
      enabled?: boolean;
    },
  ) {
    return http.put<unknown, { success: boolean }>(`/ai/alerts/configs/${id}`, data);
  },

  async getAlertRecords(params?: { page?: number; pageSize?: number; level?: string }) {
    const res = await http.get<
      unknown,
      { records: Record<string, unknown>[]; total: number; activeAlerts: number; page: number; pageSize: number }
    >("/ai/alerts/records", { params });
    return {
      ...res,
      records: toCamelCaseArray<AlertRecordItem>(res.records),
    };
  },

  async getHealthStatus() {
    const res = await http.get<
      unknown,
      { models: Record<string, unknown>[] }
    >("/ai/health");
    return {
      models: res.models.map(m => toCamelCase<{
        provider: string;
        name: string;
        healthStatus: string;
        lastCheckAt: string | null;
        latencyMs: number | null;
      }>(m)),
    };
  },

  async getHealthHistory(provider: string, days?: number) {
    const res = await http.get<unknown, { provider: string; history: Record<string, unknown>[] }>(`/ai/health/${provider}/history`, {
      params: { days },
    });
    return {
      ...res,
      history: toCamelCaseArray<HealthHistoryItem>(res.history),
    };
  },

  getRecentActivity(limit?: number) {
    return http.get<unknown, { items: ActivityItem[] }>("/ai/recent-activity", { params: { limit } });
  },

  async getSmartToolHistory(params?: { page?: number; pageSize?: number; callType?: string }) {
    const res = await http.get<unknown, { items?: Record<string, unknown>[]; list?: Record<string, unknown>[]; total?: number; page?: number; pageSize?: number }>("/ai/smart-tool-history", { params });
    const rawList = res.items || res.list || [];
    return {
      ...res,
      items: toCamelCaseArray<SmartToolHistoryItem>(rawList),
    };
  },

  deleteSmartToolHistory(id: string) {
    return http.delete<unknown, { success: boolean }>(`/ai/smart-tool-history/${id}`);
  },

  async getModelApplications() {
    const res = await http.get<unknown, Record<string, unknown>[]>("/ai/model-applications");
    return toCamelCaseArray<ModelApplication>(Array.isArray(res) ? res : []);
  },

  async createModelApplication(data: {
    module: string;
    provider: string;
    model: string;
    description?: string;
    enabled?: boolean;
  }) {
    const res = await http.post<unknown, { success: boolean; data: Record<string, unknown> }>("/ai/model-applications", data);
    return {
      success: res.success,
      data: toCamelCase<ModelApplication>(res.data),
    };
  },

  updateModelApplication(
    id: string,
    data: {
      provider?: string;
      model?: string;
      description?: string;
      enabled?: boolean;
    },
  ) {
    return http.put<unknown, { success: boolean }>(`/ai/model-applications/${id}`, data);
  },

  patchModelApplication(
    id: string,
    data: { enabled?: boolean },
  ) {
    return http.patch<unknown, { success: boolean }>(`/ai/model-applications/${id}`, data);
  },

  deleteModelApplication(id: string) {
    return http.delete<unknown, { success: boolean }>(`/ai/model-applications/${id}`);
  },

  async getPromptTemplates(params?: { module?: string }) {
    const res = await http.get<unknown, Record<string, unknown>[]>("/ai/prompt-templates", { params });
    return toCamelCaseArray<PromptTemplate>(Array.isArray(res) ? res : []);
  },

  async createPromptTemplate(data: {
    module: string;
    name: string;
    type: string;
    systemPrompt?: string;
    userPromptTemplate?: string;
    variables?: string[];
    isDefault?: boolean;
    enabled?: boolean;
    sortOrder?: number;
  }) {
    const res = await http.post<unknown, { success: boolean; data: Record<string, unknown> }>("/ai/prompt-templates", data);
    return {
      success: res.success,
      data: toCamelCase<PromptTemplate>(res.data),
    };
  },

  async updatePromptTemplate(
    id: string,
    data: {
      module?: string;
      name?: string;
      type?: string;
      systemPrompt?: string;
      userPromptTemplate?: string;
      variables?: string[];
      isDefault?: boolean;
      enabled?: boolean;
      sortOrder?: number;
    },
  ) {
    return http.put<unknown, { success: boolean }>(`/ai/prompt-templates/${id}`, data);
  },

  deletePromptTemplate(id: string) {
    return http.delete<unknown, { success: boolean }>(`/ai/prompt-templates/${id}`);
  },
};
