import http from "./http";
import type { Pagination } from "./http";
import type { FormulaTemplate, TemplateListParams } from "@/types/quickFormula";

export const formulaTemplateApi = {
  getList(params?: TemplateListParams) {
    return http.get<unknown, { list: FormulaTemplate[]; pagination: Pagination }>("/formula-templates", { params });
  },

  getById(id: string) {
    return http.get<unknown, FormulaTemplate>(`/formula-templates/${id}`);
  },

  create(data: Partial<FormulaTemplate>) {
    return http.post<unknown, FormulaTemplate>("/formula-templates", data);
  },

  update(id: string, data: Partial<FormulaTemplate>) {
    return http.put<unknown, FormulaTemplate>(`/formula-templates/${id}`, data);
  },

  delete(id: string) {
    return http.delete<unknown, { message: string }>(`/formula-templates/${id}`);
  },
};
