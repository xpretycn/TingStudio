import http from "./http";

export interface EnumOption {
  id: string;
  category: "appearance" | "taste" | "efficacy";
  label: string;
  value: string;
  sortOrder: number;
  isActive: boolean;
}

export interface EnumCategoryMap {
  appearance: EnumOption[];
  taste: EnumOption[];
  efficacy: EnumOption[];
}

export const enumApi = {
  getAll() {
    return http.get<unknown, EnumCategoryMap>("/enums");
  },
  getByCategory(category: string, activeOnly = false) {
    return http.get<unknown, EnumOption[]>(`/enums/${category}`, { params: { activeOnly } });
  },
  create(data: { category: string; label: string; value: string }) {
    return http.post<unknown, EnumOption>("/enums", data);
  },
  update(id: string, data: Partial<Pick<EnumOption, "label" | "value" | "isActive">>) {
    return http.put<unknown, EnumOption>(`/enums/${id}`, data);
  },
  delete(id: string) {
    return http.delete<unknown, { deletedId: string; referenceCount: number }>(`/enums/${id}`);
  },
};
