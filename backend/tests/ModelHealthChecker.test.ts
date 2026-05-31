import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { ModelHealthChecker } from "../src/services/ai/ModelHealthChecker.js"

const mockPrepare = vi.fn()
const mockDb = {
  prepare: mockPrepare,
}

vi.mock("../src/config/database-better-sqlite3.js", () => ({
  getDb: vi.fn(() => mockDb),
}))

vi.mock("../src/services/ai/AIService.js", () => ({
  aiService: {
    chatCompletion: vi.fn(() =>
      Promise.resolve({
        content: "hi",
        model: "test",
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      })
    ),
  },
}))

import { getDb } from "../src/config/database-better-sqlite3.js"
import { aiService } from "../src/services/ai/AIService.js"

function createModel(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "model-1",
    name: "TestModel",
    provider: "dashscope",
    api_key: "sk-test",
    health_check_interval_days: 1,
    last_health_check: null,
    ...overrides,
  }
}

describe("ModelHealthChecker - 模型健康检测", () => {
  let checker: ModelHealthChecker

  beforeEach(() => {
    vi.useFakeTimers()
    checker = new ModelHealthChecker()
    mockPrepare.mockReset()
  })

  afterEach(() => {
    checker.stop()
    vi.useRealTimers()
  })

  it("start - 应该调度周期性健康检测", async () => {
    const checkAllSpy = vi.spyOn(checker, "checkAll").mockResolvedValue()
    checker.start()
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(checkAllSpy).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(checkAllSpy).toHaveBeenCalledTimes(2)
    checkAllSpy.mockRestore()
  })

  it("stop - 应该清除定时器并停止检测", () => {
    const checkAllSpy = vi.spyOn(checker, "checkAll").mockResolvedValue()
    checker.start()
    checker.stop()
    vi.advanceTimersByTime(60 * 60 * 1000 * 3)
    expect(checkAllSpy).not.toHaveBeenCalled()
    checkAllSpy.mockRestore()
  })

  it("checkOne - 健康模型应更新状态为 healthy", async () => {
    const mockRun = vi.fn()
    mockPrepare.mockReturnValue({ run: mockRun })
    const model = createModel()

    await checker.checkOne(model)

    expect(aiService.chatCompletion).toHaveBeenCalledWith(
      "dashscope",
      [{ role: "user", content: "hi" }],
      { maxTokens: 5, temperature: 0, callType: "health_check" }
    )
    expect(mockPrepare).toHaveBeenCalledWith(
      expect.stringContaining("health_status = 'healthy'")
    )
    expect(mockRun).toHaveBeenCalledTimes(2)
  })

  it("checkOne - 不健康模型应更新状态为 unhealthy", async () => {
    const mockRun = vi.fn()
    mockPrepare.mockReturnValue({ run: mockRun })
    vi.mocked(aiService.chatCompletion).mockRejectedValueOnce(new Error("timeout"))

    const model = createModel()
    await checker.checkOne(model)

    expect(mockPrepare).toHaveBeenCalledWith(
      expect.stringContaining("health_status = 'unhealthy'")
    )
    expect(mockRun).toHaveBeenCalledTimes(2)
  })

  it("checkAll - 应跳过最近已检测的模型", async () => {
    const recentDate = new Date().toISOString()
    const models = [
      createModel({ id: "m1", last_health_check: recentDate, health_check_interval_days: 1 }),
      createModel({ id: "m2", last_health_check: null, health_check_interval_days: 1 }),
    ]
    mockPrepare.mockReturnValue({ all: () => models, run: vi.fn() })

    const checkOneSpy = vi.spyOn(checker, "checkOne").mockResolvedValue()

    await checker.checkAll()

    expect(checkOneSpy).toHaveBeenCalledTimes(1)
    expect(checkOneSpy).toHaveBeenCalledWith(models[1])
    checkOneSpy.mockRestore()
  })

  it("checkAll - 应优雅处理异常", async () => {
    vi.mocked(getDb).mockImplementationOnce(() => {
      throw new Error("db connection lost")
    })

    await expect(checker.checkAll()).resolves.toBeUndefined()
  })
})
