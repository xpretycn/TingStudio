import http from './http';
import type { Pagination } from './http';

export interface ParseResultItem {
  id: string;
  callType: string;
  fileHash: string;
  fileName: string;
  fileSize: number;
  parsedResult: Record<string, unknown>;
  rawResponse: string;
  modelProvider: string;
  modelName: string;
  status: string;
  errorMessage: string | null;
  isLinked: boolean;
  linkedFormulaId: string | null;
  linkedMaterialId: string | null;
  useCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ParseResultStatistics {
  total: number;
  linked: number;
  unlinked: number;
  totalSize: number;
}

export interface ParseResultConfig {
  storageLimit: number;
  cleanupThresholdPercent: number;
  cleanupBatchPercent: number;
  maxFileSizeBytes: number;
  fileRetentionDays: number;
  fileStorageLimitBytes: number;
  fileStorageAlertPercent: number;
}

export interface DegradationInfo {
  level: "normal" | "degraded" | "熔断";
  reason: string;
  recommendations: string[];
  systemStatus: {
    totalCount: number;
    storageLimit: number;
    usagePercent: number;
    cleanupThreshold: number;
    isOverThreshold: boolean;
  };
  isDegraded?: boolean;
  fallbackProvider?: string | null;
}

interface ParseResultMetrics {
  totalCalls: number;
  successRate: number;
  averageDuration: number;
  byProvider: Record<string, unknown>;
  byModel: Record<string, unknown>;
}

export interface ParseResultAlert {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface ParseResultPerformance {
  averageDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  byProvider: Record<string, unknown>;
}

export const parseResultApi = {
  list(params?: {
    page?: number;
    pageSize?: number;
    callType?: string;
    status?: string;
    fileName?: string;
    startDate?: string;
    endDate?: string;
    keyword?: string;
    modelProvider?: string;
    modelName?: string;
    isLinked?: boolean | null;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    return http.get<unknown, { list: ParseResultItem[]; pagination: Pagination }>('/ai/parse-results', { params });
  },

  getDetail(id: string) {
    return http.get<unknown, ParseResultItem>(`/ai/parse-results/${id}`);
  },

  save(data: {
    callType: string;
    fileHash: string;
    fileName: string;
    fileSize: number;
    parsedResult: Record<string, unknown>;
    rawResponse: string;
    modelProvider?: string;
    modelName?: string;
    status?: string;
    errorMessage?: string;
  }) {
    return http.post<unknown, ParseResultItem>('/ai/parse-results', data);
  },

  delete(id: string) {
    return http.delete<unknown, { success: boolean; message: string }>(`/ai/parse-results/${id}`);
  },

  getStatistics() {
    return http.get<unknown, ParseResultStatistics>('/ai/parse-results/statistics');
  },

  check(fileHash: string, callType: string) {
    return http.post<unknown, { exists: boolean; id?: string }>('/ai/parse-results/check', { fileHash, callType });
  },

  markUsed(id: string, data: {
    linkedFormulaId?: string;
    linkedMaterialId?: string;
    incrementCount?: boolean;
  }) {
    return http.post<unknown, { success: boolean; message: string }>(`/ai/parse-results/${id}/mark-used`, data);
  },

  getConfig() {
    return http.get<unknown, ParseResultConfig>('/ai/parse-results/config');
  },

  updateConfig(config: {
    storageLimit?: number;
    cleanupThresholdPercent?: number;
    cleanupBatchPercent?: number;
    maxFileSizeBytes?: number;
    fileRetentionDays?: number;
    fileStorageLimitBytes?: number;
    fileStorageAlertPercent?: number;
  }) {
    return http.put<unknown, ParseResultConfig>('/ai/parse-results/config', config);
  },

  cleanup(data: {
    beforeDate?: string;
    status?: string;
    dryRun?: boolean;
  }) {
    return http.post<unknown, { deleted: number; freedBytes: number }>('/ai/parse-results/cleanup', data);
  },

  getDegradation() {
    return http.get<unknown, DegradationInfo>('/ai/parse-results/degradation');
  },

  manualCleanup(data: { dryRun?: boolean }) {
    return http.post<unknown, { deleted: number; freedBytes: number }>('/ai/parse-results/manual-cleanup', data);
  },

  getLinkedFormula(id: string) {
    return http.get<unknown, Record<string, unknown>>(`/ai/parse-results/${id}/linked-formula`);
  },

  getLinkedMaterial(id: string) {
    return http.get<unknown, Record<string, unknown>>(`/ai/parse-results/${id}/linked-material`);
  },

  batchDelete(ids: string[]) {
    return http.post<unknown, { deleted: number; failed: number }>('/ai/parse-results/batch-delete', { ids });
  },

  getMetrics(startDate?: string, endDate?: string) {
    return http.get<unknown, ParseResultMetrics>('/ai/parse-results/metrics', {
      params: { startDate, endDate }
    });
  },

  getAlerts() {
    return http.get<unknown, { alerts: ParseResultAlert[] }>('/ai/parse-results/alerts');
  },

  getPerformance() {
    return http.get<unknown, ParseResultPerformance>('/ai/parse-results/performance');
  }
};
