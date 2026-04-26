import axios from "axios";
import { MessagePlugin } from "tdesign-vue-next";

const TOKEN_KEY = "tingstudio_token";

declare module "axios" {
  interface AxiosRequestConfig {
    _logLabel?: string;
    _silent?: boolean;
  }
}

const http = axios.create({
  baseURL: import.meta.env?.VITE_API_BASE_URL || "/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config._logLabel) {
    console.log(`[HTTP] ${config.method?.toUpperCase()} ${config.baseURL}${config.url} (${config._logLabel})`);
  }
  return config;
});

http.interceptors.response.use(
  response => {
    if (response.config.responseType === 'blob') {
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
    const msg = error.response?.data?.message || error.message || "网络错误";
    const label = error.config?._logLabel || "";
    console.error(
      `[HTTP-ERR] ${error.config?.method?.toUpperCase()} ${error.config?.baseURL}${error.config?.url} [${error.response?.status}] ${label ? "(" + label + ")" : ""}:`,
      msg,
      error.response?.data,
    );
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("tingstudio_user");
      window.location.href = "/login";
      MessagePlugin.error("登录已过期，请重新登录");
    } else if (!error.config?._silent) {
      MessagePlugin.error(msg);
    }
    return Promise.reject(error);
  },
);

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export default http;
