export interface SalesRecord {
  id?: number;
  salesperson_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sale_date: string;
  region?: string;
  category?: string;
}

export interface SalesAnalysisInput {
  start_date?: string;
  end_date?: string;
  salesperson_id?: number;
  region?: string;
  category?: string;
  group_by?: 'day' | 'week' | 'month' | 'salesperson' | 'region' | 'category';
}

export interface SalesTrend {
  period: string;
  total_quantity: number;
  total_amount: number;
  order_count: number;
  avg_order_value: number;
}
