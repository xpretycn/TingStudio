import { query, connectDatabase } from "../../config/database-adapter.js";
import { now } from "../../utils/helpers.js";

connectDatabase();

const APPEARANCE_OPTIONS = ["颗粒", "膏状", "粉末", "块状", "液体", "澄清", "浑浊", "有沉淀"];
const TASTE_OPTIONS = ["苦味", "甘味", "酸味", "辛味", "咸味", "泥土味", "涩感", "滑润感", "颗粒感", "粗糙感", "清凉感", "草本香", "药香", "焦香", "清香", "陈味"];
const EFFICACY_OPTIONS = ["滋补肝肾", "补中益气", "养血安神", "清热解毒", "清肝明目", "泻火除烦", "健脾养胃", "利水渗湿", "化痰止咳", "活血化瘀", "行气止痛", "疏肝解郁", "敛肺止咳", "涩肠止泻", "生津止渴"];

type ExclusionPair = [string, string];

const APPEARANCE_EXCLUSIONS: ExclusionPair[] = [
  ["膏状", "颗粒"],
  ["粉末", "颗粒"],
  ["液体", "粉末"],
  ["块状", "液体"],
  ["粉末", "膏状"],
  ["块状", "膏状"],
  ["澄清", "膏状"],
];

const TASTE_EXCLUSIONS: ExclusionPair[] = [
  ["咸味", "甘味"],
  ["咸味", "酸味"],
  ["清凉感", "辛味"],
  ["滑润感", "粗糙感"],
];

function isExcluded(value: string, selected: string[], exclusions: ExclusionPair[]): boolean {
  for (const pair of exclusions) {
    if (
      (pair[0] === value && selected.includes(pair[1])) ||
      (pair[1] === value && selected.includes(pair[0]))
    ) {
      return true;
    }
  }
  return false;
}

function pickRandom(options: string[], count: number, exclusions: ExclusionPair[] = []): string[] {
  const shuffled = [...options].sort(() => Math.random() - 0.5);
  const result: string[] = [];
  for (const opt of shuffled) {
    if (result.length >= count) break;
    if (!isExcluded(opt, result, exclusions)) {
      result.push(opt);
    }
  }
  return result;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function seedMaterialEnumFields() {
  console.log("[Seed] 开始：为原料填充性状/口感/功效枚举值...");

  try {
    const result = await query<{ id: string; appearance_json: string | null; taste_json: string | null; efficacy_json: string | null }>(
      "SELECT id, appearance_json, taste_json, efficacy_json FROM materials WHERE is_deleted = 0 AND is_latest = 1"
    );
    const materials = result.rows || [];

    if (materials.length === 0) {
      console.log("[Seed] ⏭️ 没有找到活跃原料，跳过");
      return;
    }

    let updated = 0;
    let skipped = 0;

    for (const mat of materials) {
      const hasAppearance = mat.appearance_json && safeJsonParse(mat.appearance_json).length > 0;
      const hasTaste = mat.taste_json && safeJsonParse(mat.taste_json).length > 0;
      const hasEfficacy = mat.efficacy_json && safeJsonParse(mat.efficacy_json).length > 0;

      if (hasAppearance && hasTaste && hasEfficacy) {
        skipped++;
        continue;
      }

      const appearanceCount = randomInt(2, 3);
      const tasteCount = randomInt(2, 3);
      const efficacyCount = randomInt(2, 3);

      const appearance = hasAppearance
        ? safeJsonParse(mat.appearance_json!)
        : pickRandom(APPEARANCE_OPTIONS, appearanceCount, APPEARANCE_EXCLUSIONS);
      const taste = hasTaste
        ? safeJsonParse(mat.taste_json!)
        : pickRandom(TASTE_OPTIONS, tasteCount, TASTE_EXCLUSIONS);
      const efficacy = hasEfficacy
        ? safeJsonParse(mat.efficacy_json!)
        : pickRandom(EFFICACY_OPTIONS, efficacyCount);

      await query(
        "UPDATE materials SET appearance_json = ?, taste_json = ?, efficacy_json = ?, updated_at = ? WHERE id = ?",
        [JSON.stringify(appearance), JSON.stringify(taste), JSON.stringify(efficacy), now(), mat.id]
      );
      updated++;
    }

    console.log(`[Seed] ✅ 已更新 ${updated} 条原料，跳过 ${skipped} 条已有数据`);
    console.log("[Seed] ✅ 原料枚举值填充完成");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Seed] ✗ 填充失败:", message);
    throw error;
  }
}

function safeJsonParse(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

seedMaterialEnumFields()
  .then(() => {
    console.log("\n✅ 原料枚举值填充完成！");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ 填充失败:", err);
    process.exit(1);
  });
