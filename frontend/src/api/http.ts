import axios from "axios";
import { MessagePlugin } from "tdesign-vue-next";

const TOKEN_KEY = "tingstudio_token";
const USER_KEY = "tingstudio_user";

// ── 网络错误去重：防止多个并发请求同时失败时重复弹消息和跳转 ──
let networkErrorHandledTime = 0;
const NETWORK_ERROR_COOLDOWN = 5000; // 5 秒内只处理一次

declare module "axios" {
  interface AxiosRequestConfig {
    _logLabel?: string;
    _silent?: boolean;
  }
}

function getTokenFromStorage(): string | null {
  const sessionToken = sessionStorage.getItem(TOKEN_KEY)
  if (sessionToken) return sessionToken
  const localToken = localStorage.getItem(TOKEN_KEY)
  if (localToken) {
    sessionStorage.setItem(TOKEN_KEY, localToken)
    const user = localStorage.getItem(USER_KEY)
    if (user) sessionStorage.setItem(USER_KEY, user)
  }
  return localToken
}

const http = axios.create({
  baseURL: import.meta.env?.VITE_API_BASE_URL || "/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use(config => {
  const token = getTokenFromStorage();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * 判断是否为后端不可用错误
 * 1. 代理层面：Vite/nginx 代理返回 502/503/504（代理本身在线但无法连接后端）
 * 2. 网络层面：连接被拒绝、网络不通、请求超时等（无 HTTP 响应）
 */
function isBackendUnavailable(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;

  // 代理返回 502/503/504
  const status = error.response?.status;
  if (status === 502 || status === 503 || status === 504) {
    return true;
  }

  // 网络层面错误：没有收到 HTTP 响应
  if (!error.response) {
    const NETWORK_ERROR_CODES = [
      "ERR_CONNECTION_REFUSED",
      "ERR_NETWORK",
      "ECONNREFUSED",
      "ERR_ABORTED",
      "ECONNABORTED", // 请求超时
    ] as const;
    if (NETWORK_ERROR_CODES.includes(error.code as (typeof NETWORK_ERROR_CODES)[number])) {
      return true;
    }
    // 修复：原逻辑 error.code && (...) 短路导致 message 检测被跳过
    if (error.message?.includes("Network Error") || error.message?.includes("Failed to fetch")) {
      return true;
    }
  }

  return false;
}

http.interceptors.response.use(
  response => {
    // 后端已恢复通信，重置网络错误去重计时
    networkErrorHandledTime = 0;

    if (response.config.responseType === "blob") {
      return response.data;
    }
    const res = response.data;
    if (res.success === false) {
      if (!response.config._silent) {
        const errorMsg = res.error?.message || res.message || "请求失败";
        MessagePlugin.error(errorMsg);
      }
      return Promise.reject(new Error(res.error?.message || res.message));
    }
    return res.data;
  },
  error => {
    // ===== 后端不可用（网络错误或代理返回 502/503/504） =====
    if (isBackendUnavailable(error)) {
      // 已在错误页面：静默拒绝，不再弹消息和跳转
      if (window.location.pathname === "/server-error") {
        return Promise.reject(error);
      }

      // 去重：冷却期内只处理一次，避免并发请求重复弹消息和跳转
      const now = Date.now();
      if (now - networkErrorHandledTime < NETWORK_ERROR_COOLDOWN) {
        return Promise.reject(error);
      }
      networkErrorHandledTime = now;

      console.warn("[HTTP] 后端服务不可用，即将跳转服务器故障页面");
      MessagePlugin.error("后端服务未启动或网络连接失败");
      // 立即跳转（去重已保证只触发一次，无需延迟）
      window.dispatchEvent(
        new CustomEvent("app:navigate", { detail: { path: "/server-error", replace: true } }),
      );
      return Promise.reject(error);
    }

    // ===== HTTP 状态码处理 =====
    const status = error.response?.status;
    const responseData = error.response?.data;
    const msg = responseData?.error?.message || responseData?.message || error.message || "网络错误";
    const label = error.config?._logLabel || "";

    if (status === 401) {
      if (!error.config?._silent) {
        removeToken();
        clearUser();
        if (!window.location.pathname.startsWith("/login")) {
          window.dispatchEvent(new CustomEvent("app:navigate", { detail: { path: "/login" } }));
        }
        MessagePlugin.error("登录已过期，请重新登录");
      }
    } else if (status === 403) {
      if (!error.config?._silent) {
        MessagePlugin.warning("权限不足，无法访问该资源");
      }
    } else {
      if (!error.config?._silent) {
        console.error(
          `[HTTP-ERR] ${error.config?.method?.toUpperCase()} ${error.config?.baseURL}${error.config?.url} [${status}] ${label ? "(" + label + ")" : ""}:`,
          msg,
          error.response?.data,
        );
        MessagePlugin.error(msg);
      }
    }
    return Promise.reject(error);
  },
);

/** 重置网络错误去重状态（离开 /server-error 页面时调用） */
export function resetNetworkErrorState(): void {
  networkErrorHandledTime = 0;
}

export function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

function clearUser() {
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(USER_KEY);
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export { USER_KEY };
export default http;
