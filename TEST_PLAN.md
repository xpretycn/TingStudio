# TingStudio 前端 — 全面测试计划

> 版本：v1.0 | 日期：2026-04-19 | 状态：待执行

---

## 一、项目现状评估

### 1.1 技术栈

| 技术              |       版本       | 用途        |
| :---------------- | :--------------: | :---------- |
| Vue 3             |     ^3.4.21      | 前端框架    |
| TypeScript        |      ^5.4.2      | 类型系统    |
| Vite              |      ^5.1.6      | 构建工具    |
| Pinia             |      ^2.1.7      | 状态管理    |
| TDesign Vue Next  |      ^1.9.6      | UI 组件库   |
| Vue Router        |      ^4.3.0      | 路由管理    |
| Axios             |     ^1.13.6      | HTTP 客户端 |
| VeeValidate + Yup | ^4.12.8 / ^1.4.0 | 表单验证    |
| xlsx              |     ^0.18.5      | Excel 处理  |
| SCSS (Sass)       |     ^1.72.0      | 样式预处理  |

### 1.2 项目规模

```
┌─────────────────────────────────────┬──────┐
│ 模块类型                             │ 数量 │
├─────────────────────────────────────┼──────┤
│ 路由页面 (views/)                   │  18  │
│ 通用组件 (components/)              │   4  │
│ Pinia Store (stores/)               │  11  │
│ API 接口层 (api/)                   │  12  │
│ 路由定义                            │  22  │
│ 样式文件 (styles/)                  │  10  │
│ 工具函数 (utils/)                   │   2  │
│ 类型定义 (types/)                   │   3  │
└─────────────────────────────────────┴──────┘
总计：~79 个可测单元
```

### 1.3 测试现状评估

| 维度             | 现状                                    | 风险等级 |
| :--------------- | :-------------------------------------- | :------: |
| **测试文件**     | ❌ 0 个（无 `.test.ts` / `.spec.ts`）   |  🔴 高   |
| **测试框架**     | ❌ 未安装（无 vitest / jest / cypress） |  🔴 高   |
| **类型检查**     | ✅ `vue-tsc` 已配置（build 时执行）     |  🟢 低   |
| **代码规范**     | ⚠️ 无 ESLint / Prettier 配置            |  🟡 中   |
| **CI/CD 流水线** | ❌ 未发现自动化流水线配置               |  🔴 高   |

---

## 二、测试策略总览

采用**测试金字塔模型**，自底向上分层实施：

```
                    ┌───────────┐
                    │  E2E 测试  │  ← Playwright (~5%)
                    │  关键流程  │
                ┌───┴───────────┴───┐
                │    组件测试        │  ← Vitest + VTU (~30%)
                │  UI 交互/渲染     │
            ┌───┴───────────────────┴───┐
            │       单元测试             │  ← Vitest (~65%)
            │  Store/API/Utils/Types    │
            └───────────────────────────┘
```

### 分层职责说明

|     层级     | 职责范围                         |   执行速度   | 维护成本 |
| :----------: | :------------------------------- | :----------: | :------: |
| **单元测试** | 函数逻辑 / Store 状态 / API 封装 | < 100ms/用例 |    低    |
| **组件测试** | 渲染结果 / 用户交互 / 事件触发   | ~200ms/用例  |    中    |
| **E2E 测试** | 完整业务流程 / 跨页面导航        |  1-10s/用例  |    高    |

---

## 三、P0 — 基础设施搭建（前置任务）

### 3.1 安装测试依赖

```bash
# 核心测试框架
npm install -D vitest @vue/test-utils jsdom @vitest/ui @vitest/coverage-v8

# E2E 测试框架
npm install -D @playwright/test

# API Mock 服务
npm install -D msw@latest

# 数据生成（边界测试）
npm install -D faker@latest
```

### 3.2 Vitest 配置

在 `vite.config.ts` 中添加 test 配置块：

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
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
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
});
```

### 3.3 全局 Setup 文件

创建 `src/__tests__/setup.ts`：

```typescript
import { config } from "@vue/test-utils";
import { vi } from "vitest";

// TDesign 组件全局 stub（减少第三方组件干扰）
config.global.stubs = {
  "t-icon": { template: "<span></span>" },
};

// localStorage Mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] || null),
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// sessionStorage Mock
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, "sessionStorage", { value: sessionStorageMock });

// URL / location mock（路由守卫测试需要）
Object.defineProperty(window, "location", {
  value: {
    href: "http://localhost/",
    origin: "http://localhost",
    pathname: "/",
    assign: vi.fn(),
    replace: vi.fn(),
  },
  writable: true,
});

// console.error 静默（可选，避免测试输出噪音）
// vi.spyOn(console, 'error').mockImplementation(() => {})
```

### 3.4 Playwright 配置

创建 `playwright.config.ts`：

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never", outputFolder: "playwright-report" }], ["list"]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
```

### 3.5 package.json Scripts 补充

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:all": "npm run test:run && npm run test:e2e"
  }
}
```

### 3.6 目录结构规划

```
frontend/
├── src/
│   ├── __tests__/              # 测试工具 & 配置
│   │   ├── setup.ts           # 全局 setup
│   │   └── mocks/             # Mock 数据 & handlers
│   │       ├── handlers.ts    # MSW request handlers
│   │       └── data/          # 固定测试数据
│   ├── stores/
│   │   └── __tests__/         # Store 单元测试
│   ├── api/
│   │   └── __tests__/         # API 层测试
│   ├── components/
│   │   └── __tests__/         # 组件测试
│   ├── views/
│   │   └── __tests__/         # 页面组件测试
│   └── utils/
│       └── __tests__/         # 工具函数测试
├── e2e/                       # E2E 测试
│   ├── auth.spec.ts
│   ├── material.spec.ts
│   ├── formula.spec.ts
│   ├── ai-assistant.spec.ts
│   └── theme.spec.ts
├── coverage/                   # 覆盖率报告
├── playwright-report/          # E2E 报告
├── vitest.config.ts           # Vitest 配置（或集成到 vite.config.ts）
└── playwright.config.ts       # Playwright 配置
```

---

## 四、P1 — 单元测试（优先级最高）

### 4.1 Store 层测试（11 个 Store）

#### 4.1.1 认证 Store — `auth.ts`

| ID  | 测试场景                                    | 预期结果                                                       | 优先级 |
| :-: | :------------------------------------------ | :------------------------------------------------------------- | :----: |
| A01 | 初始状态检查                                | `isAuthenticated === false`, `user === null`                   |   P0   |
| A02 | 登录成功                                    | token 存入 localStorage, user 更新, `isAuthenticated === true` |   P0   |
| A03 | 登录失败（密码错误）                        | 显示错误提示, 状态不变更                                       |   P0   |
| A04 | 登出操作                                    | 清除 token/user, `isAuthenticated === false`                   |   P0   |
| A05 | Token 过期处理（401）                       | 自动清除认证信息, 跳转 `/login`                                |   P0   |
| A06 | initAuth 从 localStorage 恢复               | 有 token 时自动恢复登录态                                      |   P1   |
| A07 | 已登录用户访问 `/login` 应重定向到首页      | 路由守卫正确拦截                                               |   P1   |
| A08 | 未登录用户访问受保护页面应重定向到 `/login` | 路由守卫正确拦截                                               |   P1   |

**关键代码示例：**

```typescript
// src/stores/__tests__/auth.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAuthStore } from "@/stores/auth";
import * as authApi from "@/api/auth";

describe("useAuthStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it("A01: 初始状态应为未登录", () => {
    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
  });

  it("A02: 登录成功后应存储 token 和用户信息", async () => {
    vi.spyOn(authApi, "login").mockResolvedValue({
      token: "test-token-xyz",
      user: { id: "u1", username: "admin", avatar: "/avatar.jpg", role: "admin" },
    });

    const store = useAuthStore();
    await store.login({ username: "admin", password: "123456" });

    expect(store.isAuthenticated).toBe(true);
    expect(store.user?.username).toBe("admin");
    expect(localStorage.setItem).toHaveBeenCalledWith("tingstudio_token", "test-token-xyz");
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "tingstudio_user",
      JSON.stringify({ id: "u1", username: "admin", avatar: "/avatar.jpg", role: "admin" }),
    );
  });

  it("A04: 登出后应清除所有认证信息", () => {
    const store = useAuthStore();
    // 先设置已登录状态
    (store as any)._user = { id: "u1", username: "admin" };

    store.logout();

    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
    expect(localStorage.removeItem).toHaveBeenCalledWith("tingstudio_token");
    expect(localStorage.removeItem).toHaveBeenCalledWith("tingstudio_user");
  });
});
```

#### 4.1.2 原料 Store — `material.ts`

| ID  | 测试场景                     | 预期结果                                      | 优先级 |
| :-: | :--------------------------- | :-------------------------------------------- | :----: |
| M01 | fetchMaterials 成功加载列表  | materials 数组填充, loading=false, total 正确 |   P0   |
| M02 | fetchMaterials 失败处理      | 错误提示, materials 为空数组                  |   P0   |
| M03 | createMaterial 新增原料      | 列表新增记录, 成功提示                        |   P0   |
| M04 | updateMaterial 编辑原料      | 对应记录更新                                  |   P0   |
| M05 | deleteMaterial 删除原料      | 列表移除记录, 确认弹窗交互                    |   P0   |
| M06 | searchKeyword 搜索过滤       | filteredMaterials 只包含匹配项                |   P1   |
| M07 | sortBy 排序切换              | 列表按指定字段升序/降序排列                   |   P1   |
| M08 | setPage/setPageSize 分页状态 | currentPage/pageSize 正确更新                 |   P1   |
| M09 | 边界值：空列表时的分页计算   | totalPages=1, 不越界                          |   P2   |
| M10 | 并发请求去重                 | 连续调用 fetchMaterials 只发一次请求          |   P2   |

#### 4.1.3 配方 Store — `formula.ts`

| ID  | 测试场景              | 预期结果                  | 优先级 |
| :-: | :-------------------- | :------------------------ | :----: |
| F01 | CRUD 四个操作完整流程 | 创建→读取→更新→删除均正常 |   P0   |
| F02 | 配方与版本关联        | versions 数组随配方加载   |   P0   |
| F03 | 配方与原料关联        | materials 字段正确映射    |   P0   |
| F04 | 发布/草稿状态切换     | status 字段正确变更       |   P1   |
| F05 | 搜索：按名称/编号过滤 | 多字段搜索正确            |   P1   |

#### 4.1.4 其余 Store 快速清单

| Store             | 核心测试点                                                                    | 用例数预估 |
| :---------------- | :---------------------------------------------------------------------------- | :--------: |
| **salesman.ts**   | CRUD / 头像上传 / 在职离职切换                                                |    ~12     |
| **ai.ts**         | 模型列表加载 / 模型选择切换 / 对话消息流 / 流式响应                           |    ~15     |
| **theme.ts**      | setBrand(4种颜色) / toggleDarkMode / 持久化到 localStorage / data-\* 属性设置 |    ~12     |
| **pagination.ts** | register / update / unregister / 跨页面同步                                   |     ~8     |
| **version.ts**    | 版本列表 / 版本对比差异 / 发布版本 / 回滚到历史版本                           |    ~14     |
| **nutrition.ts**  | 营养素数据结构 / per100g 计算 / 保存/查询                                     |    ~16     |
| **export.ts**     | 导出任务创建 / 进度跟踪 / 取消导出 / 完成回调                                 |    ~10     |
| **weather.ts**    | 天气数据获取 / 缓存策略 / 错误降级显示                                        |     ~6     |

**Store 层总计：约 146 个用例**

---

### 4.2 API 层测试（12 个模块）

#### 4.2.1 HTTP 客户端 — `http.ts`

| ID  | 测试场景                            | 预期结果                                                   | 优先级 |
| :-: | :---------------------------------- | :--------------------------------------------------------- | :----: |
| H01 | 请求时自动注入 Authorization header | headers 包含 `Bearer xxx`                                  |   P0   |
| H02 | 无 token 时不注入 Authorization     | headers 不含 Authorization                                 |   P0   |
| H03 | 401 响应处理                        | 清除 token, 设置 `window.location.href='/login'`, 显示提示 |   P0   |
| H04 | 500 服务器错误处理                  | 显示错误消息, Promise reject                               |   P0   |
| H05 | 网络超时处理（15s）                 | 超时后 reject, 显示网络错误提示                            |   P1   |
| H06 | 业务错误 (`success:false`)          | 提取 message 并显示, reject                                |   P0   |
| H07 | \_silent 静默模式                   | 不弹出 MessagePlugin                                       |   P2   |
| H08 | \_logLabel 日志标记                 | console.log 包含 label 信息                                |   P2   |

**代码示例：**

```typescript
// src/api/__tests__/http.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import http from "@/api/http";
import axios from "axios";

vi.mock("axios");

describe("HTTP 客户端", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("H01: 请求时应自动注入 Authorization header", async () => {
    localStorage.setItem("tingstudio_token", "my-test-token");
    const mockedAxios = vi.mocked(axios.create({} as any));
    // 通过 spy on instance methods
    const mockGet = vi.fn().mockResolvedValue({
      data: { success: true, data: { id: 1 } },
    });
    (http as any).get = mockGet;

    await http.get("/test-endpoint");

    expect(mockGet).toHaveBeenCalledWith(
      "/test-endpoint",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-test-token",
        }),
      }),
    );
  });
});
```

#### 4.2.2 各业务 API 模块

| API 模块         | 测试重点                                 | 用例数 |
| :--------------- | :--------------------------------------- | :----: |
| `auth.ts`        | login/register 参数校验 / 返回值解构     |   ~8   |
| `material.ts`    | URL 拼接 / 参数序列化 / 响应数据提取     |  ~10   |
| `formula.ts`     | 嵌套资源 URL (/formulas/:id/versions)    |  ~10   |
| `salesman.ts`    | FormData 上传 (头像 multipart)           |   ~8   |
| `ai.ts`          | SSE 流式接口 / 模型列表                  |   ~8   |
| `nutrition.ts`   | nutritionData 结构验证                   |   ~8   |
| `version.ts`     | 版本对比 diff 接口                       |   ~8   |
| `excelImport.ts` | NutritionParseResult 类型 / 文件上传封装 |   ~6   |
| `export.ts`      | 导出任务轮询 / blob 下载                 |   ~6   |
| `weather.ts`     | 城市参数 / 天气数据结构                  |   ~4   |

**API 层总计：约 76 个用例**

---

### 4.3 工具函数测试

#### 4.3.1 时间格式化 — `timeFormat.ts`

| ID  | 测试场景                  | 输入 → 输出                         | 优先级 |
| :-: | :------------------------ | :---------------------------------- | :----: |
| T01 | 标准日期格式化            | `'2024-01-15'` → `'2024年01月15日'` |   P0   |
| T02 | 相对时间（刚刚）          | 当前时间-10s → `'刚刚'`             |   P0   |
| T03 | 相对时间（分钟前）        | 当前时间-5min → `'5分钟前'`         |   P0   |
| T04 | 相对时间（小时前）        | 当前时间-3h → `'3小时前'`           |   P0   |
| T05 | 相对时间（天前）          | 当前时间-2d → `'2天前'`             |   P0   |
| T06 | 边界：null/undefined 输入 | 返回 `'--'` 或空字符串              |   P1   |
| T07 | 时区处理                  | UTC 时间转本地时间正确              |   P2   |

**工具层总计：约 17 个用例**

---

## 五、P2 — 组件测试（Vue Test Utils）

### 5.1 通用组件测试

#### 5.1.1 NutritionExcelImport 组件

| ID  | 测试场景                | 操作步骤               | 断言                                                                    | 优先级 |
| :-: | :---------------------- | :--------------------- | :---------------------------------------------------------------------- | :----: |
| N01 | 默认渲染                | mount 组件             | 显示「营养素 Excel 导入」标题 + 两个按钮                                |   P0   |
| N02 | 下载模板按钮            | 点击下载               | `XLSX.writeFile()` 被调用, 文件名=`营养素导入模板.xlsx`                 |   P0   |
| N03 | 模板内容完整性          | 调用 downloadTemplate  | 生成的 Excel 包含 26 个营养素行 + 表头                                  |   P0   |
| N04 | 上传文件验证 - 非 Excel | 上传 .txt 文件         | 显示「只能上传 Excel 文件」错误                                         |   P0   |
| N05 | 上传文件验证 - 超过 5MB | 上传大文件             | 显示「文件大小不能超过 5MB」错误                                        |   P1   |
| N06 | 解析有效 Excel          | 上传填充了数据的 Excel | parseResult 不为空, validNutrients > 0                                  |   P0   |
| N07 | 解析结果预览表格        | 上传后查看             | 预览表格行数 = 有效营养素数 + 1                                         |   P0   |
| N08 | 未识别字段警告          | 含未知字段的 Excel     | 显示 warning alert, unknownFields 列出名称                              |   P1   |
| N09 | 确认导入 emit           | 点击确认按钮           | `emit('import')` 触发, 数据含 nutritionData/dataSource/confidence/notes |   P0   |
| N10 | 取消导入                | 点击取消按钮           | parseResult 重置为 null                                                 |   P1   |
| N11 | 中文标签映射            | Excel 含「蛋白质」列   | 映射为 key=`protein`, unit=`g`                                          |   P0   |
| N12 | dataSource 提取         | Excel 含「数据来源」列 | result.dataSource 正确提取                                              |   P2   |

**代码示例：**

```typescript
// src/components/__tests__/NutritionExcelImport.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import NutritionExcelImport from "@/components/NutritionExcelImport.vue";
import * as XLSX from "xlsx";

vi.mock("xlsx", () => ({
  default: {
    read: vi.fn(),
    utils: {
      aoa_to_sheet: vi.fn(() => ({})),
      book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
      book_append_sheet: vi.fn(),
      writeFile: vi.fn(),
      sheet_to_json: vi.fn(),
    },
  },
}));

describe("NutritionExcelImport 组件", () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    setActivePinia(createPinia());
    wrapper = mount(NutritionExcelImport, {
      global: {
        stubs: {
          "t-alert": true,
          "t-button": true,
          "t-card": true,
          "t-upload": true,
          "t-tag": true,
          "t-space": true,
          "t-table": true,
        },
      },
    });
  });

  it("N01: 应展示操作说明和两个操作按钮", () => {
    expect(wrapper.find(".guide-title").text()).toContain("营养素 Excel 导入");
    // 验证存在下载和上传按钮
  });

  it("N09: 确认导入应 emit 正确的数据结构", async () => {
    // 模拟解析完成状态
    // 点击确认按钮
    // 验证 emit 数据
    const emitted = wrapper.emitted("import");
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toMatchObject({
      nutritionData: expect.any(Object),
      dataSource: expect.any(String),
      confidence: expect.any(String),
      notes: expect.any(String),
    });
  });
});
```

#### 5.1.2 其他通用组件

| 组件                   | 核心测试点                                                   | 用例数 |
| :--------------------- | :----------------------------------------------------------- | :----: |
| `ExcelImportPanel.vue` | 配方模板下载 / 文件上传 / 解析预览 / 缺失原料提示 / 确认导入 |  ~15   |
| `EmptyState.vue`       | 默认插槽 / 图标自定义 / 描述文案 / 操作按钮插槽              |   ~6   |
| `PageSkeleton.vue`     | 骨架屏数量 / 动画 class / 类型变体                           |   ~4   |

**通用组件总计：约 45 个用例**

---

### 5.2 页面组件测试（按优先级分批）

#### 第一批：核心业务页面（P0 高优先级）

##### MaterialForm.vue — 原料表单（最复杂组件之一）

|  ID  | 测试场景                  | 关键断言                                              | 优先级 |
| :--: | :------------------------ | :---------------------------------------------------- | :----: |
| MF01 | 新建模式渲染              | 标题显示「新增原料」, 表单为空                        |   P0   |
| MF02 | 编辑模式渲染              | 标题显示「编辑原料」, 表单回填数据                    |   P0   |
| MF03 | 必填项验证 - 名称留空     | 提交时显示「请输入原料名称」                          |   P0   |
| MF04 | 必填项验证 - 分类未选     | 提交时显示分类字段错误                                |   P0   |
| MF05 | 营养素分组折叠/展开       | collapse 组件正确响应                                 |   P1   |
| MF06 | 营养素数值录入            | input-number 绑定 nutritionData                       |   P0   |
| MF07 | 能量自动计算              | protein/fat/carbohydrate 变化时 calculatedEnergy 更新 |   P1   |
| MF08 | 营养素清空操作            | 所有字段归零, meta 重置                               |   P1   |
| MF09 | NutritionExcelImport 导入 | 导入后 nutritionData 正确填充                         |   P0   |
| MF10 | AI 智能解析区域           | 模型选择 / 发送按钮 / 结果展示                        |   P1   |
| MF11 | 保存成功                  | API 调用 + 成功提示 + 路由跳转                        |   P0   |
| MF12 | 图片懒加载                | img 标签含 `loading="lazy"`                           |   P2   |

##### FormulaForm.vue — 配方表单

|  ID  | 测试场景          | 关键断言                    | 优先级 |
| :--: | :---------------- | :-------------------------- | :----: |
| FF01 | 新建/编辑模式切换 | 标题和 API 调用不同         |   P0   |
| FF02 | 原料选择器        | 弹窗打开/搜索/选中/数量调整 |   P0   |
| FF03 | 原料去重          | 不能重复添加同一原料        |   P0   |
| FF04 | 总量自动计算      | Σ(原料量) = totalWeight     |   P1   |
| FF05 | 配方保存          | API 参数结构正确            |   P0   |
| FF06 | AI 模型集成       | 与 MaterialForm 类似        |   P1   |

##### MaterialList.vue / FormulaList.vue / SalesmanList.vue

| 共通测试点   | 说明                                             |
| :----------- | :----------------------------------------------- |
| **列表渲染** | 数据为空时 EmptyState, 有数据时表格行数匹配      |
| **搜索功能** | 输入关键词后 filtered 列表正确过滤               |
| **排序功能** | 点击表头后列表按该字段排序                       |
| **分页组件** | 分页按钮颜色使用 `var(--color-primary)` CSS 变量 |
| **分页交互** | 上一页/下一页/页码点击/禁用态                    |
| **删除确认** | 弹出确认对话框, 确认后列表移除                   |
| **新建入口** | 点击新建按钮跳转到对应表单页                     |
| **详情入口** | 点击行进入详情页                                 |

**第一批页面总计：约 138 个用例**

#### 第二批：辅助功能页面（P1 中优先级）

| 页面               | 核心测试点                                         | 用例数 |
| :----------------- | :------------------------------------------------- | :----: |
| `Login.vue`        | 表单验证(空/格式错)/登录成功跳转/注册链接/记住我   |  ~18   |
| `AiAssistant.vue`  | 模型网格渲染/选择切换/对话输入/消息流/图片识别开关 |  ~22   |
| `VersionList.vue`  | 版本卡片列表/发布按钮/当前版本标签/回滚确认        |  ~18   |
| `SalesmanForm.vue` | 头像上传预览/在职离职切换/基础信息表单             |  ~20   |
| `Home.vue`         | 仪表盘统计卡/快捷导航/用户菜单下拉/天气展示        |  ~15   |

**第二批页面总计：约 93 个用例**

#### 第三批：次要页面（P2 低优先级）

| 页面                    | 核心测试点                        | 用例数 |
| :---------------------- | :-------------------------------- | :----: |
| `AccountSettings.vue`   | 修改昵称/头像更改/主题切换预览    |  ~12   |
| `ExportCenter.vue`      | 导出任务列表/进度条/取消/重新下载 |  ~10   |
| `NutritionAnalysis.vue` | 分析图表占位/数据输入             |  ~10   |
| `NutritionProfiles.vue` | 营养标准列表/CRUD                 |   ~8   |
| `VersionCompare.vue`    | 左右版本选择/差异高亮             |   ~8   |
| `Tools.vue`             | 工具卡片网格/各工具入口           |   ~6   |
| `MaterialDetail.vue`    | 详情展示/编辑按钮/返回导航        |   ~8   |
| `FormulaDetail.vue`     | 详情+版本列表/原料清单展示        |  ~10   |
| `SalesmanDetail.vue`    | 详情展示/联系方式                 |   ~6   |
| `Register.vue`          | 注册表单/密码强度/协议勾选        |  ~10   |

**第三批页面总计：约 88 个用例**

**组件测试总计：约 364 个用例**

---

## 六、P3 — E2E 测试（Playwright）

### 6.1 冒烟测试 — 核心业务流程

#### 流程 1：用户认证

```
前置条件：后端服务可用 / 测试账号 admin/admin123 已创建
```

| 步骤 | 操作             | 验证点                                    |
| :--- | :--------------- | :---------------------------------------- |
| 1    | 打开 `/login`    | 页面标题含「登录」, 用户名/密码输入框可见 |
| 2    | 不填内容直接提交 | 表单验证错误提示出现                      |
| 3    | 输入错误密码提交 | 「用户名或密码错误」提示                  |
| 4    | 输入正确凭据提交 | 跳转到 `/formulas`, URL 正确              |
| 5    | 刷新页面         | 仍处于登录态（token 持久化生效）          |
| 6    | 点击登出         | 跳转回 `/login`                           |

#### 流程 2：原料管理完整生命周期

| 步骤 | 操作                        | 验证点                        |
| :--- | :-------------------------- | :---------------------------- |
| 1    | 进入 `/materials/new`       | 表单页面加载完成              |
| 2    | 填写名称「测试原料-A」      | 输入框值正确                  |
| 3    | 选择分类「药材」            | 下拉选中                      |
| 4    | 展开「基础营养成分」        | 折叠面板展开                  |
| 5    | 录入蛋白质 20.5g, 脂肪 8.3g | 数值正确绑定                  |
| 6    | 点击「保存」                | API 调用成功, 成功 Toast 出现 |
| 7    | 自动跳转到原料列表          | URL 为 `/materials`           |
| 8    | 列表中出现「测试原料-A」    | 新记录可见                    |
| 9    | 点击进入详情                | 详情页数据一致                |
| 10   | 返回列表, 删除该原料        | 确认弹窗 → 删除 → 列表移除    |

#### 流程 3：配方管理完整生命周期

| 步骤 | 操作                     | 验证点                         |
| :--- | :----------------------- | :----------------------------- |
| 1    | 进入 `/formulas/new`     | 配方表单加载                   |
| 2    | 填写配方名称和编号       | 基础信息填写                   |
| 3    | 点击「添加原料」         | 原料选择弹窗出现               |
| 4    | 搜索并选中「测试原料-A」 | 原料加入配方                   |
| 5    | 调整用量为 50g           | 数量更新                       |
| 6    | 保存并发布配方           | 状态变为「已发布」             |
| 7    | 进入版本管理             | 版本 v1.0.0 显示为「当前」     |
| 8    | 修改配方名称, 保存新版本 | 出现 v1.0.1, v1.0.0 标记为历史 |

#### 流程 4：AI 助手对话

| 步骤 | 操作                 | 验证点                        |
| :--- | :------------------- | :---------------------------- |
| 1    | 进入 `/ai-assistant` | AI 助手页面加载               |
| 2    | 查看模型网格         | 至少 1 个模型可用             |
| 3    | 选择一个模型         | 模型按钮高亮为激活态          |
| 4    | 在输入框输入问题     | 输入框接受文字                |
| 5    | 点击发送             | 消息气泡出现在对话区          |
| 6    | 等待 AI 回复         | 回复消息出现（或 loading 态） |

#### 流程 5：动态主题切换

| 步骤 | 操作                         | 验证点                                |
| :--- | :--------------------------- | :------------------------------------ |
| 1    | 打开任意列表页（如配方列表） | 观察默认粉色主题                      |
| 2    | 进入 `/settings`             | 设置页加载                            |
| 3    | 切换品牌色为「绿色」         | `data-brand="green"` 属性出现         |
| 4    | 返回配方列表                 | 分页激活按钮变为绿色                  |
| 5    | 切换品牌色为「黄色」         | 分页激活按钮变为黄色                  |
| 6    | 切换暗色模式                 | 背景/文字颜色反转, 对比度符合 WCAG AA |

#### 流程 6：营养素 Excel 导入

| 步骤 | 操作                             | 验证点                           |
| :--- | :------------------------------- | :------------------------------- |
| 1    | 进入原料新增页 `/materials/new`  | 表单加载                         |
| 2    | 找到营养成分区域                 | NutritionExcelImport 可见        |
| 3    | 点击「下载模板」                 | 浏览器下载 `营养素导入模板.xlsx` |
| 4    | 打开模板, 填写部分营养素数据     | 手动填写                         |
| 5    | 保存后回到页面, 点击「上传文件」 | 文件选择器打开                   |
| 6    | 选择刚填写的 Excel               | 解析完成, 预览表格出现           |
| 7    | 检查预览数据                     | 数值与 Excel 一致                |
| 8    | 点击「确认导入」                 | 表单中对应营养素字段自动填充     |

**E2E 测试总计：约 45 个步骤/断言点**

### 6.2 E2E 代码骨架

```typescript
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test.describe("用户认证流程", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("正常登录应跳转到配方列表", async ({ page }) => {
    await page.fill('[data-testid="username"]', "admin");
    await page.fill('[data-testid="password"]', "admin123");
    await page.click('[data-testid="login-btn"]');

    await expect(page).toHaveURL(/\/formulas/, { timeout: 5000 });
    await expect(page.locator(".breadcrumb-current")).toContainText("配方管理");
  });

  test("空表单提交应显示验证错误", async ({ page }) => {
    await page.click('[data-testid="login-btn"]');
    await expect(page.locator(".t-form__error-msg")).first().toBeVisible();
  });

  test("错误凭据应显示失败提示", async ({ page }) => {
    await page.fill('[data-testid="username"]', "wrong");
    await page.fill('[data-testid="password"]', "wrong");
    await page.click('[data-testid="login-btn"]');
    await expect(page.locator(".t-message--error")).toBeVisible();
  });
});

// e2e/material-crud.spec.ts
test.describe("原料管理 CRUD", () => {
  test("完整的新建→查看→删除流程", async ({ page }) => {
    // 登录
    await page.goto("/login");
    await page.fill('[data-testid="username"]', "admin");
    await page.fill('[data-testid="password"]', "admin123");
    await page.click('[data-testid="login-btn"]');
    await expect(page).toHaveURL(/\/formulas/);

    // 新增
    await page.goto("/materials/new");
    await page.waitForLoadState("networkidle");
    await page.fill('[name="name"]', `E2E-Test-${Date.now()}`);
    await page.selectOption('[name="category"]', "herb");
    await page.click('[data-testid="save-btn"]');
    await expect(page.locator(".t-message--success")).toBeVisible({ timeout: 5000 });

    // 验证列表中出现
    await expect(page).toHaveURL(/\/materials/);
    // ... 更多断言
  });
});
```

---

## 七、P4 — 视觉回归 & 性能测试

### 7.1 视觉回归测试（截图对比）

使用 Playwright 的 `expect(page).toHaveScreenshot()` 能力。

| 场景                  | 截图目标                     | 关注点                               |
| :-------------------- | :--------------------------- | :----------------------------------- |
| 分页按钮 - 粉色主题   | `.pagination-btn--active`    | 背景色 = `#ff6b8a`                   |
| 分页按钮 - 绿色主题   | 同上（切换 brand=green 后）  | 背景色 = `#10b981`                   |
| 分页按钮 - 黄色主题   | 同上（切换 brand=yellow 后） | 背景色 = `#f5a623`                   |
| 分页按钮 - 蓝色主题   | 同上（切换 brand=blue 后）   | 背景色 = `#4a90d9`                   |
| 暗色模式 - 配方列表页 | 整体页面                     | 背景 ≈ `#1a1520`, 文字对比度 ≥ 4.5:1 |
| 表单验证错误态        | 错误提示元素                 | 红色边框 + 错误图标 + 提示文案       |
| 移动端 375px          | 整体页面                     | 布局不溢出, 侧边栏隐藏               |
| 移动端 768px          | 整体页面                     | 双列布局适配                         |

### 7.2 性能基准测试

| 指标                                 |           目标值            | 测量方法                                       |
| :----------------------------------- | :-------------------------: | :--------------------------------------------- |
| **LCP** ( Largest Contentful Paint ) |           ≤ 2.5s            | Lighthouse CI / Performance Observer           |
| **FCP** ( First Contentful Paint )   |           ≤ 1.5s            | DevTools Performance panel                     |
| **路由切换延迟**                     |           ≤ 500ms           | `performance.mark()` + `performance.measure()` |
| **首屏 JS bundle (gzip)**            |           ≤ 300KB           | `vite build` 输出分析                          |
| **图片懒加载**                       |    视口外图片不发起请求     | Network tab 验证                               |
| **路由预加载**                       | prefetch 资源在 idle 时下载 | Network tab → Prefetch 状态                    |

### 7.3 可访问性 (A11y) 自动化审计

```bash
# 使用 axe-core 进行可访问性扫描
npx playwright test --reporter=html
# 结合 @axe-core/playwright 插件
```

| 审计项          | 标准       | 目标                                 |
| :-------------- | :--------- | :----------------------------------- |
| 图片 alt 属性   | WCAG 1.1.1 | 所有 `<img>` 有 alt 或 `aria-hidden` |
| 表单 label 关联 | WCAG 1.3.1 | 所有 input 有关联 label              |
| 颜色对比度      | WCAG 1.4.3 | 正文 ≥ 4.5:1, 大字 ≥ 3:1             |
| 键盘可操作性    | WCAG 2.1.1 | 所有交互元素可通过 Tab 到达          |
| 焦点可见性      | WCAG 2.4.7 | focus 状态有明显的视觉指示           |

---

## 八、执行计划（4 周路线图）

### Week 1：基础设施 + Store 单元测试

|  天   | 任务                                                       | 产出              |
| :---: | :--------------------------------------------------------- | :---------------- |
|  D1   | 安装依赖 (vitest/msw/playwright), 创建配置文件, 目录结构   | 可运行 `npm test` |
|  D2   | 编写 setup.ts 全局配置, MSW handlers 基础框架              | Mock 服务就绪     |
| D3-D4 | authStore + materialStore 完整测试                         | ~35 个用例通过    |
|  D5   | formulaStore + salesmanStore 测试                          | ~32 个用例通过    |
| D6-D7 | aiStore + themeStore + paginationStore 测试                | ~37 个用例通过    |
| D8-D9 | versionStore + nutritionStore + exportStore + weatherStore | ~42 个用例通过    |
|  D10  | http.ts 拦截器 + 各 API 模块测试                           | ~76 个用例通过    |

**Week 1 里程碑：单元测试覆盖率 ≥ 50%, Store + API 全覆盖**

### Week 2：组件测试

|   天   | 任务                                                                | 产出     |
| :----: | :------------------------------------------------------------------ | :------- |
| D1-D2  | NutritionExcelImport + ExcelImportPanel + EmptyState + PageSkeleton | ~45 用例 |
| D3-D5  | MaterialForm + FormulaForm（核心表单深度测试）                      | ~75 用例 |
| D6-D7  | MaterialList + FormulaList + SalesmanList（列表页）                 | ~68 用例 |
|   D8   | Login + Register（认证页）                                          | ~28 用例 |
| D9-D10 | AiAssistant + VersionList + SalesmanForm                            | ~60 用例 |

**Week 2 里程碑：组件测试覆盖率 ≥ 55%, 核心页面全覆盖**

### Week 3：E2E + 补充测试

|   天   | 任务                            | 产出             |
| :----: | :------------------------------ | :--------------- |
| D1-D2  | Playwright 6 大冒烟流程脚本编写 | ~45 E2E 步骤     |
|   D3   | E2E 本地调试通过                | 所有冒烟流程绿灯 |
| D4-D5  | 第二/三批次页面组件测试         | ~88 用例         |
|   D6   | 视觉回归截图基线建立            | 基线截图集       |
| D7-D8  | 性能基准采集 + LCP/FCP 测量     | 基准报告         |
| D9-D10 | 覆盖率缺口补充 + 边界用例       | 覆盖率提升       |

**Week 3 里程碑：E2E 冒烟全绿, 总覆盖率 ≥ 65%**

### Week 4：收尾 + CI 集成

|   天   | 任务                                       | 产出              |
| :----: | :----------------------------------------- | :---------------- |
| D1-D2  | CI 流水线配置 (GitHub Actions / GitLab CI) | Push 自动触发测试 |
|   D3   | 覆盖率门禁配置 (不达标则 PR 无法合并)      | 质量门禁          |
| D4-D5  | 测试报告美化 (HTML + Badge)                | README 徽章       |
| D6-D8  | 问题修复 + Flaky test 处理                 | 稳定性 > 95%      |
| D9-D10 | 文档完善 + 知识沉淀                        | 测试维护手册      |

**Week 4 里程碑：CI 自动化, 覆盖率 ≥ 70%**

---

## 九、覆盖率目标

### 阶段性目标

|   阶段   | Statements | Branches | Functions | Lines |  截止时间   |
| :------: | :--------: | :------: | :-------: | :---: | :---------: |
| **MVP**  |    50%     |   40%    |    55%    |  50%  | Week 1 结束 |
| **标准** |    70%     |   60%    |    70%    |  70%  | Week 3 结束 |
| **理想** |    80%+    |   70%+   |   80%+    | 80%+  |  持续优化   |

### 模块覆盖率分配建议

| 模块类型   | 目标覆盖率 | 理由                             |
| :--------- | :--------: | :------------------------------- |
| Stores     |   ≥ 85%    | 纯逻辑, 易于全覆盖               |
| API 层     |   ≥ 75%    | 重点测拦截器和错误路径           |
| Utils      |   ≥ 90%    | 函数粒度小, 应尽量 100%          |
| Components |   ≥ 60%    | UI 交互复杂, template 覆盖成本高 |
| Views      |   ≥ 50%    | 页面级组件, 重点测关键路径       |

---

## 十、风险与缓解措施

| 风险                                         | 概率 | 影响  | 缓解方案                                                                            |
| :------------------------------------------- | :--: | :---: | :---------------------------------------------------------------------------------- |
| **后端 API 未就绪导致测试阻塞**              |  高  | 🔴 高 | 使用 MSW (Mock Service Worker) 完整 Mock 所有 API 端点, 测试不依赖后端              |
| **TDesign 内部行为不稳定导致 flaky test**    |  中  | 🟡 中 | 对 TDesign 组件使用 `global.stubs` 或 `shallowMount` 隔离, 不测试第三方组件内部逻辑 |
| **CSS 动态变量难以做精确断言**               |  中  | 🟡 中 | 使用 `getComputedStyle()` 读取实际计算值; 结合截图对比验证视觉效果                  |
| **缺少真实测试数据导致边界遗漏**             |  中  | 🟡 中 | 使用 faker.js 生成批量随机测试数据, 覆盖空值/超大值/特殊字符                        |
| **E2E 测试执行速度慢影响 CI**                |  低  | 🟡 低 | 仅保留冒烟测试在 CI, 全量 E2E 在 nightly 执行; 使用并行 worker 加速                 |
| **Store 依赖 localStorage/路由等浏览器 API** |  低  | 🟡 低 | 在 setup.ts 中统一 Mock, 所有 Store 测试共享一致的 Mock 环境                        |

---

## 十一、交付物清单

| 序号 | 交付物                       | 格式      | 位置                                      |
| :--: | :--------------------------- | :-------- | :---------------------------------------- |
|  1   | Vitest + Playwright 配置文件 | ts        | `vite.config.ts` / `playwright.config.ts` |
|  2   | 全局测试 setup               | ts        | `src/__tests__/setup.ts`                  |
|  3   | MSW Mock Handlers            | ts        | `src/__tests__/mocks/handlers.ts`         |
|  4   | Store 单元测试               | ts        | `src/stores/__tests__/`                   |
|  5   | API 层测试                   | ts        | `src/api/__tests__/`                      |
|  6   | 工具函数测试                 | ts        | `src/utils/__tests__/`                    |
|  7   | 通用组件测试                 | ts        | `src/components/__tests__/`               |
|  8   | 页面组件测试                 | ts        | `src/views/**/__tests__/`                 |
|  9   | E2E 冒烟测试                 | ts        | `e2e/*.spec.ts`                           |
|  10  | 覆盖率报告                   | html/json | `coverage/`                               |
|  11  | E2E 测试报告                 | html      | `playwright-report/`                      |
|  12  | CI 配置文件                  | yml       | `.github/workflows/test.yml`              |
|  13  | 本文档（测试计划）           | md        | `docs/TEST_PLAN.md`                       |

---

## 附录 A：测试用例总数预估汇总

|         层级         |  模块数  |  用例数  |   占比   |
| :------------------: | :------: | :------: | :------: |
| **单元测试 - Store** |    11    |   ~146   |   23%    |
|  **单元测试 - API**  |    12    |   ~76    |   12%    |
| **单元测试 - Utils** |    2     |   ~17    |    3%    |
| **组件测试 - 通用**  |    4     |   ~45    |    7%    |
| **组件测试 - 页面**  |    18    |   ~364   |   56%    |
|     **E2E 测试**     | 6 个流程 | ~45 步骤 |    —     |
|       **合计**       |  **53**  | **~648** | **100%** |

## 附录 B：常用断言速查

```typescript
// DOM 断言
expect(wrapper.find(".selector").exists()).toBe(true);
expect(wrapper.text()).toContain("期望文本");
expect(wrapper.findAll("tr")).toHaveLength(n);

// Store 断言
expect(store.xxx).toEqual(expectedValue);
expect(store.isLoading).toBe(false);

// API 断言
expect(mockFn).toHaveBeenCalledWith(expectedArgs);
expect(mockFn).toHaveBeenCalledTimes(n);

// E2E 断言
await expect(page).toHaveURL(expectedUrl);
await expect(page.locator(".selector")).toBeVisible();
await expect(page.locator(".selector")).toHaveText(expectedText);
await expect(page).toHaveScreenshot(name.png);

// 异步断言
await waitFor(() => expect(condition).toBe(true));
```
