import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { usePreferencesStore } from "@/stores/preferences";

const userId008 = "user-008-uuid";
const userId009 = "user-009-uuid";

const { getPreferences, updatePreferences } = vi.hoisted(() => ({
  getPreferences: vi.fn(),
  updatePreferences: vi.fn(),
}));

let mockCachedUser: { id: string; username: string } | null = null;

vi.mock("@/api/auth", () => ({
  authApi: {
    getPreferences,
    updatePreferences,
  },
  getCachedUser: vi.fn(() => mockCachedUser),
}));

describe("usePreferencesStore 数据隔离", () => {
  let store: ReturnType<typeof usePreferencesStore>;

  beforeEach(() => {
    localStorage.clear();
    mockCachedUser = null;
    setActivePinia(createPinia());
    store = usePreferencesStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("PF01: 未登录时使用 guest key 存储偏好", () => {
    mockCachedUser = null;
    store.saveToLocal({ brandColor: "blue", themeMode: "dark" } as any);
    const stored = localStorage.getItem("ting-preferences-guest");
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).brandColor).toBe("blue");
  });

  it("PF02: 不同用户的偏好存储在独立的 key 中", () => {
    mockCachedUser = { id: userId008, username: "user008" };
    store.saveToLocal({ brandColor: "pink" } as any);

    mockCachedUser = { id: userId009, username: "user009" };
    store.saveToLocal({ brandColor: "green" } as any);

    const stored008 = localStorage.getItem(`ting-preferences-${userId008}`);
    const stored009 = localStorage.getItem(`ting-preferences-${userId009}`);

    expect(JSON.parse(stored008!).brandColor).toBe("pink");
    expect(JSON.parse(stored009!).brandColor).toBe("green");
  });

  it("PF03: user008 修改品牌色不应影响 user009 的本地缓存", () => {
    mockCachedUser = { id: userId008, username: "user008" };
    store.updatePreferences({ brandColor: "pink" });

    mockCachedUser = { id: userId009, username: "user009" };
    const prefs009 = store.loadFromLocal();

    expect(prefs009.brandColor).toBe("pink");
    expect(localStorage.getItem(`ting-preferences-${userId009}`)).toBeNull();
  });

  it("PF04: clearLocal 应能清理指定用户的偏好缓存", () => {
    mockCachedUser = { id: userId008, username: "user008" };
    store.saveToLocal({ brandColor: "yellow" } as any);

    mockCachedUser = { id: userId009, username: "user009" };
    store.saveToLocal({ brandColor: "blue" } as any);

    store.clearLocal(userId008);

    expect(localStorage.getItem(`ting-preferences-${userId008}`)).toBeNull();
    expect(localStorage.getItem(`ting-preferences-${userId009}`)).toBeTruthy();
  });

  it("PF05: fetchPreferences 成功应将服务器数据保存到用户专属 key", async () => {
    mockCachedUser = { id: userId008, username: "user008" };
    getPreferences.mockResolvedValue({ brandColor: "green", themeMode: "light" });

    await store.fetchPreferences();

    const stored = localStorage.getItem(`ting-preferences-${userId008}`);
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).brandColor).toBe("green");
    expect(store.preferences.brandColor).toBe("green");
  });

  it("PF06: 旧的全局 key 数据应自动迁移到用户专属 key", () => {
    localStorage.setItem("ting-preferences", JSON.stringify({ brandColor: "blue", themeMode: "dark" }));
    mockCachedUser = { id: userId008, username: "user008" };

    const prefs = store.loadFromLocal();

    expect(prefs.brandColor).toBe("blue");
    expect(localStorage.getItem(`ting-preferences-${userId008}`)).toBeTruthy();
    expect(localStorage.getItem("ting-preferences")).toBeNull();
  });
});
