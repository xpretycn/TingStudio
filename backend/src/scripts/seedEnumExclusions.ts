import { query, connectDatabase } from "../config/database-adapter.js";
import { generateId, now } from "../utils/helpers.js";

connectDatabase();

/**
 * 互斥规则种子数据
 * value_a < value_b（按 Unicode 字典序）
 *
 * Unicode 排序参考（appearance）：
 *   块(U+5757) < 液(U+6DB2) < 澄(U+6F84) < 粉(U+7C89) < 膏(U+818F) < 颗(U+9897)
 *
 * Unicode 排序参考（taste）：
 *   咸(U+54B8) < 清(U+6E05) < 滑(U+6ED1) < 甘(U+7518) < 粗(U+7C97) < 辛(U+8F9B) < 酸(U+9178)
 */
const SEED_DATA: Array<{ category: string; valueA: string; valueB: string }> = [
  // appearance 互斥
  { category: "appearance", valueA: "膏状", valueB: "颗粒" },
  { category: "appearance", valueA: "粉末", valueB: "颗粒" },
  { category: "appearance", valueA: "液体", valueB: "粉末" },
  { category: "appearance", valueA: "块状", valueB: "液体" },
  { category: "appearance", valueA: "粉末", valueB: "膏状" },
  { category: "appearance", valueA: "块状", valueB: "膏状" },
  { category: "appearance", valueA: "澄清", valueB: "膏状" },

  // taste 互斥
  { category: "taste", valueA: "咸味", valueB: "甘味" },
  { category: "taste", valueA: "咸味", valueB: "酸味" },
  { category: "taste", valueA: "清凉感", valueB: "辛味" },
  { category: "taste", valueA: "滑润感", valueB: "粗糙感" },
];

export async function seedEnumExclusions() {
  console.log("[Seed] 开始：填充枚举互斥规则种子数据...");

  try {
    const existingResult = await query<{ count: number }>("SELECT COUNT(*) as count FROM enum_exclusions");
    const existingCount = existingResult.rows?.[0]?.count ?? 0;
    if (existingCount > 0) {
      console.log(`[Seed] ⏭️ enum_exclusions 表已有 ${existingCount} 条数据，跳过种子填充`);
      return;
    }

    for (const { category, valueA, valueB } of SEED_DATA) {
      const id = generateId();
      await query(
        "INSERT INTO enum_exclusions (id, category, value_a, value_b, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        [id, category, valueA, valueB, now(), now()],
      );
    }

    const appearanceCount = SEED_DATA.filter((d) => d.category === "appearance").length;
    const tasteCount = SEED_DATA.filter((d) => d.category === "taste").length;
    console.log(`[Seed] ✅ appearance: 已插入 ${appearanceCount} 条互斥规则`);
    console.log(`[Seed] ✅ taste: 已插入 ${tasteCount} 条互斥规则`);
    console.log("[Seed] ✅ 枚举互斥规则种子数据填充完成");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Seed] ✗ 种子填充失败:", message);
    throw error;
  }
}

seedEnumExclusions()
  .then(() => {
    console.log("\n✅ 种子数据填充完成！");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ 种子填充失败:", err);
    process.exit(1);
  });
