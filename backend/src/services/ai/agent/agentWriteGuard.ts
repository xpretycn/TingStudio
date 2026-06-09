export interface WriteGuardResult {
  blocked: boolean;
  toolName: string;
  params: Record<string, unknown>;
  guidanceMessage?: string;
  navigationLink?: string;
}

const WRITE_KEYWORD_PATTERNS: Array<{ pattern: RegExp; resource: string; route: string }> = [
  { pattern: /创建|新建|添加|录入|新增|增加.*配方/, resource: "配方", route: "/formula/add" },
  { pattern: /创建|新建|添加|录入|新增|增加.*原料/, resource: "原料", route: "/material/add" },
  { pattern: /创建|新建|添加|录入|新增|增加.*业务员/, resource: "业务员", route: "/salesman/add" },
  { pattern: /修改|编辑|更新|调整|变更.*配方/, resource: "配方", route: "/formula" },
  { pattern: /修改|编辑|更新|调整|变更.*原料/, resource: "原料", route: "/material" },
  { pattern: /修改|编辑|更新|调整|变更.*业务员/, resource: "业务员", route: "/salesman" },
  { pattern: /删除|移除|清除|作废.*配方/, resource: "配方", route: "/formula" },
  { pattern: /删除|移除|清除|作废.*原料/, resource: "原料", route: "/material" },
  { pattern: /删除|移除|清除|作废.*业务员/, resource: "业务员", route: "/salesman" },
];

/**
 * 从用户输入的文本中检测写操作意图（创建/修改/删除）。
 * 命中时返回导航引导结果，未命中返回 null。
 * 当前由悬浮 AI 助手（floatChat）在非表单页面使用。
 */
export function checkWriteIntentFromText(text: string): WriteGuardResult | null {
  for (const wp of WRITE_KEYWORD_PATTERNS) {
    if (wp.pattern.test(text)) {
      const message = `⚠️ 该操作需要前往**${wp.resource}管理**页面完成，AI助手仅支持数据查询。\n\n👉 [前往${wp.resource}管理](${wp.route})\n\n如需查询${wp.resource}信息，请修改提问方式（如"查询${wp.resource}"）。`;
      return {
        blocked: true,
        toolName: "user_intent",
        params: { originalText: text },
        guidanceMessage: message,
        navigationLink: wp.route,
      };
    }
  }
  return null;
}
