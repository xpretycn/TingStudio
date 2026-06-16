import cron, { ScheduledTask } from "node-cron";
import { query } from '../config/database-adapter.js';
import { generateId, now } from "../utils/helpers.js";
import { aggregateReportData, getWeekNumber } from "../controllers/reportController.js";
import { logger } from "../utils/logger.js";

const scheduledTasks: ScheduledTask[] = [];

function getLastWeekRange(): { start: string; end: string } {
  const nowDate = new Date();
  const dayOfWeek = nowDate.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(nowDate);
  thisMonday.setDate(nowDate.getDate() - diff);
  thisMonday.setHours(0, 0, 0, 0);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);
  return {
    start: lastMonday.toISOString().split("T")[0],
    end: lastSunday.toISOString().split("T")[0],
  };
}

function getLastMonthRange(): { start: string; end: string } {
  const nowDate = new Date();
  const firstDayThisMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
  const lastDayPrevMonth = new Date(firstDayThisMonth.getTime() - 1);
  const firstDayPrevMonth = new Date(lastDayPrevMonth.getFullYear(), lastDayPrevMonth.getMonth(), 1);
  return {
    start: firstDayPrevMonth.toISOString().split("T")[0],
    end: lastDayPrevMonth.toISOString().split("T")[0],
  };
}

async function generateAutoReport(type: "weekly" | "monthly") {
  try {
    const range = type === "weekly" ? getLastWeekRange() : getLastMonthRange();
    const { start, end } = range;

    const [existing]: any[] = await query(
      "SELECT id FROM reports WHERE type = ? AND period_start = ? AND period_end = ? AND generated_by = 'auto'",
      [type, start, end]
    );
    if (existing && existing.length > 0) {
      logger.info(`[报告生成器] ${type === "weekly" ? "周报" : "月报"}已存在: ${start} ~ ${end}`);
      return;
    }

    const dataJson = await aggregateReportData(type, start, end, false, false);

    const title = type === "weekly"
      ? `TingStudio 第${getWeekNumber(start)}周工作报告`
      : `TingStudio ${start.substring(0, 7).replace("-", "年")}月工作报告`;

    const [adminUsers]: any[] = await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    const createdBy = adminUsers?.[0]?.id || "system";

    const id = generateId();
    await query(
      `INSERT INTO reports (id, type, title, period_start, period_end, status, data_json, generated_by, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, 'auto', ?, ?, ?)`,
      [id, type, title, start, end, JSON.stringify(dataJson), createdBy, now(), now()]
    );

    logger.info(`[报告生成器] 自动生成${type === "weekly" ? "周报" : "月报"}成功: ${title} (${start} ~ ${end})`);
  } catch (error: any) {
    logger.error(`[报告生成器] 自动生成${type === "weekly" ? "周报" : "月报"}失败:`, error.message);
  }
}

export function startScheduledTasks() {
  const weeklyTask = cron.schedule("0 9 * * 1", () => {
    logger.info("[报告生成器] 开始自动生成周报...");
    generateAutoReport("weekly");
  });

  const monthlyTask = cron.schedule("0 9 1 * *", () => {
    logger.info("[报告生成器] 开始自动生成月报...");
    generateAutoReport("monthly");
  });

  scheduledTasks.push(weeklyTask, monthlyTask);
  logger.info("[报告生成器] 定时任务已启动 (周报: 每周一9:00, 月报: 每月1日9:00)");
}

export function stopScheduledTasks() {
  for (const task of scheduledTasks) {
    task.stop();
  }
  scheduledTasks.length = 0;
  logger.info("[报告生成器] 定时任务已停止");
}
