import { getDb, connectDatabase } from "../backend/src/config/database-better-sqlite3.js";

connectDatabase();
const db = getDb();

const fvCreateSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='formula_versions'").get() as any;
console.log("=== formula_versions 建表语句 ===");
console.log(fvCreateSql?.sql);

const hasPendingReview = fvCreateSql?.sql?.includes("pending_review");
console.log("\n✓ pending_review 已添加:", hasPendingReview);

const logTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='formula_review_logs'").get() as any;
console.log("\n=== formula_review_logs 表 ===");
console.log("存在:", !!logTable);

const fvIndexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='formula_versions'").all() as any[];
console.log("\n=== formula_versions 索引 ===");
fvIndexes.forEach((idx: any) => console.log("  -", idx.name));

const frlIndexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='formula_review_logs'").all() as any[];
console.log("\n=== formula_review_logs 索引 ===");
frlIndexes.forEach((idx: any) => console.log("  -", idx.name));

console.log("\n=== 数据完整性 ===");
const fvCount = db.prepare("SELECT COUNT(*) as cnt FROM formula_versions").get() as any;
const fCount = db.prepare("SELECT COUNT(*) as cnt FROM formulas").get() as any;
console.log("formula_versions 记录数:", fvCount.cnt);
console.log("formulas 记录数:", fCount.cnt);

const statusDist = db.prepare("SELECT status, COUNT(*) as cnt FROM formula_versions GROUP BY status").all() as any[];
console.log("formula_versions 状态分布:");
statusDist.forEach((s: any) => console.log("  -", s.status, ":", s.cnt));

console.log("\n✅ 验证完成");
process.exit(0);