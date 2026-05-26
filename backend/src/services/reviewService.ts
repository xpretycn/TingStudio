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
    `SELECT fv.*, f.name AS formula_name, f.code AS formula_code, u.display_name AS submitter_name
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
      formulaCode: logRow.formula_code,
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

export async function getMySubmissions(params: {
  userId: string;
  keyword?: string;
  status?: string;
  page: number;
  pageSize: number;
}): Promise<{ list: any[]; pagination: any }> {
  const { userId, keyword, status, page, pageSize } = params;
  const conditions: string[] = ["fv.created_by = ?"];
  const queryParams: any[] = [userId];

  if (keyword) {
    conditions.push("(f.name LIKE ? OR fv.version_name LIKE ?)");
    const like = `%${keyword}%`;
    queryParams.push(like, like);
  }

  if (status) {
    if (status === "rejected") {
      conditions.push("rl.action = 'reject'");
    } else {
      conditions.push("fv.status = ?");
      queryParams.push(status);
    }
  }

  const whereClause = "WHERE " + conditions.join(" AND ");
  const offset = (page - 1) * pageSize;

  const [dataResult]: any[] = await query(
    `SELECT
       fv.version_id, fv.formula_id, f.name AS formula_name, f.code AS formula_code,
       fv.version_number, fv.version_name, fv.status, fv.created_at,
       rl.action AS latest_action, rl.reviewer_name AS latest_reviewer_name,
       rl.comment AS latest_comment, rl.created_at AS latest_review_at
     FROM formula_versions fv
     JOIN formulas f ON f.id = fv.formula_id
     LEFT JOIN (
       SELECT rl1.* FROM formula_review_logs rl1
       INNER JOIN (
         SELECT version_id, MAX(created_at) AS max_created
         FROM formula_review_logs GROUP BY version_id
       ) rl2 ON rl1.version_id = rl2.version_id AND rl1.created_at = rl2.max_created
     ) rl ON rl.version_id = fv.version_id
     ${whereClause}
     ORDER BY fv.created_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, pageSize, offset]
  );

  const [countResult]: any[] = await query(
    `SELECT COUNT(*) as total FROM formula_versions fv
     JOIN formulas f ON f.id = fv.formula_id
     LEFT JOIN (
       SELECT rl1.* FROM formula_review_logs rl1
       INNER JOIN (
         SELECT version_id, MAX(created_at) AS max_created
         FROM formula_review_logs GROUP BY version_id
       ) rl2 ON rl1.version_id = rl2.version_id AND rl1.created_at = rl2.max_created
     ) rl ON rl.version_id = fv.version_id
     ${whereClause}`,
    queryParams
  );

  const list = (dataResult || []).map((row: any) => ({
    versionId: row.version_id,
    formulaId: row.formula_id,
    formulaName: row.formula_name,
    formulaCode: row.formula_code,
    versionNumber: row.version_number,
    versionName: row.version_name,
    status: row.status,
    createdAt: row.created_at,
    latestReview: row.latest_action
      ? {
          action: row.latest_action,
          reviewerName: row.latest_reviewer_name,
          comment: row.latest_comment,
          createdAt: row.latest_review_at,
        }
      : null,
  }));

  const total = countResult?.[0]?.total || 0;

  return {
    list,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function getReviewedByMe(params: {
  reviewerId: string;
  keyword?: string;
  action?: string;
  page: number;
  pageSize: number;
}): Promise<{ list: any[]; pagination: any }> {
  const { reviewerId, keyword, action, page, pageSize } = params;
  const conditions: string[] = ["rl.reviewer_id = ?"];
  const queryParams: any[] = [reviewerId];

  if (action) {
    conditions.push("rl.action = ?");
    queryParams.push(action);
  } else {
    conditions.push("rl.action IN ('approve', 'reject')");
  }

  if (keyword) {
    conditions.push("f.name LIKE ?");
    const like = `%${keyword}%`;
    queryParams.push(like);
  }

  const whereClause = "WHERE " + conditions.join(" AND ");
  const offset = (page - 1) * pageSize;

  const [dataResult]: any[] = await query(
    `SELECT
       rl.action, rl.comment, rl.created_at AS review_at,
       rl.reviewer_name,
       fv.version_id, fv.formula_id, fv.version_number, fv.version_name, fv.status, fv.created_at,
       f.name AS formula_name, f.code AS formula_code,
       u.display_name AS submitted_by_name
     FROM formula_review_logs rl
     JOIN formula_versions fv ON rl.version_id = fv.version_id
     JOIN formulas f ON fv.formula_id = f.id
     LEFT JOIN users u ON fv.created_by = u.id
     ${whereClause}
     ORDER BY rl.created_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, pageSize, offset]
  );

  const [countResult]: any[] = await query(
    `SELECT COUNT(*) as total FROM formula_review_logs rl
     JOIN formula_versions fv ON rl.version_id = fv.version_id
     JOIN formulas f ON fv.formula_id = f.id
     ${whereClause}`,
    queryParams
  );

  const list = (dataResult || []).map((row: any) => ({
    versionId: row.version_id,
    formulaId: row.formula_id,
    formulaName: row.formula_name,
    formulaCode: row.formula_code,
    versionNumber: row.version_number,
    versionName: row.version_name,
    status: row.status,
    createdAt: row.created_at,
    submittedByName: row.submitted_by_name,
    action: row.action,
    comment: row.comment,
    reviewedAt: row.review_at,
  }));

  const total = countResult?.[0]?.total || 0;

  return {
    list,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function isFormulaOwner(formulaId: string, userId: string): Promise<boolean> {
  const [[formula]]: any[][] = await query(
    "SELECT created_by FROM formulas WHERE id = ?",
    [formulaId]
  );
  return formula?.created_by === userId;
}
