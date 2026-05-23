import http from "./http";

export interface MaterialItem {
  materialId: string;
  materialName: string;
  quantity: number;
  adjustedPrice?: number | null;
}

export interface FormulaVersion {
  versionId: string;
  formulaId: string;
  versionNumber: string;
  versionName: string | null;
  changesJson: string | null;
  snapshotJson: string;
  status: string;
  isCurrent: number;
  createdBy: string;
  createdByName?: string;
  createdByAvatar?: string | null;
  createdAt: string;
}

export interface Formula {
  id: string;
  name: string;
  salesmanId: string;
  salesmanName: string;
  materialsJson: string;
  finishedWeight: number;
  ratioFactor: number;
  supplementRatioFactor: number;
  packagingPrice?: number;
  otherPrice?: number;
  profitMargin?: number;
  costSubtotal?: number;
  totalPrice?: number;
  description: string | null;
  createdBy: string;
  createdByName?: string;
  createdByAvatar?: string | null;
  createdAt: string;
  updatedAt: string;
  materials?: MaterialItem[];
  versions?: FormulaVersion[];
  currentVersionNumber?: string | null;
  salesQuantity?: number;
}

export interface FormulaForm {
  name: string;
  salesmanId: string;
  materials: { materialId: string; materialName?: string; quantity: number }[];
  finishedWeight: number;
  ratioFactor?: number;
  supplementRatioFactor?: number;
  packagingPrice?: number;
  otherPrice?: number;
  profitMargin?: number;
  description?: string;
  versionReason?: string;
  originalName?: string;
  originalWeight?: number;
  parseResultId?: string;
}

export interface RatioFactorValidationResult {
  level: 'normal' | 'warning' | 'high_warning' | 'error';
  totalRatio: number;
  breakdown: {
    materialId: string;
    materialName: string;
    quantity: number;
    materialType: string;
    ratioFactor: number;
  }[];
  thresholds: {
    normalLow: number;
    normalHigh: number;
    warningLow: number;
    warningHigh: number;
    highWarningLow: number;
    highWarningHigh: number;
  };
  message: string;
  description: string;
  allowed: boolean;
  requiresManualReview: boolean;
}

export interface PriceQuoteMaterial {
  materialId: string;
  materialName: string;
  quantity: number;
  unitPrice: number | null;
  basePrice: number | null;
  isAdjusted: boolean;
  subtotal: number;
}

export interface PriceQuote {
  materials: PriceQuoteMaterial[];
  materialTotal: number;
  packagingPrice: number;
  otherPrice: number;
  costSubtotal: number;
  profitMargin: number;
  totalPrice: number;
  missingPrices: string[];
}

export const formulaApi = {
  getList(params?: { keyword?: string; salesmanId?: string; page?: number; pageSize?: number }) {
    // axios 拦截器会提取 res.data，所以这里直接返回内部的数据结构
    return http.get<any, { list: Formula[]; pagination: any }>("/formulas", { params });
  },
  getById(id: string) {
    return http.get<any, Formula>(`/formulas/${id}`);
  },
  create(data: FormulaForm) {
    return http.post<any, Formula>("/formulas", data);
  },
  update(id: string, data: Partial<FormulaForm>) {
    return http.put<any, Formula>(`/formulas/${id}`, data);
  },
  delete(id: string) {
    return http.delete<any, { message: string }>(`/formulas/${id}`);
  },
  publish(id: string) {
    return http.put<any, FormulaVersion>(`/formulas/${id}/publish`);
  },
  getByMaterial(materialId: string) {
    return http.get<any, Formula[]>(`/formulas/by-material/${materialId}`);
  },
  getPriceQuote(id: string) {
    return http.get<any, PriceQuote>(`/formulas/${id}/price-quote`);
  },
  validateRatio(data: {
    materials: { materialId: string; materialName?: string; quantity: number }[];
    finishedWeight: number;
    ratioFactor: number;
    supplementRatioFactor: number;
  }) {
    return http.post<any, RatioFactorValidationResult>('/formulas/validate-ratio', data);
  },
};
