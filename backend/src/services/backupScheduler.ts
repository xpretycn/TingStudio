import cron, { type ScheduledTask } from "node-cron";

import { logger } from "../utils/logger.js";
import { createBackup } from "./dbService.js";

const DEFAULT_CRON_EXPRESSION = "0 2 * * *";

let scheduledTask: ScheduledTask | null = null;

export function startBackupScheduler(): void {
  const backupEnabled = process.env.BACKUP_ENABLED !== "false";

  if (!backupEnabled) {
    logger.info("[BackupScheduler] 自动备份已禁用 (BACKUP_ENABLED=false)");
    return;
  }

  const cronExpression = process.env.BACKUP_CRON || DEFAULT_CRON_EXPRESSION;

  if (!cron.validate(cronExpression)) {
    logger.error(`[BackupScheduler] 无效的 cron 表达式: ${cronExpression}`);
    return;
  }

  if (scheduledTask) {
    logger.warn("[BackupScheduler] 调度器已在运行，跳过重复启动");
    return;
  }

  scheduledTask = cron.schedule(cronExpression, () => {
    logger.info("[BackupScheduler] 自动备份开始...");
    try {
      const result = createBackup();
      logger.info(`[BackupScheduler] 自动备份完成: ${JSON.stringify(result)}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "未知错误";
      logger.error(`[BackupScheduler] 自动备份失败: ${message}`);
    }
  });

  logger.info(`[BackupScheduler] 自动备份调度已启动，计划: ${cronExpression}`);
}

export function stopBackupScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info("[BackupScheduler] 自动备份调度已停止");
  }
}
