import http from "./http";
import type { Pagination } from "./http";

export interface SaleRecord {
  id: string;
  formulaId: string;
  formulaName?: string;
  formulaCode?: string;
  salesmanId: string;
  salesmanName?: string;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  periodStart: string;
  periodEnd: string;
  quantity: number;
  revenue: number;
  notes?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface SaleForm {
  formulaId: string;
  salesmanId?: string;
  periodType?: 'monthly' | 'quarterly' | 'yearly';
  periodStart: string;
  quantity: number;
  revenue: number;
  notes?: string;
}

export interface SaleStats {
  totalQuantity: number;
  totalRevenue: number;
  topFormulas: Array<{
    formulaId: string;
    formulaName: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  topSalesmen: Array<{
    salesmanId: string;
    salesmanName: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    quantity: number;
    revenue: number;
  }>;
  periodComparison: {
    current: { quantity: number; revenue: number; month: string };
    previous: { quantity: number; revenue: number; month: string };
    quantityGrowthRate: number;
    revenueGrowthRate: number;
  };
}

export const salesApi = {
  getList(params?: {
    formulaId?: string;
    salesmanId?: string;
    periodStart?: string;
    periodEnd?: string;
    keyword?: string;
    sortBy?: string;
    order?: string;
    page?: number;
    pageSize?: number;
  }) {
    return http.get<unknown, { list: SaleRecord[]; pagination: Pagination }>("/sales", { params });
  },
  getByFormula(formulaId: string) {
    return http.get<unknown, SaleRecord[]>(`/sales/formula/${formulaId}`);
  },
  getStats(params?: { periodStart?: string; periodEnd?: string }) {
    return http.get<unknown, SaleStats>("/sales/stats", { params });
  },
  create(data: SaleForm) {
    return http.post<unknown, SaleRecord>("/sales", data);
  },
  update(id: string, data: Partial<SaleForm>) {
    return http.put<unknown, SaleRecord>(`/sales/${id}`, data);
  },
  delete(id: string) {
    return http.delete<unknown, { message: string }>(`/sales/${id}`);
  },
};
