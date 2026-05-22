import { query } from "../config/database-better-sqlite3.js";
import { generateId, now, rowsToCamelCase } from "../utils/helpers.js";

export async function createReviewLog(params: {
  versionId: string;
  reviewerId: string;
  reviewerName?: string;
  action: "submit" | "approve" | "reject";
  comment?: string;
}): Promise<void> {
  const { versionId, reviewerId, reviewerName, action, comment } = params;
  await query(
    `INSERT INTO formula_review_logs (review_log_id, version_id, reviewer_id, reviewer_name, action, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [generateId(), versionId, reviewerId, reviewerName || null, action, comment || null, now()]
  );
}

export async function getReviewLogs(versionId: string): Promise<any[]> {
  const [logs]: any[] = await query(
    `SELECT rl.*, u.display_name AS reviewer_display_name, u.role AS reviewer_role
     FROM formula_review_logs rl
     LEFT JOIN users u ON rl.reviewer_id = u.id
     WHERE rl.version_id = ?
     ORDER BY rl.created_at ASC`,
    [versionId]
  );
  return rowsToCamelCase(logs || []);
}

export async function getPendingReviewList(params: {
  keyword?: string;
  page: number;
  pageSize: number;
}): Promise<{ list: any[]; pagination: any }> {
  const { keyword, page, pageSize } = params;
  const conditions: string[] = ["fv.status = 'pending_review'"];
  const queryParams: any[] = [];

  if (keyword) {
    conditions.push("(f.name LIKE ? OR fv.version_name LIKE ?)");
    const like = `%${keyword}%`;
    queryParams.push(like, like);
  }

  const whereClause = "WHERE " + conditions.join(" AND ");
  const offset = (page - 1) * pageSize;

  const [dataResult]: any[] = await query(
    `SELECT fv.*, f.name AS formula_name, u.display_name AS submitter_name
     FROM formula_versions fv
     LEFT JOIN formulas f ON fv.formula_id = f.id
     LEFT JOIN users u ON fv.created_by = u.id
     ${whereClause}
     ORDER BY fv.created_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, pageSize, offset]
  );

  const [countResult]: any[] = await query(
    `SELECT COUNT(*) as total FROM formula_versions fv
     LEFT JOIN formulas f ON fv.formula_id = f.id
     ${whereClause}`,
    queryParams
  );

  const list = (dataResult || []).map((row: any) => {
    const logRow = row as any;
    const submitLog = getLatestSubmitLog(logRow.version_id);
    return {
      versionId: logRow.version_id,
      formulaId: logRow.formula_id,
      formulaName: logRow.formula_name,
      versionNumber: logRow.version_number,
      versionName: logRow.version_name,
      status: logRow.status,
      submittedBy: logRow.created_by,
      submittedByName: logRow.submitter_name,
      submittedAt: logRow.created_at,
    };
  });

  const total = countResult?.[0]?.total || 0;

  return {
    list,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

async function getLatestSubmitLog(versionId: string): Promise<any> {
  const [logs]: any[] = await query(
    `SELECT * FROM formula_review_logs WHERE version_id = ? AND action = 'submit' ORDER BY created_at DESC LIMIT 1`,
    [versionId]
  );
  return logs?.[0] || null;
}

export async function isFormulaOwner(formulaId: string, userId: string): Promise<boolean> {
  const [[formula]]: any[][] = await query(
    "SELECT created_by FROM formulas WHERE id = ?",
    [formulaId]
  );
  return formula?.created_by === userId;
}
