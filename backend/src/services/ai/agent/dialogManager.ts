import { IntentType, IntentResult } from "./intentEngine.js";
import { toolRegistry } from "./toolRegistry.js";
import { getDb } from "../../../config/database-better-sqlite3.js";

export type DialogActionType = "chat" | "follow_up" | "confirm" | "execute" | "execute_confirmed" | "form";

export interface FormField {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "textarea" | "multiselect" | "material-list";
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string; type?: string }>;
  defaultValue?: any;
  validation?: { min?: number; max?: number; pattern?: string; message?: string };
  errorMessage?: string;
}

export interface FormSchema {
  formId: string;
  title: string;
  description?: string;
  fields: FormField[];
  submitLabel?: string;
  cancelLabel?: string;
  toolName: string;
}

export interface DialogAction {
  type: DialogActionType;
  message?: string;
  missingParams?: string[];
  toolName?: string;
  params?: Record<string, any>;
  formSchema?: FormSchema;
}

export interface PendingConfirmation {
  toolName: string;
  params: Record<string, any>;
  confirmMessage: string;
}

const FIELD_LABELS: Record<string, string> = {
  name: "名称",
  salesman_name: "业务员",
  salesman_id: "业务员ID",
  finished_weight: "成品重量(g)",
  ratio_factor: "系数",
  materials: "原料列表",
  description: "描述",
  phone: "手机号",
  region: "区域",
  code: "编码",
  unit: "单位",
  stock: "库存",
  material_type: "类型",
  keyword: "关键词",
  id: "ID",
  quantity: "用量(g)",
  unit_price: "单价(元/kg)",
  department: "部门",
  email: "邮箱",
};

const FIELD_TYPES: Record<string, FormField["type"]> = {
  name: "text",
  salesman_name: "select",
  salesman_id: "select",
  finished_weight: "number",
  ratio_factor: "number",
  materials: "material-list",
  description: "textarea",
  phone: "text",
  region: "text",
  code: "text",
  unit: "text",
  stock: "number",
  material_type: "select",
  keyword: "text",
  id: "text",
  quantity: "number",
  unit_price: "number",
  department: "text",
  email: "text",
};

const FIELD_PLACEHOLDERS: Record<string, string> = {
  name: "请输入名称",
  salesman_name: "请选择业务员",
  finished_weight: "请输入成品重量",
  description: "请输入描述信息",
  phone: "请输入手机号",
  keyword: "请输入关键词",
  unit_price: "请输入单价",
  stock: "请输入库存数量",
};

const FIELD_VALIDATIONS: Record<string, { min?: number; max?: number; message?: string }> = {
  finished_weight: { min: 1, message: "成品重量必须大于0" },
  stock: { min: 0, message: "库存不能为负数" },
  unit_price: { min: 0, message: "单价不能为负数" },
};

const TABLE_TITLES: Record<string, string> = {
  formula: "配方",
  material: "原料",
  salesperson: "业务员",
};

const ACTION_TITLES: Record<string, string> = {
  create_formula: "创建新配方",
  create_material: "创建新原料",
  create_salesperson: "创建新业务员",
  update_formula: "修改配方",
  update_material: "修改原料",
  update_salesperson: "修改业务员",
  query_formulas: "查询配方",
  query_materials: "查询原料",
  query_salespeople: "查询业务员",
};

const ACTION_LABELS: Record<string, string> = {
  create_data: "创建",
  update_data: "修改",
  delete_data: "删除",
};

export class DialogManager {
  processIntent(intent: IntentResult): DialogAction {
    if (intent.intent === IntentType.CHAT || intent.intent === IntentType.UNCLEAR) {
      return { type: "chat" };
    }

    if (intent.missingParams.length > 0) {
      const formSchema = this.generateFormSchema(intent);
      if (formSchema) {
        return {
          type: "form",
          formSchema,
          message: this.generateFormIntro(intent),
        };
      }
      return {
        type: "follow_up",
        message: this.generateFollowUp(intent.missingParams, intent.targetTable),
        missingParams: intent.missingParams,
      };
    }

    if ([IntentType.CREATE_DATA, IntentType.UPDATE_DATA, IntentType.DELETE_DATA].includes(intent.intent)) {
      return {
        type: "confirm",
        message: this.generateConfirmMessage(intent),
        toolName: intent.targetAction,
        params: intent.params,
      };
    }

    return {
      type: "execute",
      toolName: intent.targetAction,
      params: intent.params,
    };
  }

  processConfirmation(confirmed: boolean, pending: PendingConfirmation): DialogAction {
    if (confirmed) {
      return {
        type: "execute_confirmed",
        toolName: pending.toolName,
        params: pending.params,
      };
    }
    return { type: "chat", message: "操作已取消。" };
  }

  generateFormSchema(intent: IntentResult): FormSchema | null {
    const toolName = intent.targetAction;
    if (!toolName) return null;

    const tool = toolRegistry.getTool(toolName);
    if (!tool) return null;

    const formId = `${toolName}_${Date.now()}`;
    const title = ACTION_TITLES[toolName] || `操作：${toolName}`;
    const fields: FormField[] = [];

    const schemaShape = this.parseZodSchema(tool.paramsSchema);
    console.log(`[DialogManager] parseZodSchema result for ${toolName}:`, JSON.stringify(Object.fromEntries(Object.entries(schemaShape).map(([k, v]: any) => [k, { required: v.required, typeName: v.typeName, isNumber: v.isNumber, isArray: v.isArray }]))));
    const missingSet = new Set(intent.missingParams);

    for (const [key, fieldDef] of Object.entries(schemaShape)) {
      const isMissing = missingSet.has(key);
      const isRequired = fieldDef.required === true;
      if (!isMissing && !isRequired) continue;

      const field = this.buildFormField(key, fieldDef, intent.targetTable);
      fields.push(field);
    }

    console.log(`[DialogManager] Generated ${fields.length} fields for ${toolName}, missingParams=[${intent.missingParams.join(',')}]`);

    if (fields.length === 0) return null;

    return {
      formId,
      title,
      description: this.generateFormDescription(intent),
      fields,
      submitLabel: `确认${title}`,
      cancelLabel: "取消",
      toolName,
    };
  }

  private parseZodSchema(schema: any): Record<string, any> {
    const shape: Record<string, any> = {};
    try {
      const def = schema._def || schema.def;
      const schemaShape = def?.shape;
      if (!schemaShape) return shape;

      for (const [key, value] of Object.entries(schemaShape)) {
        const field: any = value;
        const fieldType = field.type || field._def?.typeName || "";
        const fieldDefType = field.def?.type || field._def?.typeName || "";

        const isOptional = fieldType === "optional" || fieldDefType === "optional";
        let innerType = field;
        if (isOptional) {
          innerType = field.def?.innerType || field._def?.innerType || field;
        }
        const innerFieldType = innerType.type || innerType._def?.typeName || "string";

        let enumValues: string[] | undefined;
        if (innerFieldType === "enum") {
          const entries = innerType.def?.entries || innerType._def?.values;
          if (entries) {
            enumValues = Array.isArray(entries) ? entries : Object.values(entries);
          }
        }

        shape[key] = {
          required: !isOptional,
          typeName: innerFieldType,
          description: field.description || innerType.description || "",
          enumValues,
          isNumber: innerFieldType === "number",
          isArray: innerFieldType === "array",
          checks: innerType.def?.checks || innerType._def?.checks || [],
          minValue: innerType.minValue ?? innerType._def?.minValue ?? null,
          maxLength: innerType.maxLength ?? innerType._def?.maxLength ?? null,
        };
      }
    } catch (err) {
      console.error("[DialogManager] parseZodSchema error:", err);
    }
    return shape;
  }

  private buildFormField(key: string, fieldDef: any, targetTable?: string): FormField {
    const label = FIELD_LABELS[key] || fieldDef.description || key;
    const type = this.resolveFieldType(key, fieldDef);
    const field: FormField = {
      name: key,
      label,
      type,
      required: fieldDef.required,
      placeholder: FIELD_PLACEHOLDERS[key] || `请输入${label}`,
    };

    if (FIELD_VALIDATIONS[key]) {
      field.validation = FIELD_VALIDATIONS[key];
    }

    if (type === "select") {
      field.options = this.loadSelectOptions(key, targetTable);
    }

    if (type === "material-list") {
      field.options = this.loadMaterialOptions();
    }

    if (fieldDef.enumValues) {
      field.options = fieldDef.enumValues.map((v: string) => ({ label: v, value: v }));
    }

    return field;
  }

  private resolveFieldType(key: string, fieldDef: any): FormField["type"] {
    if (FIELD_TYPES[key]) return FIELD_TYPES[key];
    if (fieldDef.isNumber) return "number";
    if (fieldDef.isArray) return "multiselect";
    if (fieldDef.enumValues) return "select";
    if (key.includes("description") || key.includes("desc")) return "textarea";
    return "text";
  }

  private loadSelectOptions(key: string, _targetTable?: string): Array<{ label: string; value: string }> {
    try {
      const db = getDb();
      if (key === "salesman_name" || key === "salesman_id") {
        const rows = db.prepare("SELECT id, name FROM salesmen WHERE status = 'active' ORDER BY name").all() as any[];
        return rows.map(r => ({ label: r.name, value: r.name }));
      }
      if (key === "material_type") {
        return [
          { label: "药材", value: "herb" },
          { label: "辅料", value: "supplement" },
        ];
      }
      if (key === "type") {
        return [
          { label: "药材", value: "herb" },
          { label: "辅料", value: "supplement" },
        ];
      }
    } catch {
      // database not available
    }
    return [];
  }

  private loadMaterialOptions(): Array<{ label: string; value: string; type: string }> {
    try {
      const db = getDb();
      const rows = db.prepare("SELECT name, material_type FROM materials ORDER BY name").all() as any[];
      return rows.map(r => ({ label: r.name, value: r.name, type: r.material_type || "herb" }));
    } catch {
      return [];
    }
  }

  private generateFormIntro(intent: IntentResult): string {
    const tableLabel = TABLE_TITLES[intent.targetTable || ""] || intent.targetTable || "数据";
    const actionLabel = ACTION_LABELS[intent.intent] || "";
    return `好的，我来帮您${actionLabel}${tableLabel}，请填写以下信息：`;
  }

  private generateFormDescription(intent: IntentResult): string {
    const tableLabel = TABLE_TITLES[intent.targetTable || ""] || intent.targetTable || "";
    const actionLabel = ACTION_LABELS[intent.intent] || "";
    return `${actionLabel}${tableLabel}`;
  }

  private generateFollowUp(missing: string[], table?: string | undefined): string {
    const labels = missing.map(f => FIELD_LABELS[f] || f).join("、");
    const tableHint = table
      ? `（${table === "formula" ? "配方" : table === "material" ? "原料" : table === "salesperson" ? "业务员" : table}）`
      : "";
    return `请提供以下信息${tableHint}：${labels}`;
  }

  private generateConfirmMessage(intent: IntentResult): string {
    const actionLabel = ACTION_LABELS[intent.intent] || intent.intent;
    const tableLabel = intent.targetTable
      ? intent.targetTable === "formula"
        ? "配方"
        : intent.targetTable === "material"
          ? "原料"
          : intent.targetTable === "salesperson"
            ? "业务员"
            : intent.targetTable
      : "数据";

    const paramSummary = Object.entries(intent.params)
      .map(([k, v]) => `${FIELD_LABELS[k] || k}: ${v}`)
      .join("、");

    const irreversible = intent.intent === IntentType.DELETE_DATA ? "此操作不可撤销。" : "";

    return `确认${actionLabel}${tableLabel}？${paramSummary ? `参数：${paramSummary}。` : ""}${irreversible}`;
  }
}
