export interface Customer {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  createdBy: string;
  createdAt: string;
}

export interface CustomerForm {
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface CustomerQuery {
  keyword?: string;
  page?: number;
  pageSize?: number;
}
