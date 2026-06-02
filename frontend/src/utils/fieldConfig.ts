export interface FieldConfig {
  key: string
  label: string
  defaultSelected: boolean
}

export interface FieldGroup {
  groupName: string
  required: boolean
  fields: FieldConfig[]
}

const CORE_FIELD_KEYS: Record<string, string[]> = {
  formula: ["name"],
  material: ["name"],
  "weekly-report": ["periodRange", "generatedAt"],
  "monthly-report": ["periodRange", "generatedAt"],
}

export const EXPORT_FIELD_CONFIG: Record<string, FieldGroup[]> = {
  formula: [
    {
      groupName: "基本信息",
      required: false,
      fields: [
        { key: "name", label: "配方名称", defaultSelected: true },
        { key: "code", label: "配方编码", defaultSelected: true },
        { key: "salesmanName", label: "业务员", defaultSelected: true },
        { key: "salesmanPhone", label: "业务员电话", defaultSelected: false },
        { key: "customerName", label: "客户名称", defaultSelected: false },
        { key: "finishedWeight", label: "成品重量(g)", defaultSelected: true },
        { key: "version", label: "版本号", defaultSelected: true },
        { key: "versionReason", label: "版本说明", defaultSelected: false },
        { key: "createdAt", label: "创建时间", defaultSelected: false },
        { key: "updatedAt", label: "更新时间", defaultSelected: false },
        { key: "createdBy", label: "创建人", defaultSelected: false },
      ],
    },
    {
      groupName: "其他",
      required: false,
      fields: [
        { key: "description", label: "备注说明", defaultSelected: false },
        { key: "preparationMethod", label: "制法", defaultSelected: false },
      ],
    },
    {
      groupName: "原料清单",
      required: true,
      fields: [
        { key: "materialList", label: "原料清单表格", defaultSelected: true },
      ],
    },
    {
      groupName: "报价信息",
      required: false,
      fields: [
        { key: "priceInfo", label: "报价信息区域", defaultSelected: true },
      ],
    },
    {
      groupName: "营养数据",
      required: false,
      fields: [
        { key: "nutritionTable", label: "营养数据表", defaultSelected: true },
        { key: "nrvTable", label: "营养成分表(NRV%)", defaultSelected: true },
      ],
    },
    {
      groupName: "页脚",
      required: false,
      fields: [
        { key: "usageNotes", label: "使用说明", defaultSelected: true },
      ],
    },
  ],
  material: [
    {
      groupName: "基本信息",
      required: true,
      fields: [
        { key: "name", label: "原料名称", defaultSelected: true },
        { key: "code", label: "原料编码", defaultSelected: true },
        { key: "materialType", label: "类型", defaultSelected: true },
        { key: "spec", label: "规格", defaultSelected: false },
        { key: "unit", label: "单位", defaultSelected: true },
      ],
    },
    {
      groupName: "库存信息",
      required: false,
      fields: [
        { key: "stockQuantity", label: "库存数量", defaultSelected: false },
        { key: "supplierName", label: "供应商", defaultSelected: false },
        { key: "unitPrice", label: "单价(元)", defaultSelected: false },
        { key: "stockStatus", label: "库存状态", defaultSelected: false },
      ],
    },
    {
      groupName: "营养数据",
      required: false,
      fields: [
        { key: "nutrition", label: "营养数据", defaultSelected: false },
      ],
    },
  ],
  "weekly-report": [
    {
      groupName: "基本信息",
      required: true,
      fields: [
        { key: "periodRange", label: "统计周期", defaultSelected: true },
        { key: "generatedAt", label: "生成时间", defaultSelected: true },
        { key: "generatedBy", label: "生成人", defaultSelected: false },
      ],
    },
    {
      groupName: "统计数据",
      required: false,
      fields: [
        { key: "newFormulasCount", label: "新增配方数", defaultSelected: true },
        { key: "newMaterialsCount", label: "新增原料数", defaultSelected: true },
        { key: "exportCount", label: "导出次数", defaultSelected: true },
        { key: "topFormulas", label: "热门配方 TOP5", defaultSelected: false },
        { key: "salesmanStats", label: "业务员统计", defaultSelected: false },
        { key: "dataCutoffTime", label: "数据截止时间", defaultSelected: false },
      ],
    },
  ],
  "monthly-report": [
    {
      groupName: "基本信息",
      required: true,
      fields: [
        { key: "periodRange", label: "统计周期", defaultSelected: true },
        { key: "generatedAt", label: "生成时间", defaultSelected: true },
        { key: "generatedBy", label: "生成人", defaultSelected: false },
      ],
    },
    {
      groupName: "统计数据",
      required: false,
      fields: [
        { key: "newFormulasCount", label: "新增配方数", defaultSelected: true },
        { key: "newMaterialsCount", label: "新增原料数", defaultSelected: true },
        { key: "exportCount", label: "导出次数", defaultSelected: true },
        { key: "topFormulas", label: "热门配方 TOP5", defaultSelected: false },
        { key: "salesmanStats", label: "业务员统计", defaultSelected: false },
        { key: "dataCutoffTime", label: "数据截止时间", defaultSelected: false },
      ],
    },
  ],
}

export const CATEGORY_META: Record<string, { name: string; icon: string }> = {
  formula: { name: "配方导出模板", icon: "layers" },
  material: { name: "原料导出模板", icon: "inbox" },
  "weekly-report": { name: "周报导出模板", icon: "chart-bar" },
  "monthly-report": { name: "月报导出模板", icon: "chart-line" },
}

export function getDefaultFields(category: string): string[] {
  const groups = EXPORT_FIELD_CONFIG[category]
  if (!groups) return []
  const allFields: string[] = []
  for (const group of groups) {
    for (const field of group.fields) {
      if (field.defaultSelected || group.required) {
        allFields.push(field.key)
      }
    }
  }
  return allFields
}

export function getTotalFieldCount(category: string): number {
  const groups = EXPORT_FIELD_CONFIG[category]
  if (!groups) return 0
  let count = 0
  for (const group of groups) {
    count += group.fields.length
  }
  return count
}

export function getSelectedFieldCount(category: string, selectedFields: string[]): number {
  const allFields = getAllFieldKeys(category)
  return selectedFields.filter((f) => allFields.includes(f)).length
}

export function getAllFieldKeys(category: string): string[] {
  const groups = EXPORT_FIELD_CONFIG[category]
  if (!groups) return []
  const keys: string[] = []
  for (const group of groups) {
    for (const field of group.fields) {
      keys.push(field.key)
    }
  }
  return keys
}

export function getRequiredFieldKeys(category: string): string[] {
  return CORE_FIELD_KEYS[category] || []
}
