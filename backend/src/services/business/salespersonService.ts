import type {
  Salesperson,
  SalespersonCreateInput,
  SalespersonUpdateInput,
  SalespersonQueryParams,
} from "../../types/salesperson.js";

class SalespersonService {
  private salespersons: Map<number, Salesperson> = new Map();
  private nextId = 1;

  async create(input: SalespersonCreateInput): Promise<Salesperson> {
    const now = new Date().toISOString();
    const salesperson: Salesperson = {
      id: this.nextId++,
      name: input.name,
      phone: input.phone,
      email: input.email,
      department: input.department,
      status: input.status || "active",
      created_at: now,
      updated_at: now,
    };

    this.salespersons.set(salesperson.id!, salesperson);
    return { ...salesperson };
  }

  async getById(id: number): Promise<Salesperson | null> {
    const salesperson = this.salespersons.get(id);
    return salesperson ? { ...salesperson } : null;
  }

  async update(id: number, input: SalespersonUpdateInput): Promise<Salesperson | null> {
    const existing = this.salespersons.get(id);
    if (!existing) return null;

    const updated: Salesperson = {
      ...existing,
      ...input,
      id: existing.id,
      updated_at: new Date().toISOString(),
    };

    this.salespersons.set(id, updated);
    return { ...updated };
  }

  async delete(id: number): Promise<boolean> {
    return this.salespersons.delete(id);
  }

  async query(params: SalespersonQueryParams): Promise<{
    data: Salesperson[];
    total: number;
    page: number;
    limit: number;
  }> {
    let filtered = Array.from(this.salespersons.values());

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(
        s =>
          s.name.toLowerCase().includes(searchLower) ||
          s.phone?.toLowerCase().includes(searchLower) ||
          s.email?.toLowerCase().includes(searchLower),
      );
    }

    if (params.status) {
      filtered = filtered.filter(s => s.status === params.status);
    }

    if (params.department) {
      filtered = filtered.filter(s => s.department === params.department);
    }

    const total = filtered.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedData = filtered.slice(start, end).map(s => ({ ...s }));

    return {
      data: paginatedData,
      total,
      page,
      limit,
    };
  }

  async batchDelete(ids: number[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const id of ids) {
      if (this.salespersons.has(id)) {
        this.salespersons.delete(id);
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }

  async getStatistics(): Promise<{
    total: number;
    active_count: number;
    inactive_count: number;
    departments: Array<{ name: string; count: number }>;
  }> {
    const all = Array.from(this.salespersons.values());
    const activeCount = all.filter(s => s.status === "active").length;
    const inactiveCount = all.filter(s => s.status === "inactive").length;

    const deptMap = new Map<string, number>();
    all.forEach(s => {
      const dept = s.department || "未分配";
      deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
    });

    const departments = Array.from(deptMap.entries()).map(([name, count]) => ({ name, count }));

    return {
      total: all.length,
      active_count: activeCount,
      inactive_count: inactiveCount,
      departments,
    };
  }
}

export { SalespersonService };
export const salespersonService = new SalespersonService();
