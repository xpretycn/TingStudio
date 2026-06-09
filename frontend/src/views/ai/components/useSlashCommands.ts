import { ref, computed, type Ref } from "vue";

// ════════════════════════════════════════
// 斜杠指令系统 — 类型定义与数据
// ════════════════════════════════════════

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  shortcut?: string;
  prefix: string;
  keywords: string[];
  category: "formula" | "material" | "salesperson" | "analytics" | "report";
}

export const COMMAND_CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  formula: { label: "配方查询", icon: "edit", color: "var(--color-primary)" },
  material: { label: "原料查询", icon: "chart-bar", color: "#3B82F6" },
  salesperson: { label: "业务员查询", icon: "user", color: "#8B5CF6" },
  analytics: { label: "数据分析", icon: "chart", color: "#EC4899" },
  report: { label: "报表报告", icon: "file-icon", color: "var(--color-warning)" },
};

const DEFAULT_COMMANDS: SlashCommand[] = [
  {
    id: "查询配方",
    label: "查询配方",
    description: "按名称、编号或条件搜索配方",
    icon: "search",
    iconBg: "var(--color-emerald-50, #ecfdf5)",
    iconColor: "var(--color-primary)",
    prefix: "请帮我查询配方，",
    keywords: ["配方", "查询", "搜索", "查找", "formula", "query", "search"],
    category: "formula",
  },
  {
    id: "配方详情",
    label: "配方详情",
    description: "查看指定配方的详细信息、原料组成和用量",
    icon: "file-icon",
    iconBg: "var(--color-primary-bg)",
    iconColor: "var(--color-primary-dark)",
    prefix: "请帮我查看配方详情，",
    keywords: ["配方", "详情", "信息", "组成", "用量", "formula", "detail"],
    category: "formula",
  },
  {
    id: "配方对比",
    label: "配方对比",
    description: "对比多个配方的原料、成本和营养成分差异",
    icon: "swap",
    iconBg: "var(--color-primary-lightest)",
    iconColor: "var(--color-primary-deep)",
    prefix: "请帮我对比配方，",
    keywords: ["配方", "对比", "比较", "差异", "formula", "compare", "diff"],
    category: "formula",
  },
  {
    id: "配方成本分析",
    label: "配方成本分析",
    description: "分析配方的原料成本构成和占比",
    icon: "chart-bar",
    iconBg: "var(--color-primary-lighter)",
    iconColor: "#065f46",
    prefix: "请帮我分析配方成本，",
    keywords: ["配方", "成本", "分析", "费用", "formula", "cost", "analysis"],
    category: "formula",
  },
  {
    id: "查询原料",
    label: "查询原料",
    description: "按名称、编码或类型搜索原料信息",
    icon: "search",
    iconBg: "var(--color-blue-50, #eff6ff)",
    iconColor: "#3B82F6",
    prefix: "请帮我查询原料，",
    keywords: ["原料", "查询", "搜索", "查找", "material", "query", "search"],
    category: "material",
  },
  {
    id: "原料详情",
    label: "原料详情",
    description: "查看指定原料的详细属性、价格和供应商",
    icon: "file-icon",
    iconBg: "var(--color-blue-100, #dbeafe)",
    iconColor: "#2563eb",
    prefix: "请帮我查看原料详情，",
    keywords: ["原料", "详情", "信息", "属性", "material", "detail"],
    category: "material",
  },
  {
    id: "库存查询",
    label: "库存查询",
    description: "查看原料库存状态、库存量及预警信息",
    icon: "warehouse",
    iconBg: "var(--color-blue-200, #bfdbfe)",
    iconColor: "#1d4ed8",
    prefix: "请帮我查询库存情况，",
    keywords: ["库存", "查询", "预警", "不足", "inventory", "stock"],
    category: "material",
  },
  {
    id: "原料价格趋势",
    label: "原料价格趋势",
    description: "查看原料价格的历史变化和趋势预测",
    icon: "chart-line",
    iconBg: "var(--color-blue-300, #93c5fd)",
    iconColor: "#1e40af",
    prefix: "请帮我查看原料价格趋势，",
    keywords: ["原料", "价格", "趋势", "波动", "material", "price", "trend"],
    category: "material",
  },
  {
    id: "查询业务员",
    label: "查询业务员",
    description: "按姓名、工号或区域搜索业务员信息",
    icon: "search",
    iconBg: "var(--color-violet-100, #f3e8ff)",
    iconColor: "#8B5CF6",
    prefix: "请帮我查询业务员：",
    keywords: ["业务员", "查询", "搜索", "查找", "salesman", "query", "search"],
    category: "salesperson",
  },
  {
    id: "业务员详情",
    label: "业务员详情",
    description: "查看业务员的详细信息、负责区域和业绩",
    icon: "user",
    iconBg: "var(--color-violet-200, #e9d5ff)",
    iconColor: "#7c3aed",
    prefix: "请帮我查看业务员详情：",
    keywords: ["业务员", "详情", "信息", "业绩", "salesman", "detail"],
    category: "salesperson",
  },
  {
    id: "业务员业绩",
    label: "业务员业绩",
    description: "查看业务员的销售业绩排名和完成率",
    icon: "chart",
    iconBg: "var(--color-violet-300, #c4b5fd)",
    iconColor: "#6d28d9",
    prefix: "请帮我查看业务员业绩：",
    keywords: ["业务员", "业绩", "排名", "完成率", "salesman", "performance"],
    category: "salesperson",
  },
  {
    id: "销量分析",
    label: "销量分析",
    description: "分析销售数据、趋势和同比环比变化",
    icon: "chart",
    iconBg: "var(--color-pink-100, #fce7f3)",
    iconColor: "#EC4899",
    prefix: "请帮我分析销量数据，",
    keywords: ["销量", "销售", "趋势", "分析", "同比", "环比", "sales", "trend", "analysis"],
    category: "analytics",
  },
  {
    id: "数据概览",
    label: "数据概览",
    description: "查看关键业务指标和整体运营概览",
    icon: "dashboard",
    iconBg: "var(--color-pink-200, #fbcfe8)",
    iconColor: "#db2777",
    prefix: "请帮我查看数据概览，",
    keywords: ["概览", "指标", "概况", "总览", "dashboard", "overview", "kpi"],
    category: "analytics",
  },
  {
    id: "配方用量统计",
    label: "配方用量统计",
    description: "统计各配方的使用频次和原料消耗量",
    icon: "chart-pie",
    iconBg: "var(--color-pink-300, #f9a8d4)",
    iconColor: "#be185d",
    prefix: "请帮我统计配方用量，",
    keywords: ["配方", "用量", "统计", "频次", "消耗", "formula", "usage", "stats"],
    category: "analytics",
  },
  {
    id: "成本趋势分析",
    label: "成本趋势分析",
    description: "分析配方成本的变化趋势和影响因素",
    icon: "chart-line",
    iconBg: "var(--color-rose-200, #fecdd3)",
    iconColor: "#9f1239",
    prefix: "请帮我分析成本趋势，",
    keywords: ["成本", "趋势", "分析", "变化", "cost", "trend"],
    category: "analytics",
  },
  {
    id: "查询月报",
    label: "查询月报",
    description: "获取月度统计报告和关键指标汇总",
    icon: "file-icon",
    iconBg: "var(--color-amber-100, #fef3c7)",
    iconColor: "var(--color-warning)",
    prefix: "请帮我查看本月月报，",
    keywords: ["月报", "报告", "统计", "月度", "report", "monthly"],
    category: "report",
  },
  {
    id: "查询周报",
    label: "查询周报",
    description: "获取周度统计报告和环比变化",
    icon: "file-icon",
    iconBg: "var(--color-amber-200, #fde68a)",
    iconColor: "#d97706",
    prefix: "请帮我查看本周周报，",
    keywords: ["周报", "报告", "统计", "周度", "report", "weekly"],
    category: "report",
  },
  {
    id: "查询营养",
    description: "查询特定食材或配方的营养成分数据",
    icon: "heart",
    iconBg: "var(--color-orange-50, #fff7ed)",
    iconColor: "#EA580C",
    prefix: "请帮我查询营养成分，",
    keywords: ["营养", "查询", "成分", "含量", "nutrition", "query"],
    category: "report",
  },
];

/**
 * 斜杠指令系统 composable
 * 管理 AI 对话中的斜杠指令注册、过滤和执行
 */
export function useSlashCommands() {
  const commandRegistry = ref<SlashCommand[]>([...DEFAULT_COMMANDS]);
  const activeCommandCategory = ref<string | null>(null);

  const showCommandPalette = ref(false);
  const commandPaletteRef = ref<HTMLElement | null>(null);
  const inputWrapperRef = ref<HTMLElement | null>(null);
  const activeCommandIndex = ref(0);
  const commandQuery = ref("");

  const filteredCommands = computed(() => {
    let commands = commandRegistry.value;

    if (activeCommandCategory.value) {
      commands = commands.filter(cmd => cmd.category === activeCommandCategory.value);
    }

    const q = commandQuery.value.toLowerCase().trim();
    if (!q) return commands;

    return commands.filter(cmd => {
      if (cmd.id.toLowerCase().includes(q)) return true;
      if (cmd.label.toLowerCase().includes(q)) return true;
      if (cmd.description.toLowerCase().includes(q)) return true;
      if (cmd.category.toLowerCase().includes(q)) return true;
      return cmd.keywords.some(kw => kw.toLowerCase().includes(q));
    });
  });

  const registerCommand = (cmd: SlashCommand) => {
    const exists = commandRegistry.value.some(c => c.id === cmd.id);
    if (!exists) {
      commandRegistry.value.push(cmd);
    }
  };

  const unregisterCommand = (id: string) => {
    const idx = commandRegistry.value.findIndex(c => c.id === id);
    if (idx !== -1) {
      commandRegistry.value.splice(idx, 1);
    }
  };

  const openCommandPalette = () => {
    showCommandPalette.value = true;
    activeCommandIndex.value = 0;
    commandQuery.value = "";
  };

  const closeCommandPalette = () => {
    showCommandPalette.value = false;
    commandQuery.value = "";
    activeCommandIndex.value = 0;
  };

  return {
    commandRegistry,
    activeCommandCategory,
    showCommandPalette,
    commandPaletteRef,
    inputWrapperRef,
    activeCommandIndex,
    commandQuery,
    filteredCommands,
    registerCommand,
    unregisterCommand,
    openCommandPalette,
    closeCommandPalette,
  };
}
