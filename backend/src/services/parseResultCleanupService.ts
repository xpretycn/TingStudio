import cron, { ScheduledTask } from 'node-cron';
import { query, execute } from '../config/database-adapter.js';

export type DegradationLevel = 'normal' | 'degraded' | '熔断';

interface CleanupResult {
  deletedCount: number;
  triggerReason: string;
  degradationLevel: DegradationLevel;
}

interface SystemStatus {
  degradationLevel: DegradationLevel;
  totalCount: number;
  storageLimit: number;
  usagePercent: number;
  cleanupThreshold: number;
  isOverThreshold: boolean;
  lastCleanupAt: string | null;
}

class ParseResultCleanupService {
  private cleanupTask: ScheduledTask | null = null;
  private lastCleanupResult: CleanupResult | null = null;
  private lastStatusCheck: SystemStatus | null = null;
  private currentDegradationLevel: DegradationLevel = 'normal';

  async getSystemStatus(): Promise<SystemStatus> {
    

    const totalResult = (await query('SELECT COUNT(*) as count FROM parse_results', [])).rows[0] as { count: number };
    const configResult = (await query("SELECT config_key, config_value FROM parse_result_configs WHERE config_key IN ('storage_limit', 'cleanup_threshold_percent')", [])).rows as Array<{ config_key: string; config_value: string }>;

    const configMap = new Map<string, number>();
    for (const row of configResult) {
      configMap.set(row.config_key, parseInt(row.config_value, 10));
    }

    const storageLimit = configMap.get('storage_limit') || 5000;
    const cleanupThreshold = configMap.get('cleanup_threshold_percent') || 95;
    const usagePercent = Math.round((totalResult.count / storageLimit) * 100);
    const isOverThreshold = usagePercent >= cleanupThreshold;

    const lastCleanup = (await query("SELECT created_at FROM parse_results ORDER BY created_at ASC LIMIT 1", [])).rows[0] as { created_at: string } | undefined;

    const newDegradationLevel = this.calculateDegradationLevel(
      totalResult.count,
      storageLimit,
      usagePercent
    );

    this.currentDegradationLevel = newDegradationLevel;

    return {
      degradationLevel: newDegradationLevel,
      totalCount: totalResult.count,
      storageLimit,
      usagePercent,
      cleanupThreshold,
      isOverThreshold,
      lastCleanupAt: lastCleanup?.created_at || null,
    };
  }

  private calculateDegradationLevel(
    totalCount: number,
    storageLimit: number,
    usagePercent: number
  ): DegradationLevel {
    if (usagePercent >= 95 || totalCount >= storageLimit) {
      return '熔断';
    }
    if (usagePercent >= 80 || totalCount >= storageLimit * 0.8) {
      return 'degraded';
    }
    return 'normal';
  }

  async performCleanup(dryRun: boolean = false): Promise<CleanupResult> {
    
    const status = await this.getSystemStatus();

    if (status.usagePercent < status.cleanupThreshold && !dryRun) {
      return {
        deletedCount: 0,
        triggerReason: '存储未达到清理阈值',
        degradationLevel: this.currentDegradationLevel,
      };
    }

    const cleanupBatchPercent = 5;
    const recordsToDelete = Math.ceil(status.totalCount * (cleanupBatchPercent / 100));

    if (recordsToDelete === 0) {
      return {
        deletedCount: 0,
        triggerReason: '无记录可清理',
        degradationLevel: this.currentDegradationLevel,
      };
    }

    if (dryRun) {
      return {
        deletedCount: recordsToDelete,
        triggerReason: `Dry Run: 将清理 ${recordsToDelete} 条最老记录`,
        degradationLevel: this.currentDegradationLevel,
      };
    }

    const idsToDelete = (await query(`
      SELECT id FROM parse_results
      WHERE is_linked = 0
      ORDER BY created_at ASC
      LIMIT ?
    `, [recordsToDelete])).rows as Array<{ id: string }>;

    if (idsToDelete.length === 0) {
      return {
        deletedCount: 0,
        triggerReason: '所有记录都已关联，无法清理',
        degradationLevel: this.currentDegradationLevel,
      };
    }

    const placeholders = idsToDelete.map(() => '?').join(',');
    const result = await execute(`
      DELETE FROM parse_results WHERE id IN (${placeholders})
    `, [...idsToDelete.map(r => r.id]));

    this.lastCleanupResult = {
      deletedCount: result.changes,
      triggerReason: `存储达到 ${status.usagePercent}%，清理 ${cleanupBatchPercent}% 最老记录`,
      degradationLevel: this.currentDegradationLevel,
    };

    console.log(`[ParseResultCleanup] 清理完成: 删除 ${result.changes} 条记录, 原因: ${this.lastCleanupResult.triggerReason}`);

    return this.lastCleanupResult;
  }

  startScheduledCleanup(): void {
    if (this.cleanupTask) {
      console.log('[ParseResultCleanup] 定时任务已启动');
      return;
    }

    this.cleanupTask = cron.schedule('0 * * * *', async () => {
      console.log('[ParseResultCleanup] 执行定时清理检查...');
      try {
        const status = await this.getSystemStatus();
        this.lastStatusCheck = status;

        if (status.isOverThreshold) {
          console.log(`[ParseResultCleanup] 存储使用率 ${status.usagePercent}% 超过阈值 ${status.cleanupThreshold}%，执行清理`);
          await this.performCleanup(false);
        } else {
          console.log(`[ParseResultCleanup] 存储使用率 ${status.usagePercent}% 未超过阈值`);
        }
      } catch (error) {
        console.error('[ParseResultCleanup] 定时清理出错:', error);
      }
    }, {
      timezone: 'Asia/Shanghai',
    });

    console.log('[ParseResultCleanup] 定时清理任务已启动 (每小时的第 0 分执行)');
  }

  stopScheduledCleanup(): void {
    if (this.cleanupTask) {
      this.cleanupTask.stop();
      this.cleanupTask = null;
      console.log('[ParseResultCleanup] 定时清理任务已停止');
    }
  }

  getLastCleanupResult(): CleanupResult | null {
    return this.lastCleanupResult;
  }

  getCurrentDegradationLevel(): DegradationLevel {
    return this.currentDegradationLevel;
  }

  async getDegradationInfo(): Promise<{
    level: DegradationLevel;
    reason: string;
    recommendations: string[];
  }> {
    const status = await this.getSystemStatus();
    const recommendations: string[] = [];

    switch (status.degradationLevel) {
      case '熔断':
        recommendations.push('立即执行手动清理');
        recommendations.push('考虑提高存储上限');
        recommendations.push('检查是否有异常数据累积');
        break;
      case 'degraded':
        recommendations.push('存储接近上限，建议尽快清理');
        recommendations.push('可以适当提高存储上限');
        break;
      default:
        recommendations.push('系统运行正常');
        recommendations.push('定期检查存储使用情况');
    }

    const reasonMap: Record<DegradationLevel, string> = {
      normal: '系统运行正常',
      degraded: `存储使用率 ${status.usagePercent}% 较高（超过 80%）`,
      '熔断': `存储使用率 ${status.usagePercent}% 达到或超过阈值 ${status.cleanupThreshold}%`,
    };

    return {
      level: status.degradationLevel,
      reason: reasonMap[status.degradationLevel],
      recommendations,
    };
  }
}

export const parseResultCleanupService = new ParseResultCleanupService();
