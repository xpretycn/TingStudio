import http from './http';

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
    return http.get<any, any>('/ai/parse-results', { params });
  },

  getDetail(id: string) {
    return http.get<any, any>(`/ai/parse-results/${id}`);
  },

  save(data: {
    callType: string;
    fileHash: string;
    fileName: string;
    fileSize: number;
    parsedResult: any;
    rawResponse: string;
    modelProvider?: string;
    modelName?: string;
    status?: string;
    errorMessage?: string;
  }) {
    return http.post<any, any>('/ai/parse-results', data);
  },

  delete(id: string) {
    return http.delete<any, any>(`/ai/parse-results/${id}`);
  },

  getStatistics() {
    return http.get<any, any>('/ai/parse-results/statistics');
  },

  check(fileHash: string, callType: string) {
    return http.post<any, any>('/ai/parse-results/check', { fileHash, callType });
  },

  markUsed(id: string, data: {
    linkedFormulaId?: string;
    linkedMaterialId?: string;
    incrementCount?: boolean;
  }) {
    return http.post<any, any>(`/ai/parse-results/${id}/mark-used`, data);
  },

  getConfig() {
    return http.get<any, any>('/ai/parse-results/config');
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
    return http.put<any, any>('/ai/parse-results/config', config);
  },

  cleanup(data: {
    beforeDate?: string;
    status?: string;
    dryRun?: boolean;
  }) {
    return http.post<any, any>('/ai/parse-results/cleanup', data);
  },

  getDegradation() {
    return http.get<any, any>('/ai/parse-results/degradation');
  },

  manualCleanup(data: { dryRun?: boolean }) {
    return http.post<any, any>('/ai/parse-results/manual-cleanup', data);
  },

  getLinkedFormula(id: string) {
    return http.get<any, any>(`/ai/parse-results/${id}/linked-formula`);
  },

  getLinkedMaterial(id: string) {
    return http.get<any, any>(`/ai/parse-results/${id}/linked-material`);
  },

  batchDelete(ids: string[]) {
    return http.post<any, any>('/ai/parse-results/batch-delete', { ids });
  },

  getMetrics(startDate?: string, endDate?: string) {
    return http.get<any, any>('/ai/parse-results/metrics', {
      params: { startDate, endDate }
    });
  },

  getAlerts() {
    return http.get<any, any>('/ai/parse-results/alerts');
  },

  getPerformance() {
    return http.get<any, any>('/ai/parse-results/performance');
  }
};
