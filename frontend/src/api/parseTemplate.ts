import http from "./http";

export interface ParseTemplate {
  id: string;
  name: string;
  category: "formula" | "nutrition" | "general";
  defaultProvider: string | null;
  defaultModel: string | null;
  customPrompt: string | null;
  fieldMapping: Record<string, string>;
  validationRules: Record<string, any>;
  isPreset: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParseTemplateForm {
  name: string;
  category?: "formula" | "nutrition" | "general";
  defaultProvider?: string | null;
  defaultModel?: string | null;
  customPrompt?: string | null;
  fieldMapping?: Record<string, string>;
  validationRules?: Record<string, any>;
}

export const parseTemplateApi = {
  getList(params?: { keyword?: string; category?: string; page?: number; pageSize?: number }) {
    return http.get<any, { list: ParseTemplate[]; pagination: any }>("/parse-templates", { params });
  },
  getById(id: string) {
    return http.get<any, ParseTemplate>(`/parse-templates/${id}`);
  },
  create(data: ParseTemplateForm) {
    return http.post<any, ParseTemplate>("/parse-templates", data);
  },
  update(id: string, data: Partial<ParseTemplateForm> & { isActive?: boolean }) {
    return http.put<any, ParseTemplate>(`/parse-templates/${id}`, data);
  },
  delete(id: string) {
    return http.delete<any, { success: boolean; message: string }>(`/parse-templates/${id}`);
  },
};
