import { describe, it, expect, vi, beforeEach } from "vitest";

describe("HTTP 客户端工具函数", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("H01: getToken 应从 localStorage 获取 token", () => {
    const TOKEN_KEY = "tingstudio_token";
    localStorage.setItem(TOKEN_KEY, "my-token");
    const result = localStorage.getItem(TOKEN_KEY);
    expect(result).toBe("my-token");
  });

  it("H02: setToken 应写入 localStorage", () => {
    const TOKEN_KEY = "tingstudio_token";
    localStorage.setItem(TOKEN_KEY, "new-token");
    expect(localStorage.getItem(TOKEN_KEY)).toBe("new-token");
  });

  it("H03: removeToken 应清除 localStorage", () => {
    const TOKEN_KEY = "tingstudio_token";
    localStorage.setItem(TOKEN_KEY, "exists");
    localStorage.removeItem(TOKEN_KEY);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
