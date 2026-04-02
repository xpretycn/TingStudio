# CODEBUDDY.md This file provides guidance to CodeBuddy when working with code in this repository.

## Project Overview

TingStudio is a food formula (herbal medicine) recipe data management platform. Monorepo with separate frontend (Vue 3) and backend (Express + SQLite). Authentication uses JWT with two roles: `admin` and `formulist`. Data isolation: regular users only see their own formulas/materials; admins see all.

## Common Commands

### Root (monorepo orchestration)
- `npm run dev` — Start both frontend and backend concurrently (concurrently)
- `npm run build` — Build both backend (`tsc`) and frontend (`vue-tsc && vite build`)
- `npm run init-db` — Initialize SQLite database schema (runs backend initDatabase.ts)
- `npm run seed` — Populate seed data (30 test users, sample formulas/materials/salesmen)
- `npm run start` — Run production backend (`node dist/index.js`, port 3000)

### Backend (backend/)
- `npm run dev` — Dev server with hot reload (tsx watch, port 3000)
- `npm run build` — Compile TypeScript to dist/
- `npm run init-db` — Initialize DB tables (13 tables via init.sql)
- `npm run seed` — Seed data
- `npm run import-nutrition` — Import nutrition data from Excel

### Frontend (frontend/)
- `npm run dev` — Vite dev server (port 5173, proxies /api to localhost:3000)
- `npm run build` — Type-check then build (`vue-tsc && vite build`)
- `npm run preview` — Preview production build

## Architecture

### Backend (Express + better-sqlite3)

Entry: `backend/src/index.ts` — Bootstrap Express with helmet, cors, compression, morgan. All routes mounted under `/api`.

**Database layer** (`config/database.ts`): Uses `better-sqlite3` with WAL mode. The `query()` helper wraps `prepare().all()` for SELECTs (returns `[rows]` array destructurable pattern) and `prepare().run()` for mutations. Use `transaction()` for multi-statement atomicity. Schema defined in `scripts/init.sql` (13 tables).

**AI service layer** (`services/ai/AIService.ts`): Unified OpenAI-compatible chat completion interface supporting three providers: DashScope (Alibaba Qwen), Zhipu GLM, and DeepSeek. Each provider has a text model and optional vision model (`visionModel` field). The `chatCompletion()` method handles provider-specific logic (e.g., skipping `response_format` for Zhipu vision models). Configuration via environment variables: `AI_DASHSCOPE_API_KEY`, `AI_ZHIPU_API_KEY`, `AI_DEEPSEEK_API_KEY`. The AI controller (`controllers/aiController.ts`) provides three endpoints: `POST /api/ai/parse-formula` (file upload + AI parsing with material fuzzy matching), `POST /api/ai/natural-search` (NL2SQL with safety validation via `sqlValidator.ts`), and `GET /api/ai/models` (available model list).

**Route pattern**: 9 route modules registered in `routes/index.ts`: auth, materials, formulas, salesmen, versions, exports, nutrition, import, ai. Routes apply `authMiddleware` for protected endpoints.

**Controller pattern**: Each controller imports `query` and `transaction` from database config. Controllers use `const [rows] = query(sql, params)` for SELECTs. All responses follow `{ success: true/false, data?, message? }` format.

**Key files**: `middleware/auth.ts` (JWT verify + `AuthRequest` type extension), `middleware/errorHandler.ts`, `middleware/validate.ts`, `utils/formulaExporter.ts` (Excel export), `utils/formulaPdfExporter.ts` (PDF via pdfkit), `utils/sqlValidator.ts` (SQL whitelist for AI NL2SQL), `services/ai/AIService.ts` (unified OpenAI-compatible AI service with multi-provider switching), `services/ai/prompts.ts` (formula parsing + NL2SQL prompt templates).

**ESM project**: Backend uses `"type": "module"` in package.json. All internal imports must include `.js` extension (e.g., `import { query } from '../config/database.js'`).

### Frontend (Vue 3 + Pinia + TDesign)

Entry: `frontend/src/main.ts`. Layout: `Home.vue` provides left-sidebar navigation + right content area. All authenticated routes are children of Home.

**API layer** (`src/api/`): `http.ts` creates an Axios instance with `baseURL: '/api'`. The response interceptor **unwraps `response.data.data`** — API calls receive the actual data directly, not the `{ success, data }` wrapper. 401 errors clear tokens and redirect to `/login`. Each domain has its own API module (auth.ts, formula.ts, material.ts, etc.) exporting typed functions. **Exception**: `weather.ts` uses its own independent Axios instance (no base URL proxy) to call QWeather API directly from the browser — it does NOT go through the backend.

**State management** (`src/stores/`): Pinia stores mirror backend modules. Each store manages loading state, data, and async fetch/create/update/delete actions. Stores call API modules and assign results directly (no `.data` unwrapping needed — the interceptor handles it). **Exception**: `weather.ts` store manages weather state (loading/error/rate-limit), 30-minute in-memory cache, Geolocation auto-positioning (10s timeout), and city persistence via localStorage (`ting-weather-city`). Call `weatherStore.init()` in `onMounted` to trigger auto-location + cached weather fetch.

**Router** (`src/router/index.ts`): All authenticated routes nested under Home.vue. Route guard checks `authStore.isAuthenticated`, redirects to `/login` if not. Lazy-loaded components throughout.

**Path alias**: `@` resolves to `frontend/src/` (configured in both `vite.config.ts` and `tsconfig.json`).

**Styling system**:
- `assets/styles/design-tokens.scss` — 250+ SCSS variables (colors, spacing, shadows, etc.). Auto-injected globally via Vite `additionalData`. These are **compile-time constants** and do NOT change at runtime.
- `assets/styles/variables.scss` — Compatibility entry that `@forward`s design-tokens.scss + provides backward-compatible aliases (`$primary-color` → `$brand-primary`, etc.) + stagger mixin. Also auto-injected via Vite `additionalData`.
- `assets/styles/theme-variables.scss` — **CSS custom properties** for runtime theming. Defines 4 brand colors x 2 modes = 8 variable sets via `[data-brand="pink|yellow|blue|green"][data-theme="dark"]` selectors.
- `assets/styles/tokens.ts` — JS-importable color constants for charts/gradients. Also exports `getThemeTokens(isDark, brandColor)` and `getTDesignTokens(isDark, brandColor)` utility functions.
- `assets/styles/_a11y.scss` — Theme transition animations (300ms smooth transition on theme/brand switch).
- `assets/styles/main.scss` — Global TDesign style overrides (`::v-deep` selectors for buttons, inputs, tables, etc.)

**Theme & Brand Color system** (`stores/theme.ts`):
- Two independent dimensions: `mode` (auto/light/dark) and `brandColor` (pink/yellow/blue/green).
- `auto` mode listens to `prefers-color-scheme` via `matchMedia` and resolves to `light` or `dark`.
- `applyToDOM()` sets `<html data-theme="dark" data-brand="blue" data-theme-transitioning>` attributes.
- Both values persisted in `localStorage`: `ting-theme` (mode) and `ting-brand-color` (brand color).
- `index.html` has an inline blocking script to set these attributes before DOM render (FOUT prevention).
- `App.vue` passes dynamic brand color token to `<t-config-provider>` via `getTDesignTokens()`.
- **Convention**: Use CSS `var(--color-primary)` instead of SCSS `$brand-primary` for brand-color-dependent styles in `.vue` files. SCSS variables are compile-time constants and won't switch at runtime. Only Home.vue has been migrated so far; other files still use hardcoded pink SCSS variables (acceptable degradation for non-pink brand colors).

**Component patterns**: Pages follow List → Detail → Form structure. List pages use `t-table` with `table-layout="auto"`. Forms use TDesign `t-form` with `vee-validate` + `yup` rules including `trigger: 'blur'`. All pages use `PageSkeleton` component for loading states.

**Build optimization**: Vite config splits vendor chunks into three groups: `vendor-tdesign`, `vendor-vue` (vue/vue-router/pinia), and `vendor-utils` (all other node_modules). Gzip compression enabled for assets > 1KB.

### Key Conventions

- **No `fixed` columns in tables**: The global sticky header (`position: sticky` on `.t-table__header` in Home.vue) conflicts with TDesign's `getBoundingClientRect` for fixed columns. Use `table-layout="auto"` instead.
- **Database queries return `[rows]`**: The `query()` helper wraps SELECT results in an array for destructuring (`const [list] = query(...)`).
- **API responses auto-unwrapped**: Frontend API calls receive `response.data.data` directly due to Axios interceptor.
- **SCSS variables are global**: Any `.vue` file can use `$brand-primary`, `$text-primary`, `$space-4`, etc. directly without imports. But these are compile-time constants.
- **CSS variables for runtime theming**: For brand-color-dependent styles, prefer `var(--color-primary)` over `$brand-primary`. CSS custom properties resolve at runtime and respect `data-brand`/`data-theme` attributes.
- **TDesign select dropdown z-index**: Always use `:popup-props="{ appendToBody: true }"` on `t-select` and `t-date-picker` inside cards to prevent dropdown being clipped by card overflow.
- **Workspace is npm workspaces**: Root `package.json` uses `--workspace=backend/frontend` for script delegation.
- **No test framework configured**: There are no unit or integration tests. Use `npm run build` (vue-tsc + tsc) as the primary validation.
- **QWeather API**: Free subscription uses `devapi.qweather.com/v7` for both Geo and Weather endpoints. Geo path is `/geo/city/lookup` (NOT the deprecated `geoapi.qweather.com/v2`). API key configured in `frontend/.env` as `VITE_QWEATHER_KEY`.
- **Auth profile API**: `PUT /api/auth/me` updates user profile fields (display_name, avatar, bio, email, phone) with uniqueness validation. `PUT /api/auth/change-password` verifies old password before updating. `GET /api/auth/me` returns full user info including profile fields.
