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
  createdBy: string;
  createdByName: string;
  createdByRole: string;
  createdAt: string;
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

export const materialApi = {
  getList(params?: { keyword?: string; page?: number; pageSize?: number; scope?: string }) {
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
};
