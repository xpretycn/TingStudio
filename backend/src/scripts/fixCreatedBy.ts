

const db = new Database("data/tingstudio.db");

const adminUser = (await query("SELECT id FROM users WHERE username='admin'", [])).rows[0] as any;
const adminId = adminUser.id;

console.log("Admin ID:", adminId);

const result = db
  .prepare("UPDATE materials SET created_by = ? WHERE created_by = ?")
  .run(adminId, "admin");

console.log("已更新原料:", result.changes, "条");

const verify = db
  .prepare("SELECT created_by, COUNT(*) as c FROM materials GROUP BY created_by")
  .all();
console.log("\n验证:", verify);

db.close();
