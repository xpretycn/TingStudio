import type { SalesRecord, SalesAnalysisInput, SalesTrend } from "../../types/sales.js";

class SalesAnalysisService {
  private records: Map<number, SalesRecord> = new Map();
  private nextId = 1;

  async addRecord(record: Omit<SalesRecord, "id">): Promise<SalesRecord> {
    const newRecord: SalesRecord = {
      ...record,
      id: this.nextId++,
    };
    this.records.set(newRecord.id!, newRecord);
    return { ...newRecord };
  }

  async analyze(input: SalesAnalysisInput): Promise<{
    summary: {
      total_records: number;
      total_quantity: number;
      total_amount: number;
      avg_quantity_per_order: number;
      avg_amount_per_order: number;
    };
    trends: SalesTrend[];
    top_products: Array<{ name: string; quantity: number; amount: number }>;
    top_salespersons: Array<{ id: number; name: string; total_amount: number }>;
    regional_breakdown: Array<{ region: string; count: number; amount: number }>;
    anomalies: Array<{
      date: string;
      metric: string;
      value: number;
      expected_range: [number, number];
      severity: "low" | "medium" | "high";
    }>;
  }> {
    let filtered = Array.from(this.records.values());

    if (input.start_date) {
      filtered = filtered.filter(r => r.sale_date >= input.start_date!);
    }
    if (input.end_date) {
      filtered = filtered.filter(r => r.sale_date <= input.end_date!);
    }
    if (input.salesperson_id) {
      filtered = filtered.filter(r => r.salesperson_id === input.salesperson_id);
    }
    if (input.region) {
      filtered = filtered.filter(r => r.region === input.region);
    }
    if (input.category) {
      filtered = filtered.filter(r => r.category === input.category);
    }

    const summary = this.calculateSummary(filtered);
    const trends = this.calculateTrends(filtered, input.group_by || "day");
    const topProducts = this.getTopProducts(filtered, 10);
    const topSalespersons = this.getTopSalespersons(filtered, 5);
    const regionalBreakdown = this.getRegionalBreakdown(filtered);
    const anomalies = this.detectAnomalies(filtered);

    return {
      summary,
      trends,
      top_products: topProducts,
      top_salespersons: topSalespersons,
      regional_breakdown: regionalBreakdown,
      anomalies,
    };
  }

  private calculateSummary(records: SalesRecord[]) {
    if (records.length === 0) {
      return {
        total_records: 0,
        total_quantity: 0,
        total_amount: 0,
        avg_quantity_per_order: 0,
        avg_amount_per_order: 0,
      };
    }

    const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0);
    const totalAmount = records.reduce((sum, r) => sum + r.total_amount, 0);

    return {
      total_records: records.length,
      total_quantity: Math.round(totalQuantity * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100,
      avg_quantity_per_order: Math.round((totalQuantity / records.length) * 100) / 100,
      avg_amount_per_order: Math.round((totalAmount / records.length) * 100) / 100,
    };
  }

  private calculateTrends(records: SalesRecord[], groupBy: string): SalesTrend[] {
    const grouped = new Map<string, SalesRecord[]>();

    for (const record of records) {
      let key: string;

      switch (groupBy) {
        case "day":
          key = record.sale_date.substring(0, 10);
          break;
        case "week":
          const date = new Date(record.sale_date);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().substring(0, 10);
          break;
        case "month":
          key = record.sale_date.substring(0, 7);
          break;
        case "salesperson":
          key = `salesperson_${record.salesperson_id}`;
          break;
        case "region":
          key = record.region || "unknown";
          break;
        case "category":
          key = record.category || "unknown";
          break;
        default:
          key = record.sale_date.substring(0, 10);
      }

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(record);
    }

    const trends: SalesTrend[] = [];
    for (const [period, groupRecords] of grouped) {
      const totalQty = groupRecords.reduce((sum, r) => sum + r.quantity, 0);
      const totalAmt = groupRecords.reduce((sum, r) => sum + r.total_amount, 0);

      trends.push({
        period,
        total_quantity: Math.round(totalQty * 100) / 100,
        total_amount: Math.round(totalAmt * 100) / 100,
        order_count: groupRecords.length,
        avg_order_value: Math.round((totalAmt / groupRecords.length) * 100) / 100,
      });
    }

    return trends.sort((a, b) => a.period.localeCompare(b.period));
  }

  private getTopProducts(records: SalesRecord[], limit: number) {
    const productMap = new Map<string, { quantity: number; amount: number }>();

    for (const record of records) {
      const existing = productMap.get(record.product_name) || { quantity: 0, amount: 0 };
      productMap.set(record.product_name, {
        quantity: existing.quantity + record.quantity,
        amount: existing.amount + record.total_amount,
      });
    }

    return Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  }

  private getTopSalespersons(records: SalesRecord[], limit: number) {
    const spMap = new Map<number, { total_amount: number }>();

    for (const record of records) {
      const existing = spMap.get(record.salesperson_id) || { total_amount: 0 };
      spMap.set(record.salesperson_id, {
        total_amount: existing.total_amount + record.total_amount,
      });
    }

    return Array.from(spMap.entries())
      .map(([id, data]) => ({ id, name: `业务员${id}`, ...data }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, limit);
  }

  private getRegionalBreakdown(records: SalesRecord[]) {
    const regionMap = new Map<string, { count: number; amount: number }>();

    for (const record of records) {
      const region = record.region || "未知区域";
      const existing = regionMap.get(region) || { count: 0, amount: 0 };
      regionMap.set(region, {
        count: existing.count + 1,
        amount: existing.amount + record.total_amount,
      });
    }

    return Array.from(regionMap.entries())
      .map(([region, data]) => ({ region, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }

  private detectAnomalies(records: SalesRecord[]) {
    const anomalies: Array<{
      date: string;
      metric: string;
      value: number;
      expected_range: [number, number];
      severity: "low" | "medium" | "high";
    }> = [];

    if (records.length < 7) return anomalies;

    const dailyData = new Map<string, { count: number; amount: number }>();
    for (const record of records) {
      const day = record.sale_date.substring(0, 10);
      const existing = dailyData.get(day) || { count: 0, amount: 0 };
      dailyData.set(day, {
        count: existing.count + 1,
        amount: existing.amount + record.total_amount,
      });
    }

    const amounts = Array.from(dailyData.values())
      .map(d => d.amount)
      .sort((a, b) => a - b);
    const q1 = amounts[Math.floor(amounts.length * 0.25)];
    const q3 = amounts[Math.floor(amounts.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    for (const [date, data] of dailyData) {
      if (data.amount < lowerBound || data.amount > upperBound) {
        let severity: "low" | "medium" | "high" = "low";
        const deviation = Math.abs(data.amount - (q1 + q3) / 2) / iqr;

        if (deviation > 2) severity = "high";
        else if (deviation > 1.5) severity = "medium";

        anomalies.push({
          date,
          metric: "total_amount",
          value: data.amount,
          expected_range: [lowerBound, upperBound],
          severity,
        });
      }
    }

    return anomalies;
  }
}

export { SalesAnalysisService };
export const salesAnalysisService = new SalesAnalysisService();
