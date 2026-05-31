import { describe, it, expect, vi } from "vitest"
import { validateBody } from "../src/middleware/validate.js"

function createMocks(body: Record<string, unknown> = {}) {
  const req = { body } as Record<string, unknown>
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Record<string, unknown>
  const next = vi.fn()
  return { req, res, next }
}

describe("validateBody 中间件", () => {
  it("合法请求体通过验证，调用 next()", () => {
    const { req, res, next } = createMocks({ name: "测试", age: 25 })
    const middleware = validateBody({
      name: { type: "string", required: true },
      age: { type: "number", required: true },
    })
    middleware(req as never, res as never, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it("缺少必填字段，返回 400 错误", () => {
    const { req, res, next } = createMocks({})
    const middleware = validateBody({
      name: { required: true },
    })
    middleware(req as never, res as never, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>
    expect(jsonArg.success).toBe(false)
    expect(jsonArg.message).toBe("参数验证失败")
    const errors = jsonArg.errors as string[]
    expect(errors).toContain("name 为必填项")
  })

  it("字符串字段传入非字符串，返回 400", () => {
    const { req, res, next } = createMocks({ name: 123 })
    const middleware = validateBody({
      name: { type: "string", required: true },
    })
    middleware(req as never, res as never, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>
    const errors = jsonArg.errors as string[]
    expect(errors).toContain("name 必须为字符串")
  })

  it("数字字段传入非数字，返回 400", () => {
    const { req, res, next } = createMocks({ age: "不是数字" })
    const middleware = validateBody({
      age: { type: "number", required: true },
    })
    middleware(req as never, res as never, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>
    const errors = jsonArg.errors as string[]
    expect(errors).toContain("age 必须为数字")
  })

  it("数组字段传入非数组，返回 400", () => {
    const { req, res, next } = createMocks({ items: "不是数组" })
    const middleware = validateBody({
      items: { type: "array", required: true },
    })
    middleware(req as never, res as never, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>
    const errors = jsonArg.errors as string[]
    expect(errors).toContain("items 必须为数组")
  })

  it("字符串长度不足 minLength，返回 400", () => {
    const { req, res, next } = createMocks({ code: "AB" })
    const middleware = validateBody({
      code: { type: "string", minLength: 3 },
    })
    middleware(req as never, res as never, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>
    const errors = jsonArg.errors as string[]
    expect(errors).toContain("code 长度不能少于 3")
  })

  it("字符串长度超过 maxLength，返回 400", () => {
    const { req, res, next } = createMocks({ name: "ABCDEFGHIJ" })
    const middleware = validateBody({
      name: { type: "string", maxLength: 5 },
    })
    middleware(req as never, res as never, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>
    const errors = jsonArg.errors as string[]
    expect(errors).toContain("name 长度不能超过 5")
  })

  it("数字小于 min，返回 400", () => {
    const { req, res, next } = createMocks({ price: -1 })
    const middleware = validateBody({
      price: { type: "number", min: 0 },
    })
    middleware(req as never, res as never, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>
    const errors = jsonArg.errors as string[]
    expect(errors).toContain("price 不能小于 0")
  })

  it("数字大于 max，返回 400", () => {
    const { req, res, next } = createMocks({ quantity: 999 })
    const middleware = validateBody({
      quantity: { type: "number", max: 100 },
    })
    middleware(req as never, res as never, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>
    const errors = jsonArg.errors as string[]
    expect(errors).toContain("quantity 不能大于 100")
  })

  it("自定义 message 优先于默认错误信息", () => {
    const { req, res, next } = createMocks({})
    const middleware = validateBody({
      email: { required: true, message: "邮箱地址不能为空" },
    })
    middleware(req as never, res as never, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>
    const errors = jsonArg.errors as string[]
    expect(errors).toContain("邮箱地址不能为空")
    expect(errors).not.toContain("email 为必填项")
  })

  it("可选字段传入 null 或 undefined 不报错", () => {
    const { req, res, next } = createMocks({ nickname: null })
    const middleware = validateBody({
      nickname: { type: "string" },
    })
    middleware(req as never, res as never, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it("多个验证错误同时收集返回", () => {
    const { req, res, next } = createMocks({ name: "", age: "abc" })
    const middleware = validateBody({
      name: { required: true },
      age: { type: "number", required: true },
    })
    middleware(req as never, res as never, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>
    const errors = jsonArg.errors as string[]
    expect(errors.length).toBe(2)
    expect(errors).toContain("name 为必填项")
    expect(errors).toContain("age 必须为数字")
  })
})
