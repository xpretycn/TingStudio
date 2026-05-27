import http from "./http";
import type { Pagination } from "./http";

export interface Report {
  id: string;
  type: 'weekly' | 'monthly';
  title: string;
  periodStart: string;
  periodEnd: string;
  status: 'draft' | 'published' | 'archived';
  dataJson: Record<string, unknown>;
  generatedBy: 'auto' | 'manual';
  createdBy: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

export interface PeriodCheckResult {
  exists: boolean;
  existingReport: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
  } | null;
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
  targetsJson: Record<string, unknown>;
  createdBy: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
}

interface WeeklyReportData {
  periodStart: string;
  periodEnd: string;
  formulaCount: number;
  materialCount: number;
  salesSummary: Record<string, unknown>;
  topFormulas: Record<string, unknown>[];
  trends: Record<string, unknown>;
}

export interface MonthlyReportData {
  periodStart: string;
  periodEnd: string;
  formulaCount: number;
  materialCount: number;
  salesSummary: Record<string, unknown>;
  topFormulas: Record<string, unknown>[];
  topSalesmen: Record<string, unknown>[];
  trends: Record<string, unknown>;
  comparison: Record<string, unknown>;
}

export interface CompareResult {
  report1: Record<string, unknown>;
  report2: Record<string, unknown>;
  diff: Record<string, unknown>;
}

export interface AIAnalysisData {
  analysis?: string;
  summary?: string;
  suggestions?: string[];
  risks?: string[];
  improvements?: string[];
  createdAt?: string;
  model?: string;
  provider?: string;
}

export const reportApi = {
  getList(params?: ReportFilters & { page?: number; pageSize?: number }) {
    return http.get<unknown, { list: Report[]; pagination: Pagination }>("/reports", { params });
  },
  getById(id: string) {
    return http.get<unknown, Report>(`/reports/${id}`);
  },
  generate(data: ReportGenerateForm) {
    return http.post<unknown, Report>("/reports/generate", data);
  },
  update(id: string, data: Partial<{ title: string; dataJson: Record<string, unknown>; status: string }>) {
    return http.put<unknown, Report>(`/reports/${id}`, data);
  },
  delete(id: string) {
    return http.delete<unknown, { message: string }>(`/reports/${id}`);
  },
  publish(id: string) {
    return http.post<unknown, Report>(`/reports/${id}/publish`);
  },
  getWeeklyData(params: { periodStart: string; periodEnd: string }) {
    return http.get<unknown, WeeklyReportData>("/reports/data/weekly", { params });
  },
  getMonthlyData(params: { periodStart: string; periodEnd: string }) {
    return http.get<unknown, MonthlyReportData>("/reports/data/monthly", { params });
  },
  getTargetList(params?: { periodType?: string }) {
    return http.get<unknown, ReportTarget[]>("/reports/targets", { params });
  },
  createTarget(data: { periodType: string; periodStart: string; periodEnd: string; targetsJson?: Record<string, unknown> }) {
    return http.post<unknown, ReportTarget>("/reports/targets", data);
  },
  updateTarget(id: string, data: Partial<ReportTarget>) {
    return http.put<unknown, ReportTarget>(`/reports/targets/${id}`, data);
  },
  deleteTarget(id: string) {
    return http.delete<unknown, { message: string }>(`/reports/targets/${id}`);
  },
  exportPdf(id: string) {
    return http.get<unknown, Blob>(`/reports/${id}/export/pdf`, { responseType: 'blob' });
  },
  exportExcel(id: string) {
    return http.get<unknown, Blob>(`/reports/${id}/export/excel`, { responseType: 'blob' });
  },
  checkPeriodExists(type: 'weekly' | 'monthly', periodStart: string) {
    return http.post<unknown, PeriodCheckResult>("/reports/check-period", { type, periodStart });
  },
  batchExportExcel(reportIds: string[]) {
    return http.post<unknown, Blob>("/reports/batch-export/excel", { reportIds }, { responseType: 'blob' });
  },
  compareReports(reportId1: string, reportId2: string) {
    return http.post<unknown, CompareResult>('/reports/compare', { reportId1, reportId2 });
  },
  getAIAnalysis(reportData: Record<string, unknown>, type: string) {
    return http.post<unknown, AIAnalysisData>('/reports/ai-analysis', { reportData, type }, {
      timeout: 120000
    });
  },
  saveAIAnalysis(reportId: string, aiAnalysisData: Record<string, unknown>) {
    return http.put<unknown, Report>(`/reports/${reportId}/ai-analysis`, { aiAnalysis: aiAnalysisData });
  },
};
