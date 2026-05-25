import http from "./http";
import type { Pagination } from "./http";

export interface ParseTemplate {
  id: string;
  name: string;
  category: "formula" | "nutrition" | "general";
  defaultProvider: string | null;
  defaultModel: string | null;
  customPrompt: string | null;
  fieldMapping: Record<string, string>;
  validationRules: Record<string, unknown>;
  isPreset: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ParseTemplateForm {
  name: string;
  category?: "formula" | "nutrition" | "general";
  defaultProvider?: string | null;
  defaultModel?: string | null;
  customPrompt?: string | null;
  fieldMapping?: Record<string, string>;
  validationRules?: Record<string, unknown>;
}

export const parseTemplateApi = {
  getList(params?: { keyword?: string; category?: string; page?: number; pageSize?: number }) {
    return http.get<unknown, { list: ParseTemplate[]; pagination: Pagination }>("/parse-templates", { params });
  },
  getById(id: string) {
    return http.get<unknown, ParseTemplate>(`/parse-templates/${id}`);
  },
  create(data: ParseTemplateForm) {
    return http.post<unknown, ParseTemplate>("/parse-templates", data);
  },
  update(id: string, data: Partial<ParseTemplateForm> & { isActive?: boolean }) {
    return http.put<unknown, ParseTemplate>(`/parse-templates/${id}`, data);
  },
  delete(id: string) {
    return http.delete<unknown, { success: boolean; message: string }>(`/parse-templates/${id}`);
  },
};
