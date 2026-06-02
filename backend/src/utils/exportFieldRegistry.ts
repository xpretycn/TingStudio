/**
 * 导出字段注册表
 * 中心化定义所有可导出字段，供模板编辑器和导出引擎共同使用
 */

export interface ExportFieldDef {
  key: string;
  label: string;
  group: string;
  groupName: string;
  category: 'formula' | 'material' | 'weekly-report' | 'monthly-report';
  defaultSelected?: boolean;
  dependsOn?: string[];
}

export interface TemplateConfig {
  selectedFields: string[];
  requiredFields: string[];
  exportFormat: 'pdf' | 'excel';
  orientation: 'portrait' | 'landscape';
  pageSize: string;
  fontSize: number;
  includeHeader: boolean;
  includeFooter: boolean;
}

// ==================== 配方字段 ====================

export const FORMULA_FIELDS: ExportFieldDef[] = [
  // 基本信息
  { key: 'name', label: '配方名称', group: 'basic', groupName: '基本信息', category: 'formula', defaultSelected: true },
  { key: 'code', label: '配方编码', group: 'basic', groupName: '基本信息', category: 'formula', defaultSelected: true },
  { key: 'salesmanName', label: '业务员', group: 'basic', groupName: '基本信息', category: 'formula', defaultSelected: true },
  { key: 'salesmanPhone', label: '业务员电话', group: 'basic', groupName: '基本信息', category: 'formula' },
  { key: 'customerName', label: '客户名称', group: 'basic', groupName: '基本信息', category: 'formula' },
  { key: 'finishedWeight', label: '成品重量(g)', group: 'basic', groupName: '基本信息', category: 'formula', defaultSelected: true },
  { key: 'version', label: '版本号', group: 'basic', groupName: '基本信息', category: 'formula', defaultSelected: true },
  { key: 'versionReason', label: '版本说明', group: 'basic', groupName: '基本信息', category: 'formula' },
  { key: 'createdAt', label: '创建时间', group: 'basic', groupName: '基本信息', category: 'formula' },
  { key: 'updatedAt', label: '更新时间', group: 'basic', groupName: '基本信息', category: 'formula' },
  { key: 'createdBy', label: '创建人', group: 'basic', groupName: '基本信息', category: 'formula' },
  { key: 'description', label: '备注说明', group: 'other', groupName: '其他', category: 'formula' },
  { key: 'preparationMethod', label: '制法', group: 'other', groupName: '其他', category: 'formula' },

  // 原料清单
  { key: 'materialList', label: '原料清单表格', group: 'materials', groupName: '原料清单', category: 'formula', defaultSelected: true },

  // 报价信息
  { key: 'priceInfo', label: '报价信息区域', group: 'price', groupName: '报价信息', category: 'formula', defaultSelected: true, dependsOn: ['materialList'] },

  // 营养数据
  { key: 'nutritionTable', label: '营养数据表', group: 'nutrition', groupName: '营养数据', category: 'formula', defaultSelected: true, dependsOn: ['materialList'] },
  { key: 'nrvTable', label: '营养成分表(NRV%)', group: 'nutrition', groupName: '营养数据', category: 'formula', defaultSelected: true, dependsOn: ['nutritionTable'] },

  // 页脚
  { key: 'usageNotes', label: '使用说明', group: 'footer', groupName: '页脚', category: 'formula', defaultSelected: true },
];

// ==================== 原料字段 ====================

export const MATERIAL_FIELDS: ExportFieldDef[] = [
  // 基本信息
  { key: 'name', label: '原料名称', group: 'basic', groupName: '基本信息', category: 'material', defaultSelected: true },
  { key: 'code', label: '原料编码', group: 'basic', groupName: '基本信息', category: 'material', defaultSelected: true },
  { key: 'materialType', label: '类型', group: 'basic', groupName: '基本信息', category: 'material', defaultSelected: true },
  { key: 'spec', label: '规格', group: 'basic', groupName: '基本信息', category: 'material' },
  { key: 'unit', label: '单位', group: 'basic', groupName: '基本信息', category: 'material', defaultSelected: true },

  // 库存信息
  { key: 'stockQuantity', label: '库存数量', group: 'stock', groupName: '库存信息', category: 'material' },
  { key: 'supplierName', label: '供应商', group: 'stock', groupName: '库存信息', category: 'material' },
  { key: 'unitPrice', label: '单价(元)', group: 'stock',groupName: '库存信息', category: 'material' },
  { key: 'stockStatus', label: '库存状态', group: 'stock', groupName: '库存信息', category: 'material' },

  // 营养数据
  { key: 'nutrition', label: '营养数据', group: 'nutrition', groupName: '营养数据', category: 'material' },
];

// ==================== 报告字段（周报/月报共用）====================

export const REPORT_FIELDS: ExportFieldDef[] = [
  // 基本信息
  { key: 'periodRange', label: '统计周期', group: 'basic', groupName: '基本信息', category: 'weekly-report', defaultSelected: true },
  { key: 'generatedAt', label: '生成时间', group: 'basic', groupName: '基本信息', category: 'weekly-report', defaultSelected: true },
  { key: 'generatedBy', label: '生成人', group: 'basic', groupName: '基本信息', category: 'weekly-report' },

  // 统计数据
  { key: 'newFormulasCount', label: '新增配方数', group: 'stats', groupName: '统计数据', category: 'weekly-report', defaultSelected: true },
  { key: 'newMaterialsCount', label: '新增原料数', group: 'stats', groupName: '统计数据', category: 'weekly-report', defaultSelected: true },
  { key: 'exportCount', label: '导出次数', group: 'stats', groupName: '统计数据', category: 'weekly-report', defaultSelected: true },
  { key: 'topFormulas', label: '热门配方 TOP5', group: 'stats', groupName: '统计数据', category: 'weekly-report' },
  { key: 'salesmanStats', label: '业务员统计', group: 'stats', groupName: '统计数据', category: 'weekly-report' },
  { key: 'dataCutoffTime', label: '数据截止时间', group: 'stats', groupName: '统计数据', category: 'weekly-report' },
];

// 月报复用周报字段，category 不同
export const MONTHLY_REPORT_FIELDS: ExportFieldDef[] = REPORT_FIELDS.map(f => ({
  ...f,
  category: 'monthly-report' as const,
}));

// ==================== 工具函数 ====================

/** 获取指定类别的所有字段 */
export function getFieldsByCategory(category: 'formula' | 'material' | 'weekly-report' | 'monthly-report'): ExportFieldDef[] {
  switch (category) {
    case 'formula': return FORMULA_FIELDS;
    case 'material': return MATERIAL_FIELDS;
    case 'weekly-report': return REPORT_FIELDS;
    case 'monthly-report': return MONTHLY_REPORT_FIELDS;
    default: return [];
  }
}

/** 获取字段的分组列表 */
export function getFieldGroups(fields: ExportFieldDef[]): Map<string, { name: string; fields: ExportFieldDef[] }> {
  const groups = new Map<string, { name: string; fields: ExportFieldDef[] }>();
  for (const field of fields) {
    if (!groups.has(field.group)) {
      groups.set(field.group, { name: field.groupName, fields: [] });
    }
    groups.get(field.group)!.fields.push(field);
  }
  return groups;
}

/** 获取默认选中的字段 */
export function getDefaultSelectedFields(category: 'formula' | 'material' | 'weekly-report' | 'monthly-report'): string[] {
  return getFieldsByCategory(category)
    .filter(f => f.defaultSelected)
    .map(f => f.key);
}

/** 获取完整的默认 TemplateConfig */
export function getDefaultTemplateConfig(
  category: 'formula' | 'material' | 'weekly-report' | 'monthly-report',
  exportType: 'pdf' | 'excel'
): TemplateConfig {
  return {
    selectedFields: getDefaultSelectedFields(category),
    requiredFields: getFieldsByCategory(category)
      .filter(f => f.key === 'name')
      .map(f => f.key),
    exportFormat: exportType,
    orientation: exportType === 'pdf' ? 'portrait' : 'landscape',
    pageSize: 'A4',
    fontSize: 10,
    includeHeader: true,
    includeFooter: true,
  };
}

/** 检查字段依赖关系，返回需要额外选中的字段 */
export function resolveFieldDependencies(selectedFields: string[], allFields: ExportFieldDef[]): string[] {
  const resolved = new Set(selectedFields);
  let changed = true;
  while (changed) {
    changed = false;
    for (const field of allFields) {
      if (resolved.has(field.key) && field.dependsOn) {
        for (const dep of field.dependsOn) {
          if (!resolved.has(dep)) {
            resolved.add(dep);
            changed = true;
          }
        }
      }
    }
  }
  return Array.from(resolved);
}
