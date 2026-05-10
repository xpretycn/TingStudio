export interface Salesperson {
  id?: number;
  name: string;
  phone?: string;
  email?: string;
  department?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface SalespersonCreateInput {
  name: string;
  phone?: string;
  email?: string;
  department?: string;
}

export interface SalespersonUpdateInput {
  name?: string;
  phone?: string;
  email?: string;
  department?: string;
  status?: 'active' | 'inactive';
}

export interface SalespersonQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
  department?: string;
}
