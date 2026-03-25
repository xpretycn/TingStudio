// 扩展类型定义 - 新功能模块

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. 业务员数据管理体系
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 业务员实体
 */
export interface Salesman {
  id: string;
  name: string;
  code: string;              // 业务员工号
  department?: string;        // 所属部门
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  linkedFormulists: string[]; // 关联的配方师ID列表
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * 业务员-配方师对接关系
 */
export interface SalesmanFormulistRelation {
  id: string;
  salesmanId: string;
  formulistId: string;
  cooperationMode: 'direct' | 'indirect';  // 直接对接/间接对接
  priority: number;  // 优先级 1-5
  communicationLog: CommunicationLog[];
  createdAt: string;
}

/**
 * 沟通记录
 */
export interface CommunicationLog {
  id: string;
  timestamp: string;
  type: 'email' | 'phone' | 'meeting' | 'message';
  content: string;
  attachmentUrls?: string[];
  createdBy: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. 配方版本控制与对比
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 配方版本
 */
export interface FormulaVersion {
  versionId: string;
  formulaId: string;
  versionNumber: string;  // 版本号（如 v1.0, v1.1, v2.0）
  versionName: string;    // 版本名称（如"2024春季版本"）
  changes: VersionChange[];  // 变更记录
  createdBy: string;    // 创建人（配方师ID）
  createdAt: string;
  status: 'draft' | 'published' | 'archived';
  isCurrent: boolean;   // 是否为当前版本
  snapshot: FormulaSnapshot;  // 配方快照数据
}

/**
 * 版本变更记录
 */
export interface VersionChange {
  changeId: string;
  field: string;        // 变更字段
  fieldLabel: string;   // 字段显示名称
  oldValue: any;       // 旧值
  newValue: any;       // 新值
  changeType: 'add' | 'modify' | 'delete';
  timestamp: string;
  changedBy: string;    // 变更人
}

/**
 * 配方快照
 */
export interface FormulaSnapshot {
  name: string;
  salesmanId: string;
  salesmanName: string;
  materials: MaterialItem[];
  description: string;
  formulaData: any;  // 完整的配方数据
  calculatedFields?: any;  // 计算字段（如营养成分）
}

/**
 * 版本对比结果
 */
export interface FormulaVersionDiff {
  diffId: string;
  versionA: FormulaVersion;
  versionB: FormulaVersion;
  differences: DiffItem[];
  summary: DiffSummary;
}

/**
 * 差异项
 */
export interface DiffItem {
  fieldId: string;
  fieldLabel: string;
  fieldType: 'salesman' | 'material' | 'materialQuantity' | 'description' | 'nutrition';
  changes: {
    oldValue: any;
    newValue: any;
    changeType: 'add' | 'modify' | 'delete';
    highlighted?: boolean;  // 是否需要高亮显示
  };
}

/**
 * 对比摘要
 */
export interface DiffSummary {
  totalChanges: number;
  addedCount: number;
  modifiedCount: number;
  deletedCount: number;
  materialChanges: number;
  descriptionChanges: number;
  nutritionChanges: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. 多元化配方输出方案
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 导出模板
 */
export interface ExportTemplate {
  templateId: string;
  name: string;
  description?: string;
  type: 'pdf' | 'excel' | 'api' | 'print';
  formatConfig: {
    pageSize?: 'A4' | 'A3' | 'letter' | 'custom';
    orientation?: 'portrait' | 'landscape';
    margin?: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    includeColumns?: string[];  // 导出包含的字段
    excludeColumns?: string[];  // 排除的字段
    customStyles?: any;  // 自定义样式配置
    headerTemplate?: string;  // 页眉模板
    footerTemplate?: string;  // 页脚模板
  };
  default: boolean;      // 是否为默认模板
  createdAt: string;
  createdBy: string;
}

/**
 * 导出任务
 */
export interface ExportJob {
  jobId: string;
  formulaId: string;
  versionId: string;
  templateId?: string;
  exportType: 'pdf' | 'excel' | 'api';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  fileName?: string;
  apiEndpoint?: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
  progress: number;  // 进度 0-100
}

/**
 * API数据接口配置
 */
export interface APIDataInterface {
  interfaceId: string;
  name: string;
  description?: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  authentication: 'none' | 'basic' | 'apiKey' | 'oauth';
  authenticationConfig?: {
    username?: string;
    password?: string;
    apiKey?: string;
    token?: string;
  };
  dataFormat: 'json' | 'xml';
  fieldMapping: FieldMapping[];
  rateLimit?: {
    maxRequests: number;
    perMinutes: number;
  };
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
  createdAt: string;
  updatedAt?: string;
}

/**
 * 字段映射
 */
export interface FieldMapping {
  mappingId: string;
  sourceField: string;    // 配方数据字段
  targetField: string;    // 目标系统字段
  transformFunction?: string;  // 转换函数（如：uppercase, formatDate）
  defaultValue?: any;      // 默认值
  required: boolean;       // 是否必填
}

/**
 * 分享配置
 */
export interface ShareConfig {
  shareId: string;
  formulaId: string;
  versionId?: string;
  shareType: 'link' | 'email' | 'api';
  shareUrl?: string;
  password?: string;
  expireDate?: string;
  allowedEmails?: string[];
  downloadLimit?: number;
  downloadCount: number;
  createdAt: string;
  createdBy: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. 营养成分集成模块
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 原料营养成分信息
 */
export interface MaterialNutrition {
  nutritionId: string;
  materialId: string;
  materialName: string;
  materialCode: string;
  per100g: NutritionValues;    // 每100g营养成分
  perUnit?: NutritionValues;  // 每单位营养成分（可选）
  dataVersion: string;        // 数据版本号
  lastUpdated: string;
  dataSource?: string;       // 数据来源（如：国家标准、实验室检测等）
  notes?: string;
}

/**
 * 营养成分值
 */
export interface NutritionValues {
  // 宏量营养素
  energy: number;           // 能量 (kcal/100g)
  protein: number;          // 蛋白质 (g/100g)
  fat: number;             // 脂肪 (g/100g)
  carbohydrate: number;     // 碳水化合物 (g/100g)
  fiber: number;           // 膳食纤维 (g/100g)
  sugars?: number;          // 糖 (g/100g)
  
  // 矿物质
  sodium: number;          // 钠 (mg/100g)
  potassium?: number;      // 钾 (mg/100g)
  calcium?: number;        // 钙 (mg/100g)
  iron?: number;          // 铁 (mg/100g)
  zinc?: number;          // 锌 (mg/100g)
  magnesium?: number;     // 镁 (mg/100g)
  phosphorus?: number;    // 磷 (mg/100g)
  
  // 维生素
  vitaminA?: number;     // 维生素A (μg/100g)
  vitaminC?: number;     // 维生素C (mg/100g)
  vitaminD?: number;     // 维生素D (μg/100g)
  vitaminE?: number;     // 维生素E (mg/100g)
  vitaminK?: number;     // 维生素K (μg/100g)
  vitaminB1?: number;    // 维生素B1 (mg/100g)
  vitaminB2?: number;    // 维生素B2 (mg/100g)
  vitaminB3?: number;    // 维生素B3 (mg/100g)
  vitaminB6?: number;    // 维生素B6 (mg/100g)
  vitaminB12?: number;   // 维生素B12 (μg/100g)
  folate?: number;      // 叶酸 (μg/100g)
  
  // 其他
  cholesterol?: number;   // 胆固醇 (mg/100g)
  transFat?: number;     // 反式脂肪 (g/100g)
  saturatedFat?: number;  // 饱和脂肪 (g/100g)
}

/**
 * 配方营养汇总
 */
export interface FormulaNutritionSummary {
  summaryId: string;
  formulaId: string;
  versionId: string;
  formulaName: string;
  totalWeight: number;  // 配方总重量
  totalNutrition: NutritionValues;  // 总营养成分
  per100gNutrition: NutritionValues;  // 每100g营养成分
  perServingNutrition?: NutritionValues;  // 每份营养成分
  materialBreakdown: MaterialNutritionBreakdown[];  // 原料营养贡献
  calculatedAt: string;
  calculatedBy: string;
}

/**
 * 原料营养贡献
 */
export interface MaterialNutritionBreakdown {
  materialId: string;
  materialName: string;
  materialCode: string;
  quantity: number;
  unit: string;
  weightContribution: number;  // 重量贡献
  percentage: number;  // 占比（%）
  nutritionContribution: NutritionValues;  // 营养贡献
}

/**
 * 营养标准/档案
 */
export interface NutritionProfile {
  profileId: string;
  name: string;
  description?: string;
  category: 'infant' | 'child' | 'adult' | 'elderly' | 'pregnant' | 'special';
  targetValues: NutritionValues;  // 目标值
  toleranceRange: ToleranceRange[];  // 容差范围
  mandatoryFields: (keyof NutritionValues)[];  // 必填字段
  createdAt: string;
}

/**
 * 容差范围
 */
export interface ToleranceRange {
  field: keyof NutritionValues;
  label: string;
  min: number;
  max: number;
  unit: string;
  alertLevel: 'info' | 'warning' | 'error';
}

/**
 * 营养分析报告
 */
export interface NutritionAnalysisReport {
  reportId: string;
  formulaId: string;
  versionId: string;
  summary: FormulaNutritionSummary;
  complianceCheck: ComplianceCheck[];
  recommendations: Recommendation[];
  generatedAt: string;
  generatedBy: string;
}

/**
 * 合规性检查
 */
export interface ComplianceCheck {
  field: keyof NutritionValues;
  label: string;
  actualValue: number;
  targetRange?: { min: number; max: number };
  status: 'pass' | 'warning' | 'fail';
  deviation?: number;  // 偏差值
  message: string;
}

/**
 * 推荐建议
 */
export interface Recommendation {
  type: 'nutrition' | 'balance' | 'safety';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionable: boolean;  // 是否可操作
  suggestedValue?: number;
}
