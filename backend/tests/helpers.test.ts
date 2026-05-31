import { describe, it, expect, vi } from "vitest";
import {
  generateId,
  now,
  buildPagination,
  buildLike,
  success,
  successWithPagination,
  snakeToCamel,
  camelToSnake,
  rowToCamelCase,
  rowsToCamelCase,
  safeJsonParse,
  generateFormulaCode,
  generateMaterialCode,
  fixMulterOriginalname,
  isLikelyGarbled,
  fixGarbledText,
  buildContentDisposition,
} from "../src/utils/helpers.js";

vi.mock("pinyin-pro", () => ({
  pinyin: vi.fn((str: string) => {
    const map: Record<string, string> = {
      "\u6d4b\u8bd5": ["c", "s"],
      "\u9ec4\u82a9": ["h", "q"],
      "\u5f53\u5f52": ["d", "g"],
    };
    return map[str] || str.split("").map(() => "x");
  }),
}));

describe("helpers - 通用工具函数", () => {
  describe("generateId", () => {
    it("应该返回非空字符串", () => {
      const id = generateId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");
    });

    it("应该生成唯一 ID", () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateId()));
      expect(ids.size).toBe(100);
    });

    it("应该只包含 base36 字符", () => {
      const id = generateId();
      expect(id).toMatch(/^[0-9a-z]+$/);
    });
  });

  describe("now", () => {
    it("应该返回 ISO 8601 格式字符串", () => {
      const result = now();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("应该返回接近当前时间的值", () => {
      const before = Date.now();
      const result = new Date(now()).getTime();
      const after = Date.now();
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });
  });

  describe("buildPagination", () => {
    it("应该使用默认值 page=1 pageSize=20", () => {
      const result = buildPagination();
      expect(result).toEqual({ page: 1, pageSize: 20, offset: 0 });
    });

    it("应该正确计算 offset", () => {
      const result = buildPagination(3, 10);
      expect(result).toEqual({ page: 3, pageSize: 10, offset: 20 });
    });

    it("应该限制 pageSize 最大为 100", () => {
      const result = buildPagination(1, 200);
      expect(result.pageSize).toBe(100);
    });

    it("应该将 page 小于 1 的情况修正为 1", () => {
      const result = buildPagination(0, 10);
      expect(result.page).toBe(1);
      expect(result.offset).toBe(0);
    });

    it("应该将 pageSize 小于 1 的情况修正为 1", () => {
      const result = buildPagination(1, -5);
      expect(result.pageSize).toBe(1);
    });
  });

  describe("buildLike", () => {
    it("应该用 % 包裹关键词", () => {
      expect(buildLike("test")).toBe("%test%");
    });

    it("应该转义 % 字符", () => {
      expect(buildLike("50%")).toBe("%50\\%%");
    });

    it("应该转义 _ 字符", () => {
      expect(buildLike("user_name")).toBe("%user\\_name%");
    });

    it("应该转义 \\ 字符", () => {
      expect(buildLike("path\\file")).toBe("%path\\\\file%");
    });
  });

  describe("success", () => {
    it("应该返回默认消息", () => {
      const result = success({ id: 1 });
      expect(result).toEqual({ success: true, message: "操作成功", data: { id: 1 } });
    });

    it("应该使用自定义消息", () => {
      const result = success(null, "创建成功");
      expect(result.message).toBe("创建成功");
    });
  });

  describe("successWithPagination", () => {
    it("应该返回分页结构", () => {
      const list = [{ id: 1 }, { id: 2 }];
      const result = successWithPagination(list, 10, 1, 5);
      expect(result.success).toBe(true);
      expect(result.message).toBe("查询成功");
      expect(result.data.list).toEqual(list);
      expect(result.data.pagination).toEqual({
        page: 1,
        pageSize: 5,
        total: 10,
        totalPages: 2,
      });
    });

    it("应该正确计算 totalPages 向上取整", () => {
      const result = successWithPagination([], 11, 1, 5);
      expect(result.data.pagination.totalPages).toBe(3);
    });

    it("应该处理空列表", () => {
      const result = successWithPagination([], 0, 1, 20);
      expect(result.data.pagination.totalPages).toBe(0);
    });
  });

  describe("snakeToCamel", () => {
    it("应该将 snake_case 转为 camelCase", () => {
      expect(snakeToCamel("created_at")).toBe("createdAt");
    });

    it("应该处理多个下划线", () => {
      expect(snakeToCamel("user_name_id")).toBe("userNameId");
    });

    it("无下划线时应该原样返回", () => {
      expect(snakeToCamel("name")).toBe("name");
    });
  });

  describe("camelToSnake", () => {
    it("应该将 camelCase 转为 snake_case", () => {
      expect(camelToSnake("createdAt")).toBe("created_at");
    });

    it("应该处理多个大写字母", () => {
      expect(camelToSnake("userNameId")).toBe("user_name_id");
    });

    it("无大写字母时应该原样返回", () => {
      expect(camelToSnake("name")).toBe("name");
    });
  });

  describe("rowToCamelCase", () => {
    it("应该将数据库行键名转为驼峰", () => {
      const row = { created_at: "2026-01-01", user_name: "test" };
      const result = rowToCamelCase<Record<string, string>>(row);
      expect(result).toEqual({ createdAt: "2026-01-01", userName: "test" });
    });
  });

  describe("rowsToCamelCase", () => {
    it("应该批量转换数据库行", () => {
      const rows = [
        { id: "1", created_at: "2026-01-01" },
        { id: "2", created_at: "2026-01-02" },
      ];
      const result = rowsToCamelCase<Record<string, string>[]>(rows);
      expect(result).toEqual([
        { id: "1", createdAt: "2026-01-01" },
        { id: "2", createdAt: "2026-01-02" },
      ]);
    });

    it("应该处理空数组", () => {
      expect(rowsToCamelCase([])).toEqual([]);
    });
  });

  describe("safeJsonParse", () => {
    it("应该正确解析有效 JSON", () => {
      expect(safeJsonParse('{"key":"value"}', null)).toEqual({ key: "value" });
    });

    it("应该在 null 输入时返回默认值", () => {
      expect(safeJsonParse(null, "default")).toBe("default");
    });

    it("应该在 undefined 输入时返回默认值", () => {
      expect(safeJsonParse(undefined, 0)).toBe(0);
    });

    it("应该在无效 JSON 时返回默认值", () => {
      expect(safeJsonParse("not json", { fallback: true })).toEqual({ fallback: true });
    });
  });

  describe("generateFormulaCode", () => {
    it("应该从 PINYIN_MAP 中的汉字生成编码", () => {
      const code = generateFormulaCode("补气养血");
      expect(code).toBe("BQYX");
    });

    it("应该在编码不足 2 位时回退到英文字母", () => {
      const code = generateFormulaCode("ABC");
      expect(code.length).toBeGreaterThanOrEqual(2);
    });

    it("应该在无有效字符时返回 FM", () => {
      const code = generateFormulaCode("123");
      expect(code).toBe("FM");
    });

    it("应该限制编码最长 5 位", () => {
      const code = generateFormulaCode("补气养血清热解毒");
      expect(code.length).toBeLessThanOrEqual(5);
    });
  });

  describe("generateMaterialCode", () => {
    it("应该从 MATERIAL_CODE_MAP 返回预定义编码", () => {
      expect(generateMaterialCode("铁皮石斛")).toBe("TPSH");
    });

    it("应该对未映射名称使用拼音首字母", () => {
      const code = generateMaterialCode("测试药材");
      expect(code).toBeTruthy();
    });

    it("应该对空字符串返回空", () => {
      expect(generateMaterialCode("")).toBe("");
    });

    it("应该对空白字符串返回空", () => {
      expect(generateMaterialCode("   ")).toBe("");
    });
  });

  describe("fixMulterOriginalname", () => {
    it("应该原样返回包含中文的文件名", () => {
      expect(fixMulterOriginalname("测试文件.pdf")).toBe("测试文件.pdf");
    });

    it("应该原样返回空字符串", () => {
      expect(fixMulterOriginalname("")).toBe("");
    });

    it("应该原样返回纯 ASCII 文件名", () => {
      expect(fixMulterOriginalname("report.pdf")).toBe("report.pdf");
    });
  });

  describe("isLikelyGarbled", () => {
    it("应该检测替换字符为乱码", () => {
      expect(isLikelyGarbled("test\ufffdname")).toBe(true);
    });

    it("应该对空字符串返回 false", () => {
      expect(isLikelyGarbled("")).toBe(false);
    });

    it("应该对正常文本返回 false", () => {
      expect(isLikelyGarbled("正常文本")).toBe(false);
    });

    it("应该对纯 ASCII 文本返回 false", () => {
      expect(isLikelyGarbled("hello world")).toBe(false);
    });
  });

  describe("fixGarbledText", () => {
    it("应该对空字符串原样返回", () => {
      expect(fixGarbledText("")).toBe("");
    });

    it("应该对正常文本原样返回", () => {
      expect(fixGarbledText("正常文本")).toBe("正常文本");
    });
  });

  describe("buildContentDisposition", () => {
    it("应该构建包含 ASCII fallback 和 UTF-8 编码的 header", () => {
      const result = buildContentDisposition("测试文件.pdf");
      expect(result).toContain("attachment;");
      expect(result).toContain('filename="____.pdf"');
      expect(result).toContain("filename*=UTF-8''");
    });

    it("应该对纯 ASCII 文件名正常工作", () => {
      const result = buildContentDisposition("report.pdf");
      expect(result).toContain('filename="report.pdf"');
      expect(result).toContain("filename*=UTF-8''report.pdf");
    });
  });
});
