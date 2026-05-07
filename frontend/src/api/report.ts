import http from "./http";

export interface Report {
  id: string;
  type: 'weekly' | 'monthly';
  title: string;
  periodStart: string;
  periodEnd: string;
  status: 'draft' | 'published' | 'archived';
  dataJson: any;
  generatedBy: 'auto' | 'manual';
  createdBy: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

export interface ReportGenerateForm {
  type: 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  includePlans?: boolean;
  includeAIAnalysis?: boolean;
}

export interface ReportFilters {
  type?: 'weekly' | 'monthly' | 'all';
  status?: 'draft' | 'published' | 'archived' | 'all';
  startDate?: string;
  endDate?: string;
  generatedBy?: 'auto' | 'manual' | 'all';
}

export interface ReportTarget {
  id: string;
  periodType: 'quarterly' | 'yearly';
  periodStart: string;
  periodEnd: string;
  targetsJson: any;
  createdBy: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
}

export const reportApi = {
  getList(params?: ReportFilters & { page?: number; pageSize?: number }) {
    return http.get<any, { list: Report[]; pagination: any }>("/reports", { params });
  },
  getById(id: string) {
    return http.get<any, Report>(`/reports/${id}`);
  },
  generate(data: ReportGenerateForm) {
    return http.post<any, Report>("/reports/generate", data);
  },
  update(id: string, data: Partial<{ title: string; dataJson: any; status: string }>) {
    return http.put<any, Report>(`/reports/${id}`, data);
  },
  delete(id: string) {
    return http.delete<any, { message: string }>(`/reports/${id}`);
  },
  publish(id: string) {
    return http.post<any, Report>(`/reports/${id}/publish`);
  },
  getWeeklyData(params: { periodStart: string; periodEnd: string }) {
    return http.get<any, any>("/reports/data/weekly", { params });
  },
  getMonthlyData(params: { periodStart: string; periodEnd: string }) {
    return http.get<any, any>("/reports/data/monthly", { params });
  },
  getTargetList(params?: { periodType?: string }) {
    return http.get<any, ReportTarget[]>("/reports/targets", { params });
  },
  createTarget(data: { periodType: string; periodStart: string; periodEnd: string; targetsJson?: any }) {
    return http.post<any, ReportTarget>("/reports/targets", data);
  },
  updateTarget(id: string, data: Partial<ReportTarget>) {
    return http.put<any, ReportTarget>(`/reports/targets/${id}`, data);
  },
  deleteTarget(id: string) {
    return http.delete<any, { message: string }>(`/reports/targets/${id}`);
  },
  exportPdf(id: string) {
    return http.get<any, Blob>(`/reports/${id}/export/pdf`, { responseType: 'blob' });
  },
  exportExcel(id: string) {
    return http.get<any, Blob>(`/reports/${id}/export/excel`, { responseType: 'blob' });
  },
  compareReports(reportId1: string, reportId2: string) {
    return http.post<any, any>('/reports/compare', { reportId1, reportId2 });
  },
  getAIAnalysis(reportData: any, type: string) {
    return http.post<any, any>('/reports/ai-analysis', { reportData, type }, {
      timeout: 120000 // AI分析可能需要较长时间，设置2分钟超时
    });
  },
  saveAIAnalysis(reportId: string, aiAnalysisData: any) {
    return http.put<any, any>(`/reports/${reportId}/ai-analysis`, { aiAnalysis: aiAnalysisData });
  },
};
