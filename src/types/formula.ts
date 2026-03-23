export interface MaterialItem {
  materialId: string;
  materialName: string;
  quantity: number;
}

export interface Formula {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  materials: MaterialItem[];
  description?: string;
  createdBy: string;
  createdAt: string;
}

export interface FormulaForm {
  name: string;
  customerId: string;
  materials: MaterialItem[];
  description?: string;
}

export interface FormulaQuery {
  keyword?: string;
  customerId?: string;
  materialId?: string;
  page?: number;
  pageSize?: number;
}
