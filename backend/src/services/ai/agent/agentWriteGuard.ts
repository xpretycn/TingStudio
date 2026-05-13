export interface WriteGuardResult {
  blocked: boolean;
  toolName: string;
  params: Record<string, any>;
  guidanceMessage?: string;
  navigationLink?: string;
}

interface NavigationConfig {
  action: string;
  listRoute: string;
  addRoute: string;
  editRoute: string;
  resourceName: string;
}

const WRITE_TOOLS = new Set([
  "create_formula",
  "update_formula",
  "delete_formula",
  "create_material",
  "update_material",
  "delete_material",
  "create_salesperson",
  "update_salesperson",
  "delete_salesperson",
  "generate_formula",
  "generate_report",
  "export_data",
  "import_data",
  "batch_create",
  "batch_update",
  "batch_delete",
]);

const TOOL_NAVIGATION_MAP: Record<string, NavigationConfig> = {
  create_formula: {
    action: "创建配方",
    listRoute: "/formula",
    addRoute: "/formula/add",
    editRoute: "/formula/edit",
    resourceName: "配方",
  },
  update_formula: {
    action: "编辑配方",
    listRoute: "/formula",
    addRoute: "/formula/add",
    editRoute: "/formula/edit",
    resourceName: "配方",
  },
  delete_formula: {
    action: "删除配方",
    listRoute: "/formula",
    addRoute: "",
    editRoute: "",
    resourceName: "配方",
  },
  generate_formula: {
    action: "生成配方",
    listRoute: "/formula",
    addRoute: "/formula/add",
    editRoute: "/formula/edit",
    resourceName: "配方",
  },
  create_material: {
    action: "创建原料",
    listRoute: "/material",
    addRoute: "/material/add",
    editRoute: "/material/edit",
    resourceName: "原料",
  },
  update_material: {
    action: "编辑原料",
    listRoute: "/material",
    addRoute: "/material/add",
    editRoute: "/material/edit",
    resourceName: "原料",
  },
  delete_material: {
    action: "删除原料",
    listRoute: "/material",
    addRoute: "",
    editRoute: "",
    resourceName: "原料",
  },
  create_salesperson: {
    action: "创建业务员",
    listRoute: "/salesman",
    addRoute: "/salesman/add",
    editRoute: "/salesman/edit",
    resourceName: "业务员",
  },
  update_salesperson: {
    action: "编辑业务员",
    listRoute: "/salesman",
    addRoute: "/salesman/add",
    editRoute: "/salesman/edit",
    resourceName: "业务员",
  },
  delete_salesperson: {
    action: "删除业务员",
    listRoute: "/salesman",
    addRoute: "",
    editRoute: "",
    resourceName: "业务员",
  },
  generate_report: {
    action: "生成报表",
    listRoute: "/report",
    addRoute: "",
    editRoute: "",
    resourceName: "报表",
  },
  export_data: {
    action: "导出数据",
    listRoute: "/report",
    addRoute: "",
    editRoute: "",
    resourceName: "数据",
  },
  import_data: {
    action: "导入数据",
    listRoute: "/report",
    addRoute: "",
    editRoute: "",
    resourceName: "数据",
  },
  batch_create: {
    action: "批量创建",
    listRoute: "/",
    addRoute: "",
    editRoute: "",
    resourceName: "数据",
  },
  batch_update: {
    action: "批量更新",
    listRoute: "/",
    addRoute: "",
    editRoute: "",
    resourceName: "数据",
  },
  batch_delete: {
    action: "批量删除",
    listRoute: "/",
    addRoute: "",
    editRoute: "",
    resourceName: "数据",
  },
};

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

export function checkWriteGuard(toolName: string, params: Record<string, any>): WriteGuardResult {
  if (!WRITE_TOOLS.has(toolName)) {
    return { blocked: false, toolName, params };
  }

  const nav = TOOL_NAVIGATION_MAP[toolName];
  if (!nav) {
    return { blocked: false, toolName, params };
  }

  const isDelete = toolName.startsWith("delete") || toolName.startsWith("batch_delete");
  const isCreate =
    toolName.startsWith("create") || toolName.startsWith("generate") || toolName.startsWith("batch_create");
  const isUpdate = toolName.startsWith("update") || toolName.startsWith("batch_update");
  const isImport = toolName === "import_data";
  const isExport = toolName === "export_data";

  let link = nav.listRoute;
  let linkText = `${nav.resourceName}管理页面`;

  if (isCreate && nav.addRoute) {
    link = nav.addRoute;
    linkText = `创建${nav.resourceName}`;
  } else if ((isUpdate || isDelete) && (params.id || params.name)) {
    const id = params.id;
    if (id) {
      link = `${nav.editRoute}/${id}`;
      linkText = isDelete ? `${nav.resourceName}管理页面` : `编辑${nav.resourceName}`;
    }
  }

  let icon = "📋";
  if (isDelete) icon = "⚠️";
  if (isImport) icon = "📥";
  if (isExport) icon = "📤";

  const action = nav.action;
  const message = `${icon} ${action}请前往**${nav.resourceName}管理**页面操作。\n\n👉 [前往${linkText}](${link})`;

  return {
    blocked: true,
    toolName,
    params,
    guidanceMessage: message,
    navigationLink: link,
  };
}

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

export function isWriteTool(toolName: string): boolean {
  return WRITE_TOOLS.has(toolName);
}
