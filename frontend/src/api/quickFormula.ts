import http from '@/api/http'
import type { PublishData } from '@/types/quickFormula'

export function getQuickFormulaList(params?: { keyword?: string; page?: number; pageSize?: number }) {
  return http.get('/quick-formulas', { params, _logLabel: '获取快速配方列表' })
}

export function getQuickFormulaById(id: string) {
  return http.get(`/quick-formulas/${id}`, { _logLabel: '获取快速配方详情' })
}

export function createQuickFormula(data: { name: string }) {
  return http.post('/quick-formulas', data, { _logLabel: '创建快速配方' })
}

export function updateQuickFormula(id: string, data: Record<string, unknown>) {
  return http.put(`/quick-formulas/${id}`, data, { _logLabel: '更新快速配方' })
}

export function deleteQuickFormula(id: string) {
  return http.delete(`/quick-formulas/${id}`, { _logLabel: '删除快速配方' })
}

export function publishQuickFormula(id: string, data: PublishData) {
  return http.post(`/quick-formulas/${id}/publish`, data, { _logLabel: '发布快速配方' })
}
