import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAuthStore } from "@/stores/auth";

const { login, register, getMe, updateProfile, changePassword } = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  getMe: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
}));

vi.mock("@/api/auth", () => ({
  authApi: {
    login,
    register,
    getMe,
    updateProfile,
    changePassword,
  },
  saveAuthData: vi.fn(),
  clearAuthData: vi.fn(),
  getCachedUser: vi.fn(() => null),
}));

describe("useAuthStore", () => {
  let store: ReturnType<typeof useAuthStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    store = useAuthStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("A01: 初始状态应为未登录", () => {
    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
    expect(store.loading).toBe(false);
  });

  it("A02: 登录成功后应存储 token 和用户信息", async () => {
    const mockUser = { id: "u1", username: "admin", role: "admin" };
    const mockToken = "test-token-xyz";
    login.mockResolvedValue({ user: mockUser, token: mockToken });

    const result = await store.login({ username: "admin", password: "admin123" });

    expect(result.success).toBe(true);
    expect(store.isAuthenticated).toBe(true);
    expect(store.user).toEqual(mockUser);
    expect(store.loading).toBe(false);
  });

  it("A03: 登录失败（密码错误）应返回错误信息", async () => {
    login.mockRejectedValue(new Error("用户名或密码错误"));

    const result = await store.login({ username: "admin", password: "wrong" });

    expect(result.success).toBe(false);
    expect(result.message).toBeTruthy();
    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
  });

  it("A04: 登出后应清除所有认证信息", () => {
    (store as unknown as { _user: { id: string; username: string } | null })._user = { id: "u1", username: "admin" };

    store.logout();

    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
  });

  it("A05: 注册成功后应自动设置登录态", async () => {
    const mockUser = { id: "u2", username: "newuser", role: "user" };
    register.mockResolvedValue({ user: mockUser, token: "reg-token" });

    const result = await store.register({ username: "newuser", password: "pass123" });

    expect(result.success).toBe(true);
    expect(store.isAuthenticated).toBe(true);
    expect(store.user).toEqual(mockUser);
  });

  it("A06: 注册失败应返回错误信息", async () => {
    register.mockRejectedValue(new Error("用户已存在"));

    const result = await store.register({ username: "existing", password: "pass" });

    expect(result.success).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it("A07: updateProfile 成功应更新 user 信息", async () => {
    const updatedUser = { id: "u1", username: "admin-updated", role: "admin" };
    localStorage.setItem("tingstudio_token", "existing-token");
    updateProfile.mockResolvedValue(updatedUser);

    const result = await store.updateProfile({ display_name: "新昵称" });

    expect(result.success).toBe(true);
    expect(store.user).toEqual(updatedUser);
  });

  it("A08: changePassword 失败应返回错误信息", async () => {
    changePassword.mockRejectedValue(new Error("旧密码不正确"));

    const result = await store.changePassword({ oldPassword: "wrong", newPassword: "new" });

    expect(result.success).toBe(false);
    expect(result.message).toBeTruthy();
  });
});
