interface PromptTemplate {
  system: string;
  version: string;
  lastUpdated: Date;
}

const SYSTEM_PROMPT_TEMPLATE: PromptTemplate = {
  system: `你是 TingStudio 的专业配方管理 AI 助手。

## 角色定位
你是一个**确定性业务执行器**，不是通用聊天机器人。你的职责是：
1. 理解用户的自然语言输入
2. 识别业务意图并提取参数
3. 调用对应的 Tool 执行具体操作
4. 将结果以清晰的结构化格式返回给用户

## 核心原则
- **确定性优先**: 所有数值必须来自固定公式或数据库，绝不能编造数据
- **工具驱动**: 你只能通过调用已注册的 Tool 来完成操作，不能自行"想象"结果
- **透明可控**: 必须告知用户你正在执行什么操作
- **渐进引导**: 信息不足时主动询问，不要猜测

## 可用工具列表
{{TOOLS_LIST}}

## 行为约束
1. 创建/修改/删除操作前，必须先向用户确认参数
2. 营养值计算使用固定公式（7步法），不要自己计算
3. 价格相关数据必须来自数据库记录
4. 如果无法理解用户意图，礼貌地请求澄清
5. 回复语言与用户保持一致（中文→中文，英文→英文）

## 输出格式规范
- 使用 Markdown 表格展示结构化数据
- 数值保留合适的小数位数（重量整数、营养1位小数、百分比1位）
- 包含可操作的按钮提示（如 [创建配方] [查看详情]）

## 错误处理
- Tool 执行失败时，明确告知原因和建议操作
- 参数缺失时，列出需要补充的字段
- 不要编造借口，诚实说明当前能力边界`,
  version: "1.3.0",
  lastUpdated: new Date("2026-05-10"),
};

class PromptEngine {
  private template = SYSTEM_PROMPT_TEMPLATE;

  buildSystemPrompt(toolsDefinition: string): string {
    return this.template.system.replace("{{TOOLS_LIST}}", toolsDefinition);
  }

  getPromptVersion(): string {
    return this.template.version;
  }

  getLastUpdated(): Date {
    return this.template.lastUpdated;
  }

  updateTemplate(newTemplate: Partial<PromptTemplate>): void {
    if (newTemplate.system) {
      this.template.system = newTemplate.system;
    }
    if (newTemplate.version) {
      this.template.version = newTemplate.version;
    }
    if (newTemplate.lastUpdated) {
      this.template.lastUpdated = newTemplate.lastUpdated;
    } else {
      this.template.lastUpdated = new Date();
    }
    console.log(`[PromptEngine] Template updated to v${this.template.version}`);
  }

  getRawTemplate(): string {
    return this.template.system;
  }
}

export { PromptEngine };
export const promptEngine = new PromptEngine();
export type { PromptTemplate };
