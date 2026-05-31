import { describe, it, expect, vi, beforeEach } from "vitest"
import { SessionStore } from "../src/services/ai/agent/sessionStore.js"
import type { SessionRecord, MessageRecord } from "../src/services/ai/agent/sessionStore.js"

const mockRun = vi.fn()
const mockGet = vi.fn()
const mockAll = vi.fn()

const mockDb = {
  prepare: vi.fn(() => ({
    run: mockRun,
    get: mockGet,
    all: mockAll,
  })),
}

vi.mock("../src/config/database-better-sqlite3.js", () => ({
  getDb: vi.fn(() => mockDb),
}))

vi.mock("node:crypto", () => ({
  default: {
    randomUUID: vi.fn(() => "abcdefgh-1234-5678-abcd-ef0123456789"),
  },
}))

describe("SessionStore", () => {
  let store: SessionStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new SessionStore()
  })

  it("createSession - 创建并返回会话记录", () => {
    const result = store.createSession("user1", "测试会话")

    expect(mockDb.prepare).toHaveBeenCalledTimes(1)
    expect(mockRun).toHaveBeenCalledTimes(1)
    expect(result.user_id).toBe("user1")
    expect(result.title).toBe("测试会话")
    expect(result.message_count).toBe(0)
    expect(result.last_intent).toBeNull()
    expect(result.id).toContain("session_")
  })

  it("getSession - 根据ID返回会话", () => {
    const session: SessionRecord = {
      id: "session_1",
      user_id: "user1",
      title: "测试",
      message_count: 5,
      last_intent: null,
      last_active_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
    }
    mockGet.mockReturnValue(session)

    const result = store.getSession("session_1")

    expect(result).toEqual(session)
    expect(mockGet).toHaveBeenCalledWith("session_1")
  })

  it("getSession - 不存在的会话返回null", () => {
    mockGet.mockReturnValue(undefined)

    const result = store.getSession("nonexistent")

    expect(result).toBeNull()
  })

  it("getSessionsByUser - 按last_active_at排序返回用户会话", () => {
    const sessions: SessionRecord[] = [
      {
        id: "s1",
        user_id: "user1",
        title: "最近",
        message_count: 1,
        last_intent: null,
        last_active_at: "2026-01-02T00:00:00.000Z",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "s2",
        user_id: "user1",
        title: "较早",
        message_count: 0,
        last_intent: null,
        last_active_at: "2026-01-01T00:00:00.000Z",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ]
    mockAll.mockReturnValue(sessions)

    const result = store.getSessionsByUser("user1")

    expect(result).toEqual(sessions)
    expect(mockAll).toHaveBeenCalledWith("user1")
    expect(result[0].last_active_at >= result[1].last_active_at).toBe(true)
  })

  it("updateSessionActivity - 带intent更新", () => {
    store.updateSessionActivity("session_1", "query_formula")

    expect(mockDb.prepare).toHaveBeenCalledTimes(1)
    expect(mockRun).toHaveBeenCalledWith(
      expect.any(String),
      "query_formula",
      "session_1"
    )
  })

  it("updateSessionActivity - 不带intent更新", () => {
    store.updateSessionActivity("session_1")

    expect(mockDb.prepare).toHaveBeenCalledTimes(1)
    expect(mockRun).toHaveBeenCalledWith(
      expect.any(String),
      "session_1"
    )
  })

  it("updateSessionTitle - 更新会话标题", () => {
    store.updateSessionTitle("session_1", "新标题")

    expect(mockDb.prepare).toHaveBeenCalledTimes(1)
    expect(mockRun).toHaveBeenCalledWith("新标题", "session_1")
  })

  it("deleteSession - 删除会话并返回true", () => {
    mockRun.mockReturnValue({ changes: 1 })

    const result = store.deleteSession("session_1")

    expect(mockDb.prepare).toHaveBeenCalledTimes(3)
    expect(mockRun).toHaveBeenCalledTimes(3)
    expect(result).toBe(true)
  })

  it("addMessage - 创建消息记录", () => {
    const result = store.addMessage("session_1", "user", "你好", {
      intent: "greeting",
    })

    expect(mockDb.prepare).toHaveBeenCalledTimes(1)
    expect(mockRun).toHaveBeenCalledTimes(1)
    expect(result.session_id).toBe("session_1")
    expect(result.role).toBe("user")
    expect(result.content).toBe("你好")
    expect(result.intent).toBe("greeting")
    expect(result.id).toContain("msg_")
  })

  it("messagesToChatHistory - 转换为简单格式", () => {
    const messages: MessageRecord[] = [
      {
        id: "msg_1",
        session_id: "s1",
        role: "user",
        content: "你好",
        intent: null,
        tool_calls: null,
        tool_results: null,
        display_type: null,
        metadata: null,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "msg_2",
        session_id: "s1",
        role: "assistant",
        content: "你好，有什么可以帮你？",
        intent: null,
        tool_calls: null,
        tool_results: null,
        display_type: null,
        metadata: null,
        created_at: "2026-01-01T00:00:00.001Z",
      },
    ]

    const result = store.messagesToChatHistory(messages)

    expect(result).toEqual([
      { role: "user", content: "你好" },
      { role: "assistant", content: "你好，有什么可以帮你？" },
    ])
  })
})
