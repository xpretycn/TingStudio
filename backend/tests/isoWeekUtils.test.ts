import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getISOWeekInfo,
  getISOWeekKey,
  getMonthKey,
  getWeeksInMonth,
  getWeekRangeByISOWeek,
  getCurrentISOWeek,
  getCurrentMonth,
  getCurrentYear,
  formatDate,
  toISO8601,
  getMonthsInYear,
  getYearsRange,
} from "../src/utils/isoWeekUtils.js";

describe("isoWeekUtils", () => {
  describe("getISOWeekInfo", () => {
    it("应正确计算年初日期的周信息", () => {
      const result = getISOWeekInfo("2026-01-01");
      expect(result.year).toBe(2026);
      expect(result.week).toBeGreaterThanOrEqual(1);
      expect(result.week).toBeLessThanOrEqual(53);
    });

    it("应正确计算年末日期的周信息", () => {
      const result = getISOWeekInfo("2026-12-31");
      expect(result.year).toBe(2026);
      expect(result.week).toBeLessThanOrEqual(53);
    });

    it("闰年2月29日应返回有效周数", () => {
      const result = getISOWeekInfo("2024-02-29");
      expect(result.year).toBe(2024);
      expect(result.week).toBeGreaterThanOrEqual(1);
      expect(result.week).toBeLessThanOrEqual(53);
    });
  });

  describe("getISOWeekKey", () => {
    it("应返回 YYYY-Www 格式", () => {
      const result = getISOWeekKey("2026-01-06");
      expect(result).toMatch(/^\d{4}-W\d{2}$/);
    });

    it("周数应补零", () => {
      const result = getISOWeekKey("2026-01-01");
      const weekPart = result.split("-W")[1];
      expect(weekPart.length).toBe(2);
    });
  });

  describe("getMonthKey", () => {
    it("应返回 YYYY-MM 格式", () => {
      expect(getMonthKey("2026-05-14")).toBe("2026-05");
    });

    it("1月日期应返回正确月份", () => {
      expect(getMonthKey("2026-01-31")).toBe("2026-01");
    });
  });

  describe("getWeeksInMonth", () => {
    it("应返回指定月份的周选项列表", () => {
      const weeks = getWeeksInMonth(2026, 5);
      expect(weeks.length).toBeGreaterThanOrEqual(4);
      expect(weeks.length).toBeLessThanOrEqual(5);
      weeks.forEach((w) => {
        expect(w).toHaveProperty("label");
        expect(w).toHaveProperty("value");
        expect(w).toHaveProperty("periodStart");
        expect(w).toHaveProperty("periodEnd");
      });
    });

    it("2月应返回4或5周", () => {
      const febWeeks = getWeeksInMonth(2026, 2);
      expect(febWeeks.length).toBeGreaterThanOrEqual(4);
      expect(febWeeks.length).toBeLessThanOrEqual(5);
    });

    it("闰年2月应返回4或5周", () => {
      const leapFebWeeks = getWeeksInMonth(2024, 2);
      expect(leapFebWeeks.length).toBeGreaterThanOrEqual(4);
      expect(leapFebWeeks.length).toBeLessThanOrEqual(5);
    });
  });

  describe("getWeekRangeByISOWeek", () => {
    it("应返回包含 start 和 end 的日期范围", () => {
      const range = getWeekRangeByISOWeek(2026, 5);
      expect(range).toHaveProperty("start");
      expect(range).toHaveProperty("end");
      expect(range.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(range.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("start 应早于或等于 end", () => {
      const range = getWeekRangeByISOWeek(2026, 10);
      expect(new Date(range.start).getTime()).toBeLessThanOrEqual(
        new Date(range.end).getTime()
      );
    });

    it("第1周应返回年初附近的日期", () => {
      const range = getWeekRangeByISOWeek(2026, 1);
      expect(range.start.startsWith("2025") || range.start.startsWith("2026")).toBe(true);
    });
  });

  describe("getCurrentISOWeek / getCurrentMonth / getCurrentYear", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("getCurrentISOWeek 应返回当前ISO周号", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-14T12:00:00Z"));
      const week = getCurrentISOWeek();
      expect(week).toBeGreaterThanOrEqual(1);
      expect(week).toBeLessThanOrEqual(53);
    });

    it("getCurrentMonth 应返回当前月份", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-15T00:00:00Z"));
      const month = getCurrentMonth();
      expect(month).toBe(3);
    });

    it("getCurrentYear 应返回当前年份", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-07-01T00:00:00Z"));
      const year = getCurrentYear();
      expect(year).toBe(2026);
    });
  });

  describe("formatDate", () => {
    it("应格式化为 YYYY-MM-DD", () => {
      const result = formatDate(new Date(2026, 4, 3));
      expect(result).toBe("2026-05-03");
    });

    it("月和日应补零", () => {
      const result = formatDate(new Date(2026, 0, 5));
      expect(result).toBe("2026-01-05");
    });
  });

  describe("toISO8601", () => {
    it("应返回 ISO 日期部分", () => {
      const result = toISO8601(new Date("2026-05-14T10:30:00.000Z"));
      expect(result).toBe("2026-05-14");
    });
  });

  describe("getMonthsInYear", () => {
    it("应返回12个月", () => {
      const months = getMonthsInYear(2026);
      expect(months).toHaveLength(12);
    });

    it("标签应包含年份和月份", () => {
      const months = getMonthsInYear(2026);
      expect(months[0].label).toBe("2026年1月");
      expect(months[11].label).toBe("2026年12月");
    });

    it("value 应为 1 到 12", () => {
      const months = getMonthsInYear(2026);
      expect(months[0].value).toBe(1);
      expect(months[11].value).toBe(12);
    });
  });

  describe("getYearsRange", () => {
    it("应返回降序排列的年份范围", () => {
      const years = getYearsRange(2020, 2026);
      expect(years[0].value).toBe(2026);
      expect(years[years.length - 1].value).toBe(2020);
    });

    it("标签应为 'YYYY年' 格式", () => {
      const years = getYearsRange(2024, 2026);
      expect(years[0].label).toBe("2026年");
    });

    it("默认参数应返回有效范围", () => {
      const years = getYearsRange();
      expect(years.length).toBeGreaterThan(0);
      expect(years[0].value).toBeGreaterThan(years[years.length - 1].value);
    });
  });
});
