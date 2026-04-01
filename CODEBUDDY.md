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

**Route pattern**: 8 route modules registered in `routes/index.ts`: auth, materials, formulas, salesmen, versions, exports, nutrition, import. Routes apply `authMiddleware` for protected endpoints.

**Controller pattern**: Each controller imports `query` and `transaction` from database config. Controllers use `const [rows] = query(sql, params)` for SELECTs. All responses follow `{ success: true/false, data?, message? }` format.

**Key files**: `middleware/auth.ts` (JWT verify + `AuthRequest` type extension), `middleware/errorHandler.ts`, `middleware/validate.ts`, `utils/formulaExporter.ts` (Excel export), `utils/formulaPdfExporter.ts` (PDF via pdfkit).

### Frontend (Vue 3 + Pinia + TDesign)

Entry: `frontend/src/main.ts`. Layout: `Home.vue` provides left-sidebar navigation + right content area. All authenticated routes are children of Home.

**API layer** (`src/api/`): `http.ts` creates an Axios instance with `baseURL: '/api'`. The response interceptor **unwraps `response.data.data`** — API calls receive the actual data directly, not the `{ success, data }` wrapper. 401 errors clear tokens and redirect to `/login`. Each domain has its own API module (auth.ts, formula.ts, material.ts, etc.) exporting typed functions.

**State management** (`src/stores/`): Pinia stores mirror backend modules. Each store manages loading state, data, and async fetch/create/update/delete actions. Stores call API modules and assign results directly (no `.data` unwrapping needed — the interceptor handles it).

**Router** (`src/router/index.ts`): All authenticated routes nested under Home.vue. Route guard checks `authStore.isAuthenticated`, redirects to `/login` if not. Lazy-loaded components throughout.

**Styling system**: 
- `assets/styles/design-tokens.scss` — 250+ SCSS variables (colors, spacing, shadows, etc.). Auto-injected globally via Vite `additionalData`. These are **compile-time constants** and do NOT change at runtime.
- `assets/styles/variables.scss` — Additional SCSS variables and imports. Also auto-injected.
- `assets/styles/theme-variables.scss` — **CSS custom properties** for runtime theming. Defines 4 brand colors x 2 modes = 8 variable sets via `[data-brand="pink|yellow|blue|green"][data-theme="dark"]` selectors.
- `assets/styles/tokens.ts` — JS-importable color constants for charts/gradients. Also exports `getThemeTokens(isDark, brandColor)` and `getTDesignTokens(isDark, brandColor)` utility functions.
- `assets/styles/_a11y.scss` — Theme transition animations (300ms smooth transition on theme/brand switch).
- `assets/styles/main.scss` — Global TDesign style overrides (`::v-deep` selectors for buttons, inputs, tables, etc.)

**Theme & Brand Color system** (`stores/theme.ts`):
- Two independent dimensions: `mode` (auto/light/dark) and `brandColor` (pink/yellow/blue/green).
- `auto` mode listens to `prefers-color-scheme` via `matchMedia` and resolves to `light` or `dark`.
- `applyTheme()` sets `<html data-theme="dark" data-brand="blue" data-theme-transitioning>` attributes.
- Both values persisted in `localStorage`: `ting-theme` (mode) and `ting-brand-color` (brand color).
- `index.html` has an inline blocking script to set these attributes before DOM render (FOUT prevention).
- `App.vue` passes dynamic brand color token to `<t-config-provider>` via `getTDesignTokens()`.
- **Convention**: Use CSS `var(--color-primary)` instead of SCSS `$brand-primary` for brand-color-dependent styles in `.vue` files. SCSS variables are compile-time constants and won't switch at runtime. Only Home.vue has been migrated so far; other files still use hardcoded pink SCSS variables (acceptable degradation for non-pink brand colors).

**Component patterns**: Pages follow List → Detail → Form structure. List pages use `t-table` with `table-layout="auto"`. Forms use TDesign `t-form` with `vee-validate` + `yup` rules including `trigger: 'blur'`. All pages use `PageSkeleton` component for loading states.

### Key Conventions

- **No `fixed` columns in tables**: The global sticky header (`position: sticky` on `.t-table__header` in Home.vue) conflicts with TDesign's `getBoundingClientRect` for fixed columns. Use `table-layout="auto"` instead.
- **Database queries return `[rows]`**: The `query()` helper wraps SELECT results in an array for destructuring (`const [list] = query(...)`).
- **API responses auto-unwrapped**: Frontend API calls receive `response.data.data` directly due to Axios interceptor.
- **SCSS variables are global**: Any `.vue` file can use `$brand-pink`, `$cream`, etc. directly without imports. But these are compile-time constants.
- **CSS variables for runtime theming**: For brand-color-dependent styles, prefer `var(--color-primary)` over `$brand-primary`. CSS custom properties resolve at runtime and respect `data-brand`/`data-theme` attributes.
- **TDesign select dropdown z-index**: Always use `:popup-props="{ appendToBody: true }"` on `t-select` and `t-date-picker` inside cards to prevent dropdown being clipped by card overflow.
- **Workspace is npm workspaces**: Root `package.json` uses `--workspace=backend/frontend` for script delegation.
