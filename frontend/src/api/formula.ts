import http from "./http";
import type { Pagination } from "./http";

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
  code?: string;
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
  status?: string;
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
    return http.get<unknown, { list: Formula[]; pagination: Pagination }>("/formulas", { params });
  },
  getById(id: string) {
    return http.get<unknown, Formula>(`/formulas/${id}`);
  },
  create(data: FormulaForm) {
    return http.post<unknown, Formula>("/formulas", data);
  },
  update(id: string, data: Partial<FormulaForm>) {
    return http.put<unknown, Formula>(`/formulas/${id}`, data);
  },
  delete(id: string) {
    return http.delete<unknown, { message: string }>(`/formulas/${id}`);
  },
  publish(id: string) {
    return http.put<unknown, FormulaVersion>(`/formulas/${id}/publish`);
  },
  getByMaterial(materialId: string) {
    return http.get<unknown, Formula[]>(`/formulas/by-material/${materialId}`);
  },
  getPriceQuote(id: string) {
    return http.get<unknown, PriceQuote>(`/formulas/${id}/price-quote`);
  },
  validateRatio(data: {
    materials: { materialId: string; materialName?: string; quantity: number }[];
    finishedWeight: number;
    ratioFactor: number;
    supplementRatioFactor: number;
  }) {
    return http.post<unknown, RatioFactorValidationResult>('/formulas/validate-ratio', data);
  },
};
