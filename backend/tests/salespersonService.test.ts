import { describe, it, expect, beforeEach } from "vitest";
import { SalespersonService } from "../src/services/business/salespersonService.js";
import type { SalespersonCreateInput, SalespersonUpdateInput } from "../src/types/salesperson.js";

describe("SalespersonService - 业务员管理", () => {
  let service: SalespersonService;

  beforeEach(() => {
    service = new SalespersonService();
  });

  describe("create()", () => {
    it("应该成功创建业务员记录", async () => {
      const input: SalespersonCreateInput = {
        name: "张三",
        phone: "13800138000",
        email: "zhangsan@example.com",
        department: "销售一部",
      };

      const result = await service.create(input);

      expect(result.id).toBeDefined();
      expect(result.name).toBe("张三");
      expect(result.phone).toBe("13800138000");
      expect(result.email).toBe("zhangsan@example.com");
      expect(result.department).toBe("销售一部");
      expect(result.status).toBe("active");
      expect(result.created_at).toBeDefined();
    });

    it("应该使用默认值创建最小化记录", async () => {
      const input: SalespersonCreateInput = {
        name: "李四",
      };

      const result = await service.create(input);

      expect(result.name).toBe("李四");
      expect(result.status).toBe("active");
      expect(result.phone).toBeUndefined();
      expect(result.email).toBeUndefined();
    });
  });

  describe("getById()", () => {
    it("应该根据ID获取业务员信息", async () => {
      const created = await service.create({ name: "王五" });
      const found = await service.getById(created.id!);

      expect(found).not.toBeNull();
      expect(found!.name).toBe("王五");
    });

    it("应该对不存在的ID返回null", async () => {
      const found = await service.getById(99999);
      expect(found).toBeNull();
    });
  });

  describe("update()", () => {
    it("应该更新业务员信息", async () => {
      const created = await service.create({ name: "赵六" });

      const updateData: SalespersonUpdateInput = {
        name: "赵六更新",
        phone: "13900139000",
        department: "销售二部",
      };

      const updated = await service.update(created.id!, updateData);

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("赵六更新");
      expect(updated!.phone).toBe("13900139000");
      expect(updated!.department).toBe("销售二部");
      expect(updated!.updated_at).toBeDefined();
    });

    it("应该对不存在的ID返回null", async () => {
      const updated = await service.update(99999, { name: "不存在" });
      expect(updated).toBeNull();
    });
  });

  describe("delete()", () => {
    it("应该删除存在的业务员", async () => {
      const created = await service.create({ name: "孙七" });
      const deleted = await service.delete(created.id!);

      expect(deleted).toBe(true);
      const found = await service.getById(created.id!);
      expect(found).toBeNull();
    });

    it("应该对不存在的ID返回false", async () => {
      const deleted = await service.delete(99999);
      expect(deleted).toBe(false);
    });
  });

  describe("query()", () => {
    beforeEach(async () => {
      await service.create({ name: "张三", status: "active", department: "销售一部" });
      await service.create({ name: "李四", status: "inactive", department: "销售二部" });
      await service.create({ name: "张伟", status: "active", department: "销售一部" });
      await service.create({ name: "王芳", phone: "13800138001", department: "销售三部" });
    });

    it("应该支持分页查询", async () => {
      const result = await service.query({ page: 1, limit: 2 });

      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.total).toBeGreaterThanOrEqual(4);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });

    it("应该支持关键词搜索", async () => {
      const result = await service.query({ search: "张" });

      result.data.forEach(sp => {
        expect(sp.name.includes("张") || sp.phone?.includes("张")).toBe(true);
      });
    });

    it("应该支持状态筛选", async () => {
      const activeResult = await service.query({ status: "active" });
      activeResult.data.forEach(sp => {
        expect(sp.status).toBe("active");
      });
    });

    it("应该支持部门筛选", async () => {
      const deptResult = await service.query({ department: "销售一部" });
      deptResult.data.forEach(sp => {
        expect(sp.department).toBe("销售一部");
      });
    });
  });

  describe("batchDelete()", () => {
    it("应该批量删除多个业务员", async () => {
      const sp1 = await service.create({ name: "批量删除1" });
      const sp2 = await service.create({ name: "批量删除2" });
      const sp3 = await service.create({ name: "批量删除3" });

      const result = await service.batchDelete([sp1.id!, sp2.id!, sp3.id!]);

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
    });

    it("应该处理部分不存在的ID", async () => {
      const sp1 = await service.create({ name: "存在" });

      const result = await service.batchDelete([sp1.id!, 99998, 99999]);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(2);
    });
  });

  describe("getStatistics()", () => {
    it("应该返回正确的统计信息", async () => {
      await service.create({ name: "统计测试1", status: "active", department: "A部" });
      await service.create({ name: "统计测试2", status: "active", department: "A部" });
      await service.create({ name: "统计测试3", status: "inactive", department: "B部" });

      const stats = await service.getStatistics();

      expect(stats.total).toBeGreaterThanOrEqual(3);
      expect(stats.active_count).toBeGreaterThanOrEqual(2);
      expect(stats.inactive_count).toBeGreaterThanOrEqual(1);
      expect(stats.departments.some(d => d.name === "A部")).toBe(true);
      expect(stats.departments.some(d => d.name === "B部")).toBe(true);
    });
  });
});
