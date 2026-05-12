export enum IntentType {
  QUERY_DATA = "query_data",
  CREATE_DATA = "create_data",
  UPDATE_DATA = "update_data",
  DELETE_DATA = "delete_data",
  CALCULATE = "calculate",
  CHAT = "chat",
  UNCLEAR = "unclear",
}

export interface IntentResult {
  intent: IntentType;
  params: Record<string, any>;
  confidence: number;
  missingParams: string[];
  targetTable?: string;
  targetAction?: string;
}

const INTENT_SYSTEM_PROMPT = `你是 TingStudio 的意图识别引擎。分析用户输入和上下文，识别意图并提取参数。

## 意图类型
- query_data: 查询/检索/搜索/查看/列出数据
- create_data: 新增/创建/添加数据
- update_data: 修改/更新/编辑数据
- delete_data: 删除/移除数据
- calculate: 计算/分析（营养成分/成本/统计）
- chat: 普通聊天/问答/解释/闲聊
- unclear: 意图不明确，需要追问

## 可操作的业务对象
- formula(配方): name, salesman_name, finished_weight, ratio_factor, materials, description
- material(原料): name, code, unit, stock, material_type
- salesperson(业务员): name, phone, region

## 可用工具映射
- query_data → query_formulas / query_materials / query_salespersons / analyze_sales / nl2sql_query
- create_data → create_formula / create_material / create_salesperson
- update_data → update_formula / update_material / update_salesperson
- delete_data → delete_formula / delete_material / delete_salesperson
- calculate → calculate_nutrition / calculate_cost / validate_ratio_factor

## 工具选择规则
- 简单查询（按名称/业务员搜索配方/原料）→ query_formulas / query_materials
- 复杂查询（跨表关联/聚合统计/模糊条件组合）→ nl2sql_query
- 创建新记录 → create_formula / create_material / create_salesperson
- 修改已有记录 → update_formula / update_material / update_salesperson
- 删除记录 → delete_formula / delete_material / delete_salesperson
- 营养/成本计算 → calculate_nutrition / calculate_cost / validate_ratio_factor

## 输出格式
严格输出 JSON，不要包含任何其他文字：
{
  "intent": "意图标签",
  "params": { 从用户输入中提取的参数 },
  "confidence": 0.0-1.0,
  "missingParams": ["缺失的必填参数名"],
  "targetTable": "业务对象名(formula/material/salesperson)",
  "targetAction": "工具名"
}

## 规则
1. confidence < 0.6 时使用 unclear
2. 仅当用户明确表达操作意图时才标记为 create/update/delete
3. 询问"有什么"/"有哪些"/"查看"/"搜索"均为 query_data
4. "帮我计算"/"分析"均为 calculate
5. 缺少关键参数时填入 missingParams（如创建配方缺少名称）`;

const INTENT_USER_PROMPT = (
  userMessage: string,
  contextMessages: Array<{ role: string; content: string }>
) => {
  const contextStr = contextMessages
    .slice(-6)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");
  return `## 对话上下文
${contextStr}

## 当前用户输入
${userMessage}

请识别意图并提取参数，严格输出 JSON：`;
};

export class IntentEngine {
  private chatCompletion: (
    provider: string,
    messages: Array<{ role: string; content: string }>,
    options?: { temperature?: number }
  ) => Promise<{ content: string }>;
  private defaultProvider: string;

  constructor(
    chatCompletion: (
      provider: string,
      messages: Array<{ role: string; content: string }>,
      options?: { temperature?: number }
    ) => Promise<{ content: string }>,
    defaultProvider: string
  ) {
    this.chatCompletion = chatCompletion;
    this.defaultProvider = defaultProvider;
  }

  async recognize(
    userMessage: string,
    contextMessages: Array<{ role: string; content: string }> = [],
    provider?: string
  ): Promise<IntentResult> {
    const defaultResult: IntentResult = {
      intent: IntentType.UNCLEAR,
      params: {},
      confidence: 0,
      missingParams: [],
    };

    try {
      const messages = [
        { role: "system", content: INTENT_SYSTEM_PROMPT },
        {
          role: "user",
          content: INTENT_USER_PROMPT(userMessage, contextMessages),
        },
      ];

      const result = await this.chatCompletion(provider || this.defaultProvider, messages, {
        temperature: 0.1,
      });

      let jsonStr = result.content.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const parsed = JSON.parse(jsonStr);

      if (!Object.values(IntentType).includes(parsed.intent)) {
        return defaultResult;
      }

      return {
        intent: parsed.intent,
        params: parsed.params || {},
        confidence: parsed.confidence ?? 0.5,
        missingParams: parsed.missingParams || [],
        targetTable: parsed.targetTable,
        targetAction: parsed.targetAction,
      };
    } catch (error) {
      console.error("[IntentEngine] 识别失败:", error);
      return defaultResult;
    }
  }
}
