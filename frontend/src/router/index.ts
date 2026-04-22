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
      path: "/register",
      name: "Register",
      component: () => import("@/views/auth/Register.vue"),
      meta: { requiresAuth: false },
    },
    {
      path: "/",
      component: () => import("@/views/Home.vue"),
      meta: { requiresAuth: true },
      children: [
        {
          path: "",
          redirect: "/formulas",
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
          path: "formulas",
          name: "FormulaList",
          component: () => import(/* webpackPrefetch: true */ "@/views/formulas/FormulaList.vue"),
          meta: { title: "配方管理" },
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
          meta: { title: "新增配方", hideHeader: true },
        },
        {
          path: "formulas/:id/edit",
          name: "FormulaEdit",
          component: () => import("@/views/formulas/FormulaForm.vue"),
          meta: { title: "编辑配方", hideHeader: true },
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
          path: "versions/formula/:formulaId",
          name: "VersionList",
          component: () => import(/* webpackPrefetch: true */ "@/views/versions/VersionList.vue"),
          meta: { title: "版本管理", hideHeader: true },
        },
        {
          path: "versions/compare/:formulaId",
          name: "VersionCompare",
          component: () => import(/* webpackPrefetch: true */ "@/views/versions/VersionCompare.vue"),
          meta: { title: "版本对比", hideHeader: true },
        },
        {
          path: "exports",
          name: "ExportCenter",
          component: () => import(/* webpackPrefetch: true */ "@/views/exports/ExportCenter.vue"),
          meta: { title: "导出中心" },
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
          component: () => import("@/views/Tools.vue"),
          meta: { title: "工具箱" },
        },
        {
          path: "ai-assistant",
          name: "AiAssistant",
          component: () => import("@/views/ai/AiAssistant.vue"),
          meta: { title: "AI 助手" },
        },
        {
          path: "settings",
          name: "AccountSettings",
          component: () => import("@/views/settings/AccountSettings.vue"),
          meta: { title: "账号设置" },
        },
      ],
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
  } else if ((to.path === "/login" || to.path === "/register") && authStore.isAuthenticated) {
    next("/");
  } else {
    next();
  }
});

export default router;
