// 营养来源类型、图标、可信度等共享常量
// 禁止在各组件中重复定义，统一从此文件导入

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  manual: "手工录入",
  tianapi: "天行API",
  seed: "种子库",
  ai: "AI 估算",
  excel_import: "Excel 导入",
  other: "其他",
}

export const SOURCE_TYPE_SHORT_LABELS: Record<string, string> = {
  manual: "手工",
  tianapi: "API",
  seed: "种子",
  ai: "AI",
  excel_import: "Excel",
  other: "其他",
}

export const SOURCE_TYPE_ICONS: Record<string, string> = {
  manual: "edit-1",
  tianapi: "cloud",
  seed: "root-list",
  ai: "spark",
  excel_import: "upload",
  other: "ellipsis",
}

export const CONFIDENCE_LABELS: Record<string, string> = {
  high: "高可信",
  medium: "中可信",
  low: "低可信",
}

export const CONFIDENCE_SHORT_LABELS: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
}

export const CONFIDENCE_THEMES: Record<string, "success" | "warning" | "default"> = {
  high: "success",
  medium: "warning",
  low: "default",
}

export const VALID_STRATEGIES = ["best-deviation", "manual", "highest-confidence", "newest"] as const
export type BatchStrategy = (typeof VALID_STRATEGIES)[number]

/**
 * 标记当前为"演示数据"的来源类型集合。
 * 用于在 UI 上给用户明确的提示——这些来源的数据不是从真实外部接口拉取的，
 * 而是来自本地 mock / seed JSON / 兜底数据，避免误以为来源于真实接口。
 */
export const DEMO_SOURCE_TYPES: ReadonlySet<string> = new Set(["tianapi"])

export const SOURCE_TYPE_OPTIONS = [
  { value: "manual", label: "手工录入" },
  { value: "tianapi", label: "天行" },
  { value: "seed", label: "种子库" },
  { value: "ai", label: "AI 估算" },
  { value: "excel_import", label: "Excel" },
  { value: "other", label: "其他" },
]
