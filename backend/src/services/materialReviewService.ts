import { query } from "../config/database-adapter.js";
import { generateId, now, rowsToCamelCase } from "../utils/helpers.js";

async function getReviewerName(reviewerId: string): Promise<string | null> {
  const result = await query<{ display_name: string }>("SELECT display_name FROM users WHERE id = ?", [reviewerId]);
  return result.rows?.[0]?.display_name || null;
}

export async function createReviewLog(params: {
  materialId: string;
  reviewerId: string;
  action: string;
  comment?: string;
}): Promise<string> {
  const { materialId, reviewerId, action, comment } = params;
  const logId = generateId();
  const reviewerName = await getReviewerName(reviewerId);

  await query(
    `INSERT INTO material_review_logs (review_log_id, material_id, reviewer_id, reviewer_name, action, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [logId, materialId, reviewerId, reviewerName, action, comment || null, now()],
  );

  return logId;
}

export async function getReviewLogs(materialId: string): Promise<any[]> {
  const result = await query<any>(
    `SELECT mrl.*, u.display_name AS reviewer_display_name
     FROM material_review_logs mrl
     LEFT JOIN users u ON mrl.reviewer_id = u.id
     WHERE mrl.material_id = ?
     ORDER BY mrl.created_at DESC`,
    [materialId],
  );

  return rowsToCamelCase(result.rows || []);
}

export async function getPendingReviewList(params: {
  keyword?: string;
  page: number;
  pageSize: number;
}): Promise<any> {
  const { keyword, page, pageSize } = params;
  const { buildPagination, buildLike } = await import("../utils/helpers.js");
  const { page: p, pageSize: size, offset } = buildPagination(page, pageSize);

  const conditions: string[] = ["m.status = 'pending_review'", "m.is_deleted = 0", "m.is_latest = 1"];
  const queryParams: any[] = [];

  if (keyword) {
    conditions.push("(m.name LIKE ? OR m.code LIKE ?)");
    const like = buildLike(keyword);
    queryParams.push(like, like);
  }

  const whereClause = conditions.join(" AND ");

  const dataResult = await query<any>(
    `SELECT m.*, u.display_name AS submitter_name
     FROM materials m
     LEFT JOIN users u ON m.created_by = u.id
     WHERE ${whereClause}
     ORDER BY m.updated_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, size, offset],
  );

  const countResult = await query<{ total: number }>(
    `SELECT COUNT(*) as total FROM materials m WHERE ${whereClause}`,
    queryParams,
  );

  const list = rowsToCamelCase(dataResult.rows || []);
  const total = countResult.rows?.[0]?.total || 0;

  return {
    list,
    pagination: {
      page: p,
      pageSize: size,
      total,
      totalPages: Math.ceil(total / size),
    },
  };
}
