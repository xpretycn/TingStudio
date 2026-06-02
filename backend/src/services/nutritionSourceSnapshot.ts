// 营养来源变更快照服务
// 每次批量操作（设主用、归档、恢复）后，将"当时的来源状态 + 主用映射"序列化为 JSON 存入快照表

import crypto from 'crypto';
import { query } from '../config/database-adapter.js';
import { logger } from '../utils/logger.js';

type DbRow = Record<string, unknown>;

export type SnapshotActionType = 'batch_set_authoritative' | 'batch_archive' | 'batch_restore' | 'manual_set' | 'import';

export interface SnapshotInput {
  materialId: string
  materialName?: string
  action: SnapshotActionType
  operatorId: string
  operatorName?: string
  affectedSourceIds: string[]
  payload: Record<string, unknown>
  note?: string
}

export interface SnapshotRow {
  snapshotId: string
  materialId: string
  action: SnapshotActionType
  operatorId: string
  operatorName: string | null
  affectedSourceIds: string[]
  payload: Record<string, unknown>
  note: string | null
  createdAt: string
}

let snapshotTableEnsured = false;

export async function ensureSnapshotTable(): Promise<void> {
  if (snapshotTableEnsured) return;

  await query(`
    CREATE TABLE IF NOT EXISTS material_nutrition_snapshots (
      snapshot_id        TEXT PRIMARY KEY,
      material_id        TEXT NOT NULL,
      action             TEXT NOT NULL,
      operator_id        TEXT,
      operator_name      TEXT,
      affected_source_ids TEXT NOT NULL,
      payload_json       TEXT NOT NULL,
      note               TEXT,
      created_at         TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_mnsnap_material ON material_nutrition_snapshots(material_id)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_mnsnap_created ON material_nutrition_snapshots(created_at DESC)
  `);

  snapshotTableEnsured = true;
}

export async function createSnapshot(input: SnapshotInput): Promise<SnapshotRow> {
  await ensureSnapshotTable();

  const snapshotId = `snap_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  await query(
    `INSERT INTO material_nutrition_snapshots
       (snapshot_id, material_id, action, operator_id, operator_name, affected_source_ids, payload_json, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      snapshotId,
      input.materialId,
      input.action,
      input.operatorId,
      input.operatorName ?? null,
      JSON.stringify(input.affectedSourceIds),
      JSON.stringify(input.payload),
      input.note ?? null,
      now,
    ],
  );

  logger.info(`[Snapshot] ✓ Created ${input.action} snapshot ${snapshotId} for material ${input.materialId}`);

  return {
    snapshotId,
    materialId: input.materialId,
    action: input.action,
    operatorId: input.operatorId,
    operatorName: input.operatorName ?? null,
    affectedSourceIds: input.affectedSourceIds,
    payload: input.payload,
    note: input.note ?? null,
    createdAt: now,
  };
}

export async function listSnapshots(materialId: string, limit = 50): Promise<SnapshotRow[]> {
  await ensureSnapshotTable();
  const rows = (await query(
    `SELECT * FROM material_nutrition_snapshots
     WHERE material_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [materialId, limit],
  )).rows as DbRow[];

  return rows.map((r) => ({
    snapshotId: r.snapshot_id as string,
    materialId: r.material_id as string,
    action: r.action as SnapshotActionType,
    operatorId: (r.operator_id as string) ?? '',
    operatorName: (r.operator_name as string) ?? null,
    affectedSourceIds: safeParseArray(r.affected_source_ids as string),
    payload: safeParseObject(r.payload_json as string),
    note: (r.note as string) ?? null,
    createdAt: (r.created_at as string) ?? '',
  }));
}

export async function getSnapshot(snapshotId: string): Promise<SnapshotRow | null> {
  await ensureSnapshotTable();
  const row = (await query(
    `SELECT * FROM material_nutrition_snapshots WHERE snapshot_id = ?`,
    [snapshotId],
  )).rows[0] as DbRow | undefined;

  if (!row) return null;

  return {
    snapshotId: row.snapshot_id as string,
    materialId: row.material_id as string,
    action: row.action as SnapshotActionType,
    operatorId: (row.operator_id as string) ?? '',
    operatorName: (row.operator_name as string) ?? null,
    affectedSourceIds: safeParseArray(row.affected_source_ids as string),
    payload: safeParseObject(row.payload_json as string),
    note: (row.note as string) ?? null,
    createdAt: (row.created_at as string) ?? '',
  };
}

function safeParseArray(json: string): string[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

function safeParseObject(json: string): Record<string, unknown> {
  try {
    const v = JSON.parse(json)
    return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
  } catch {
    return {}
  }
}
