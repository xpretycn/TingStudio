/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import compression from "vite-plugin-compression";
import Components from "unplugin-vue-components/vite";
import AutoImport from "unplugin-auto-import/vite";
import { TDesignResolver } from "unplugin-vue-components/resolvers";
import { visualizer } from "rollup-plugin-visualizer";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [TDesignResolver({ library: "vue-next" })],
    }),
    AutoImport({
      resolvers: [TDesignResolver({ library: "vue-next" })],
    }),
    compression({
      algorithm: "gzip",
      threshold: 1024,
    }),
    compression({
      algorithm: "brotliCompress",
      threshold: 1024,
    }),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: "dist/stats.html",
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
    target: "es2020",
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
          if (id.includes("node_modules/echarts")) {
            return "vendor-echarts";
          }
          if (id.includes("node_modules/xlsx")) {
            return "vendor-xlsx";
          }
          if (id.includes("node_modules/marked")) {
            return "vendor-marked";
          }
          if (id.includes("node_modules") && !id.includes("tdesign") && !id.includes("vue") && !id.includes("pinia") && !id.includes("echarts") && !id.includes("xlsx") && !id.includes("marked")) {
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
      "/amap": {
        target: "https://restapi.amap.com",
        changeOrigin: true,
        rewrite: path => path.replace(/^\/amap/, ""),
      },
      "/ip-api": {
        target: "http://ip-api.com",
        changeOrigin: true,
        rewrite: path => path.replace(/^\/ip-api/, ""),
      },
    },
  },
});
