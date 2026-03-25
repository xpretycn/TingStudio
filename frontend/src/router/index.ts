import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/auth/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/auth/Register.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      component: () => import('@/views/Home.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/recent-formulas'
        },
        {
          path: 'recent-formulas',
          name: 'RecentFormulas',
          component: () => import('@/views/formulas/RecentFormulas.vue'),
          meta: { title: '最近配方' }
        },

        {
          path: 'materials',
          name: 'MaterialList',
          component: () => import('@/views/materials/MaterialList.vue'),
          meta: { title: '原料管理' }
        },
        {
          path: 'materials/new',
          name: 'MaterialNew',
          component: () => import('@/views/materials/MaterialForm.vue'),
          meta: { title: '新增原料' }
        },
        {
          path: 'materials/:id/edit',
          name: 'MaterialEdit',
          component: () => import('@/views/materials/MaterialForm.vue'),
          meta: { title: '编辑原料' }
        },
        {
          path: 'formulas',
          name: 'FormulaList',
          component: () => import('@/views/formulas/FormulaList.vue'),
          meta: { title: '配方管理' }
        },
        {
          path: 'formulas/new',
          name: 'FormulaNew',
          component: () => import('@/views/formulas/FormulaForm.vue'),
          meta: { title: '新增配方' }
        },
        {
          path: 'formulas/:id/edit',
          name: 'FormulaEdit',
          component: () => import('@/views/formulas/FormulaForm.vue'),
          meta: { title: '编辑配方' }
        },
        {
          path: 'salesmen',
          name: 'SalesmanList',
          component: () => import('@/views/salesmen/SalesmanList.vue'),
          meta: { title: '业务员管理' }
        },
        {
          path: 'salesmen/new',
          name: 'SalesmanNew',
          component: () => import('@/views/salesmen/SalesmanForm.vue'),
          meta: { title: '新增业务员' }
        },
        {
          path: 'salesmen/:id/edit',
          name: 'SalesmanEdit',
          component: () => import('@/views/salesmen/SalesmanForm.vue'),
          meta: { title: '编辑业务员' }
        },
        {
          path: 'salesmen/:id',
          name: 'SalesmanDetail',
          component: () => import('@/views/salesmen/SalesmanDetail.vue'),
          meta: { title: '业务员详情' }
        },
        {
          path: 'versions/formula/:formulaId',
          name: 'VersionList',
          component: () => import('@/views/versions/VersionList.vue'),
          meta: { title: '版本管理' }
        },
        {
          path: 'versions/compare/:formulaId',
          name: 'VersionCompare',
          component: () => import('@/views/versions/VersionCompare.vue'),
          meta: { title: '版本对比' }
        },
        {
          path: 'exports',
          name: 'ExportCenter',
          component: () => import('@/views/exports/ExportCenter.vue'),
          meta: { title: '导出中心' }
        },
        {
          path: 'nutrition',
          name: 'NutritionAnalysis',
          component: () => import('@/views/nutrition/NutritionAnalysis.vue'),
          meta: { title: '营养分析' }
        },
        {
          path: 'nutrition/profiles',
          name: 'NutritionProfiles',
          component: () => import('@/views/nutrition/NutritionProfiles.vue'),
          meta: { title: '营养标准' }
        },
        {
          path: 'tools',
          name: 'Tools',
          component: () => import('@/views/Tools.vue'),
          meta: { title: '工具箱' }
        }
      ]
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (!authStore.user) {
    authStore.initAuth()
  }

  if (to.meta.requiresAuth !== false && !authStore.isAuthenticated) {
    next('/login')
  } else if ((to.path === '/login' || to.path === '/register') && authStore.isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router
