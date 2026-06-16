import { query, execute } from '../../config/database-adapter.js';
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
    
    const id = generateId();

    const lastCodeRow = (await query("SELECT code FROM salesmen WHERE code LIKE 'YW%' ORDER BY code DESC LIMIT 1", [])).rows[0] as any;
    let code = "YW001";
    if (lastCodeRow?.code) {
      const num = parseInt(lastCodeRow.code.replace("YW", ""), 10);
      code = `YW${String(num + 1).padStart(3, "0")}`;
    }

    await execute("INSERT INTO salesmen (id, name, code, department, phone, email, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", [id, input.name, code, input.department || null, input.phone || null, input.email || null, "active", "agent"]);

    const row = (await query("SELECT * FROM salesmen WHERE id = ?", [id])).rows[0] as SalespersonRecord;
    return row;
  }

  async getById(id: number | string): Promise<SalespersonRecord | null> {
    
    const row = (await query("SELECT * FROM salesmen WHERE id = ?", [String(id])).rows[0]) as SalespersonRecord | undefined;
    return row || null;
  }

  async update(id: number | string, input: SalespersonUpdateInput): Promise<SalespersonRecord | null> {
    
    const sid = String(id);
    const existing = (await query("SELECT * FROM salesmen WHERE id = ?", [sid])).rows[0] as SalespersonRecord | undefined;
    if (!existing) return null;

    const setClauses: string[] = [];
    const sqlParams: any[] = [];

    if (input.name !== undefined) { setClauses.push("name = ?"); sqlParams.push(input.name); }
    if (input.phone !== undefined) { setClauses.push("phone = ?"); sqlParams.push(input.phone); }
    if (input.email !== undefined) { setClauses.push("email = ?"); sqlParams.push(input.email); }
    if (input.department !== undefined) { setClauses.push("department = ?"); sqlParams.push(input.department); }
    if (input.status !== undefined) { setClauses.push("status = ?"); sqlParams.push(input.status); }

    if (setClauses.length === 0) return existing;

    setClauses.push("updated_at = CURRENT_TIMESTAMP");
    sqlParams.push(sid);
    await execute(`UPDATE salesmen SET ${setClauses.join(", ")} WHERE id = ?`, [...sqlParams]);

    return (await query("SELECT * FROM salesmen WHERE id = ?", [sid])).rows[0] as SalespersonRecord;
  }

  async delete(id: number | string): Promise<boolean> {
    
    const result = await execute("DELETE FROM salesmen WHERE id = ?", [String(id]));
    return result.changes > 0;
  }

  async query(params: SalespersonQueryParams): Promise<{
    data: SalespersonRecord[];
    total: number;
    page: number;
    limit: number;
  }> {
    
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

    const rows = (await query(`SELECT * FROM salesmen ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...sqlParams, limit, offset])).rows as SalespersonRecord[];

    const countRow = (await query(
      `SELECT COUNT(*) as total FROM salesmen ${whereSql}`, [...sqlParams])).rows[0] as Record<string, unknown>;

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
    
    const totalRow = (await query("SELECT COUNT(*) as total FROM salesmen", [])).rows[0] as any;
    const activeRow = (await query("SELECT COUNT(*) as cnt FROM salesmen WHERE status = 'active'", [])).rows[0] as any;
    const inactiveRow = (await query("SELECT COUNT(*) as cnt FROM salesmen WHERE status = 'inactive'", [])).rows[0] as any;
    const deptRows = (await query("SELECT COALESCE(department, '未分配') as name, COUNT(*) as count FROM salesmen GROUP BY department", [])).rows as Array<{ name: string; count: number }>;

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
