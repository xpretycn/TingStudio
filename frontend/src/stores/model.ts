import { defineStore } from "pinia";
import { ref } from "vue";
import { modelApi } from "@/api/model";
import type {
  ModelItem,
  ModelStats,
  UsageSummaryItem,
  UsageTrendItem,
  UsageDistributionItem,
  UsageLogItem,
  AlertConfigItem,
  AlertRecordItem,
  HealthHistoryItem,
} from "@/api/model";

export const useModelStore = defineStore("model", () => {
  const models = ref<ModelItem[]>([]);
  const stats = ref<ModelStats>({
    totalModels: 0,
    configuredModels: 0,
    todayCalls: 0,
    todayTokens: 0,
    monthTokens: 0,
    activeAlerts: 0,
  });
  const loading = ref(false);

  const usageSummary = ref<UsageSummaryItem[]>([]);
  const usageTrend = ref<UsageTrendItem[]>([]);
  const usageDistribution = ref<UsageDistributionItem[]>([]);
  const usageLogs = ref<UsageLogItem[]>([]);
  const usageLogsTotal = ref(0);

  const alertConfigs = ref<AlertConfigItem[]>([]);
  const alertRecords = ref<AlertRecordItem[]>([]);
  const alertRecordsTotal = ref(0);
  const activeAlerts = ref(0);

  const healthHistory = ref<HealthHistoryItem[]>([]);

  const fetchModels = async () => {
    loading.value = true;
    try {
      const res = await modelApi.getModels();
      models.value = res.models;
      stats.value = res.stats;
    } catch (error) {
      console.error("[ModelStore] 获取模型列表失败:", error);
    } finally {
      loading.value = false;
    }
  };

  const createModel = async (data: Parameters<typeof modelApi.createModel>[0]) => {
    const res = await modelApi.createModel(data);
    await fetchModels();
    return res;
  };

  const updateModel = async (id: string, data: Parameters<typeof modelApi.updateModel>[1]) => {
    const res = await modelApi.updateModel(id, data);
    await fetchModels();
    return res;
  };

  const deleteModel = async (id: string) => {
    const res = await modelApi.deleteModel(id);
    await fetchModels();
    return res;
  };

  const testConnection = async (id: string) => {
    return await modelApi.testConnection(id);
  };

  const fetchUsageStats = async (params?: { startDate?: string; endDate?: string; provider?: string }) => {
    try {
      const res = await modelApi.getUsageStats(params);
      usageSummary.value = res.summary;
      usageTrend.value = res.trend;
      usageDistribution.value = res.distribution;
    } catch (error) {
      console.error("[ModelStore] 获取用量统计失败:", error);
    }
  };

  const fetchUsageLogs = async (params?: Parameters<typeof modelApi.getUsageLogs>[0]) => {
    try {
      const res = await modelApi.getUsageLogs(params);
      usageLogs.value = res.logs;
      usageLogsTotal.value = res.total;
    } catch (error) {
      console.error("[ModelStore] 获取调用日志失败:", error);
    }
  };

  const fetchAlertConfigs = async () => {
    try {
      const res = await modelApi.getAlertConfigs();
      alertConfigs.value = res.configs;
    } catch (error) {
      console.error("[ModelStore] 获取预警配置失败:", error);
    }
  };

  const updateAlertConfig = async (id: string, data: Parameters<typeof modelApi.updateAlertConfig>[1], skipRefresh = false) => {
    const res = await modelApi.updateAlertConfig(id, data);
    if (!skipRefresh) {
      await fetchAlertConfigs();
    }
    return res;
  };

  const fetchAlertRecords = async (params?: Parameters<typeof modelApi.getAlertRecords>[0]) => {
    try {
      const res = await modelApi.getAlertRecords(params);
      alertRecords.value = res.records;
      alertRecordsTotal.value = res.total;
      activeAlerts.value = res.activeAlerts;
    } catch (error) {
      console.error("[ModelStore] 获取预警记录失败:", error);
    }
  };

  const fetchHealthHistory = async (provider: string, days?: number) => {
    try {
      const res = await modelApi.getHealthHistory(provider, days);
      healthHistory.value = res.history;
    } catch (error) {
      console.error("[ModelStore] 获取健康历史失败:", error);
    }
  };

  return {
    models,
    stats,
    loading,
    usageSummary,
    usageTrend,
    usageDistribution,
    usageLogs,
    usageLogsTotal,
    alertConfigs,
    alertRecords,
    alertRecordsTotal,
    activeAlerts,
    healthHistory,
    fetchModels,
    createModel,
    updateModel,
    deleteModel,
    testConnection,
    fetchUsageStats,
    fetchUsageLogs,
    fetchAlertConfigs,
    updateAlertConfig,
    fetchAlertRecords,
    fetchHealthHistory,
  };
});
