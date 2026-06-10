import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { query } from "../config/database-adapter.js";
import {
  generateId,
  now,
  success,
  fail,
  buildPagination,
  rowToCamelCase,
  rowsToCamelCase,
  safeJsonParse,
  buildLike,
  fixMulterOriginalname,
  buildContentDisposition,
} from "../utils/helpers.js";
import { AuthRequest } from "../middleware/auth.js";

async function createAuditLog(fileId: string, action: string, operator: string, detail?: Record<string, unknown>, ipAddress?: string) {
  const logId = generateId();
  await query(
    `INSERT INTO file_audit_log (log_id, file_id, action, operator, timestamp, detail_json, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [logId, fileId, action, operator, now(), detail ? JSON.stringify(detail) : null, ipAddress || null],
  );
}

export async function listFiles(req: AuthRequest, res: Response) {
  try {
    const { keyword, fileType, status, relatedStatus, startDate, endDate, page, pageSize } = req.query;
    const { page: p, pageSize: size, offset } = buildPagination(Number(page), Number(pageSize));

    let whereSql = "WHERE 1=1";
    const params: unknown[] = [];

    if (keyword) {
      whereSql += " AND uf.original_name LIKE ?";
      params.push(buildLike(keyword as string));
    }
    if (fileType) {
      whereSql += " AND uf.file_type = ?";
      params.push(fileType);
    }
    if (status) {
      whereSql += " AND uf.status = ?";
      params.push(status);
    }
    if (relatedStatus === "unlinked") {
      whereSql += " AND uf.related_id IS NULL";
    } else if (relatedStatus === "linked") {
      whereSql += " AND uf.related_id IS NOT NULL";
    }
    if (startDate) {
      whereSql += " AND uf.created_at >= ?";
      params.push(startDate);
    }
    if (endDate) {
      whereSql += " AND uf.created_at <= ?";
      params.push(endDate);
    }

    const { rows: listRows } = await query(
      `SELECT uf.*, u.username as uploaded_by_name,
        CASE
          WHEN uf.related_type = 'formula' THEN f.name
          WHEN uf.related_type = 'material' THEN m.name
          ELSE NULL
        END as related_name
       FROM uploaded_files uf
       LEFT JOIN users u ON uf.created_by = u.id
       LEFT JOIN formulas f ON uf.related_id = f.id AND uf.related_type = 'formula'
       LEFT JOIN materials m ON uf.related_id = m.id AND uf.related_type = 'material'
       ${whereSql}
       ORDER BY uf.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, size, offset],
    );

    const { rows: countRows } = await query(`SELECT COUNT(*) as total FROM uploaded_files uf ${whereSql}`, params);

    const { rows: statsRows } = await query(
      `SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'parsed' THEN 1 ELSE 0 END), 0) as parsed,
        COALESCE(SUM(CASE WHEN status = 'linked' THEN 1 ELSE 0 END), 0) as linked,
        COALESCE(SUM(CASE WHEN status IN ('uploaded', 'orphaned') THEN 1 ELSE 0 END), 0) as pending
       FROM uploaded_files`,
    );

    const statsResult = statsRows[0] as Record<string, unknown>;

    res.json(
      success({
        list: rowsToCamelCase(listRows as Record<string, unknown>[]),
        total: (countRows[0] as Record<string, unknown>).total,
        stats: {
          total: statsResult.total,
          parsed: statsResult.parsed,
          linked: statsResult.linked,
          pending: statsResult.pending,
        },
      }),
    );
  } catch (error: unknown) {
    res.status(500).json(fail("获取文件列表失败"));
  }
}

export async function uploadFile(req: AuthRequest, res: Response) {
  try {
    if (!req.file) {
      res.status(400).json(fail("请上传文件", "VALIDATION_ERROR"));
      return;
    }

    const file = req.file as unknown as Record<string, unknown>;
    const fileType = req.body.fileType || "formula";
    const userId = req.user!.userId;

    if (file.originalname) {
      file.originalname = fixMulterOriginalname(file.originalname as string);
    }

    const fileId = generateId();
    const uploadDir = path.join(process.cwd(), "data", "uploads", fileType as string, new Date().toISOString().slice(0, 7));

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.originalname as string);
    const storageFileName = `${fileId}${ext}`;
    const storagePath = path.join(uploadDir, storageFileName);

    if (file.path && file.path !== storagePath) {
      const sourceDir = path.dirname(file.path as string);
      fs.copyFileSync(file.path as string, storagePath);
      try {
        fs.unlinkSync(file.path as string);
        if (fs.readdirSync(sourceDir).length === 0) {
          fs.rmdirSync(sourceDir);
        }
      } catch { /* ignore cleanup errors */ }
    }

    const relativePath = path.relative(process.cwd(), storagePath).replace(/\\/g, "/");

    await query(
      `INSERT INTO uploaded_files (id, original_name, storage_path, file_size, mime_type, file_type, status, version, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'uploaded', 1, ?, ?)`,
      [fileId, file.originalname, relativePath, file.size, file.mimetype, fileType, userId, now()],
    );

    await createAuditLog(fileId, "upload", userId, { originalName: file.originalname, fileSize: file.size }, req.ip);

    const { rows: fileRows } = await query("SELECT * FROM uploaded_files WHERE id = ?", [fileId]);
    res.status(201).json(success(rowToCamelCase(fileRows[0] as Record<string, unknown>), "文件上传成功"));
  } catch (error: unknown) {
    res.status(500).json(fail("文件上传失败"));
  }
}

export async function getFile(req: AuthRequest, res: Response) {
  try {
    const { fileId } = req.params;

    const { rows: fileRows } = await query(
      `SELECT uf.*, u.username as uploaded_by_name,
        CASE
          WHEN uf.related_type = 'formula' THEN f.name
          WHEN uf.related_type = 'material' THEN m.name
          ELSE NULL
        END as related_name
       FROM uploaded_files uf
       LEFT JOIN users u ON uf.created_by = u.id
       LEFT JOIN formulas f ON uf.related_id = f.id AND uf.related_type = 'formula'
       LEFT JOIN materials m ON uf.related_id = m.id AND uf.related_type = 'material'
       WHERE uf.id = ?`,
      [fileId],
    );

    const fileRecord = fileRows[0] as Record<string, unknown> | undefined;
    if (!fileRecord) {
      res.status(404).json(fail("文件不存在", "NOT_FOUND"));
      return;
    }

    await query("UPDATE uploaded_files SET last_accessed_at = ? WHERE id = ?", [now(), fileId]);

    const { rows: relations } = await query(
      "SELECT * FROM file_relations WHERE file_id = ? ORDER BY created_at ASC",
      [fileId],
    );

    res.json(success({ ...rowToCamelCase(fileRecord), relations: rowsToCamelCase(relations as Record<string, unknown>[]) }));
  } catch (error: unknown) {
    res.status(500).json(fail("获取文件信息失败"));
  }
}

export async function deleteFile(req: AuthRequest, res: Response) {
  try {
    if (req.user!.role !== "admin") {
      res.status(403).json(fail("仅管理员可删除文件", "FORBIDDEN"));
      return;
    }

    const { fileId } = req.params;

    const { rows: fileRows } = await query("SELECT * FROM uploaded_files WHERE id = ?", [fileId]);
    const fileRecord = fileRows[0] as Record<string, unknown> | undefined;
    if (!fileRecord) {
      res.status(404).json(fail("文件不存在", "NOT_FOUND"));
      return;
    }

    const absolutePath = path.join(process.cwd(), fileRecord.storage_path as string);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    await createAuditLog(fileId, "delete", req.user!.userId, { originalName: fileRecord.original_name }, req.ip);

    await query("DELETE FROM uploaded_files WHERE id = ?", [fileId]);

    res.json(success(null, "文件删除成功"));
  } catch (error: unknown) {
    res.status(500).json(fail("删除文件失败"));
  }
}

export async function downloadFile(req: AuthRequest, res: Response) {
  try {
    const { fileId } = req.params;

    const { rows: fileRows } = await query("SELECT * FROM uploaded_files WHERE id = ?", [fileId]);
    const fileRecord = fileRows[0] as Record<string, unknown> | undefined;
    if (!fileRecord) {
      res.status(404).json(fail("文件不存在", "NOT_FOUND"));
      return;
    }

    const absolutePath = path.join(process.cwd(), fileRecord.storage_path as string);
    if (!fs.existsSync(absolutePath)) {
      res.status(404).json(fail("文件已丢失", "NOT_FOUND"));
      return;
    }

    await query("UPDATE uploaded_files SET last_accessed_at = ? WHERE id = ?", [now(), fileId]);

    await createAuditLog(fileId, "download", req.user!.userId, { originalName: fileRecord.original_name }, req.ip);

    const fileName = fileRecord.original_name as string;
    res.setHeader("Content-Disposition", buildContentDisposition(fileName));
    res.setHeader("Content-Type", (fileRecord.mime_type as string) || "application/octet-stream");
    const fileStream = fs.createReadStream(absolutePath);
    fileStream.pipe(res);
  } catch (error: unknown) {
    res.status(500).json(fail("文件下载失败"));
  }
}

export async function linkFile(req: AuthRequest, res: Response) {
  try {
    const { fileId } = req.params;
    const { relatedId, relatedType } = req.body as Record<string, string>;

    if (!relatedId || !relatedType) {
      res.status(400).json(fail("缺少关联ID或关联类型", "VALIDATION_ERROR"));
      return;
    }

    const { rows: fileRows } = await query("SELECT * FROM uploaded_files WHERE id = ?", [fileId]);
    const fileRecord = fileRows[0] as Record<string, unknown> | undefined;
    if (!fileRecord) {
      res.status(404).json(fail("文件不存在", "NOT_FOUND"));
      return;
    }

    let relatedName: string | null = null;
    if (relatedType === "formula") {
      const { rows: formulaRows } = await query("SELECT name FROM formulas WHERE id = ?", [relatedId]);
      relatedName = formulaRows[0] ? (formulaRows[0] as Record<string, unknown>).name as string : null;
    } else if (relatedType === "material") {
      const { rows: materialRows } = await query("SELECT name FROM materials WHERE id = ?", [relatedId]);
      relatedName = materialRows[0] ? (materialRows[0] as Record<string, unknown>).name as string : null;
    }

    if (!relatedName) {
      res.status(400).json(fail("关联的记录不存在", "VALIDATION_ERROR"));
      return;
    }

    const relationId = generateId();
    await query(
      `INSERT OR IGNORE INTO file_relations (relation_id, file_id, related_id, related_type, related_name, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [relationId, fileId, relatedId, relatedType, relatedName, req.user!.userId, now()],
    );

    await query("UPDATE uploaded_files SET status = 'linked', related_id = ?, related_type = ? WHERE id = ? AND status NOT IN ('linked')", [
      relatedId,
      relatedType,
      fileId,
    ]);

    if (!fileRecord.related_id) {
      await query("UPDATE uploaded_files SET related_id = ?, related_type = ?, status = 'linked' WHERE id = ?", [
        relatedId,
        relatedType,
        fileId,
      ]);
    }

    await createAuditLog(fileId, "link", req.user!.userId, { relatedId, relatedType, relatedName }, req.ip);

    res.json(success(null, "文件关联成功"));
  } catch (error: unknown) {
    res.status(500).json(fail("关联文件失败"));
  }
}

export async function unlinkFile(req: AuthRequest, res: Response) {
  try {
    const { fileId } = req.params;
    const { relatedId, relatedType } = req.body as Record<string, string>;

    const { rows: fileRows } = await query("SELECT * FROM uploaded_files WHERE id = ?", [fileId]);
    const fileRecord = fileRows[0] as Record<string, unknown> | undefined;
    if (!fileRecord) {
      res.status(404).json(fail("文件不存在", "NOT_FOUND"));
      return;
    }

    if (relatedId && relatedType) {
      await query("DELETE FROM file_relations WHERE file_id = ? AND related_id = ? AND related_type = ?", [
        fileId,
        relatedId,
        relatedType,
      ]);
    } else {
      await query("DELETE FROM file_relations WHERE file_id = ?", [fileId]);
    }

    const { rows: remainingRows } = await query(
      "SELECT COUNT(*) as cnt FROM file_relations WHERE file_id = ?",
      [fileId],
    );

    const remaining = remainingRows[0] as Record<string, unknown>;
    if (remaining.cnt === 0) {
      await query(
        "UPDATE uploaded_files SET related_id = NULL, related_type = NULL, status = 'parsed' WHERE id = ?",
        [fileId],
      );
    } else {
      const { rows: firstRelationRows } = await query(
        "SELECT related_id, related_type FROM file_relations WHERE file_id = ? ORDER BY created_at ASC LIMIT 1",
        [fileId],
      );
      const firstRelation = firstRelationRows[0] as Record<string, unknown> | undefined;
      if (firstRelation) {
        await query("UPDATE uploaded_files SET related_id = ?, related_type = ? WHERE id = ?", [
          firstRelation.related_id,
          firstRelation.related_type,
          fileId,
        ]);
      }
    }

    await createAuditLog(
      fileId,
      "unlink",
      req.user!.userId,
      { previousRelatedId: relatedId || fileRecord.related_id, previousRelatedType: relatedType || fileRecord.related_type },
      req.ip,
    );

    res.json(success(null, "取消关联成功"));
  } catch (error: unknown) {
    res.status(500).json(fail("取消关联失败"));
  }
}

export async function getFileRelations(req: AuthRequest, res: Response) {
  try {
    const { fileId } = req.params;

    const { rows: fileRows } = await query("SELECT id FROM uploaded_files WHERE id = ?", [fileId]);
    if (!fileRows[0]) {
      res.status(404).json(fail("文件不存在", "NOT_FOUND"));
      return;
    }

    const { rows: relations } = await query(
      "SELECT * FROM file_relations WHERE file_id = ? ORDER BY created_at ASC",
      [fileId],
    );
    res.json(success(rowsToCamelCase(relations as Record<string, unknown>[])));
  } catch (error: unknown) {
    res.status(500).json(fail("获取关联关系失败"));
  }
}

export async function reparseFile(req: AuthRequest, res: Response) {
  try {
    const { fileId } = req.params;
    const { model } = req.body as Record<string, string>;

    const { rows: fileRows } = await query("SELECT * FROM uploaded_files WHERE id = ?", [fileId]);
    const fileRecord = fileRows[0] as Record<string, unknown> | undefined;
    if (!fileRecord) {
      res.status(404).json(fail("文件不存在", "NOT_FOUND"));
      return;
    }

    await query("UPDATE uploaded_files SET parse_model = ?, version = version + 1 WHERE id = ?", [
      model || fileRecord.parse_model,
      fileId,
    ]);

    await createAuditLog(
      fileId,
      "reparse",
      req.user!.userId,
      { model: model || fileRecord.parse_model, newVersion: Number(fileRecord.version) + 1 },
      req.ip,
    );

    res.json(success(null, "重新解析已触发"));
  } catch (error: unknown) {
    res.status(500).json(fail("重新解析失败"));
  }
}

export async function getFileAuditLog(req: AuthRequest, res: Response) {
  try {
    const { fileId } = req.params;

    const { rows: fileRows } = await query("SELECT id FROM uploaded_files WHERE id = ?", [fileId]);
    if (!fileRows[0]) {
      res.status(404).json(fail("文件不存在", "NOT_FOUND"));
      return;
    }

    const { rows: logs } = await query("SELECT * FROM file_audit_log WHERE file_id = ? ORDER BY timestamp DESC", [
      fileId,
    ]);

    res.json(success(rowsToCamelCase(logs as Record<string, unknown>[])));
  } catch (error: unknown) {
    res.status(500).json(fail("获取审计日志失败"));
  }
}

export async function previewFile(req: AuthRequest, res: Response) {
  try {
    const { fileId } = req.params;
    const sheetIndex = Number(req.query.sheet) || 0;
    const maxRows = Number(req.query.maxRows) || 500;
    const maxCols = Number(req.query.maxCols) || 50;

    const { rows: fileRows } = await query("SELECT * FROM uploaded_files WHERE id = ?", [fileId]);
    const fileRecord = fileRows[0] as Record<string, unknown> | undefined;
    if (!fileRecord) {
      res.status(404).json(fail("文件不存在", "NOT_FOUND"));
      return;
    }

    const absolutePath = path.join(process.cwd(), fileRecord.storage_path as string);
    if (!fs.existsSync(absolutePath)) {
      res.status(404).json(fail("文件已丢失", "NOT_FOUND"));
      return;
    }

    const mimeType = (fileRecord.mime_type as string) || "";
    const ext = path.extname(fileRecord.original_name as string).toLowerCase();

    if (
      mimeType.includes("spreadsheet") ||
      mimeType.includes("excel") ||
      mimeType.includes("csv") ||
      [".xlsx", ".xls", ".csv"].includes(ext)
    ) {
      const workbook = XLSX.readFile(absolutePath);
      const sheetNames = workbook.SheetNames;
      const activeSheet = Math.min(sheetIndex, sheetNames.length - 1);
      const worksheet = workbook.Sheets[sheetNames[activeSheet]];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "" }) as unknown[][];

      let headers: string[] = [];
      let rows: unknown[][] = [];

      if (rawData.length > 0) {
        headers = rawData[0]
          .slice(0, maxCols)
          .map((h: unknown, i: number) => (h != null && String(h).trim() !== "" ? String(h) : `列${i + 1}`));
        rows = rawData.slice(1, maxRows + 1).map((row: unknown[]) => row.slice(0, maxCols));
      }

      const totalRows = rawData.length - 1;
      const truncated = totalRows > maxRows;

      await createAuditLog(fileId, "download", req.user!.userId, { action: "preview", sheet: activeSheet }, req.ip);

      res.json(
        success({
          type: "excel",
          sheets: [{ name: sheetNames[activeSheet], headers, rows }],
          activeSheet,
          sheetNames,
          totalRows,
          truncated,
        }),
      );
    } else if (mimeType.startsWith("image/") || [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
      await createAuditLog(fileId, "download", req.user!.userId, { action: "preview" }, req.ip);

      res.json(
        success({
          type: "image",
          url: `/api/files/${fileId}/download`,
          thumbnailUrl: `/api/files/${fileId}/thumbnail`,
        }),
      );
    } else {
      res.status(400).json(fail("不支持预览该文件类型", "VALIDATION_ERROR"));
    }
  } catch (error: unknown) {
    res.status(500).json(fail("文件预览失败"));
  }
}

export async function getThumbnail(req: AuthRequest, res: Response) {
  try {
    const { fileId } = req.params;

    const { rows: fileRows } = await query("SELECT * FROM uploaded_files WHERE id = ?", [fileId]);
    const fileRecord = fileRows[0] as Record<string, unknown> | undefined;
    if (!fileRecord) {
      res.status(404).json(fail("文件不存在", "NOT_FOUND"));
      return;
    }

    const absolutePath = path.join(process.cwd(), fileRecord.storage_path as string);
    if (!fs.existsSync(absolutePath)) {
      res.status(404).json(fail("文件已丢失", "NOT_FOUND"));
      return;
    }

    const mimeType = (fileRecord.mime_type as string) || "";
    const ext = path.extname(fileRecord.original_name as string).toLowerCase();

    if (mimeType.startsWith("image/") || [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
      try {
        const sharp = (await import("sharp" as string)).default;
        const thumbnailBuffer = await sharp(absolutePath)
          .resize(200, 200, { fit: "cover" })
          .jpeg({ quality: 80 })
          .toBuffer();

        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.send(thumbnailBuffer);
      } catch {
        res.redirect(`/api/files/${fileId}/download`);
      }
    } else {
      res.status(404).json(fail("该文件类型不支持缩略图", "NOT_FOUND"));
    }
  } catch (error: unknown) {
    res.status(500).json(fail("获取缩略图失败"));
  }
}

export async function getStats(req: AuthRequest, res: Response) {
  try {
    const { rows: statsRows } = await query(
      `SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'parsed' THEN 1 ELSE 0 END), 0) as parsed,
        COALESCE(SUM(CASE WHEN status = 'linked' THEN 1 ELSE 0 END), 0) as linked,
        COALESCE(SUM(CASE WHEN status IN ('uploaded', 'orphaned') THEN 1 ELSE 0 END), 0) as pending,
        COALESCE(SUM(file_size), 0) as totalSize
       FROM uploaded_files`,
    );

    const statsResult = statsRows[0] as Record<string, unknown>;
    res.json(
      success({
        total: statsResult.total,
        parsed: statsResult.parsed,
        linked: statsResult.linked,
        pending: statsResult.pending,
        totalSize: statsResult.totalSize,
      }),
    );
  } catch (error: unknown) {
    res.status(500).json(fail("获取文件统计失败"));
  }
}

export async function batchDelete(req: AuthRequest, res: Response) {
  try {
    if (req.user!.role !== "admin") {
      res.status(403).json(fail("仅管理员可批量删除文件", "FORBIDDEN"));
      return;
    }

    const { fileIds } = req.body as { fileIds: string[] };
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      res.status(400).json(fail("请提供要删除的文件ID列表", "VALIDATION_ERROR"));
      return;
    }

    let deleted = 0;
    let failed = 0;

    for (const fileId of fileIds) {
      try {
        const { rows: fileRows } = await query("SELECT * FROM uploaded_files WHERE id = ?", [fileId]);
        const fileRecord = fileRows[0] as Record<string, unknown> | undefined;
        if (!fileRecord) {
          failed++;
          continue;
        }

        const absolutePath = path.join(process.cwd(), fileRecord.storage_path as string);
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }

        await createAuditLog(
          fileId,
          "delete",
          req.user!.userId,
          { originalName: fileRecord.original_name, batch: true },
          req.ip,
        );
        await query("DELETE FROM uploaded_files WHERE id = ?", [fileId]);
        deleted++;
      } catch {
        failed++;
      }
    }

    res.json(success({ deleted, failed }, `批量删除完成：成功 ${deleted} 个，失败 ${failed} 个`));
  } catch (error: unknown) {
    res.status(500).json(fail("批量删除失败"));
  }
}

export async function batchArchive(req: AuthRequest, res: Response) {
  try {
    const { fileIds } = req.body as { fileIds: string[] };
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      res.status(400).json(fail("请提供要归档的文件ID列表", "VALIDATION_ERROR"));
      return;
    }

    let archived = 0;
    let failed = 0;

    for (const fileId of fileIds) {
      try {
        const { rows: fileRows } = await query("SELECT id FROM uploaded_files WHERE id = ?", [fileId]);
        if (!fileRows[0]) {
          failed++;
          continue;
        }

        await query("UPDATE uploaded_files SET status = 'archived' WHERE id = ?", [fileId]);
        await createAuditLog(fileId, "archive", req.user!.userId, { batch: true }, req.ip);
        archived++;
      } catch {
        failed++;
      }
    }

    res.json(success({ archived, failed }, `批量归档完成：成功 ${archived} 个，失败 ${failed} 个`));
  } catch (error: unknown) {
    res.status(500).json(fail("批量归档失败"));
  }
}

export async function fixGarbledFilenames(_req: AuthRequest, res: Response) {
  try {
    const { rows: files } = await query("SELECT id, original_name FROM uploaded_files");
    let fixed = 0;
    for (const file of files as Record<string, unknown>[]) {
      const fixedName = fixMulterOriginalname(file.original_name as string);
      if (fixedName !== file.original_name) {
        await query("UPDATE uploaded_files SET original_name = ? WHERE id = ?", [fixedName, file.id]);
        fixed++;
      }
    }
    res.json(success({ total: files.length, fixed }, `修复完成：共 ${files.length} 条记录，修复 ${fixed} 条`));
  } catch (error: unknown) {
    res.status(500).json(fail("修复乱码失败"));
  }
}

export async function autoFixGarbledFilenames() {
  try {
    const { rows: files } = await query("SELECT id, original_name FROM uploaded_files");
    let fixed = 0;
    for (const file of files as Record<string, unknown>[]) {
      const fixedName = fixMulterOriginalname(file.original_name as string);
      if (fixedName !== file.original_name) {
        await query("UPDATE uploaded_files SET original_name = ? WHERE id = ?", [fixedName, file.id]);
        fixed++;
      }
    }
    if (fixed > 0) {
      console.log(`[自动修复] 已修复 ${fixed} 条乱码文件名`);
    }
  } catch (error: unknown) {
    console.error("[自动修复] 修复乱码文件名失败:", error instanceof Error ? error.message : String(error));
  }
}
