export interface MaterialItem {
  materialId: string;
  materialName: string;
  quantity: number;
}

export interface Formula {
  id: string;
  name: string;
  salesmanId: string;
  salesmanName: string;
  materials: MaterialItem[];
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FormulaForm {
  name: string;
  salesmanId: string;
  materials: MaterialItem[];
  description?: string;
}

export interface FormulaQuery {
  keyword?: string;
  salesmanId?: string;
  materialId?: string;
  page?: number;
  pageSize?: number;
}
