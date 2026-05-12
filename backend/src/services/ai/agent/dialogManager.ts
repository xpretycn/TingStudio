import { IntentType, IntentResult } from "./intentEngine.js";

export type DialogActionType =
  | "chat"
  | "follow_up"
  | "confirm"
  | "execute"
  | "execute_confirmed";

export interface DialogAction {
  type: DialogActionType;
  message?: string;
  missingParams?: string[];
  toolName?: string;
  params?: Record<string, any>;
}

export interface PendingConfirmation {
  toolName: string;
  params: Record<string, any>;
  confirmMessage: string;
}

const FIELD_LABELS: Record<string, string> = {
  name: "名称",
  salesman_name: "业务员",
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
};

const ACTION_LABELS: Record<string, string> = {
  create_data: "创建",
  update_data: "修改",
  delete_data: "删除",
};

export class DialogManager {
  processIntent(intent: IntentResult): DialogAction {
    if (
      intent.intent === IntentType.CHAT ||
      intent.intent === IntentType.UNCLEAR
    ) {
      return { type: "chat" };
    }

    if (intent.missingParams.length > 0) {
      return {
        type: "follow_up",
        message: this.generateFollowUp(intent.missingParams, intent.targetTable),
        missingParams: intent.missingParams,
      };
    }

    if (
      [IntentType.CREATE_DATA, IntentType.UPDATE_DATA, IntentType.DELETE_DATA].includes(
        intent.intent
      )
    ) {
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

  processConfirmation(
    confirmed: boolean,
    pending: PendingConfirmation
  ): DialogAction {
    if (confirmed) {
      return {
        type: "execute_confirmed",
        toolName: pending.toolName,
        params: pending.params,
      };
    }
    return { type: "chat", message: "操作已取消。" };
  }

  private generateFollowUp(
    missing: string[],
    table?: string | undefined
  ): string {
    const labels = missing
      .map((f) => FIELD_LABELS[f] || f)
      .join("、");
    const tableHint = table ? `（${table === "formula" ? "配方" : table === "material" ? "原料" : table === "salesperson" ? "业务员" : table}）` : "";
    return `请提供以下信息${tableHint}：${labels}`;
  }

  private generateConfirmMessage(intent: IntentResult): string {
    const actionLabel =
      ACTION_LABELS[intent.intent] || intent.intent;
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

    const irreversible =
      intent.intent === IntentType.DELETE_DATA ? "此操作不可撤销。" : "";

    return `确认${actionLabel}${tableLabel}？${paramSummary ? `参数：${paramSummary}。` : ""}${irreversible}`;
  }
}
