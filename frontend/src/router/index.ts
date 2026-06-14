import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "Login",
      component: () => import("@/views/auth/Login.vue"),
      meta: { requiresAuth: false },
    },

    {
      path: "/server-error",
      name: "ServerError",
      component: () => import("@/views/errors/ServerError.vue"),
      meta: { requiresAuth: false, hideHeader: true },
    },
    {
      path: "/404",
      name: "NotFound",
      component: () => import("@/views/errors/NotFound.vue"),
      meta: { requiresAuth: false, hideHeader: true },
    },
    {
      path: "/",
      component: () => import("@/views/Home.vue"),
      meta: { requiresAuth: true },
      children: [
        {
          path: "",
          redirect: "/dashboard",
        },
        {
          path: "dashboard",
          name: "Dashboard",
          component: () => import("@/views/dashboard/Dashboard.vue"),
          meta: { title: "工作台" },
        },

        {
          path: "materials",
          name: "MaterialList",
          component: () => import(/* webpackPrefetch: true */ "@/views/materials/MaterialList.vue"),
          meta: { title: "原料管理" },
        },
        {
          path: "materials/:id",
          name: "MaterialDetail",
          component: () => import(/* webpackPrefetch: true */ "@/views/materials/MaterialDetail.vue"),
          meta: { title: "原料详情", hideHeader: true },
        },
        {
          path: "materials/new",
          name: "MaterialNew",
          component: () => import(/* webpackPrefetch: true */ "@/views/materials/MaterialForm.vue"),
          meta: { title: "新增原料", hideHeader: true },
        },
        {
          path: "materials/:id/edit",
          name: "MaterialEdit",
          component: () => import("@/views/materials/MaterialForm.vue"),
          meta: { title: "编辑原料", hideHeader: true },
        },
        {
          path: "materials/:id/versions",
          name: "MaterialVersions",
          component: () => import(/* webpackPrefetch: true */ "@/views/materials/MaterialVersions.vue"),
          meta: { title: "版本历史", hideHeader: true },
        },
        {
          path: "materials/:id/versions/compare",
          name: "MaterialVersionCompare",
          component: () => import("@/views/materials/MaterialVersionCompare.vue"),
          meta: { title: "版本对比", hideHeader: true },
        },
        {
          path: "materials/:id/nutrition-sources",
          name: "NutritionSourcesCompare",
          component: () => import(/* webpackPrefetch: true */ "@/views/materials/NutritionSourcesCompare.vue"),
          meta: { title: "营养数据来源对比", hideHeader: true },
        },
        {
          path: "formulas/compare",
          name: "FormulaCompare",
          component: () => import(/* webpackPrefetch: true */ "@/views/formulas/FormulaCompare.vue"),
          meta: { title: "配方对比", hideHeader: true },
        },
        {
          path: "formulas",
          name: "FormulaList",
          component: () => import(/* webpackPrefetch: true */ "@/views/formulas/FormulaList.vue"),
          meta: { title: "配方管理", keepAlive: true },
        },
        {
          path: "formulas/:id",
          name: "FormulaDetail",
          component: () => import(/* webpackPrefetch: true */ "@/views/formulas/FormulaDetail.vue"),
          meta: { title: "配方详情", hideHeader: true },
        },
        {
          path: "formulas/new",
          name: "FormulaNew",
          component: () => import(/* webpackPrefetch: true */ "@/views/formulas/FormulaForm.vue"),
          meta: { title: "新增配方", hideHeader: true, extraBottom: true },
        },
        {
          path: "formulas/quick",
          name: "QuickFormula",
          component: () => import("@/views/formulas/quick-formula/QuickFormulaPanel.vue"),
          meta: { title: "快速录入", hideHeader: true, fullBleed: true, extraBottom: true },
        },
        {
          path: "formulas/:id/edit",
          name: "FormulaEdit",
          component: () => import("@/views/formulas/FormulaForm.vue"),
          meta: { title: "编辑配方", hideHeader: true, extraBottom: true },
        },
        {
          path: "salesmen",
          name: "SalesmanList",
          component: () => import(/* webpackPrefetch: true */ "@/views/salesmen/SalesmanList.vue"),
          meta: { title: "业务员管理" },
        },
        {
          path: "salesmen/new",
          name: "SalesmanNew",
          component: () => import("@/views/salesmen/SalesmanForm.vue"),
          meta: { title: "新增业务员", hideHeader: true },
        },
        {
          path: "salesmen/:id/edit",
          name: "SalesmanEdit",
          component: () => import("@/views/salesmen/SalesmanForm.vue"),
          meta: { title: "编辑业务员", hideHeader: true },
        },
        {
          path: "salesmen/:id",
          name: "SalesmanDetail",
          component: () => import(/* webpackPrefetch: true */ "@/views/salesmen/SalesmanDetail.vue"),
          meta: { title: "业务员详情", hideHeader: true },
        },
        {
          path: "sales",
          name: "SalesAnalysis",
          component: () => import(/* webpackPrefetch: true */ "@/views/sales/SalesAnalysis.vue"),
          meta: { title: "销量分析" },
        },
        {
          path: "reports",
          name: "ReportCenter",
          component: () => import(/* webpackPrefetch: true */ "@/views/reports/ReportCenter.vue"),
          meta: { title: "报告中心" },
        },
        {
          path: "reports/weekly",
          name: "WeeklyReport",
          component: () => import(/* webpackPrefetch: true */ "@/views/reports/WeeklyReport.vue"),
          meta: { title: "周报详情", hideHeader: true },
        },
        {
          path: "reports/weekly/:id",
          name: "WeeklyReportDetail",
          component: () => import(/* webpackPrefetch: true */ "@/views/reports/WeeklyReport.vue"),
          meta: { title: "周报详情", hideHeader: true },
        },
        {
          path: "reports/monthly",
          name: "MonthlyReport",
          component: () => import(/* webpackPrefetch: true */ "@/views/reports/MonthlyReport.vue"),
          meta: { title: "月报详情", hideHeader: true },
        },
        {
          path: "reports/monthly/:id",
          name: "MonthlyReportDetail",
          component: () => import(/* webpackPrefetch: true */ "@/views/reports/MonthlyReport.vue"),
          meta: { title: "月报详情", hideHeader: true },
        },
        {
          path: "reports/generate",
          name: "ReportGenerate",
          component: () => import(/* webpackPrefetch: true */ "@/views/reports/ReportGenerate.vue"),
          meta: { title: "生成报告", hideHeader: true },
        },
        {
          path: "reports/compare",
          name: "ReportCompare",
          component: () => import(/* webpackPrefetch: true */ "@/views/reports/ReportCompare.vue"),
          meta: { title: "报告对比", hideHeader: true },
        },
        {
          path: "versions/formula/:formulaId",
          name: "FormulaVersions",
          component: () => import(/* webpackPrefetch: true */ "@/views/formulas/versions/FormulaVersions.vue"),
          meta: { title: "版本管理", hideHeader: true },
        },
        {
          path: "versions/compare/:formulaId",
          name: "VersionCompare",
          component: () => import(/* webpackPrefetch: true */ "@/views/formulas/versions/VersionCompare.vue"),
          meta: { title: "版本对比", hideHeader: true },
        },
        {
          path: "nutrition",
          name: "NutritionAnalysis",
          component: () => import(/* webpackPrefetch: true */ "@/views/nutrition/NutritionAnalysis.vue"),
          meta: { title: "营养分析" },
        },
        {
          path: "nutrition/profiles",
          name: "NutritionProfiles",
          component: () => import(/* webpackPrefetch: true */ "@/views/nutrition/NutritionProfiles.vue"),
          meta: { title: "营养标准" },
        },
        {
          path: "tools",
          name: "Tools",
          component: () => import("@/views/system/Toolbox.vue"),
          meta: { title: "工具箱" },
        },
        {
          path: "tools/ai-assistant",
          name: "AiAssistant",
          component: () => import("@/views/ai/AiWorkspace.vue"),
          meta: { title: "AI 助手工作台", hideHeader: true, fullBleed: true, requiresAdmin: true },
        },
        {
          path: "ai-overview",
          name: "AiOverview",
          component: () => import("@/views/ai/AiOverview.vue"),
          meta: { title: "AI 概览" },
        },
        {
          path: "smart-tools",
          name: "SmartTools",
          component: () => import("@/views/ai/SmartTools.vue"),
          meta: { title: "智能工具" },
        },
        {
          path: "system/config",
          name: "SystemConfig",
          component: () => import("@/views/system/SystemConfig.vue"),
          meta: { title: "系统管理", requiresAdmin: true },
        },
        {
          path: "model-management",
          name: "ModelManagement",
          component: () => import("@/views/system/ModelManagement.vue"),
          meta: { title: "模型管理", requiresAdmin: true },
        },
        {
          path: "settings",
          name: "AccountSettings",
          component: () => import("@/views/settings/AccountSettings.vue"),
          meta: { title: "账号设置", hideHeader: true },
        },
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      name: "NotFoundCatchAll",
      component: () => import("@/views/errors/NotFound.vue"),
      meta: { requiresAuth: false, hideHeader: true },
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();

  if (!authStore.user) {
    authStore.initAuth();
  }

  if (to.meta.requiresAuth !== false && !authStore.isAuthenticated) {
    next("/login");
  } else if (to.path === "/login" && authStore.isAuthenticated) {
    next("/");
  } else if (to.meta.requiresAdmin && authStore.user?.role !== "admin") {
    next("/");
  } else {
    next();
  }
});

export default router;
