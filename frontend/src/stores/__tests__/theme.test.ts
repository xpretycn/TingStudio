import { describe, it, expect, _vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useThemeStore } from "@/stores/theme";

describe("useThemeStore", () => {
  let store: ReturnType<typeof useThemeStore>;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-brand");
    const pinia = createPinia();
    setActivePinia(pinia);
    pinia._s.delete("theme");
    store = useThemeStore();
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
});
