import { defineStore } from "pinia";
import { ref } from "vue";
import { dashboardApi } from "@/api/dashboard";
import type { DashboardStats, ActivityItem, SalesTrendItem } from "@/api/dashboard";

export const useDashboardStore = defineStore("dashboard", () => {
  const stats = ref<DashboardStats | null>(null);
  const activities = ref<ActivityItem[]>([]);
  const salesTrend = ref<SalesTrendItem[]>([]);
  const loading = ref(false);
  const statsLoading = ref(false);
  const activityLoading = ref(false);
  const trendLoading = ref(false);

  const fetchStats = async () => {
    statsLoading.value = true;
    try {
      stats.value = await dashboardApi.getStats();
    } catch (error) {
      console.error("[Dashboard] 获取统计数据失败:", error);
    } finally {
      statsLoading.value = false;
    }
  };

  const fetchActivities = async (limit: number = 8) => {
    activityLoading.value = true;
    try {
      activities.value = await dashboardApi.getRecentActivity(limit);
    } catch (error) {
      console.error("[Dashboard] 获取最近活动失败:", error);
    } finally {
      activityLoading.value = false;
    }
  };

  const fetchSalesTrend = async (period: "week" | "month" | "year" = "month") => {
    trendLoading.value = true;
    try {
      salesTrend.value = await dashboardApi.getSalesTrend(period);
    } catch (error) {
      console.error("[Dashboard] 获取销量趋势失败:", error);
    } finally {
      trendLoading.value = false;
    }
  };

  const fetchAll = async () => {
    loading.value = true;
    await Promise.allSettled([fetchStats(), fetchActivities(), fetchSalesTrend()]);
    loading.value = false;
  };

  return {
    stats,
    activities,
    salesTrend,
    loading,
    statsLoading,
    activityLoading,
    trendLoading,
    fetchStats,
    fetchActivities,
    fetchSalesTrend,
    fetchAll,
  };
});
