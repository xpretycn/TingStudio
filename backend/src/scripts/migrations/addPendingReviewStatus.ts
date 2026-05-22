import { query, connectDatabase, getDatabaseType } from "../../config/database.js";

connectDatabase();

async function migrateAddPendingReviewStatus() {
  console.log("[Migration] 开始配方版本审批流程迁移...");
  const dbType = getDatabaseType();

  try {
    if (dbType === "sqlite") {
      await migrateSqliteStatusConstraint();
    } else {
      await migrateMysqlStatusConstraint();
    }

    await createReviewLogsTable(dbType);
    await createIndexes(dbType);
    await verifyMigration(dbType);

    console.log("[Migration] ✅ 配方版本审批流程迁移完成");
  } catch (error: any) {
    console.error("[Migration] ✗ 迁移失败:", error.message);
    throw error;
  }
}

async function migrateSqliteStatusConstraint() {
  console.log("[Migration] SQLite: 检查 formula_versions.status 约束...");

  const { rows: tableInfo } = await query(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='formula_versions'"
  );

  if (tableInfo.length > 0) {
    const createSQL = tableInfo[0].sql as string;
    if (createSQL.includes("pending_review")) {
      console.log("[Migration] ⏭️ SQLite: status 约束已包含 pending_review，跳过");
      return;
    }
  }

  console.log("[Migration] SQLite: 重建 formula_versions 表以更新 CHECK 约束...");

  await query("BEGIN TRANSACTION");

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS formula_versions_new (
        version_id              TEXT PRIMARY KEY,
        formula_id              TEXT NOT NULL,
        version_number          TEXT NOT NULL,
        version_name            TEXT DEFAULT NULL,
        version_reason          TEXT DEFAULT NULL,
        changes_json            TEXT DEFAULT NULL,
        snapshot_json           TEXT NOT NULL,
        status                  TEXT NOT NULL DEFAULT 'draft'
                                CHECK(status IN ('draft', 'pending_review', 'published', 'archived')),
        is_current              INTEGER NOT NULL DEFAULT 0,
        ratio_factor            REAL NOT NULL DEFAULT 0.18
                                CHECK(ratio_factor >= 0.15 AND ratio_factor <= 0.25),
        supplement_ratio_factor REAL NOT NULL DEFAULT 1.0
                                CHECK(supplement_ratio_factor >= 0.5 AND supplement_ratio_factor <= 1.5),
        created_by              TEXT NOT NULL,
        created_at              TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (formula_id) REFERENCES formulas(id) ON DELETE CASCADE
      )
    `);

    await query(`
      INSERT INTO formula_versions_new
        (version_id, formula_id, version_number, version_name, version_reason,
         changes_json, snapshot_json, status, is_current,
         ratio_factor, supplement_ratio_factor, created_by, created_at)
      SELECT
        version_id, formula_id, version_number, version_name, version_reason,
        changes_json, snapshot_json, status, is_current,
        ratio_factor, supplement_ratio_factor, created_by, created_at
      FROM formula_versions
    `);

    await query("DROP TABLE formula_versions");
    await query("ALTER TABLE formula_versions_new RENAME TO formula_versions");

    await query("CREATE INDEX IF NOT EXISTS idx_fv_formula ON formula_versions(formula_id)");
    await query("CREATE INDEX IF NOT EXISTS idx_fv_version_number ON formula_versions(formula_id, version_number)");

    await query("COMMIT");
    console.log("[Migration] ✅ SQLite: formula_versions 表重建完成");
  } catch (error) {
    await query("ROLLBACK");
    console.error("[Migration] ✗ SQLite: 表重建失败，已回滚:", error);
    throw error;
  }
}

async function migrateMysqlStatusConstraint() {
  console.log("[Migration] MySQL: 检查 formula_versions.status 列...");

  const { rows } = await query(
    "SELECT COUNT(*) as cnt FROM formula_versions WHERE status = 'pending_review'"
  );

  if (rows[0]?.cnt > 0) {
    console.log("[Migration] ⏭️ MySQL: 已存在 pending_review 状态数据，跳过");
    return;
  }

  console.log("[Migration] ✅ MySQL: status 列 VARCHAR(20) 足够，应用层负责枚举校验");
}

async function createReviewLogsTable(dbType: string) {
  console.log("[Migration] 创建 formula_review_logs 表...");

  if (dbType === "sqlite") {
    await query(`
      CREATE TABLE IF NOT EXISTS formula_review_logs (
        review_log_id  TEXT PRIMARY KEY,
        version_id     TEXT NOT NULL,
        reviewer_id    TEXT NOT NULL,
        reviewer_name  TEXT DEFAULT NULL,
        action         TEXT NOT NULL CHECK(action IN ('submit', 'approve', 'reject')),
        comment        TEXT DEFAULT NULL,
        created_at     TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (version_id)  REFERENCES formula_versions(version_id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
  } else {
    await query(`
      CREATE TABLE IF NOT EXISTS formula_review_logs (
        review_log_id  VARCHAR(36) PRIMARY KEY,
        version_id     VARCHAR(36) NOT NULL,
        reviewer_id    VARCHAR(36) NOT NULL,
        reviewer_name  VARCHAR(255) DEFAULT NULL,
        action         VARCHAR(20) NOT NULL,
        comment        TEXT DEFAULT NULL,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_frl_version  (version_id),
        INDEX idx_frl_reviewer (reviewer_id),
        INDEX idx_frl_action   (action),
        FOREIGN KEY (version_id)  REFERENCES formula_versions(version_id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  console.log("[Migration] ✅ formula_review_logs 表创建完成");
}

async function createIndexes(dbType: string) {
  console.log("[Migration] 创建索引...");

  await query("CREATE INDEX IF NOT EXISTS idx_fv_status ON formula_versions(status)");
  await query("CREATE INDEX IF NOT EXISTS idx_fv_formula_status ON formula_versions(formula_id, status)");

  if (dbType === "sqlite") {
    await query("CREATE INDEX IF NOT EXISTS idx_frl_version ON formula_review_logs(version_id)");
    await query("CREATE INDEX IF NOT EXISTS idx_frl_reviewer ON formula_review_logs(reviewer_id)");
    await query("CREATE INDEX IF NOT EXISTS idx_frl_action ON formula_review_logs(action)");
  }

  console.log("[Migration] ✅ 索引创建完成");
}

async function verifyMigration(dbType: string) {
  console.log("[Migration] 验证迁移结果...");

  if (dbType === "sqlite") {
    const { rows: tableInfo } = await query(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='formula_versions'"
    );
    if (tableInfo.length > 0) {
      const sql = tableInfo[0].sql as string;
      if (sql.includes("pending_review")) {
        console.log("[Migration] ✅ 验证通过: formula_versions.status 约束已包含 pending_review");
      } else {
        console.error("[Migration] ✗ 验证失败: formula_versions.status 约束未包含 pending_review");
      }
    }

    const { rows: logTableInfo } = await query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='formula_review_logs'"
    );
    if (logTableInfo.length > 0) {
      console.log("[Migration] ✅ 验证通过: formula_review_logs 表已创建");
    } else {
      console.error("[Migration] ✗ 验证失败: formula_review_logs 表未创建");
    }
  }

  const { rows: fvCount } = await query("SELECT COUNT(*) as total FROM formula_versions");
  console.log(`[Migration] formula_versions 现有记录: ${fvCount[0]?.total || 0} 条`);

  const { rows: rlCount } = await query("SELECT COUNT(*) as total FROM formula_review_logs");
  console.log(`[Migration] formula_review_logs 现有记录: ${rlCount[0]?.total || 0} 条`);
}

migrateAddPendingReviewStatus()
  .then(() => {
    console.log("\n✅ 迁移完成！");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ 迁移失败:", err);
    process.exit(1);
  });
