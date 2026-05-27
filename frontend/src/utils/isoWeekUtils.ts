export interface WeekOption {
  label: string;
  value: number;
  periodStart: string;
  periodEnd: string;
}

export interface ISOWeekInfo {
  year: number;
  week: number;
}

export function getISOWeekInfo(dateStr: string): ISOWeekInfo {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const daysSinceYearStart = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  );
  const dayOfWeek = startOfYear.getDay() || 7;
  const week = Math.ceil((daysSinceYearStart + dayOfWeek) / 7);
  return { year, week: Math.min(week, 53) };
}

export function getISOWeekKey(dateStr: string): string {
  const { year, week } = getISOWeekInfo(dateStr);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7);
}

export function getWeeksInMonth(year: number, month: number): WeekOption[] {
  const weeks: WeekOption[] = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  let current = new Date(firstDay);
  while (current.getDay() !== 1) {
    current.setDate(current.getDate() + 1);
  }

  let weekNum = 1;
  while (current <= lastDay) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const ws = toISO8601(weekStart);
    const we = weekEnd <= lastDay ? toISO8601(weekEnd) : toISO8601(lastDay);

    weeks.push({
      label: `第${weekNum}周 (${formatDate(weekStart)} ~ ${formatDate(weekEnd <= lastDay ? weekEnd : lastDay)})`,
      value: weekNum,
      periodStart: ws,
      periodEnd: we,
    });

    current.setDate(current.getDate() + 7);
    weekNum++;

    if (weekNum > 5) break;
  }

  return weeks;
}

export function getWeekRangeByISOWeek(year: number, week: number): { start: string; end: string } {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple.getDay() === 1 ? simple : new Date(simple.getTime() - (dow > 1 ? dow - 1 : 6) * 86400000);
  const ISOweekEnd = new Date(ISOweekStart.getTime() + 6 * 86400000);

  return {
    start: toISO8601(ISOweekStart),
    end: toISO8601(ISOweekEnd),
  };
}

export function getCurrentISOWeek(): number {
  const now = new Date();
  const { week } = getISOWeekInfo(toISO8601(now));
  return week;
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toISO8601(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getMonthsInYear(year: number): Array<{ label: string; value: number }> {
  const months = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月",
  ];
  return months.map((label, index) => ({
    label: `${year}年${label}`,
    value: index + 1,
  }));
}

export function getYearsRange(startYear: number = 2020, endYear: number = new Date().getFullYear() + 1): Array<{ label: string; value: number }> {
  const years: Array<{ label: string; value: number }> = [];
  for (let y = endYear; y >= startYear; y--) {
    years.push({ label: `${y}年`, value: y });
  }
  return years;
}
