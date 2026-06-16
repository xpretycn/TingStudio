// 直接导入真实原料数据到SQLite数据库

import path from "path";
import fs from "fs";
import XLSX from "xlsx";

const DB_PATH = path.join(process.cwd(), "data", "tingstudio.db");
const TEST_DIR = path.join("..", "test");

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'formulist' CHECK(role IN ('admin', 'formulist')),
  display_name TEXT DEFAULT NULL,
  avatar TEXT DEFAULT NULL,
  bio TEXT DEFAULT NULL,
  email TEXT DEFAULT NULL,
  phone TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL DEFAULT 'g',
  stock REAL NOT NULL DEFAULT 0,
  material_type TEXT NOT NULL DEFAULT 'herb' CHECK(material_type IN ('herb', 'supplement')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX IF NOT EXISTS idx_material_name ON materials(name);
CREATE INDEX IF NOT EXISTS idx_material_code ON materials(code);
CREATE TABLE IF NOT EXISTS formulas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  salesman_id TEXT NOT NULL,
  salesman_name TEXT NOT NULL,
  materials_json TEXT NOT NULL,
  finished_weight REAL NOT NULL DEFAULT 0,
  ratio_factor REAL NOT NULL DEFAULT 0.18 CHECK(ratio_factor >= 0.15 AND ratio_factor <= 0.25),
  supplement_ratio_factor REAL NOT NULL DEFAULT 1.0 CHECK(supplement_ratio_factor >= 0.5 AND supplement_ratio_factor <= 1.5),
  description TEXT DEFAULT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS salesmen (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  department TEXT DEFAULT NULL,
  phone TEXT DEFAULT NULL,
  email TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE TABLE IF NOT EXISTS formula_versions (
  version_id TEXT PRIMARY KEY,
  formula_id TEXT NOT NULL,
  version_number TEXT NOT NULL,
  version_name TEXT DEFAULT NULL,
  version_reason TEXT DEFAULT NULL,
  changes_json TEXT DEFAULT NULL,
  snapshot_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  is_current INTEGER NOT NULL DEFAULT 0,
  ratio_factor REAL NOT NULL DEFAULT 0.18 CHECK(ratio_factor >= 0.15 AND ratio_factor <= 0.25),
  supplement_ratio_factor REAL NOT NULL DEFAULT 1.0 CHECK(supplement_ratio_factor >= 0.5 AND supplement_ratio_factor <= 1.5),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS export_templates (
  template_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  type TEXT NOT NULL CHECK(type IN ('pdf', 'excel', 'api', 'print')),
  format_config_json TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE TABLE IF NOT EXISTS export_jobs (
  job_id TEXT PRIMARY KEY,
  formula_id TEXT NOT NULL,
  version_id TEXT DEFAULT NULL,
  template_id TEXT DEFAULT NULL,
  export_type TEXT NOT NULL CHECK(export_type IN ('pdf', 'excel', 'api')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  file_url TEXT DEFAULT NULL,
  file_name TEXT DEFAULT NULL,
  api_endpoint TEXT DEFAULT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  error_message TEXT DEFAULT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  completed_at TEXT DEFAULT NULL,
  FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS material_nutrition (
  nutrition_id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL UNIQUE,
  per_100g_json TEXT NOT NULL,
  data_version TEXT NOT NULL DEFAULT '1.0',
  data_source TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  confidence TEXT DEFAULT 'medium' CHECK(confidence IN ('high', 'medium', 'low')),
  last_updated TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS formula_nutrition_summaries (
  summary_id TEXT PRIMARY KEY,
  formula_id TEXT NOT NULL,
  version_id TEXT DEFAULT NULL,
  total_weight REAL NOT NULL DEFAULT 0,
  total_nutrition_json TEXT NOT NULL,
  per_100g_nutrition_json TEXT NOT NULL,
  material_breakdown_json TEXT DEFAULT NULL,
  calculated_by TEXT NOT NULL,
  calculated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS nutrition_profiles (
  profile_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  category TEXT NOT NULL CHECK(category IN ('infant', 'child', 'adult', 'elderly', 'pregnant', 'special')),
  target_values_json TEXT NOT NULL,
  tolerance_ranges_json TEXT DEFAULT NULL,
  mandatory_fields_json TEXT DEFAULT NULL,
  is_preset INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
`;

function generateCode(name: string): string {
  const pinyinMap: Record<string, string> = {
    佛手: "FS",
    重瓣玫瑰: "RBPL",
    茯苓: "FL",
    熟地: "SD",
    党参: "DS",
    益母草: "YMC",
    高果糖浆: "GGTJ",
    蜂蜜: "FM",
    巴戟天: "BJT",
    纯净水: "CJS",
    龙眼肉: "LYR",
    黄精: "HJ",
    酸枣仁: "SZR",
    灵芝: "LZ",
    石斛: "SH",
    西洋参: "XYX",
    陈皮: "CP",
    当归: "DG",
    黄芪: "HQ",
    红枣: "HZ",
    枸杞: "GQ",
    桑葚: "SS",
    阿胶: "EJ",
    人参: "RS",
    鹿茸: "LR",
    冬虫夏草: "DCXC",
    藏红花: "ZHH",
    川贝: "CB",
    百合: "BH",
    麦冬: "MD",
    五味子: "WWZ",
    远志: "YZ",
    酸梅膏: "SMG",
    甘草: "GC",
    白术: "BS",
    山药: "SY",
    莲子: "LZ2",
    芡实: "QS",
    薏米: "YM",
    赤小豆: "CXD",
    扁豆: "BD",
    山楂: "SZ",
    神曲: "SQ",
    麦芽: "MY",
    谷芽: "GY",
    鸡内金: "JNJ",
    莱菔子: "LFZ",
    决明子: "JMZ",
    菊花: "JH",
    金银花: "JYH",
    连翘: "LQ",
    板蓝根: "BLG",
    蒲公英: "PGY",
    鱼腥草: "YXC",
    薄荷: "BH2",
    紫苏: "ZS",
    香附: "XF",
    郁金: "YJ",
    延胡索: "YHS",
    丹参: "DS2",
    红花: "HH",
    桃仁: "TR",
    三棱: "SL",
    莪术: "EW",
    水蛭: "SZ2",
    地龙: "DL",
    全蝎: "QX",
    蜈蚣: "WG",
    僵蚕: "JC",
    蝉蜕: "CT",
    牛黄: "NH",
    熊胆: "XD",
    麝香: "SX",
    冰片: "BP",
    珍珠粉: "ZZF",
    琥珀: "HP",
    朱砂: "ZS2",
    雄黄: "XH",
    轻粉: "QF",
    红升丹: "HSD",
    白降丹: "BJD",
    炉甘石: "LGS",
    石膏: "SG",
    寒水石: "HSS",
    芒硝: "MX",
    玄明粉: "XMF",
    火硝: "HX",
    硇砂: "NS",
    硼砂: "PS",
    明矾: "MJ",
    皂矾: "ZF",
    胆矾: "DF",
    铅丹: "QD",
    密陀僧: "MTS",
    铜绿: "TL",
    胡粉: "HF",
    石灰: "SH2",
    白蜡: "BL",
    蜂蜡: "FL2",
    虫白蜡: "CBL",
    麻油: "MY2",
    茶油: "CY",
    花生油: "HSY",
    菜籽油: "CZY",
    芝麻油: "ZMY",
    橄榄油: "GLY",
    椰子油: "YZY",
    棕榈油: "ZLY",
    大豆油: "DDY",
    葵花籽油: "KHY",
    玉米油: "YY",
    棉籽油: "MZY",
    米糠油: "MRY",
    葡萄籽油: "PTZY",
    亚麻籽油: "YMZY",
    紫苏油: "ZSY",
    沙棘油: "SJY",
    小麦胚芽油: "XMPYY",
    核桃油: "HTY",
    杏仁油: "XRY",
    南瓜籽油: "NGZY",
    番茄籽油: "FQZY",
    石榴籽油: "SLZY",
    西瓜籽油: "XGZY",
    木瓜籽油: "MGZY",
    海棠果: "HTG",
    阿胶糕: "AJG",
    鹿胎膏: "LTG",
    龟苓膏: "GLG",
    雪蛤膏: "XHG",
    燕窝: "YW",
    花胶: "HJ2",
    干贝: "GB",
    海参: "HS",
    鲍鱼: "BY",
    鱼翅: "YC",
    花菇: "HG",
    羊肚菌: "YDJ",
    松茸: "SR",
    牛肝菌: "NJ",
    鸡枞菌: "JCJ",
    竹荪: "ZS2",
    猴头菇: "HTG2",
    黑木耳: "HME",
    白木耳: "BME",
    银耳: "YE",
    金针菇: "JJG",
    杏鲍菇: "XBG",
    平菇: "PG",
    香菇: "XG",
    草菇: "CG",
    口蘑: "KM",
    滑子蘑: "HZM",
    茶树菇: "CSG",
    榛蘑: "ZM",
    元蘑: "YM2",
    姬松茸: "JSR",
    灵芝片: "LZP",
    茯苓块: "FLK",
    天麻: "TM",
    三七: "SQ",
    西洋参片: "XYXP",
    红参片: "HSP",
    丹参片: "DSP",
    黄芪片: "HQP",
    当归片: "DGP",
    川芎片: "CWP",
    白芍片: "BSP",
    熟地黄: "SDH",
    生地黄: "SDH2",
    山茱萸: "SZY",
    五味子: "WWZ2",
    麦冬: "MD2",
    天冬: "TD",
    玉竹: "YZ",
    黄精: "HJ2",
    何首乌: "HSW",
    肉苁蓉: "RCR",
    锁阳: "SY2",
    杜仲: "DZ",
    续断: "XD",
    牛膝: "NX",
    淫羊藿: "YYH",
    巴戟天: "BJT2",
    补骨脂: "BGZ",
    菟丝子: "TSZ",
    沙苑子: "SYZ",
    益智仁: "YZR",
    乌药: "WY",
    香附: "XF2",
    木香: "MX",
    陈皮: "CP2",
    枳实: "ZS3",
    枳壳: "ZK",
    青皮: "QP",
    佛手: "FS2",
    香橼: "XY",
    玫瑰花: "MHH",
    月季花: "YJH",
    红花: "HH2",
    凌霄花: "LXH",
    合欢花: "HHH",
    绿萼梅: "LYM",
    代代花: "DDH",
    厚朴花: "HPH",
    扁豆花: "BDH",
    金银花: "JYH2",
    连翘: "LQ2",
    板蓝根: "BLG2",
    大青叶: "DQY",
    蒲公英: "PGY2",
    紫花地丁: "ZHDD",
    野菊花: "YJH",
    夏枯草: "XKC",
    决明子: "JMZ2",
    谷精草: "GJC",
    密蒙花: "MMH",
    青葙子: "QXZ",
    车前子: "CQZ",
    瞿麦: "QM",
    萹蓄: "BX",
    地肤子: "DFZ",
    海金沙: "HJS",
    石韦: "SW",
    冬葵子: "D KZ",
    灯心草: "DXC",
    萆薢: "BX2",
    茵陈: "YC",
    金钱草: "JQC",
    广金钱草: "GJQC",
    连钱草: "LQC",
    虎杖: "HZ",
    贯众: "GZ",
    鹤草芽: "HCY",
    南瓜子: "NGZ",
    槟榔: "BL",
    南鹤虱: "NHS",
    苦楝皮: "KLP",
    鹤虱: "HS2",
    雷丸: "LW",
    使君子: "SJZ",
    苦楝根皮: "KLGP",
    榧子: "FZ",
  };

  if (pinyinMap[name]) return pinyinMap[name];

  const code = name
    .substring(0, Math.min(4, name.length))
    .split("")
    .map(c => {
      const code = c.charCodeAt(0);
      if (code >= 0x4e00 && code <= 0x9fff) {
        return String.fromCharCode(0x41 + ((code - 0x4e00) % 26));
      }
      return c.toUpperCase();
    })
    .join("");

  return code || "MAT";
}

function main() {
  console.log("═══════════════════════════════════════");
  console.log("  导入真实原料数据到数据库");
  console.log("═══════════════════════════════════════\n");

  // 1. 读取原始数据
  const inputPath = path.join(TEST_DIR, "原料营养汇总_输出.xlsx");
  console.log(`📂 读取: ${inputPath}`);

  if (!fs.existsSync(inputPath)) {
    console.error("❌ 文件不存在！请先运行 analyzeNutritionFiles.ts");
    process.exit(1);
  }

  const workbook = XLSX.readFile(inputPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

  console.log(`   原始记录数: ${rawData.length}\n`);

  // 2. 过滤并转换数据
  const materials: any[] = [];
  const nutritions: any[] = [];
  let skipped = 0;

  for (const row of rawData) {
    const name = String(row["原料名称"] ?? "").trim();

    // 过滤无效行
    if (!name || name.length > 12) {
      skipped++;
      continue;
    }
    if (/^[\d\s._\-+*=()]+$/.test(name)) {
      skipped++;
      continue;
    }
    if (/^(蛋白质|脂肪|碳水|钠|能量|营养|成分|序号|数据|NRV|参考)/i.test(name)) {
      skipped++;
      continue;
    }

    const id = `MAT_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const matTypeRaw = String(row["原��类型"] ?? row["原料类型"] ?? "").trim();
    const matType = matTypeRaw === "药材" ? "herb" : "supplement";
    const now = new Date().toISOString();

    // 营养数据
    const protein = Number(row["蛋白质(g/100g)"]) || null;
    const fat = Number(row["脂肪(g/100g)"]) || null;
    const carbohydrate = Number(row["碳水化合物(g/100g)"]) || null;
    const sodium = Number(row["钠(mg/100g)"]) || null;

    materials.push({
      id,
      name,
      code: generateCode(name),
      unit: "g",
      stock: 0,
      material_type: matType,
      created_by: "admin",
      created_at: now,
      updated_at: now,
    });

    nutritions.push({
      nutrition_id: `NUT_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
      material_id: id,
      per_100g_json: JSON.stringify({
        protein,
        fat,
        carbohydrate,
        sodium,
        unit: "per_100g",
      }),
      data_version: "1.0",
      data_source: String(row["数据来源"] ?? "业务员配方"),
      confidence: "high",
      last_updated: now,
    });
  }

  console.log(`✅ 有效记录: ${materials.length} 条 (跳过 ${skipped} 条无效)`);

  // 3. 连接数据库并导入
  console.log(`\n📦 数据库: ${DB_PATH}`);

  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }

  const db = new Database(DB_PATH);

  try {
    // 初始化表结构（如果不存在）
    db.exec(INIT_SQL);
    console.log("   ✅ 数据库表结构已初始化");

    // 开启事务
    await execute("BEGIN TRANSACTION");

    // 清空现有数据
    const delNutri = await execute("DELETE FROM material_nutrition", []);
    const delMat = await execute("DELETE FROM materials", []);
    console.log(`   已清空: material_nutrition(${delNutri.changes}), materials(${delMat.changes})`);

    // 插入原料数据
    const insertMat = db.prepare(`
      INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
      VALUES (@id, @name, @code, @unit, @stock, @material_type, @created_by, @created_at, @updated_at)
    `);

    const insertNutri = db.prepare(`
      INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
      VALUES (@nutrition_id, @material_id, @per_100g_json, @data_version, @data_source, @confidence, @last_updated)
    `);

    for (let i = 0; i < materials.length; i++) {
      insertMat.run(materials[i]);
      insertNutri.run(nutritions[i]);
    }

    await execute("COMMIT");

    console.log(`\n✅ 导入成功!`);
    console.log(`   原料表: ${materials.length} 条`);
    console.log(`   营养表: ${nutritions.length} 条`);

    // 统计验证
    const stats = db
      .prepare(
        `
      SELECT 
        material_type AS type,
        COUNT(*) as count
      FROM materials 
      GROUP BY material_type
    `,
      )
      .all();

    console.log(`\n📊 类型分布:`);
    for (const s of stats as any[]) {
      const label = s.type === "herb" ? "药材" : "辅料";
      console.log(`   ${label}: ${s.count} 条`);
    }

    // 显示部分数据预览
    console.log(`\n📋 数据预览:`);
    const preview = db
      .prepare(
        "SELECT m.name, m.code, m.material_type, n.per_100g_json FROM materials m JOIN material_nutrition n ON m.id = n.material_id LIMIT 10",
      )
      .all();

    console.log(
      `${"名称".padEnd(8)} │ ${"编码".padEnd(6)} │ ${"类型"}.padEnd(4)} │ ${"蛋白".padStart(5)} │ ${"脂肪".padStart(5)} │ ${"碳水"}.padStart(5)}`,
    );
    console.log("──────────┼────────┼──────┼───────┼───────┼───────");

    for (const row of preview as any[]) {
      const nut = JSON.parse(row.per_100g_json);
      const typeLabel = row.material_type === "herb" ? "药材" : "辅料";
      console.log(
        `${row.name.padEnd(8)} │ ${row.code.padEnd(6)} │ ${typeLabel.padEnd(4)} │ ${(nut.protein ?? "-")
          .toString()
          .padStart(5)} │ ${(nut.fat ?? "-").toString().padStart(5)} │ ${(nut.carbohydrate ?? "-")
          .toString()
          .padStart(5)}`,
      );
    }
  } catch (error: any) {
    await execute("ROLLBACK");
    console.error("\n❌ 导入失败:", error.message);
    throw error;
  } finally {
    db.close();
  }
}

main();
