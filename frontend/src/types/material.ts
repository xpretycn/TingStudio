export interface Material {
  id: string;
  name: string;
  code: string;
  unit: string;
  stock: number;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MaterialForm {
  name: string;
  code: string;
  unit: string;
  stock: number;
}

export interface MaterialQuery {
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface MaterialUsage {
  materialId: string;
  materialName: string;
  usageCount: number;
}
