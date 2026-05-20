import http from "./http";

export interface DashboardStats {
  formulas: number;
  materials: number;
  sales: {
    quantity: number;
    revenue: number;
    formulaCount: number;
  };
  pendingTasks: number;
}

export interface ActivityItem {
  id: string;
  name: string;
  code: string;
  updatedAt: string;
  type: "formula" | "material";
}

export interface SalesTrendItem {
  period: string;
  quantity: number;
  revenue: number;
  orderCount: number;
}

export const dashboardApi = {
  getStats() {
    return http.get<any, DashboardStats>("/dashboard/stats");
  },
  getRecentActivity(limit: number = 10) {
    return http.get<any, ActivityItem[]>("/dashboard/activity", {
      params: { limit },
    });
  },
  getSalesTrend(period: "week" | "month" | "year" = "month") {
    return http.get<any, SalesTrendItem[]>("/dashboard/sales-trend", {
      params: { period },
    });
  },
};
