import http from "./http";
import type { Pagination } from "./http";

export interface Material {
  id: string;
  name: string;
  code: string;
  unit: string;
  stock: number;
  materialType: string;
  unitPrice?: number | null;
  createdBy: string;
  createdByName?: string;
  createdByAvatar?: string;
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
  remark?: string;
  referencedFormulas?: { id: string; name: string; formulaCode: string; version: number; status: string }[];
  status: "draft" | "pending_review" | "published";
  reviewLogs?: MaterialReviewLog[];
  appearance: string[] | null;
  taste: string[] | null;
  efficacy: string[] | null;
}

export interface MaterialForm {
  name: string;
  code: string;
  unit?: string;
  stock?: number;
  materialType?: string;
  unitPrice?: number;
  appearance?: string[];
  taste?: string[];
  efficacy?: string[];
}

export interface MaterialVersion {
  id: string;
  version: number;
  isLatest: number;
  name?: string;
  changesSummary: string;
  changesDetail?: Array<{ field: string; label: string; old: unknown; new: unknown }>;
  createdBy: string;
  createdByName: string;
  createdByRole: string;
  createdAt: string;
}

export interface CompareDiffItem {
  field: string;
  label: string;
  left: unknown;
  right: unknown;
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

interface MaterialReference {
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
    return http.get<unknown, { list: Material[]; pagination: Pagination }>("/materials", { params });
  },
  getById(id: string) {
    return http.get<unknown, Material>(`/materials/${id}`);
  },
  create(data: MaterialForm) {
    return http.post<unknown, Material>("/materials", data);
  },
  update(id: string, data: Partial<MaterialForm>) {
    return http.put<unknown, UpdateResult>(`/materials/${id}`, data);
  },
  delete(id: string) {
    return http.delete<unknown, { success: boolean; message: string }>(`/materials/${id}`);
  },
  getNextCode(name: string) {
    return http.get<unknown, { code: string }>("/materials/next-code", { params: { name } });
  },
  getByFormula(formulaId: string) {
    return http.get<unknown, Material[]>(`/materials/by-formula/${formulaId}`);
  },
  getStats() {
    return http.get<unknown, { total: number; herbCount: number; supplementCount: number; nutritionCount: number }>(
      "/materials/stats",
    );
  },
  getVersions(id: string) {
    return http.get<unknown, { materialName: string; materialCode: string; currentVersion: number; versions: MaterialVersion[] }>(
      `/materials/${id}/versions`,
    );
  },
  getVersionDetail(id: string, versionId: string) {
    return http.get<unknown, Material>(`/materials/${id}/versions/${versionId}`);
  },
  getReferences(id: string) {
    return http.get<unknown, MaterialReference>(`/materials/${id}/references`);
  },
  compareVersions(id: string, v1: string, v2: string) {
    return http.get<unknown, CompareResult>(`/materials/${id}/versions/compare`, { params: { v1, v2 } });
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
  getPendingReviews(params?: { keyword?: string; page?: number; pageSize?: number; sortBy?: string; sortOrder?: string }) {
    return http.get<unknown, { list: Material[]; pagination: Pagination }>("/materials/pending-review", { params });
  },
  getReviewLogs(id: string) {
    return http.get<unknown, MaterialReviewLog[]>(`/materials/${id}/review-logs`);
  },

  getMyMaterialCounts() {
    return http.get<unknown, Record<string, number>>("/materials/my-counts");
  },
};
