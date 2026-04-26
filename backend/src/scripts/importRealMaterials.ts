// 将业务员配方中的真实原料数据导入数据库
import XLSX from "xlsx";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const TEST_DIR = path.join("..", "test");

interface MaterialRow {
  序号: number;
  原料名称: string;
  原料类型: string;
  "蛋白质(g/100g)": any;
  "脂肪(g/100g)": any;
  "碳水化合物(g/100g)": any;
  "钠(mg/100g)": any;
  数据来源: string;
}

interface MaterialRecord {
  id: string;
  name: string;
  code: string;
  unit: string;
  stock: number;
  material_type: "herb" | "supplement";
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface NutritionRecord {
  nutrition_id: string;
  material_id: string;
  per_100g_json: string;
  data_version: string;
  data_source: string;
  confidence: string;
  last_updated: string;
}

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
    佛手玫苓膏: "FSQLG",
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
    莲子: "LZ",
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
    哈密瓜籽油: "HMGZY",
    甜瓜籽油: "TGZY",
    木瓜籽油: "MGZY",
    芒果籽油: "MGZY2",
    菠萝蜜籽油: "BLMZY",
    榴莲籽油: "LLZY",
    山竹籽油: "SZY",
    红毛丹籽油: "HM DZY",
    荔枝籽油: "LZ Y",
    龙眼籽油: "LY ZY",
    杨桃籽油: "YTZY",
    莲雾籽油: "LWZY",
    释迦籽油: "SXZY",
    番石榴籽油: "FSLZY",
    百香果籽油: "BXGZY",
    火龙果籽油: "HLGZY",
    杨梅籽油: "YMZY2",
    蓝莓籽油: "LMZY",
    草莓籽油: "CMZY",
    树莓籽油: "SMZY",
    黑莓籽油: "HMZY",
    覆盆子籽油: "FPZZY",
    沙果籽油: "SGZY2",
    海棠籽油: "HTZY2",
    杏籽油: "XZY2",
    李籽油: "LZY",
    桃籽油: "TZY",
    樱桃籽油: "YTZY2",
    枣籽油: "ZZY2",
    柿籽油: "SZY2",
    葡萄柚籽油: "PTYZY",
    柠檬籽油: "NMZY",
    橘子籽油: "JZ Y2",
    橙子籽油: "CZ Y",
    柚子籽油: "YZ Y",
    金桔籽油: "JJZY",
    芦柑籽油: "LGZY",
    佛手柑籽油: "FSGZY",
    香橼籽油: "XYZY",
    枇杷籽油: "PPZY",
    杨梅籽油: "YMZY3",
    橄榄籽油: "GLZY2",
    油橄榄籽油: "YGLZY",
    槟榔籽油: "BLZY",
    椰枣籽油: "YZZY2",
    海枣籽油: "HZZY",
    无花果籽油: "WHGZY",
    面包果籽油: "MBGZY",
    菠萝籽油: "BLZY2",
    香蕉籽油: "XJZY",
    芭蕉籽油: "BJZY2",
    甘蔗籽油: "GZ Y",
    甜菜籽油: "TCZY",
    向日葵籽油: "XRKZY",
    芝麻籽油: "ZMZ Y",
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
  console.log("  真实原料数据导入工具");
  console.log("═══════════════════════════════════════\n");

  // 1. 读取原始数据
  const inputPath = path.join(TEST_DIR, "原料营养汇总_输出.xlsx");
  const workbook = XLSX.readFile(inputPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json<MaterialRow>(sheet);

  console.log(`📂 读取文件: ${inputPath}`);
  console.log(`   原始记录数: ${rawData.length}\n`);

  // 2. 过滤无效数据并转换为数据库格式
  const materials: MaterialRecord[] = [];
  const nutritions: NutritionRecord[] = [];
  const invalidRows: string[] = [];

  for (const row of rawData) {
    const name = String(row["原料名称"] ?? "").trim();

    // 过滤无效行：空名称、非中文字符为主、明显是表头残留
    if (!name) continue;
    if (/^[\d\s._\-+*=()]+$/.test(name)) {
      invalidRows.push(`${name} (非有效原料名)`);
      continue;
    }
    if (/^(蛋白质|脂肪|碳水|钠|能量|营养|成分|序号|数据|NRV|参考)/i.test(name)) {
      invalidRows.push(`${name} (表头残留)`);
      continue;
    }
    if (name.length > 12) {
      invalidRows.push(`${name} (名称过长)`);
      continue;
    }

    const id = randomUUID();
    const matType = row["原��类型"] === "药材" ? ("herb" as const) : ("supplement" as const);
    const now = new Date().toISOString();

    // 营养数据
    const protein = Number(row["蛋白质(g/100g)"]) || null;
    const fat = Number(row["脂肪(g/100g)"]) || null;
    const carbohydrate = Number(row["碳水化合物(g/100g)"]) || null;
    const sodium = Number(row["钠(mg/100g)"]) || null;

    const nutritionJson = JSON.stringify({
      protein,
      fat,
      carbohydrate,
      sodium,
      unit: "per_100g",
    });

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
      nutrition_id: randomUUID(),
      material_id: id,
      per_100g_json: nutritionJson,
      data_version: "1.0",
      data_source: String(row["数据来源"] ?? "业务员配方"),
      confidence: "high",
      last_updated: now,
    });
  }

  console.log(`✅ 有效原料: ${materials.length} 条`);
  if (invalidRows.length > 0) {
    console.log(`⚠️ 已过滤 ${invalidRows.length} 条无效记录:`);
    invalidRows.slice(0, 10).forEach(r => console.log(`   - ${r}`));
  }

  // 3. 输出完整字段的新Excel文件
  const outputData = materials.map((m, idx) => {
    const nut = nutritions[idx];
    const nutJson = JSON.parse(nut.per_100g_json);
    return {
      序号: idx + 1,
      ID: m.id.substring(0, 8) + "...",
      原料名称: m.name,
      编码: m.code,
      类型: m.material_type === "herb" ? "药材" : "辅料",
      单位: m.unit,
      库存: m.stock,
      "蛋白质(g/100g)": nutJson.protein ?? "",
      "脂肪(g/100g)": nutJson.fat ?? "",
      "碳水化合物(g/100g)": nutJson.carbohydrate ?? "",
      "钠(mg/100g)": nutJson.sodium ?? "",
      数据来源: nut.data_source,
      创建时间: m.created_at.substring(0, 19),
    };
  });

  const outWb = XLSX.utils.book_new();
  const outWs = XLSX.utils.json_to_sheet(outputData);
  outWs["!cols"] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 12 },
    { wch: 8 },
    { wch: 6 },
    { wch: 6 },
    { wch: 8 },
    { wch: 12 },
    { wch: 10 },
    { wch: 14 },
    { wch: 10 },
    { wch: 16 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(outWb, outWs, "原料完整数据");

  const outputPath = path.join(TEST_DIR, "原料数据库导入_完整版.xlsx");
  XLSX.writeFile(outWb, outputPath);
  console.log(`\n📄 完整数据已输出: ${outputPath}`);

  // 4. 输出SQL语句文件（用于手动执行或后续自动导入）
  let sqlContent = `-- ══════════════════════════════════════════════════════════════
-- 真实原料数据导入SQL
-- 生成时间: ${new Date().toLocaleString("zh-CN")}
-- 记录数: ${materials.length} 条原料 + ${nutritions.length} 条营养数据
-- ══════════════════════════════════════════════════════════════

BEGIN TRANSACTION;

-- 清空现有数据
DELETE FROM material_nutrition;
DELETE FROM materials;

`;

  for (let i = 0; i < materials.length; i++) {
    const m = materials[i];
    const n = nutritions[i];

    sqlContent += `-- ${i + 1}. ${m.name} (${m.material_type})
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('${m.id}', '${m.name.replace(/'/g, "''")}', '${m.code}', '${m.unit}', ${m.stock}, '${m.material_type}', '${m.created_by}', '${m.created_at}', '${m.updated_at}');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('${n.nutrition_id}', '${n.material_id}', '${n.per_100g_json}', '${n.data_version}', '${(n.data_source || "").replace(/'/g, "''")}', '${n.confidence}', '${n.last_updated}');

`;
  }

  sqlContent += `COMMIT;

-- 导入完成统计
SELECT COUNT(*) AS '原料总数' FROM materials;
SELECT COUNT(*) AS '营养数据总数' FROM material_nutrition;
SELECT 
  material_type AS '类型',
  COUNT(*) AS '数量'
FROM materials 
GROUP BY material_type;
`;

  const sqlPath = path.join(TEST_DIR, "import_real_materials.sql");
  fs.writeFileSync(sqlPath, sqlContent, "utf-8");
  console.log(`📝 SQL文件已输出: ${sqlPath}`);

  // 5. 同时输出JSON格式的数据（供程序直接使用）
  const jsonData = { materials, nutritions };
  const jsonPath = path.join(TEST_DIR, "import_real_materials.json");
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), "utf-8");
  console.log(`📦 JSON文件已输出: ${jsonPath}`);

  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ 准备完成！`);
  console.log(`   原料记录: ${materials.length} 条`);
  console.log(`   营养记录: ${nutritions.length} 条`);
  console.log(`   药材: ${materials.filter(m => m.material_type === "herb").length} 条`);
  console.log(`   辅料: ${materials.filter(m => m.material_type === "supplement").length} 条`);
  console.log(`${"═".repeat(60)}\n`);

  // 显示预览
  console.log("📋 数据预览 (前10条):");
  console.log(
    `${"序号".padStart(3)} │ ${"名称".padEnd(8)} │ ${"编码".padEnd(6)} │ ${"类型"}.padEnd(4)} │ ${"蛋白".padStart(5)} │ ${"脂肪".padStart(5)} │ ${"碳水"}.padStart(5)} │ ${"钠".padStart(5)}`,
  );
  console.log("───┼──────────┼────────┼──────┼───────┼───────┼───────┼───────");

  materials.slice(0, 10).forEach((m, idx) => {
    const nut = JSON.parse(nutritions[idx].per_100g_json);
    const typeLabel = m.material_type === "herb" ? "药材" : "辅料";
    console.log(
      `${String(idx + 1).padStart(3)} │ ${m.name.padEnd(8)} │ ${m.code.padEnd(
        6,
      )} │ ${typeLabel.padEnd(4)} │ ${(nut.protein ?? "-").toString().padStart(5)} │ ${(nut.fat ?? "-")
        .toString()
        .padStart(5)} │ ${(nut.carbohydrate ?? "-").toString().padStart(5)} │ ${(nut.sodium ?? "-")
        .toString()
        .padStart(5)}`,
    );
  });
}

main();
