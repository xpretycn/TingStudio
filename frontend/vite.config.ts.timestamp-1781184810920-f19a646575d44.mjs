// vite.config.ts
import { defineConfig } from "file:///D:/ProgramData/workspace-codeby/ting-studio/frontend/node_modules/vite/dist/node/index.js";
import vue from "file:///D:/ProgramData/workspace-codeby/ting-studio/frontend/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import compression from "file:///D:/ProgramData/workspace-codeby/ting-studio/frontend/node_modules/vite-plugin-compression/dist/index.mjs";
import Components from "file:///D:/ProgramData/workspace-codeby/ting-studio/frontend/node_modules/unplugin-vue-components/dist/vite.mjs";
import AutoImport from "file:///D:/ProgramData/workspace-codeby/ting-studio/frontend/node_modules/unplugin-auto-import/dist/vite.mjs";
import { TDesignResolver } from "file:///D:/ProgramData/workspace-codeby/ting-studio/frontend/node_modules/unplugin-vue-components/dist/resolvers.mjs";
import { visualizer } from "file:///D:/ProgramData/workspace-codeby/ting-studio/frontend/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import { resolve } from "path";
import { readFileSync } from "fs";
var __vite_injected_original_dirname = "D:\\ProgramData\\workspace-codeby\\ting-studio\\frontend";
var pkg = JSON.parse(readFileSync(resolve(__vite_injected_original_dirname, "package.json"), "utf-8"));
var vite_config_default = defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  plugins: [
    vue(),
    Components({
      resolvers: [TDesignResolver({ library: "vue-next" })]
    }),
    AutoImport({
      resolvers: [TDesignResolver({ library: "vue-next" })]
    }),
    compression({
      algorithm: "gzip",
      threshold: 1024
    }),
    compression({
      algorithm: "brotliCompress",
      threshold: 1024
    }),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: "dist/stats.html"
    })
  ],
  resolve: {
    alias: {
      "@": resolve(__vite_injected_original_dirname, "src")
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/assets/styles/variables.scss" as *;
`,
        api: "modern-compiler"
      }
    }
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
        lines: 65
      }
    }
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
          if (id.includes("node_modules/vue") || id.includes("node_modules/@vue") || id.includes("node_modules/vue-router") || id.includes("node_modules/pinia")) {
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
        }
      }
    }
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      "/amap": {
        target: "https://restapi.amap.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/amap/, "")
      },
      "/ip-api": {
        target: "http://ip-api.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ip-api/, "")
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxQcm9ncmFtRGF0YVxcXFx3b3Jrc3BhY2UtY29kZWJ5XFxcXHRpbmctc3R1ZGlvXFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxQcm9ncmFtRGF0YVxcXFx3b3Jrc3BhY2UtY29kZWJ5XFxcXHRpbmctc3R1ZGlvXFxcXGZyb250ZW5kXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9Qcm9ncmFtRGF0YS93b3Jrc3BhY2UtY29kZWJ5L3Rpbmctc3R1ZGlvL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7Ly8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ2aXRlc3QvY29uZmlnXCIgLz5cclxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHZ1ZSBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tdnVlXCI7XHJcbmltcG9ydCBjb21wcmVzc2lvbiBmcm9tIFwidml0ZS1wbHVnaW4tY29tcHJlc3Npb25cIjtcclxuaW1wb3J0IENvbXBvbmVudHMgZnJvbSBcInVucGx1Z2luLXZ1ZS1jb21wb25lbnRzL3ZpdGVcIjtcclxuaW1wb3J0IEF1dG9JbXBvcnQgZnJvbSBcInVucGx1Z2luLWF1dG8taW1wb3J0L3ZpdGVcIjtcclxuaW1wb3J0IHsgVERlc2lnblJlc29sdmVyIH0gZnJvbSBcInVucGx1Z2luLXZ1ZS1jb21wb25lbnRzL3Jlc29sdmVyc1wiO1xyXG5pbXBvcnQgeyB2aXN1YWxpemVyIH0gZnJvbSBcInJvbGx1cC1wbHVnaW4tdmlzdWFsaXplclwiO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSBcImZzXCI7XHJcblxyXG5jb25zdCBwa2cgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhyZXNvbHZlKF9fZGlybmFtZSwgXCJwYWNrYWdlLmpzb25cIiksIFwidXRmLThcIikpO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBkZWZpbmU6IHtcclxuICAgIF9fQVBQX1ZFUlNJT05fXzogSlNPTi5zdHJpbmdpZnkocGtnLnZlcnNpb24pLFxyXG4gIH0sXHJcbiAgcGx1Z2luczogW1xyXG4gICAgdnVlKCksXHJcbiAgICBDb21wb25lbnRzKHtcclxuICAgICAgcmVzb2x2ZXJzOiBbVERlc2lnblJlc29sdmVyKHsgbGlicmFyeTogXCJ2dWUtbmV4dFwiIH0pXSxcclxuICAgIH0pLFxyXG4gICAgQXV0b0ltcG9ydCh7XHJcbiAgICAgIHJlc29sdmVyczogW1REZXNpZ25SZXNvbHZlcih7IGxpYnJhcnk6IFwidnVlLW5leHRcIiB9KV0sXHJcbiAgICB9KSxcclxuICAgIGNvbXByZXNzaW9uKHtcclxuICAgICAgYWxnb3JpdGhtOiBcImd6aXBcIixcclxuICAgICAgdGhyZXNob2xkOiAxMDI0LFxyXG4gICAgfSksXHJcbiAgICBjb21wcmVzc2lvbih7XHJcbiAgICAgIGFsZ29yaXRobTogXCJicm90bGlDb21wcmVzc1wiLFxyXG4gICAgICB0aHJlc2hvbGQ6IDEwMjQsXHJcbiAgICB9KSxcclxuICAgIHZpc3VhbGl6ZXIoe1xyXG4gICAgICBvcGVuOiBmYWxzZSxcclxuICAgICAgZ3ppcFNpemU6IHRydWUsXHJcbiAgICAgIGJyb3RsaVNpemU6IHRydWUsXHJcbiAgICAgIGZpbGVuYW1lOiBcImRpc3Qvc3RhdHMuaHRtbFwiLFxyXG4gICAgfSksXHJcbiAgXSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcmVzb2x2ZShfX2Rpcm5hbWUsIFwic3JjXCIpLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIGNzczoge1xyXG4gICAgcHJlcHJvY2Vzc29yT3B0aW9uczoge1xyXG4gICAgICBzY3NzOiB7XHJcbiAgICAgICAgYWRkaXRpb25hbERhdGE6IGBAdXNlIFwiQC9hc3NldHMvc3R5bGVzL3ZhcmlhYmxlcy5zY3NzXCIgYXMgKjtcXG5gLFxyXG4gICAgICAgIGFwaTogXCJtb2Rlcm4tY29tcGlsZXJcIixcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxuICB0ZXN0OiB7XHJcbiAgICBnbG9iYWxzOiB0cnVlLFxyXG4gICAgZW52aXJvbm1lbnQ6IFwianNkb21cIixcclxuICAgIHNldHVwRmlsZXM6IFtcIi4vc3JjL19fdGVzdHNfXy9zZXR1cC50c1wiXSxcclxuICAgIGluY2x1ZGU6IFtcInNyYy8qKi8qLnt0ZXN0LHNwZWN9Lnt0cyx0c3h9XCJdLFxyXG4gICAgZXhjbHVkZTogW1wibm9kZV9tb2R1bGVzXCIsIFwiZGlzdFwiLCBcIi5vdXRwdXRcIl0sXHJcbiAgICBjb3ZlcmFnZToge1xyXG4gICAgICBwcm92aWRlcjogXCJ2OFwiLFxyXG4gICAgICByZXBvcnRlcjogW1widGV4dFwiLCBcImpzb25cIiwgXCJodG1sXCIsIFwibGNvdlwiXSxcclxuICAgICAgcmVwb3J0c0RpcmVjdG9yeTogXCIuL2NvdmVyYWdlXCIsXHJcbiAgICAgIGluY2x1ZGU6IFtcInNyYy8qKi8qLnt0cyx2dWV9XCJdLFxyXG4gICAgICBleGNsdWRlOiBbXCJzcmMvKiovKi5kLnRzXCIsIFwic3JjL19fdGVzdHNfXy8qKlwiLCBcInNyYy9tYWluLnRzXCIsIFwic3JjL0FwcC52dWVcIiwgXCJzcmMvdHlwZXMvKipcIl0sXHJcbiAgICAgIHRocmVzaG9sZHM6IHtcclxuICAgICAgICBzdGF0ZW1lbnRzOiA2NSxcclxuICAgICAgICBicmFuY2hlczogNDUsXHJcbiAgICAgICAgZnVuY3Rpb25zOiA1NSxcclxuICAgICAgICBsaW5lczogNjUsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgYnVpbGQ6IHtcclxuICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcclxuICAgIHRhcmdldDogXCJlczIwMjBcIixcclxuICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvdGRlc2lnbi12dWUtbmV4dFwiKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gXCJ2ZW5kb3ItdGRlc2lnblwiO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy92dWVcIikgfHxcclxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvQHZ1ZVwiKSB8fFxyXG4gICAgICAgICAgICBpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy92dWUtcm91dGVyXCIpIHx8XHJcbiAgICAgICAgICAgIGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL3BpbmlhXCIpXHJcbiAgICAgICAgICApIHtcclxuICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLXZ1ZVwiO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzL2VjaGFydHNcIikpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFwidmVuZG9yLWVjaGFydHNcIjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlcy94bHN4XCIpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBcInZlbmRvci14bHN4XCI7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXMvbWFya2VkXCIpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBcInZlbmRvci1tYXJrZWRcIjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgaWQuaW5jbHVkZXMoXCJub2RlX21vZHVsZXNcIikgJiZcclxuICAgICAgICAgICAgIWlkLmluY2x1ZGVzKFwidGRlc2lnblwiKSAmJlxyXG4gICAgICAgICAgICAhaWQuaW5jbHVkZXMoXCJ2dWVcIikgJiZcclxuICAgICAgICAgICAgIWlkLmluY2x1ZGVzKFwicGluaWFcIikgJiZcclxuICAgICAgICAgICAgIWlkLmluY2x1ZGVzKFwiZWNoYXJ0c1wiKSAmJlxyXG4gICAgICAgICAgICAhaWQuaW5jbHVkZXMoXCJ4bHN4XCIpICYmXHJcbiAgICAgICAgICAgICFpZC5pbmNsdWRlcyhcIm1hcmtlZFwiKVxyXG4gICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBcInZlbmRvci11dGlsc1wiO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiA1MTczLFxyXG4gICAgb3BlbjogdHJ1ZSxcclxuICAgIHByb3h5OiB7XHJcbiAgICAgIFwiL2FwaVwiOiB7XHJcbiAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzAwMFwiLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgXCIvYW1hcFwiOiB7XHJcbiAgICAgICAgdGFyZ2V0OiBcImh0dHBzOi8vcmVzdGFwaS5hbWFwLmNvbVwiLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICByZXdyaXRlOiBwYXRoID0+IHBhdGgucmVwbGFjZSgvXlxcL2FtYXAvLCBcIlwiKSxcclxuICAgICAgfSxcclxuICAgICAgXCIvaXAtYXBpXCI6IHtcclxuICAgICAgICB0YXJnZXQ6IFwiaHR0cDovL2lwLWFwaS5jb21cIixcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgcmV3cml0ZTogcGF0aCA9PiBwYXRoLnJlcGxhY2UoL15cXC9pcC1hcGkvLCBcIlwiKSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFNBQVM7QUFDaEIsT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxnQkFBZ0I7QUFDdkIsT0FBTyxnQkFBZ0I7QUFDdkIsU0FBUyx1QkFBdUI7QUFDaEMsU0FBUyxrQkFBa0I7QUFDM0IsU0FBUyxlQUFlO0FBQ3hCLFNBQVMsb0JBQW9CO0FBVDdCLElBQU0sbUNBQW1DO0FBV3pDLElBQU0sTUFBTSxLQUFLLE1BQU0sYUFBYSxRQUFRLGtDQUFXLGNBQWMsR0FBRyxPQUFPLENBQUM7QUFFaEYsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsUUFBUTtBQUFBLElBQ04saUJBQWlCLEtBQUssVUFBVSxJQUFJLE9BQU87QUFBQSxFQUM3QztBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLElBQ0osV0FBVztBQUFBLE1BQ1QsV0FBVyxDQUFDLGdCQUFnQixFQUFFLFNBQVMsV0FBVyxDQUFDLENBQUM7QUFBQSxJQUN0RCxDQUFDO0FBQUEsSUFDRCxXQUFXO0FBQUEsTUFDVCxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxXQUFXLENBQUMsQ0FBQztBQUFBLElBQ3RELENBQUM7QUFBQSxJQUNELFlBQVk7QUFBQSxNQUNWLFdBQVc7QUFBQSxNQUNYLFdBQVc7QUFBQSxJQUNiLENBQUM7QUFBQSxJQUNELFlBQVk7QUFBQSxNQUNWLFdBQVc7QUFBQSxNQUNYLFdBQVc7QUFBQSxJQUNiLENBQUM7QUFBQSxJQUNELFdBQVc7QUFBQSxNQUNULE1BQU07QUFBQSxNQUNOLFVBQVU7QUFBQSxNQUNWLFlBQVk7QUFBQSxNQUNaLFVBQVU7QUFBQSxJQUNaLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLFFBQVEsa0NBQVcsS0FBSztBQUFBLElBQy9CO0FBQUEsRUFDRjtBQUFBLEVBQ0EsS0FBSztBQUFBLElBQ0gscUJBQXFCO0FBQUEsTUFDbkIsTUFBTTtBQUFBLFFBQ0osZ0JBQWdCO0FBQUE7QUFBQSxRQUNoQixLQUFLO0FBQUEsTUFDUDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxNQUFNO0FBQUEsSUFDSixTQUFTO0FBQUEsSUFDVCxhQUFhO0FBQUEsSUFDYixZQUFZLENBQUMsMEJBQTBCO0FBQUEsSUFDdkMsU0FBUyxDQUFDLCtCQUErQjtBQUFBLElBQ3pDLFNBQVMsQ0FBQyxnQkFBZ0IsUUFBUSxTQUFTO0FBQUEsSUFDM0MsVUFBVTtBQUFBLE1BQ1IsVUFBVTtBQUFBLE1BQ1YsVUFBVSxDQUFDLFFBQVEsUUFBUSxRQUFRLE1BQU07QUFBQSxNQUN6QyxrQkFBa0I7QUFBQSxNQUNsQixTQUFTLENBQUMsbUJBQW1CO0FBQUEsTUFDN0IsU0FBUyxDQUFDLGlCQUFpQixvQkFBb0IsZUFBZSxlQUFlLGNBQWM7QUFBQSxNQUMzRixZQUFZO0FBQUEsUUFDVixZQUFZO0FBQUEsUUFDWixVQUFVO0FBQUEsUUFDVixXQUFXO0FBQUEsUUFDWCxPQUFPO0FBQUEsTUFDVDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxjQUFjO0FBQUEsSUFDZCxRQUFRO0FBQUEsSUFDUixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixhQUFhLElBQUk7QUFDZixjQUFJLEdBQUcsU0FBUywrQkFBK0IsR0FBRztBQUNoRCxtQkFBTztBQUFBLFVBQ1Q7QUFDQSxjQUNFLEdBQUcsU0FBUyxrQkFBa0IsS0FDOUIsR0FBRyxTQUFTLG1CQUFtQixLQUMvQixHQUFHLFNBQVMseUJBQXlCLEtBQ3JDLEdBQUcsU0FBUyxvQkFBb0IsR0FDaEM7QUFDQSxtQkFBTztBQUFBLFVBQ1Q7QUFDQSxjQUFJLEdBQUcsU0FBUyxzQkFBc0IsR0FBRztBQUN2QyxtQkFBTztBQUFBLFVBQ1Q7QUFDQSxjQUFJLEdBQUcsU0FBUyxtQkFBbUIsR0FBRztBQUNwQyxtQkFBTztBQUFBLFVBQ1Q7QUFDQSxjQUFJLEdBQUcsU0FBUyxxQkFBcUIsR0FBRztBQUN0QyxtQkFBTztBQUFBLFVBQ1Q7QUFDQSxjQUNFLEdBQUcsU0FBUyxjQUFjLEtBQzFCLENBQUMsR0FBRyxTQUFTLFNBQVMsS0FDdEIsQ0FBQyxHQUFHLFNBQVMsS0FBSyxLQUNsQixDQUFDLEdBQUcsU0FBUyxPQUFPLEtBQ3BCLENBQUMsR0FBRyxTQUFTLFNBQVMsS0FDdEIsQ0FBQyxHQUFHLFNBQVMsTUFBTSxLQUNuQixDQUFDLEdBQUcsU0FBUyxRQUFRLEdBQ3JCO0FBQ0EsbUJBQU87QUFBQSxVQUNUO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2hCO0FBQUEsTUFDQSxTQUFTO0FBQUEsUUFDUCxRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLFVBQVEsS0FBSyxRQUFRLFdBQVcsRUFBRTtBQUFBLE1BQzdDO0FBQUEsTUFDQSxXQUFXO0FBQUEsUUFDVCxRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLFVBQVEsS0FBSyxRQUFRLGFBQWEsRUFBRTtBQUFBLE1BQy9DO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
