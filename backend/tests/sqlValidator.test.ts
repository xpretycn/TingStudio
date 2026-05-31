import { describe, it, expect, vi } from "vitest"
import { validateSQL, readFileAsText, readFileAsBase64 } from "../src/utils/sqlValidator.js"

vi.mock("node:fs", () => ({
  default: {
    readFileSync: vi.fn(),
  },
}))

vi.mock("node:path", () => ({
  default: {
    extname: vi.fn((p: string) => {
      const idx = p.lastIndexOf(".")
      return idx === -1 ? "" : p.slice(idx)
    }),
  },
}))

import fs from "node:fs"
import path from "node:path"

describe("sqlValidator - SQL安全校验", () => {
  describe("validateSQL - 合法SELECT查询", () => {
    it("应该通过白名单表的简单SELECT查询", () => {
      const result = validateSQL("SELECT * FROM formulas")
      expect(result.valid).toBe(true)
      expect(result.sql).toContain("SELECT")
      expect(result.sql).toContain("FROM formulas")
    })

    it("应该通过带WHERE条件的SELECT查询", () => {
      const result = validateSQL("SELECT id, name FROM materials WHERE name = '人参'")
      expect(result.valid).toBe(true)
      expect(result.sql).toContain("WHERE")
    })

    it("应该通过带JOIN的白名单表查询", () => {
      const result = validateSQL(
        "SELECT f.id, m.name FROM formulas f JOIN materials m ON f.material_id = m.id"
      )
      expect(result.valid).toBe(true)
      expect(result.sql).toContain("JOIN")
    })

    it("应该通过白名单中所有表的查询", () => {
      const allowedTables = [
        "formulas",
        "materials",
        "salesmen",
        "formula_versions",
        "material_nutrition",
        "material_nutrition_summaries",
        "formula_nutrition_summaries",
        "nutrition_profiles",
        "users",
        "formula_sales",
      ]
      for (const table of allowedTables) {
        const result = validateSQL(`SELECT id FROM ${table}`)
        expect(result.valid, `表 ${table} 应该通过校验`).toBe(true)
      }
    })
  })

  describe("validateSQL - 非SELECT语句应被拒绝", () => {
    it("应该拒绝INSERT语句", () => {
      const result = validateSQL("INSERT INTO formulas (id) VALUES ('1')")
      expect(result.valid).toBe(false)
      expect(result.error).toContain("SELECT")
    })

    it("应该拒绝UPDATE语句", () => {
      const result = validateSQL("UPDATE formulas SET name = 'x' WHERE id = '1'")
      expect(result.valid).toBe(false)
      expect(result.error).toContain("SELECT")
    })

    it("应该拒绝DELETE语句", () => {
      const result = validateSQL("DELETE FROM formulas WHERE id = '1'")
      expect(result.valid).toBe(false)
      expect(result.error).toContain("SELECT")
    })

    it("应该拒绝空字符串", () => {
      const result = validateSQL("")
      expect(result.valid).toBe(false)
    })
  })

  describe("validateSQL - 非白名单表应被拒绝", () => {
    it("应该拒绝查询非白名单表", () => {
      const result = validateSQL("SELECT * FROM secret_table")
      expect(result.valid).toBe(false)
      expect(result.error).toContain("secret_table")
    })

    it("应该拒绝JOIN非白名单表", () => {
      const result = validateSQL(
        "SELECT f.id FROM formulas f JOIN hacker_table h ON f.id = h.id"
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain("hacker_table")
    })
  })

  describe("validateSQL - 禁止关键字检测", () => {
    it("应该检测到DROP关键字", () => {
      const result = validateSQL("SELECT * FROM formulas; DROP TABLE formulas")
      expect(result.valid).toBe(false)
      expect(result.error).toContain("DROP")
    })

    it("应该检测到ALTER关键字", () => {
      const result = validateSQL("SELECT * FROM formulas ALTER TABLE formulas ADD col INT")
      expect(result.valid).toBe(false)
      expect(result.error).toContain("ALTER")
    })

    it("应该检测到GRANT关键字", () => {
      const result = validateSQL("SELECT * FROM formulas GRANT ALL ON formulas TO user")
      expect(result.valid).toBe(false)
      expect(result.error).toContain("GRANT")
    })

    it("应该检测到ATTACH关键字", () => {
      const result = validateSQL("SELECT * FROM formulas ATTACH DATABASE 'evil.db' AS evil")
      expect(result.valid).toBe(false)
      expect(result.error).toContain("ATTACH")
    })
  })

  describe("validateSQL - 注释剥离", () => {
    it("应该去除单行注释", () => {
      const result = validateSQL("SELECT * FROM formulas -- 这是一个注释")
      expect(result.valid).toBe(true)
      expect(result.sql).not.toContain("--")
      expect(result.sql).toContain("FROM formulas")
    })

    it("应该去除多行注释", () => {
      const result = validateSQL("SELECT * /* 多行注释 */ FROM formulas")
      expect(result.valid).toBe(true)
      expect(result.sql).not.toContain("/*")
      expect(result.sql).not.toContain("*/")
      expect(result.sql).toContain("FROM formulas")
    })

    it("应该去除注释后再校验关键字", () => {
      const result = validateSQL("SELECT * FROM formulas -- DROP TABLE formulas")
      expect(result.valid).toBe(true)
    })
  })

  describe("validateSQL - 自动追加LIMIT", () => {
    it("应该在没有LIMIT时自动追加LIMIT 50", () => {
      const result = validateSQL("SELECT * FROM formulas")
      expect(result.valid).toBe(true)
      expect(result.sql).toContain("LIMIT 50")
    })

    it("应该在有LIMIT时不重复追加", () => {
      const result = validateSQL("SELECT * FROM formulas LIMIT 10")
      expect(result.valid).toBe(true)
      expect(result.sql).toMatch(/LIMIT\s+10/)
      expect(result.sql).not.toMatch(/LIMIT\s+10\s+LIMIT/)
    })
  })
})

describe("readFileAsText - 文件文本读取", () => {
  it("应该使用utf-8编码读取文件", () => {
    const mockFs = vi.mocked(fs)
    mockFs.readFileSync.mockReturnValue("文件内容" as unknown as Buffer)
    const result = readFileAsText("/path/to/file.txt")
    expect(result).toBe("文件内容")
    expect(mockFs.readFileSync).toHaveBeenCalledWith("/path/to/file.txt", "utf-8")
  })

  it("应该支持自定义编码", () => {
    const mockFs = vi.mocked(fs)
    mockFs.readFileSync.mockReturnValue("内容" as unknown as Buffer)
    readFileAsText("/path/to/file.txt", "latin1")
    expect(mockFs.readFileSync).toHaveBeenCalledWith("/path/to/file.txt", "latin1")
  })
})

describe("readFileAsBase64 - 文件Base64读取", () => {
  it("应该正确映射png的MIME类型", () => {
    const mockFs = vi.mocked(fs)
    const mockBuffer = Buffer.from("fake-image")
    mockFs.readFileSync.mockReturnValue(mockBuffer)
    const result = readFileAsBase64("/path/to/image.png")
    expect(result.mimeType).toBe("image/png")
    expect(result.base64).toBe(mockBuffer.toString("base64"))
  })

  it("应该正确映射jpg的MIME类型", () => {
    const mockFs = vi.mocked(fs)
    mockFs.readFileSync.mockReturnValue(Buffer.from("fake"))
    const result = readFileAsBase64("/path/to/photo.jpg")
    expect(result.mimeType).toBe("image/jpeg")
  })

  it("应该正确映射jpeg的MIME类型", () => {
    const mockFs = vi.mocked(fs)
    mockFs.readFileSync.mockReturnValue(Buffer.from("fake"))
    const result = readFileAsBase64("/path/to/photo.jpeg")
    expect(result.mimeType).toBe("image/jpeg")
  })

  it("应该正确映射gif的MIME类型", () => {
    const mockFs = vi.mocked(fs)
    mockFs.readFileSync.mockReturnValue(Buffer.from("fake"))
    const result = readFileAsBase64("/path/to/anim.gif")
    expect(result.mimeType).toBe("image/gif")
  })

  it("应该正确映射webp的MIME类型", () => {
    const mockFs = vi.mocked(fs)
    mockFs.readFileSync.mockReturnValue(Buffer.from("fake"))
    const result = readFileAsBase64("/path/to/image.webp")
    expect(result.mimeType).toBe("image/webp")
  })

  it("应该将bmp映射为image/png", () => {
    const mockFs = vi.mocked(fs)
    mockFs.readFileSync.mockReturnValue(Buffer.from("fake"))
    const result = readFileAsBase64("/path/to/image.bmp")
    expect(result.mimeType).toBe("image/png")
  })

  it("应该对未知扩展名默认使用image/jpeg", () => {
    const mockFs = vi.mocked(fs)
    mockFs.readFileSync.mockReturnValue(Buffer.from("fake"))
    const result = readFileAsBase64("/path/to/image.xyz")
    expect(result.mimeType).toBe("image/jpeg")
  })
})
