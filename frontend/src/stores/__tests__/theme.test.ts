import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useThemeStore } from "@/stores/theme";

const userId008 = "user-008-uuid";
const userId009 = "user-009-uuid";

let mockCachedUser: { id: string; username: string } | null = null;

vi.mock("@/api/auth", () => ({
  getCachedUser: vi.fn(() => mockCachedUser),
}));

describe("useThemeStore", () => {
  let store: ReturnType<typeof useThemeStore>;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-brand");
    mockCachedUser = null;
    const pinia = createPinia();
    setActivePinia(pinia);
    pinia._s.delete("theme");
    store = useThemeStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("TH01: 默认品牌色为 pink，模式为 auto", () => {
    expect(store.brandColor).toBe("pink");
    expect(store.mode).toBe("auto");
  });

  it("TH02: setBrandColor 更新品牌色状态", () => {
    store.setBrandColor("green");
    expect(store.brandColor).toBe("green");
  });

  it("TH03: setMode 更新模式状态", () => {
    store.setMode("dark");
    expect(store.mode).toBe("dark");
  });

  it("TH04: cycleTheme 循环切换 auto -> light -> dark -> auto", () => {
    expect(store.mode).toBe("auto");
    store.cycleTheme();
    expect(store.mode).toBe("light");
    store.cycleTheme();
    expect(store.mode).toBe("dark");
    store.cycleTheme();
    expect(store.mode).toBe("auto");
  });

  it("TH05: cycleBrandColor 循环 pink -> yellow -> blue -> green -> pink", () => {
    expect(store.brandColor).toBe("pink");
    store.cycleBrandColor();
    expect(store.brandColor).toBe("yellow");
    store.cycleBrandColor();
    expect(store.brandColor).toBe("blue");
    store.cycleBrandColor();
    expect(store.brandColor).toBe("green");
    store.cycleBrandColor();
    expect(store.brandColor).toBe("pink");
  });

  it("TH06: toggleTheme 是 cycleTheme 的别名", () => {
    store.setMode("light");
    store.toggleTheme();
    expect(store.mode).toBe("dark");
  });

  it("TH07: resolvedMode 在 light 模式下返回 light", () => {
    store.setMode("light");
    expect(store.resolvedMode).toBe("light");
    expect(store.isDark).toBe(false);
  });

  it("TH08: resolvedMode 在 dark 模式下返回 dark", () => {
    store.setMode("dark");
    expect(store.resolvedMode).toBe("dark");
    expect(store.isDark).toBe(true);
  });

  it("TH09: 不同用户应使用独立的 localStorage key", () => {
    localStorage.setItem(`ting-brand-color-${userId008}`, "yellow");
    localStorage.setItem(`ting-theme-${userId008}`, "dark");
    localStorage.setItem(`ting-brand-color-${userId009}`, "blue");
    localStorage.setItem(`ting-theme-${userId009}`, "light");

    store.loadForUser(userId008);
    expect(store.brandColor).toBe("yellow");
    expect(store.mode).toBe("dark");

    store.loadForUser(userId009);
    expect(store.brandColor).toBe("blue");
    expect(store.mode).toBe("light");
  });

  it("TH10: loadForUser 应加载指定用户的主题设置", () => {
    localStorage.setItem(`ting-theme-${userId008}`, "light");
    localStorage.setItem(`ting-brand-color-${userId008}`, "green");
    localStorage.setItem(`ting-theme-${userId009}`, "dark");
    localStorage.setItem(`ting-brand-color-${userId009}`, "pink");

    store.loadForUser(userId009);

    expect(store.mode).toBe("dark");
    expect(store.brandColor).toBe("pink");
  });

  it("TH11: applyPreferences 应同时应用 themeMode 和 brandColor", () => {
    store.applyPreferences({ themeMode: "dark", brandColor: "blue" });

    expect(store.mode).toBe("dark");
    expect(store.brandColor).toBe("blue");
  });

  it("TH12: clearLocal 应能清理指定用户的主题缓存", () => {
    localStorage.setItem(`ting-theme-${userId008}`, "light");
    localStorage.setItem(`ting-brand-color-${userId008}`, "green");
    localStorage.setItem(`ting-theme-${userId009}`, "dark");
    localStorage.setItem(`ting-brand-color-${userId009}`, "pink");

    store.clearLocal(userId008);

    expect(localStorage.getItem(`ting-theme-${userId008}`)).toBeNull();
    expect(localStorage.getItem(`ting-brand-color-${userId008}`)).toBeNull();
    expect(localStorage.getItem(`ting-theme-${userId009}`)).toBe("dark");
    expect(localStorage.getItem(`ting-brand-color-${userId009}`)).toBe("pink");
  });

  it("TH13: 旧的全局 key 数据应自动迁移到用户专属 key", () => {
    localStorage.setItem("ting-theme", "dark");
    localStorage.setItem("ting-brand-color", "green");
    mockCachedUser = { id: userId008, username: "user008" };

    store.loadForUser(userId008);

    expect(store.mode).toBe("dark");
    expect(store.brandColor).toBe("green");
    expect(localStorage.getItem(`ting-theme-${userId008}`)).toBe("dark");
    expect(localStorage.getItem(`ting-brand-color-${userId008}`)).toBe("green");
    expect(localStorage.getItem("ting-theme")).toBeNull();
    expect(localStorage.getItem("ting-brand-color")).toBeNull();
  });
});
