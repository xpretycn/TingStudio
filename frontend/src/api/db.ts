import http from "./http"
import type { Pagination } from "./http"

export interface DbInfo {
  dbType: string
  dbPath: string
  fileSize: string
  fileSizeBytes: number
  tableCount: number
  totalRows: number
  lastUpdated: string | null
}

export interface TableInfo {
  name: string
  rowCount: number
  columnCount: number
  indexCount: number
}

export interface ColumnInfo {
  cid: number
  name: string
  type: string
  notnull: number
  dfltValue: unknown
  pk: number
}

export interface ColumnMeta {
  name: string
  type: string
  notnull: boolean
  dfltValue: unknown
  pk: boolean
  isJson?: boolean
}

export interface IndexInfo {
  name: string
  tblName: string
  sql: string | null
  unique: boolean
  columns: string[]
}

export interface ForeignKeyInfo {
  from: string
  table: string
  to: string
}

export interface TableSchema {
  name: string
  columns: ColumnInfo[]
  indexes: IndexInfo[]
  foreignKeys: ForeignKeyInfo[]
}

export function getDbInfo() {
  return http.get<unknown, DbInfo>("/db/info")
}

export function getTableList() {
  return http.get<unknown, TableInfo[]>("/db/tables")
}

export function getTableSchema(tableName: string) {
  return http.get<unknown, TableSchema>(`/db/tables/${tableName}/schema`)
}

export interface TableDataResult {
  columns: ColumnMeta[]
  rows: Record<string, unknown>[]
  pagination: Pagination
}

export interface TableDataParams {
  page?: number
  pageSize?: number
  search?: string
  sort?: string
  order?: string
}

export function getTableData(tableName: string, params?: TableDataParams) {
  return http.get<unknown, TableDataResult>(`/db/tables/${tableName}/data`, { params })
}

export interface BackupInfo {
  fileName: string
  version: string
  exportedAt: string
  tableCount: number
  totalRows: number
  hash: string
  fileSize: string
  fileSizeFormatted: string
  createdAt: string
}

export function getBackupList() {
  return http.get<unknown, BackupInfo[]>("/db/backups")
}

export function createBackup() {
  return http.post<unknown, Record<string, unknown>>("/db/backups")
}

export function downloadBackup(fileName: string) {
  return http.get<unknown, Blob>(`/db/backups/${encodeURIComponent(fileName)}/download`, {
    responseType: "blob",
  })
}

export function restoreBackup(fileName: string) {
  return http.post<unknown, Record<string, unknown>>(`/db/backups/${encodeURIComponent(fileName)}/restore`)
}

export function deleteBackup(fileName: string) {
  return http.delete<unknown, Record<string, unknown>>(`/db/backups/${encodeURIComponent(fileName)}`)
}

export function uploadAndRestore(file: File) {
  const formData = new FormData()
  formData.append("backup", file)
  return http.post<unknown, Record<string, unknown>>("/db/backups/upload-restore", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120_000,
  })
}

export interface ScriptContent {
  content: string
  scriptPath: string
}

export function getScriptContent(scriptId: string) {
  return http.get<unknown, ScriptContent>(`/db/scripts/${encodeURIComponent(scriptId)}/content`)
}

export function updateScriptContent(scriptId: string, content: string, changeSummary?: string) {
  return http.put<unknown, { scriptPath: string }>(`/db/scripts/${encodeURIComponent(scriptId)}/content`, { content, changeSummary })
}

export interface ScriptVersion {
  id: string
  scriptId: string
  scriptName: string
  scriptPath: string
  content: string
  savedBy: string
  savedAt: string
  changeSummary: string | null
}

export function getScriptVersions(scriptId: string, limit?: number) {
  return http.get<unknown, ScriptVersion[]>(`/db/scripts/${encodeURIComponent(scriptId)}/versions`, { params: { limit } })
}

export function restoreScriptVersion(scriptId: string, versionId: string) {
  return http.post<unknown, { scriptPath: string }>(`/db/scripts/${encodeURIComponent(scriptId)}/versions/restore`, { versionId })
}
