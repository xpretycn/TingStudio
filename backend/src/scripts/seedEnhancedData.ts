// 增强版种子数据 - 为每个表填充20条数据
import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDatabase, query, closeDatabase } from "../config/database.js";
import { generateId, now } from "../utils/helpers.js";

// 生成随机数据工具函数
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

async function seedEnhancedData() {
  console.log("开始填充增强版种子数据...");

  try {
    await connectDatabase();

    // 获取现有用户ID（用于关联数据）
    const usersResult = query("SELECT id, username FROM users") as any[];
    const users = usersResult[0] as any[];

    if (users.length === 0) {
      console.error("❌ 没有找到用户数据，请先运行 createAdmin.ts");
      return;
    }

    const adminUser = users.find((u: any) => u.username === "admin");
    if (!adminUser) {
      console.error("❌ 没有找到 admin 用户");
      return;
    }

    console.log(`✅ 找到 ${users.length} 个用户，使用 admin 作为创建者`);

    // 1. 用户表 - 补充到20个用户
    await seedUsers(users, adminUser.id);

    // 2. 原料表 - 填充20条数据
    await seedMaterials(adminUser.id);

    // 3. 业务员表 - 填充20条数据
    await seedSalesmen(adminUser.id);

    // 4. 配方表 - 填充20条数据
    await seedFormulas(adminUser.id);

    // 5. 配方版本表 - 填充20条数据
    await seedFormulaVersions(adminUser.id);

    // 6. 导出模板表 - 填充20条数据
    await seedExportTemplates(adminUser.id);

    // 7. 导出任务表 - 填充20条数据
    await seedExportJobs(adminUser.id);

    // 8. API数据接口表 - 填充20条数据
    await seedApiDataInterfaces(adminUser.id);

    // 9. 分享配置表 - 填充20条数据
    await seedShareConfigs(adminUser.id);

    // 10. 原料营养成分表 - 填充20条数据
    await seedMaterialNutrition(adminUser.id);

    // 11. 配方营养汇总表 - 填充20条数据
    await seedFormulaNutritionSummaries(adminUser.id);

    // 12. 营养标准/档案表 - 填充20条数据
    await seedNutritionProfiles(adminUser.id);

    // 13. 营养分析报告表 - 填充20条数据
    await seedNutritionAnalysisReports(adminUser.id);

    console.log("\n✅ 所有表数据填充完成！");

    await closeDatabase();
  } catch (error: any) {
    console.error("❌ 数据填充失败:", error.message);
    process.exit(1);
  }
}

// 1. 用户表
async function seedUsers(existingUsers: any[], adminId: string) {
  console.log("\n--- 填充用户表 (补充到20个) ---");

  const roles = ["admin", "formulist"];
  const departments = ["研发部", "生产部", "质检部", "销售部", "市场部", "财务部", "人事部"];

  for (let i = existingUsers.length + 1; i <= 20; i++) {
    const id = generateId();
    const username = `user${String(i).padStart(3, "0")}`;
    const role = i <= 3 ? "admin" : "formulist";
    const hashedPassword = bcrypt.hashSync(username, 10);

    query(
      "INSERT INTO users (id, username, password, role, display_name, email, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        username,
        hashedPassword,
        role,
        `${randomElement(["张", "李", "王", "刘", "陈", "杨", "赵", "黄", "周", "吴"])}${randomElement(["三", "四", "五", "六", "七", "八", "九", "十"])}`,
        `${username}@tingstudio.com`,
        `138${String(randomInt(10000000, 99999999)).padStart(8, "0")}`,
        now(),
        now(),
      ],
    );
    console.log(`✓ 用户: ${username} (${role})`);
  }
  console.log(`✅ 用户表: 共 20 条数据`);
}

// 2. 原料表
async function seedMaterials(createdBy: string) {
  console.log("\n--- 填充原料表 (20条) ---");

  const herbNames = [
    "人参",
    "黄芪",
    "当归",
    "白芍",
    "熟地",
    "川芎",
    "茯苓",
    "白术",
    "甘草",
    "陈皮",
    "半夏",
    "枳实",
    "厚朴",
    "砂仁",
    "木香",
    "香附",
    "郁金",
    "丹参",
    "红花",
    "桃仁",
    "桂枝",
    "麻黄",
    "细辛",
    "附子",
    "干姜",
    "肉桂",
    "吴茱萸",
    "小茴香",
    "丁香",
    "花椒",
  ];

  const supplementNames = [
    "维生素C",
    "维生素E",
    "钙片",
    "铁剂",
    "锌片",
    "硒片",
    "蛋白粉",
    "鱼油",
    "益生菌",
    "胶原蛋白",
    "葡萄籽",
    "辅酶Q10",
    "叶酸",
    "维生素B族",
    "镁片",
    "钾片",
    "氨基酸",
    "膳食纤维",
    "酵素",
    "褪黑素",
  ];

  for (let i = 1; i <= 20; i++) {
    const isHerb = i <= 15;
    const name = isHerb ? herbNames[i - 1] : supplementNames[i - 16];
    const id = generateId();

    query(
      "INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        name,
        `MAT${String(i).padStart(3, "0")}`,
        "g",
        randomFloat(1000, 50000),
        isHerb ? "herb" : "supplement",
        createdBy,
        now(),
        now(),
      ],
    );
    console.log(`✓ 原料: ${name} (${isHerb ? "药材" : "辅料"})`);
  }
  console.log(`✅ 原料表: 共 20 条数据`);
}

// 3. 业务员表
async function seedSalesmen(createdBy: string) {
  console.log("\n--- 填充业务员表 (20条) ---");

  const surnames = ["张", "李", "王", "刘", "陈", "杨", "赵", "黄", "周", "吴"];
  const givenNames = ["明", "华", "强", "伟", "军", "杰", "勇", "超", "平", "峰"];
  const departments = [
    "华东销售部",
    "华南销售部",
    "华北销售部",
    "西南销售部",
    "华中销售部",
    "西北销售部",
    "东北销售部",
  ];

  for (let i = 1; i <= 20; i++) {
    const id = generateId();
    const name = `${randomElement(surnames)}${randomElement(givenNames)}`;

    query(
      "INSERT INTO salesmen (id, name, code, department, phone, email, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        name,
        `SM${String(i).padStart(3, "0")}`,
        randomElement(departments),
        `136${String(randomInt(10000000, 99999999)).padStart(8, "0")}`,
        `sm${String(i).padStart(3, "0")}@tingstudio.com`,
        i <= 18 ? "active" : "inactive",
        createdBy,
        now(),
        now(),
      ],
    );
    console.log(`✓ 业务员: ${name}`);
  }
  console.log(`✅ 业务员表: 共 20 条数据`);
}

// 4. 配方表
async function seedFormulas(createdBy: string) {
  console.log("\n--- 填充配方表 (20条) ---");

  // 获取业务员和原料数据
  const salesmenResult = query("SELECT id, name FROM salesmen") as any[];
  const salesmen = salesmenResult[0] as any[];
  const materialsResult = query("SELECT id, name FROM materials") as any[];
  const materials = materialsResult[0] as any[];

  const formulaNames = [
    "补气养血膏",
    "清热解毒汤",
    "健脾益胃散",
    "滋阴补肾丸",
    "活血化瘀膏",
    "安神助眠茶",
    "美容养颜膏",
    "减肥瘦身茶",
    "增强免疫力汤",
    "改善睡眠散",
    "调理月经膏",
    "缓解疲劳汤",
    "改善记忆丸",
    "降血压茶",
    "降血糖散",
    "护肝养肝膏",
    "润肺止咳汤",
    "健脑益智丸",
    "抗衰老茶",
    "促进消化散",
  ];

  for (let i = 1; i <= 20; i++) {
    const id = generateId();
    const salesman = randomElement(salesmen);

    // 随机选择3-8种原料
    const selectedMaterials = [];
    const materialCount = randomInt(3, 8);
    for (let j = 0; j < materialCount; j++) {
      const material = randomElement(materials);
      selectedMaterials.push({
        materialId: material.id,
        materialName: material.name,
        quantity: randomFloat(10, 100),
      });
    }

    query(
      "INSERT INTO formulas (id, name, salesman_id, salesman_name, materials_json, finished_weight, ratio_factor, supplement_ratio_factor, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        formulaNames[i - 1],
        salesman.id,
        salesman.name,
        JSON.stringify(selectedMaterials),
        randomFloat(500, 2000),
        randomFloat(0.15, 0.25),
        randomFloat(0.5, 1.5),
        `${formulaNames[i - 1]}的详细描述，用于${randomElement(["治疗", "调理", "保健", "预防"])}${randomElement(["气虚", "血虚", "阴虚", "阳虚", "湿热", "寒湿"])}等症状`,
        createdBy,
        now(),
        now(),
      ],
    );
    console.log(`✓ 配方: ${formulaNames[i - 1]}`);
  }
  console.log(`✅ 配方表: 共 20 条数据`);
}

// 5. 配方版本表
async function seedFormulaVersions(createdBy: string) {
  console.log("\n--- 填充配方版本表 (20条) ---");

  const formulasResult = query("SELECT id, name FROM formulas") as any[];
  const formulas = formulasResult[0] as any[];

  for (let i = 1; i <= 20; i++) {
    const formula = randomElement(formulas);
    const id = generateId();

    query(
      "INSERT INTO formula_versions (version_id, formula_id, version_number, version_name, changes_json, snapshot_json, status, is_current, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        formula.id,
        `v${randomInt(1, 3)}.${randomInt(0, 9)}`,
        `${formula.name} 版本${randomInt(1, 3)}`,
        JSON.stringify([{ field: "原料配比", oldValue: "原比例", newValue: "新比例", reason: "优化效果" }]),
        JSON.stringify({ name: formula.name, description: "配方快照数据" }),
        randomElement(["draft", "published", "archived"]),
        i <= 5 ? 1 : 0,
        createdBy,
        now(),
      ],
    );
    console.log(`✓ 版本: ${formula.name} v${i}`);
  }
  console.log(`✅ 配方版本表: 共 20 条数据`);
}

// 6. 导出模板表
async function seedExportTemplates(createdBy: string) {
  console.log("\n--- 填充导出模板表 (20条) ---");

  const templateTypes = ["pdf", "excel", "api", "print"];
  const templateNames = [
    "标准配方模板",
    "生产指导模板",
    "质检报告模板",
    "销售订单模板",
    "库存管理模板",
    "财务报表模板",
    "客户信息模板",
    "供应商模板",
    "产品目录模板",
    "价格清单模板",
    "合同模板",
    "发票模板",
    "送货单模板",
    "采购单模板",
    "入库单模板",
    "出库单模板",
    "盘点表模板",
    "统计报表模板",
    "分析报告模板",
    "工作总结模板",
  ];

  for (let i = 1; i <= 20; i++) {
    const id = generateId();

    query(
      "INSERT INTO export_templates (template_id, name, description, type, format_config_json, is_default, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        templateNames[i - 1],
        `${templateNames[i - 1]}的详细描述`,
        randomElement(templateTypes),
        JSON.stringify({
          columns: ["编号", "名称", "数量", "单位", "价格"],
          orientation: randomElement(["portrait", "landscape"]),
          fontSize: randomInt(10, 14),
        }),
        i === 1 ? 1 : 0,
        createdBy,
        now(),
      ],
    );
    console.log(`✓ 模板: ${templateNames[i - 1]}`);
  }
  console.log(`✅ 导出模板表: 共 20 条数据`);
}

// 7. 导出任务表
async function seedExportJobs(createdBy: string) {
  console.log("\n--- 填充导出任务表 (20条) ---");

  const formulasResult = query("SELECT id, name FROM formulas") as any[];
  const formulas = formulasResult[0] as any[];
  const templatesResult = query("SELECT template_id FROM export_templates") as any[];
  const templates = templatesResult[0] as any[];
  const versionsResult = query("SELECT version_id FROM formula_versions") as any[];
  const versions = versionsResult[0] as any[];

  const exportTypes = ["pdf", "excel", "api"];
  const statuses = ["pending", "processing", "completed", "failed"];

  for (let i = 1; i <= 20; i++) {
    const id = generateId();
    const formula = randomElement(formulas);

    query(
      "INSERT INTO export_jobs (job_id, formula_id, version_id, template_id, export_type, status, progress, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        formula.id,
        randomElement(versions)?.version_id || null,
        randomElement(templates)?.template_id || null,
        randomElement(exportTypes),
        randomElement(statuses),
        randomInt(0, 100),
        createdBy,
        now(),
      ],
    );
    console.log(`✓ 导出任务: ${formula.name}`);
  }
  console.log(`✅ 导出任务表: 共 20 条数据`);
}

// 8. API数据接口表
async function seedApiDataInterfaces(createdBy: string) {
  console.log("\n--- 填充API数据接口表 (20条) ---");

  const interfaceNames = [
    "用户信息接口",
    "配方查询接口",
    "原料库存接口",
    "销售统计接口",
    "生产进度接口",
    "质量检测接口",
    "客户管理接口",
    "供应商接口",
    "订单管理接口",
    "库存预警接口",
    "财务报表接口",
    "人事信息接口",
    "设备状态接口",
    "环境监测接口",
    "安全审计接口",
    "日志查询接口",
    "系统配置接口",
    "权限管理接口",
    "消息通知接口",
    "文件上传接口",
  ];

  const methods = ["GET", "POST", "PUT", "DELETE"];
  const authTypes = ["none", "basic", "apiKey", "oauth"];

  for (let i = 1; i <= 20; i++) {
    const id = generateId();

    query(
      "INSERT INTO api_data_interfaces (interface_id, name, description, endpoint, method, authentication, auth_config_json, data_format, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        interfaceNames[i - 1],
        `${interfaceNames[i - 1]}的详细描述`,
        `/api/${interfaceNames[i - 1].replace(/接口/g, "").toLowerCase()}`,
        randomElement(methods),
        randomElement(authTypes),
        JSON.stringify({ apiKey: "your-api-key", secret: "your-secret" }),
        "json",
        createdBy,
        now(),
        now(),
      ],
    );
    console.log(`✓ API接口: ${interfaceNames[i - 1]}`);
  }
  console.log(`✅ API数据接口表: 共 20 条数据`);
}

// 9. 分享配置表
async function seedShareConfigs(createdBy: string) {
  console.log("\n--- 填充分享配置表 (20条) ---");

  const formulasResult = query("SELECT id, name FROM formulas") as any[];
  const formulas = formulasResult[0] as any[];
  const versionsResult = query("SELECT version_id FROM formula_versions") as any[];
  const versions = versionsResult[0] as any[];

  const shareTypes = ["link", "email", "api"];

  for (let i = 1; i <= 20; i++) {
    const id = generateId();
    const formula = randomElement(formulas);

    query(
      "INSERT INTO share_configs (share_id, formula_id, version_id, share_type, share_url, password, expire_date, download_limit, download_count, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        formula.id,
        randomElement(versions)?.version_id || null,
        randomElement(shareTypes),
        `https://share.tingstudio.com/${generateId()}`,
        i <= 5 ? "123456" : null,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天后过期
        randomInt(10, 100),
        randomInt(0, 50),
        createdBy,
        now(),
      ],
    );
    console.log(`✓ 分享配置: ${formula.name}`);
  }
  console.log(`✅ 分享配置表: 共 20 条数据`);
}

// 10. 原料营养成分表
async function seedMaterialNutrition(createdBy: string) {
  console.log("\n--- 填充原料营养成分表 (20条) ---");

  const materialsResult = query("SELECT id, name FROM materials") as any[];
  const materials = materialsResult[0] as any[];

  for (let i = 1; i <= 20; i++) {
    const material = materials[i - 1];
    if (!material) continue;

    const id = generateId();

    query(
      "INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, notes, confidence, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        material.id,
        JSON.stringify({
          energy: randomFloat(100, 500),
          protein: randomFloat(5, 30),
          fat: randomFloat(1, 20),
          carbohydrate: randomFloat(10, 80),
          sodium: randomFloat(0, 1000),
        }),
        "1.0",
        "实验室检测",
        `${material.name}的营养成分数据`,
        randomElement(["high", "medium", "low"]),
        now(),
      ],
    );
    console.log(`✓ 营养成分: ${material.name}`);
  }
  console.log(`✅ 原料营养成分表: 共 20 条数据`);
}

// 11. 配方营养汇总表
async function seedFormulaNutritionSummaries(createdBy: string) {
  console.log("\n--- 填充配方营养汇总表 (20条) ---");

  const formulasResult = query("SELECT id, name FROM formulas") as any[];
  const formulas = formulasResult[0] as any[];
  const versionsResult = query("SELECT version_id FROM formula_versions") as any[];
  const versions = versionsResult[0] as any[];

  // 使用 Set 确保每个版本只被使用一次
  const usedVersions = new Set();

  for (let i = 1; i <= 20; i++) {
    const formula = randomElement(formulas);
    const id = generateId();

    // 找到未使用的版本
    let version = null;
    for (const v of versions) {
      if (!usedVersions.has(v.version_id)) {
        version = v;
        usedVersions.add(v.version_id);
        break;
      }
    }

    // 如果没有可用版本，使用 null
    const versionId = version?.version_id || null;

    query(
      "INSERT INTO formula_nutrition_summaries (summary_id, formula_id, version_id, total_weight, total_nutrition_json, per_100g_nutrition_json, material_breakdown_json, calculated_by, calculated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        formula.id,
        versionId,
        randomFloat(500, 2000),
        JSON.stringify({
          energy: randomFloat(1000, 5000),
          protein: randomFloat(50, 200),
          fat: randomFloat(20, 100),
          carbohydrate: randomFloat(200, 800),
          sodium: randomFloat(100, 2000),
        }),
        JSON.stringify({
          energy: randomFloat(200, 400),
          protein: randomFloat(10, 40),
          fat: randomFloat(4, 20),
          carbohydrate: randomFloat(40, 160),
          sodium: randomFloat(20, 400),
        }),
        JSON.stringify([
          { material: "原料1", percentage: randomFloat(10, 30) },
          { material: "原料2", percentage: randomFloat(10, 30) },
          { material: "原料3", percentage: randomFloat(10, 30) },
        ]),
        createdBy,
        now(),
      ],
    );
    console.log(`✓ 营养汇总: ${formula.name}`);
  }
  console.log(`✅ 配方营养汇总表: 共 20 条数据`);
}

// 12. 营养标准/档案表
async function seedNutritionProfiles(createdBy: string) {
  console.log("\n--- 填充营养标准/档案表 (20条) ---");

  const profileNames = [
    "婴幼儿营养标准",
    "儿童营养标准",
    "青少年营养标准",
    "成人营养标准",
    "老年人营养标准",
    "孕妇营养标准",
    "哺乳期营养标准",
    "运动员营养标准",
    "糖尿病患者标准",
    "高血压患者标准",
    "减肥人群标准",
    "增肌人群标准",
    "素食者标准",
    "低脂饮食标准",
    "高蛋白饮食标准",
    "低碳水化合物标准",
    "无麸质饮食标准",
    "低钠饮食标准",
    "高纤维饮食标准",
    "均衡饮食标准",
  ];

  const categories = ["infant", "child", "adult", "elderly", "pregnant", "special"];

  for (let i = 1; i <= 20; i++) {
    const id = generateId();

    query(
      "INSERT INTO nutrition_profiles (profile_id, name, description, category, target_values_json, tolerance_ranges_json, mandatory_fields_json, is_preset, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        profileNames[i - 1],
        `${profileNames[i - 1]}的详细描述`,
        randomElement(categories),
        JSON.stringify({
          energy: { min: randomFloat(1500, 2500), max: randomFloat(2500, 3500) },
          protein: { min: randomFloat(50, 100), max: randomFloat(100, 150) },
          fat: { min: randomFloat(40, 80), max: randomFloat(80, 120) },
        }),
        JSON.stringify({
          energy: { tolerance: randomFloat(50, 200) },
          protein: { tolerance: randomFloat(5, 20) },
        }),
        JSON.stringify(["能量", "蛋白质", "脂肪", "碳水化合物"]),
        i <= 10 ? 1 : 0,
        now(),
        now(),
      ],
    );
    console.log(`✓ 营养标准: ${profileNames[i - 1]}`);
  }
  console.log(`✅ 营养标准/档案表: 共 20 条数据`);
}

// 13. 营养分析报告表
async function seedNutritionAnalysisReports(createdBy: string) {
  console.log("\n--- 填充营养分析报告表 (20条) ---");

  const formulasResult = query("SELECT id, name FROM formulas") as any[];
  const formulas = formulasResult[0] as any[];
  const versionsResult = query("SELECT version_id FROM formula_versions") as any[];
  const versions = versionsResult[0] as any[];
  const summariesResult = query("SELECT summary_id FROM formula_nutrition_summaries") as any[];
  const summaries = summariesResult[0] as any[];

  for (let i = 1; i <= 20; i++) {
    const formula = randomElement(formulas);
    const id = generateId();

    query(
      "INSERT INTO nutrition_analysis_reports (report_id, formula_id, version_id, summary_id, compliance_check_json, recommendations_json, generated_by, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        formula.id,
        randomElement(versions)?.version_id || null,
        randomElement(summaries)?.summary_id || null,
        JSON.stringify({
          energy: { compliant: true, deviation: randomFloat(-10, 10) },
          protein: { compliant: true, deviation: randomFloat(-5, 5) },
        }),
        JSON.stringify(["建议增加蛋白质含量", "能量配比合理", "脂肪含量适中"]),
        createdBy,
        now(),
      ],
    );
    console.log(`✓ 分析报告: ${formula.name}`);
  }
  console.log(`✅ 营养分析报告表: 共 20 条数据`);
}

seedEnhancedData().catch(console.error);
