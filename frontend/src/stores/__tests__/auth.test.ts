import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAuthStore } from "@/stores/auth";

const { login, register, getMe, updateProfile, changePassword, getPreferences } = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  getMe: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  getPreferences: vi.fn(),
}));

vi.mock("@/api/auth", () => ({
  authApi: {
    login,
    register,
    getMe,
    updateProfile,
    changePassword,
    getPreferences,
  },
  saveAuthData: vi.fn(),
  saveUserOnly: vi.fn(),
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
    getPreferences.mockResolvedValue({ brandColor: "pink", themeMode: "auto" });

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
    getPreferences.mockResolvedValue({ brandColor: "pink", themeMode: "auto" });

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
    const currentUser = { id: "u1", username: "admin", role: "admin" };
    const updatedUser = { id: "u1", username: "admin-updated", role: "admin" };
    store.user = currentUser as any;
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

describe("useAuthStore 偏好设置同步", () => {
  let store: ReturnType<typeof useAuthStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    store = useAuthStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("A09: 登录成功后应同步用户偏好设置到 store", async () => {
    const mockUser = { id: "u008", username: "user008", role: "formulist" };
    login.mockResolvedValue({ user: mockUser, token: "token-008" });
    getPreferences.mockResolvedValue({ brandColor: "pink", themeMode: "light" });

    await store.login({ username: "user008", password: "pass" });

    expect(getPreferences).toHaveBeenCalled();
  });

  it("A10: 登出时应清理当前用户的本地偏好缓存", async () => {
    const mockUser = { id: "u008", username: "user008", role: "formulist" };
    login.mockResolvedValue({ user: mockUser, token: "token-008" });
    getPreferences.mockResolvedValue({ brandColor: "pink", themeMode: "auto" });

    await store.login({ username: "user008", password: "pass" });

    localStorage.setItem("ting-preferences-u008", JSON.stringify({ brandColor: "pink" }));
    localStorage.setItem("ting-theme-u008", "auto");
    localStorage.setItem("ting-brand-color-u008", "pink");

    store.logout();

    expect(localStorage.getItem("ting-preferences-u008")).toBeNull();
    expect(localStorage.getItem("ting-theme-u008")).toBeNull();
    expect(localStorage.getItem("ting-brand-color-u008")).toBeNull();
  });

  it("A11: initAuth 后应异步加载用户偏好", async () => {
    const { getCachedUser } = await import("@/api/auth");
    (getCachedUser as any).mockReturnValue({ id: "u009", username: "user009" });
    getPreferences.mockResolvedValue({ brandColor: "green", themeMode: "dark" });

    store.initAuth();

    await new Promise((r) => setTimeout(r, 50));

    expect(getPreferences).toHaveBeenCalled();
  });
});
