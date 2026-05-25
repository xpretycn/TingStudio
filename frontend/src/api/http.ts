import axios from "axios";
import { MessagePlugin } from "tdesign-vue-next";

const TOKEN_KEY = "tingstudio_token";
const USER_KEY = "tingstudio_user";

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

http.interceptors.response.use(
  response => {
    if (response.config.responseType === "blob") {
      return response.data;
    }
    const res = response.data;
    if (res.success === false) {
      if (!response.config._silent) {
        MessagePlugin.error(res.message || "请求失败");
      }
      return Promise.reject(new Error(res.message));
    }
    return res.data;
  },
  error => {
    const isNetworkError =
      !error.response &&
      error.code &&
      (error.code === "ERR_CONNECTION_REFUSED" ||
        error.code === "ERR_NETWORK" ||
        error.code === "ECONNREFUSED" ||
        error.code === "ERR_ABORTED" ||
        error.message?.includes("Network Error") ||
        error.message?.includes("Failed to fetch"));

    if (isNetworkError) {
      console.warn("[HTTP] 后端服务不可用，即将跳转服务器故障页");
      clearToken();
      clearUser();
      MessagePlugin.error("后端服务未启动或网络连接失败，请检查后端服务状态");
      setTimeout(() => {
        window.location.href = "/server-error";
      }, 1200);
      return Promise.reject(error);
    }

    const msg = error.response?.data?.message || error.message || "网络错误";
    const label = error.config?._logLabel || "";
    console.error(
      `[HTTP-ERR] ${error.config?.method?.toUpperCase()} ${error.config?.baseURL}${error.config?.url} [${error.response?.status}] ${label ? "(" + label + ")" : ""}:`,
      msg,
      error.response?.data,
    );
    if (error.response?.status === 401) {
      clearToken();
      clearUser();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
      MessagePlugin.error("登录已过期，请重新登录");
    } else if (!error.config?._silent) {
      MessagePlugin.error(msg);
    }
    return Promise.reject(error);
  },
);

export function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

function clearToken() {
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
