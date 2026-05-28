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
  formula: ["name", "code", "createdAt"],
  material: ["name", "code", "materialType"],
  "weekly-report": ["periodRange", "generatedAt"],
  "monthly-report": ["periodRange", "generatedAt"],
}

export const EXPORT_FIELD_CONFIG: Record<string, FieldGroup[]> = {
  formula: [
    {
      groupName: "核心字段",
      required: true,
      fields: [
        { key: "name", label: "配方名称", defaultSelected: true },
        { key: "code", label: "配方编码", defaultSelected: true },
        { key: "createdAt", label: "创建时间", defaultSelected: true },
      ],
    },
    {
      groupName: "业务信息",
      required: false,
      fields: [
        { key: "salesmanName", label: "业务员名称", defaultSelected: true },
        { key: "salesmanPhone", label: "业务员电话", defaultSelected: true },
        { key: "customerName", label: "客户名称", defaultSelected: true },
        { key: "processDescription", label: "工艺说明", defaultSelected: false },
        { key: "efficacyDescription", label: "功效描述", defaultSelected: false },
        { key: "applicableCrowd", label: "适用人群", defaultSelected: false },
        { key: "contraindications", label: "禁忌说明", defaultSelected: false },
        { key: "remark", label: "备注", defaultSelected: true },
      ],
    },
    {
      groupName: "配方数据",
      required: false,
      fields: [
        { key: "finishedWeight", label: "成品重量(g)", defaultSelected: true },
        { key: "herbList", label: "药材列表", defaultSelected: true },
        { key: "supplementList", label: "辅料列表", defaultSelected: true },
      ],
    },
    {
      groupName: "营养成分",
      required: false,
      fields: [
        { key: "protein", label: "蛋白质(g/100g)", defaultSelected: true },
        { key: "fat", label: "脂肪(g/100g)", defaultSelected: true },
        { key: "carbs", label: "碳水化合物(g/100g)", defaultSelected: true },
        { key: "sodium", label: "钠(mg/100g)", defaultSelected: true },
        { key: "energy", label: "能量(kJ/100g)", defaultSelected: true },
      ],
    },
    {
      groupName: "成本信息",
      required: false,
      fields: [
        { key: "cost", label: "成本估算(元)", defaultSelected: true },
        { key: "profitRate", label: "利润率(%)", defaultSelected: true },
        { key: "suggestedPrice", label: "建议售价(元)", defaultSelected: true },
      ],
    },
    {
      groupName: "版本信息",
      required: false,
      fields: [
        { key: "version", label: "版本号", defaultSelected: true },
        { key: "updatedAt", label: "最近更新时间", defaultSelected: true },
        { key: "createdBy", label: "创建人", defaultSelected: true },
      ],
    },
  ],
  material: [
    {
      groupName: "核心字段",
      required: true,
      fields: [
        { key: "name", label: "原料名称", defaultSelected: true },
        { key: "code", label: "原料编码", defaultSelected: true },
        { key: "materialType", label: "原料类型", defaultSelected: true },
      ],
    },
    {
      groupName: "库存信息",
      required: false,
      fields: [
        { key: "spec", label: "规格型号", defaultSelected: true },
        { key: "unit", label: "单位", defaultSelected: true },
        { key: "stockQuantity", label: "库存数量", defaultSelected: true },
        { key: "safetyStock", label: "安全库存", defaultSelected: false },
      ],
    },
    {
      groupName: "供应商信息",
      required: false,
      fields: [
        { key: "supplierName", label: "供应商名称", defaultSelected: true },
        { key: "supplierContact", label: "联系人", defaultSelected: false },
        { key: "supplierPhone", label: "联系电话", defaultSelected: false },
      ],
    },
    {
      groupName: "采购信息",
      required: false,
      fields: [
        { key: "unitPrice", label: "采购单价(元)", defaultSelected: true },
        { key: "lastPurchaseDate", label: "最近采购日期", defaultSelected: false },
      ],
    },
    {
      groupName: "营养成分",
      required: false,
      fields: [
        { key: "protein", label: "蛋白质(g/100g)", defaultSelected: false },
        { key: "fat", label: "脂肪(g/100g)", defaultSelected: false },
        { key: "carbs", label: "碳水化合物(g/100g)", defaultSelected: false },
        { key: "sodium", label: "钠(mg/100g)", defaultSelected: false },
        { key: "energy", label: "能量(kJ/100g)", defaultSelected: false },
      ],
    },
    {
      groupName: "其他信息",
      required: false,
      fields: [
        { key: "origin", label: "产地", defaultSelected: false },
        { key: "shelfLife", label: "保质期(月)", defaultSelected: false },
        { key: "createdAt", label: "创建时间", defaultSelected: true },
        { key: "updatedAt", label: "最近更新时间", defaultSelected: false },
      ],
    },
  ],
  "weekly-report": [
    {
      groupName: "核心字段",
      required: true,
      fields: [
        { key: "periodRange", label: "报告周期", defaultSelected: true },
        { key: "generatedAt", label: "生成时间", defaultSelected: true },
      ],
    },
    {
      groupName: "新增统计",
      required: false,
      fields: [
        { key: "newFormulasCount", label: "本周新增配方数", defaultSelected: true },
        { key: "newMaterialsCount", label: "本周新增原料数", defaultSelected: true },
        { key: "exportCount", label: "本周导出次数", defaultSelected: true },
      ],
    },
    {
      groupName: "排行榜",
      required: false,
      fields: [
        { key: "topFormulas", label: "配方Top5", defaultSelected: true },
        { key: "topMaterials", label: "原料消耗Top10", defaultSelected: false },
      ],
    },
    {
      groupName: "分析统计",
      required: false,
      fields: [
        { key: "salesmanStats", label: "各业务员配方统计", defaultSelected: true },
        { key: "formulaTypeRatio", label: "各类型配方占比", defaultSelected: false },
      ],
    },
    {
      groupName: "其他信息",
      required: false,
      fields: [
        { key: "anomalyAlerts", label: "异常提醒", defaultSelected: false },
        { key: "dataCutoffTime", label: "数据截止时间", defaultSelected: true },
        { key: "generatedBy", label: "生成人", defaultSelected: true },
        { key: "remark", label: "备注", defaultSelected: false },
      ],
    },
  ],
  "monthly-report": [
    {
      groupName: "核心字段",
      required: true,
      fields: [
        { key: "periodRange", label: "报告周期", defaultSelected: true },
        { key: "generatedAt", label: "生成时间", defaultSelected: true },
      ],
    },
    {
      groupName: "新增统计",
      required: false,
      fields: [
        { key: "newFormulasCount", label: "本月新增配方数", defaultSelected: true },
        { key: "newMaterialsCount", label: "本月新增原料数", defaultSelected: true },
        { key: "exportCount", label: "本月导出次数", defaultSelected: true },
      ],
    },
    {
      groupName: "排行榜",
      required: false,
      fields: [
        { key: "topFormulas", label: "配方Top10", defaultSelected: true },
        { key: "topMaterials", label: "原料消耗Top20", defaultSelected: false },
      ],
    },
    {
      groupName: "分析统计",
      required: false,
      fields: [
        { key: "salesmanStats", label: "各业务员配方统计", defaultSelected: true },
        { key: "formulaTypeRatio", label: "各类型配方占比", defaultSelected: true },
        { key: "trendAnalysis", label: "月度趋势分析", defaultSelected: false },
      ],
    },
    {
      groupName: "其他信息",
      required: false,
      fields: [
        { key: "anomalyAlerts", label: "异常提醒", defaultSelected: false },
        { key: "dataCutoffTime", label: "数据截止时间", defaultSelected: true },
        { key: "generatedBy", label: "生成人", defaultSelected: true },
        { key: "remark", label: "备注", defaultSelected: false },
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