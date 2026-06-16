import { query, execute } from '../config/database-adapter.js';

export interface MonitoringMetrics {
  totalParseRequests: number;
  successfulRequests: number;
  failedRequests: number;
  pendingRequests: number;
  successRate: number;
  averageTokensUsed: number;
  totalTokensUsed: number;
  cacheHitRate: number;
  cacheHits: number;
  cacheMisses: number;
  storageUsage: {
    current: number;
    limit: number;
    percentage: number;
  };
  modelUsage: Array<{
    provider: string;
    modelName: string;
    count: number;
    percentage: number;
  }>;
  timeRange: {
    start: string;
    end: string;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  message: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  triggeredAt: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
}

class ParseResultMonitoringService {
  async getMetrics(startDate?: string, endDate?: string): Promise<MonitoringMetrics> {
    try {
      

      const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const end = endDate || new Date().toISOString();

      const totalResult = ((await query(`
      SELECT COUNT(*) as total FROM parse_results WHERE created_at >= ? AND created_at <= ?
    `, [start, end])).rows[0]) as { total: number };

      const successResult = (await query(`
      SELECT COUNT(*) as count FROM parse_results WHERE created_at >= ? AND created_at <= ? AND status = 'success'
    `, [start, end])).rows[0] as { count: number };

      const failedResult = (await query(`
      SELECT COUNT(*) as count FROM parse_results WHERE created_at >= ? AND created_at <= ? AND status = 'failed'
    `, [start, end])).rows[0] as { count: number };

      const pendingResult = (await query(`
      SELECT COUNT(*) as count FROM parse_results WHERE created_at >= ? AND created_at <= ? AND status = 'pending'
    `, [start, end])).rows[0] as { count: number };

      const tokensResult = (await query(`
      SELECT
        COUNT(*) as count,
        SUM(tokens_used) as total
      FROM parse_results
      WHERE created_at >= ? AND created_at <= ? AND tokens_used > 0
    `, [start, end])).rows[0] as { count: number; total: number | null };

      const cacheResult = (await query(`
      SELECT
        SUM(CASE WHEN used_count > 0 THEN 1 ELSE 0 END) as hits,
        SUM(CASE WHEN used_count = 0 THEN 1 ELSE 0 END) as misses
      FROM parse_results
      WHERE created_at >= ? AND created_at <= ?
    `, [start, end])).rows[0] as { hits: number; misses: number };

      let storageLimit = 5000;
      try {
        const configResult = (await query(`
          SELECT config_key, config_value FROM parse_result_configs WHERE config_key = ?
        `, ['storage_limit'])).rows[0] as { config_key: string; config_value: string } | undefined;
        if (configResult) {
          storageLimit = parseInt(configResult.config_value) || 5000;
        }
      } catch {
        // parse_result_configs 表不存在时使用默认值
      }

      const currentStorage = totalResult.total;

      const modelUsage = (await query(`
      SELECT
        model_provider,
        model_name,
        COUNT(*) as count
      FROM parse_results
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY model_provider, model_name
      ORDER BY count DESC
      LIMIT 10
    `, [start, end])).rows as Array<{ model_provider: string; model_name: string; count: number }>;

      const totalParseRequests = totalResult.total;
      const successfulRequests = successResult.count;
      const failedRequests = failedResult.count;

      return {
        totalParseRequests,
        successfulRequests,
        failedRequests,
        pendingRequests: pendingResult.count,
        successRate: totalParseRequests > 0 ? (successfulRequests / totalParseRequests) * 100 : 0,
        averageTokensUsed: tokensResult.count > 0 ? (tokensResult.total || 0) / tokensResult.count : 0,
        totalTokensUsed: tokensResult.total || 0,
        cacheHitRate: (cacheResult.hits + cacheResult.misses) > 0
          ? (cacheResult.hits / (cacheResult.hits + cacheResult.misses)) * 100
          : 0,
        cacheHits: cacheResult.hits,
        cacheMisses: cacheResult.misses,
        storageUsage: {
          current: currentStorage,
          limit: storageLimit,
          percentage: storageLimit > 0 ? (currentStorage / storageLimit) * 100 : 0,
        },
        modelUsage: modelUsage.map(m => ({
          provider: m.model_provider || 'unknown',
          modelName: m.model_name || 'unknown',
          count: m.count,
          percentage: totalParseRequests > 0 ? (m.count / totalParseRequests) * 100 : 0,
        })),
        timeRange: {
          start,
          end,
        },
      };
    } catch {
      // 数据库表或列缺失时返回默认空指标
      const now = new Date().toISOString();
      return {
        totalParseRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        pendingRequests: 0,
        successRate: 0,
        averageTokensUsed: 0,
        totalTokensUsed: 0,
        cacheHitRate: 0,
        cacheHits: 0,
        cacheMisses: 0,
        storageUsage: { current: 0, limit: 5000, percentage: 0 },
        modelUsage: [],
        timeRange: { start: now, end: now },
      };
    }
  }

  async getAlertRules(): Promise<AlertRule[]> {
    

    const defaultRules: AlertRule[] = [
      {
        id: 'rule_storage_warning',
        name: '存储空间警告',
        metric: 'storage_usage_percentage',
        operator: 'gte',
        threshold: 80,
        severity: 'warning',
        enabled: true,
        message: '解析结果存储使用率超过 80%，建议清理',
      },
      {
        id: 'rule_storage_critical',
        name: '存储空间危机',
        metric: 'storage_usage_percentage',
        operator: 'gte',
        threshold: 95,
        severity: 'critical',
        enabled: true,
        message: '解析结果存储使用率超过 95%，已达到熔断阈值',
      },
      {
        id: 'rule_success_rate_low',
        name: '成功率过低',
        metric: 'success_rate',
        operator: 'lt',
        threshold: 50,
        severity: 'error',
        enabled: true,
        message: '解析成功率低于 50%，可能存在系统问题',
      },
      {
        id: 'rule_failure_spike',
        name: '失败率异常',
        metric: 'failure_rate',
        operator: 'gt',
        threshold: 30,
        severity: 'warning',
        enabled: true,
        message: '解析失败率超过 30%，请检查日志',
      },
    ];

    return defaultRules;
  }

  async checkAlerts(): Promise<Alert[]> {
    try {
      const metrics = await this.getMetrics();
      const rules = await this.getAlertRules();
      const alerts: Alert[] = [];

      for (const rule of rules) {
        if (!rule.enabled) continue;

        let currentValue = 0;
        switch (rule.metric) {
          case 'storage_usage_percentage':
            currentValue = metrics.storageUsage.percentage;
            break;
          case 'success_rate':
            currentValue = metrics.successRate;
            break;
          case 'failure_rate':
            currentValue = metrics.totalParseRequests > 0
              ? (metrics.failedRequests / metrics.totalParseRequests) * 100
              : 0;
            break;
          case 'cache_hit_rate':
            currentValue = metrics.cacheHitRate;
            break;
          default:
            continue;
        }

        let triggered = false;
        switch (rule.operator) {
          case 'gt':
            triggered = currentValue > rule.threshold;
            break;
          case 'lt':
            triggered = currentValue < rule.threshold;
            break;
          case 'gte':
            triggered = currentValue >= rule.threshold;
            break;
          case 'lte':
            triggered = currentValue <= rule.threshold;
            break;
          case 'eq':
            triggered = currentValue === rule.threshold;
            break;
        }

        if (triggered) {
          alerts.push({
            id: `alert_${Date.now()}_${rule.id}`,
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: rule.message,
            metric: rule.metric,
            currentValue: Math.round(currentValue * 100) / 100,
            threshold: rule.threshold,
            triggeredAt: new Date().toISOString(),
            acknowledged: false,
            acknowledgedAt: null,
            acknowledgedBy: null,
          });
        }
      }

      return alerts.sort((a, b) => {
        const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
    } catch {
      // 数据库异常时返回空告警列表
      return [];
    }
  }

  async getActiveAlerts(): Promise<Alert[]> {
    const alerts = await this.checkAlerts();
    return alerts.filter(alert => !alert.acknowledged);
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    return true;
  }

  async getPerformanceStats(): Promise<{
    averageResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  }> {
    return {
      averageResponseTime: 0,
      p50ResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
    };
  }
}

export const parseResultMonitoringService = new ParseResultMonitoringService();
