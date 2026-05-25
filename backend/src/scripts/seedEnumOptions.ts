import { query, connectDatabase } from "../config/database-adapter.js";
import { generateId, now } from "../utils/helpers.js";

connectDatabase();

const SEED_DATA: Record<string, string[]> = {
  appearance: ["颗粒", "膏状", "粉末", "块状", "液体", "澄清", "浑浊", "有沉淀"],
  taste: ["苦味", "甘味", "酸味", "辛味", "咸味", "泥土味", "涩感", "滑润感", "颗粒感", "粗糙感", "清凉感", "草本香", "药香", "焦香", "清香", "陈味"],
  efficacy: ["滋补肝肾", "补中益气", "养血安神", "清热解毒", "清肝明目", "泻火除烦", "健脾养胃", "利水渗湿", "化痰止咳", "活血化瘀", "行气止痛", "疏肝解郁", "敛肺止咳", "涩肠止泻", "生津止渴"],
};

export async function seedEnumOptions() {
  console.log("[Seed] 开始：填充枚举选项种子数据...");

  try {
    const existingResult = await query<{ count: number }>("SELECT COUNT(*) as count FROM enum_options");
    const existingCount = existingResult.rows?.[0]?.count ?? 0;
    if (existingCount > 0) {
      console.log(`[Seed] ⏭️ enum_options 表已有 ${existingCount} 条数据，跳过种子填充`);
      return;
    }

    for (const [category, values] of Object.entries(SEED_DATA)) {
      for (let i = 0; i < values.length; i++) {
        const id = generateId();
        const label = values[i];
        const value = values[i];
        const sortOrder = i + 1;
        await query(
          "INSERT INTO enum_options (id, category, label, value, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
          [id, category, label, value, sortOrder, now(), now()],
        );
      }
      console.log(`[Seed] ✅ ${category}: 已插入 ${values.length} 条数据`);
    }

    console.log("[Seed] ✅ 枚举选项种子数据填充完成");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Seed] ✗ 种子填充失败:", message);
    throw error;
  }
}

seedEnumOptions()
  .then(() => {
    console.log("\n✅ 种子数据填充完成！");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ 种子填充失败:", err);
    process.exit(1);
  });
