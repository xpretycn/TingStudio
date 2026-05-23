import http from "./http";

export interface Material {
  id: string;
  name: string;
  code: string;
  unit: string;
  stock: number;
  materialType: string;
  unitPrice?: number | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  isLatest: number;
  isDeleted: number;
  isOwner: boolean;
  referenceCount: number;
  totalVersions: number;
  hasNewerVersion: boolean;
  nutrition?: Record<string, number>;
  referencedFormulas?: { id: string; name: string }[];
  status: "draft" | "pending_review" | "published";
  reviewLogs?: MaterialReviewLog[];
}

export interface MaterialForm {
  name: string;
  code: string;
  unit?: string;
  stock?: number;
  materialType?: string;
  unitPrice?: number;
}

export interface MaterialVersion {
  id: string;
  version: number;
  isLatest: number;
  changesSummary: string;
  changesDetail?: Array<{ field: string; label: string; old: any; new: any }>;
  createdBy: string;
  createdByName: string;
  createdByRole: string;
  createdAt: string;
}

export interface CompareDiffItem {
  field: string;
  label: string;
  left: any;
  right: any;
  leftDisplay: string;
  rightDisplay: string;
  change: string;
  type: "increase" | "decrease" | "unchanged" | "new" | "deleted";
}

export interface CompareResult {
  left: { versionId: string; version: number; name: string };
  right: { versionId: string; version: number; name: string };
  diff: {
    basic: CompareDiffItem[];
    nutrition: CompareDiffItem[];
  };
}

export interface MaterialReference {
  materialId: string;
  currentVersion: number;
  referenceCount: number;
  referencedFormulas: { formulaId: string; formulaName: string }[];
}

export interface UpdateResult {
  id: string;
  version: number;
  isLatest: number;
  versionAction: "updated" | "created";
  previousVersionId?: string;
}

export interface MaterialReviewLog {
  reviewLogId: string;
  materialId: string;
  reviewerId: string;
  reviewerName: string | null;
  reviewerDisplayName?: string;
  action: "submit" | "approve" | "reject" | "publish";
  comment: string | null;
  createdAt: string;
}

export const materialApi = {
  getList(params?: { keyword?: string; page?: number; pageSize?: number; scope?: string; status?: string }) {
    return http.get<any, { list: Material[]; pagination: any }>("/materials", { params });
  },
  getById(id: string) {
    return http.get<any, Material>(`/materials/${id}`);
  },
  create(data: MaterialForm) {
    return http.post<any, Material>("/materials", data);
  },
  update(id: string, data: Partial<MaterialForm>) {
    return http.put<any, UpdateResult>(`/materials/${id}`, data);
  },
  delete(id: string) {
    return http.delete<any, { success: boolean; message: string }>(`/materials/${id}`);
  },
  getNextCode(name: string) {
    return http.get<any, { code: string }>("/materials/next-code", { params: { name } });
  },
  getByFormula(formulaId: string) {
    return http.get<any, { success: boolean; data: Material[] }>(`/materials/by-formula/${formulaId}`);
  },
  getStats() {
    return http.get<any, { total: number; herbCount: number; supplementCount: number; nutritionCount: number }>(
      "/materials/stats",
    );
  },
  getVersions(id: string) {
    return http.get<any, { materialName: string; materialCode: string; currentVersion: number; versions: MaterialVersion[] }>(
      `/materials/${id}/versions`,
    );
  },
  getVersionDetail(id: string, versionId: string) {
    return http.get<any, Material>(`/materials/${id}/versions/${versionId}`);
  },
  getReferences(id: string) {
    return http.get<any, MaterialReference>(`/materials/${id}/references`);
  },
  compareVersions(id: string, v1: string, v2: string) {
    return http.get<any, CompareResult>(`/materials/${id}/versions/compare`, { params: { v1, v2 } });
  },
  submitReview(id: string, comment?: string) {
    return http.post(`/materials/${id}/submit-review`, { comment });
  },
  approve(id: string, comment?: string) {
    return http.put(`/materials/${id}/approve`, { comment });
  },
  reject(id: string, comment: string) {
    return http.put(`/materials/${id}/reject`, { comment });
  },
  publish(id: string, comment?: string) {
    return http.put(`/materials/${id}/publish`, { comment });
  },
  getPendingReviews(params?: { keyword?: string; page?: number; pageSize?: number }) {
    return http.get<any, { list: Material[]; pagination: any }>("/materials/pending-review", { params });
  },
  getReviewLogs(id: string) {
    return http.get<any, MaterialReviewLog[]>(`/materials/${id}/review-logs`);
  },
};
