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
      component: () => import('@/components/Layout/AppLayout.vue'),
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
          path: 'customers',
          name: 'CustomerList',
          component: () => import('@/views/customers/CustomerList.vue'),
          meta: { title: '客户管理' }
        },
        {
          path: 'customers/new',
          name: 'CustomerNew',
          component: () => import('@/views/customers/CustomerForm.vue'),
          meta: { title: '新增客户' }
        },
        {
          path: 'customers/:id/edit',
          name: 'CustomerEdit',
          component: () => import('@/views/customers/CustomerForm.vue'),
          meta: { title: '编辑客户' }
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
