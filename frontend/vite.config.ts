/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import compression from "vite-plugin-compression";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    vue(),
    compression({
      algorithm: "gzip",
      threshold: 1024,
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/assets/styles/variables.scss" as *;\n`,
        api: "modern-compiler",
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".output"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,vue}"],
      exclude: ["src/**/*.d.ts", "src/__tests__/**", "src/main.ts", "src/App.vue", "src/types/**"],
      thresholds: {
        statements: 65,
        branches: 45,
        functions: 55,
        lines: 65,
      },
    },
  },
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/tdesign-vue-next")) {
            return "vendor-tdesign";
          }
          if (
            id.includes("node_modules/vue") ||
            id.includes("node_modules/@vue") ||
            id.includes("node_modules/vue-router") ||
            id.includes("node_modules/pinia")
          ) {
            return "vendor-vue";
          }
          if (id.includes("node_modules") && !id.includes("tdesign") && !id.includes("vue") && !id.includes("pinia")) {
            return "vendor-utils";
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      // 高德地图 API 代理（解决 CORS）
      "/amap": {
        target: "https://restapi.amap.com",
        changeOrigin: true,
        rewrite: path => path.replace(/^\/amap/, ""),
      },
      // ip-api.com 代理（备用定位服务）
      "/ip-api": {
        target: "http://ip-api.com",
        changeOrigin: true,
        rewrite: path => path.replace(/^\/ip-api/, ""),
      },
    },
  },
});
