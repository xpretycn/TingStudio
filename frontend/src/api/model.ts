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

export interface ModelListResponse {
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
  total_calls: number;
  total_tokens: number;
  today_calls: number;
  today_tokens: number;
  month_calls: number;
  month_tokens: number;
  avg_latency_ms: number;
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
  createdAt: string;
}

export interface AlertConfigItem {
  id: string;
  model_id: string;
  provider: string;
  model_name: string;
  daily_call_limit: number;
  monthly_token_limit: number;
  warning_threshold: number;
  critical_threshold: number;
  enabled: number;
}

export interface AlertRecordItem {
  id: string;
  provider: string;
  model_name: string;
  alert_type: string;
  level: string;
  threshold: number;
  current_value: number;
  limit_value: number;
  message: string;
  is_read: number;
  created_at: string;
}

export interface HealthHistoryItem {
  date: string;
  checks: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  avg_latency_ms: number;
}

export const modelApi = {
  getModels() {
    return http.get<any, ModelListResponse>("/ai/models-manage");
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
    return http.post<any, any>("/ai/models-manage", data);
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
    return http.put<any, any>(`/ai/models-manage/${id}`, data);
  },

  deleteModel(id: string) {
    return http.delete<any, any>(`/ai/models-manage/${id}`);
  },

  testConnection(id: string) {
    return http.post<any, any>(`/ai/models-manage/${id}/test`);
  },

  getVersions(id: string) {
    return http.get<any, { provider: string; currentModel: string; versions: ModelVersionOption[] }>(
      `/ai/models-manage/${id}/versions`,
    );
  },

  getVersionsByProvider(provider: string) {
    return http.get<any, { provider: string; currentModel: string; versions: ModelVersionOption[] }>(
      `/ai/models/${provider}/versions`,
    );
  },

  switchVersion(provider: string, model: string) {
    return http.put<any, any>(`/ai/models/${provider}/version`, { model });
  },

  setFallback(id: string, fallbackProvider: string) {
    return http.put<any, any>(`/ai/models-manage/${id}/fallback`, { fallbackProvider });
  },

  getUsageStats(params?: { startDate?: string; endDate?: string; provider?: string }) {
    return http.get<
      any,
      { summary: UsageSummaryItem[]; trend: UsageTrendItem[]; distribution: UsageDistributionItem[] }
    >("/ai/usage", { params });
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
    return http.get<any, { logs: UsageLogItem[]; total: number; page: number; pageSize: number }>("/ai/usage/logs", {
      params,
    });
  },

  getAlertConfigs() {
    return http.get<any, { configs: AlertConfigItem[] }>("/ai/alerts/configs");
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
    return http.put<any, any>(`/ai/alerts/configs/${id}`, data);
  },

  getAlertRecords(params?: { page?: number; pageSize?: number; level?: string }) {
    return http.get<
      any,
      { records: AlertRecordItem[]; total: number; activeAlerts: number; page: number; pageSize: number }
    >("/ai/alerts/records", { params });
  },

  getHealthStatus() {
    return http.get<
      any,
      {
        models: Array<{
          provider: string;
          name: string;
          health_status: string;
          lastCheckAt: string | null;
          latencyMs: number | null;
        }>;
      }
    >("/ai/health");
  },

  getHealthHistory(provider: string, days?: number) {
    return http.get<any, { provider: string; history: HealthHistoryItem[] }>(`/ai/health/${provider}/history`, {
      params: { days },
    });
  },
};
