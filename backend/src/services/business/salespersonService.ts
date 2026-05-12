import { getDb } from "../../config/database-better-sqlite3.js";
import { generateId } from "../../utils/helpers.js";

interface SalespersonRecord {
  id: string;
  name: string;
  code: string;
  department: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface SalespersonCreateInput {
  name: string;
  phone?: string;
  email?: string;
  department?: string;
}

interface SalespersonUpdateInput {
  name?: string;
  phone?: string;
  email?: string;
  department?: string;
  status?: "active" | "inactive";
}

interface SalespersonQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive";
  department?: string;
}

class SalespersonService {
  async create(input: SalespersonCreateInput): Promise<SalespersonRecord> {
    const db = getDb();
    const id = generateId();

    const lastCodeRow = db.prepare(
      "SELECT code FROM salesmen WHERE code LIKE 'YW%' ORDER BY code DESC LIMIT 1"
    ).get() as any;
    let code = "YW001";
    if (lastCodeRow?.code) {
      const num = parseInt(lastCodeRow.code.replace("YW", ""), 10);
      code = `YW${String(num + 1).padStart(3, "0")}`;
    }

    db.prepare(
      "INSERT INTO salesmen (id, name, code, department, phone, email, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
    ).run(id, input.name, code, input.department || null, input.phone || null, input.email || null, "active", "agent");

    const row = db.prepare("SELECT * FROM salesmen WHERE id = ?").get(id) as SalespersonRecord;
    return row;
  }

  async getById(id: number | string): Promise<SalespersonRecord | null> {
    const db = getDb();
    const row = db.prepare("SELECT * FROM salesmen WHERE id = ?").get(String(id)) as SalespersonRecord | undefined;
    return row || null;
  }

  async update(id: number | string, input: SalespersonUpdateInput): Promise<SalespersonRecord | null> {
    const db = getDb();
    const sid = String(id);
    const existing = db.prepare("SELECT * FROM salesmen WHERE id = ?").get(sid) as SalespersonRecord | undefined;
    if (!existing) return null;

    const setClauses: string[] = [];
    const sqlParams: any[] = [];

    if (input.name !== undefined) { setClauses.push("name = ?"); sqlParams.push(input.name); }
    if (input.phone !== undefined) { setClauses.push("phone = ?"); sqlParams.push(input.phone); }
    if (input.email !== undefined) { setClauses.push("email = ?"); sqlParams.push(input.email); }
    if (input.department !== undefined) { setClauses.push("department = ?"); sqlParams.push(input.department); }
    if (input.status !== undefined) { setClauses.push("status = ?"); sqlParams.push(input.status); }

    if (setClauses.length === 0) return existing;

    setClauses.push("updated_at = datetime('now')");
    sqlParams.push(sid);
    db.prepare(`UPDATE salesmen SET ${setClauses.join(", ")} WHERE id = ?`).run(...sqlParams);

    return db.prepare("SELECT * FROM salesmen WHERE id = ?").get(sid) as SalespersonRecord;
  }

  async delete(id: number | string): Promise<boolean> {
    const db = getDb();
    const result = db.prepare("DELETE FROM salesmen WHERE id = ?").run(String(id));
    return result.changes > 0;
  }

  async query(params: SalespersonQueryParams): Promise<{
    data: SalespersonRecord[];
    total: number;
    page: number;
    limit: number;
  }> {
    const db = getDb();
    const conditions: string[] = [];
    const sqlParams: any[] = [];

    if (params.search) {
      conditions.push("(name LIKE ? OR phone LIKE ? OR email LIKE ?)");
      const like = `%${params.search}%`;
      sqlParams.push(like, like, like);
    }
    if (params.status) {
      conditions.push("status = ?");
      sqlParams.push(params.status);
    }
    if (params.department) {
      conditions.push("department = ?");
      sqlParams.push(params.department);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const rows = db.prepare(
      `SELECT * FROM salesmen ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...sqlParams, limit, offset) as SalespersonRecord[];

    const countRow = db.prepare(
      `SELECT COUNT(*) as total FROM salesmen ${whereSql}`
    ).get(...sqlParams) as any;

    return {
      data: rows,
      total: countRow?.total || 0,
      page,
      limit,
    };
  }

  async getStatistics(): Promise<{
    total: number;
    active_count: number;
    inactive_count: number;
    departments: Array<{ name: string; count: number }>;
  }> {
    const db = getDb();
    const totalRow = db.prepare("SELECT COUNT(*) as total FROM salesmen").get() as any;
    const activeRow = db.prepare("SELECT COUNT(*) as cnt FROM salesmen WHERE status = 'active'").get() as any;
    const inactiveRow = db.prepare("SELECT COUNT(*) as cnt FROM salesmen WHERE status = 'inactive'").get() as any;
    const deptRows = db.prepare(
      "SELECT COALESCE(department, '未分配') as name, COUNT(*) as count FROM salesmen GROUP BY department"
    ).all() as Array<{ name: string; count: number }>;

    return {
      total: totalRow?.total || 0,
      active_count: activeRow?.cnt || 0,
      inactive_count: inactiveRow?.cnt || 0,
      departments: deptRows,
    };
  }
}

export { SalespersonService, SalespersonRecord, SalespersonCreateInput, SalespersonUpdateInput, SalespersonQueryParams };
export const salespersonService = new SalespersonService();
