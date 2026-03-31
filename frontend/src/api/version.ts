import http from './http'

export interface FormulaVersion {
  versionId: string
  formulaId: string
  versionNumber: string
  versionName: string | null
  changesJson: string | null
  snapshotJson: string
  status: 'draft' | 'published' | 'archived'
  isCurrent: number
  createdBy: string
  createdAt: string
  changes?: any[]
  snapshot?: any
}

export const versionApi = {
  getList(formulaId: string, params?: { status?: string }) {
    // axios 拦截器会提取 res.data，所以这里直接返回内部的数据结构
    return http.get<any, FormulaVersion[]>(`/versions/formula/${formulaId}`, { params })
  },
  getById(versionId: string) {
    return http.get<any, FormulaVersion>(`/versions/detail/${versionId}`)
  },
  create(formulaId: string, data?: { versionName?: string; versionReason?: string; status?: string }) {
    return http.post<any, { versionId: string; versionNumber: string }>(`/versions/formula/${formulaId}`, data)
  },
  publish(versionId: string) {
    return http.put<any, { message: string }>(`/versions/publish/${versionId}`)
  },
  compare(formulaId: string, versionA: string, versionB: string) {
    return http.get<any, any>(`/versions/compare/${formulaId}`, { params: { versionA, versionB } })
  },
}
