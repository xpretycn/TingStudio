import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { LoadingPlugin, LoadingDirective } from 'tdesign-vue-next'
import App from './App.vue'
import router from './router'
import './assets/styles/main.scss'
import { installGlobalErrorHandler, installWindowErrorHandler } from '@/utils/errorHandler'
import { resetNetworkErrorState } from '@/api/http'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(LoadingPlugin)
app.directive('loading', LoadingDirective)

// 监听 http 层抛出的导航事件，集中由 router 处理，避免 http.ts 反向依赖 router 形成循环
window.addEventListener('app:navigate', (event) => {
  const detail = (event as CustomEvent<{ path: string; replace?: boolean }>).detail
  if (detail?.path) {
    if (detail.replace) {
      router.replace(detail.path)
    } else {
      router.push(detail.path)
    }
  }
})

// 离开 /server-error 页面时重置网络错误去重状态，允许再次触发错误导航
router.afterEach((to) => {
  if (to.path !== '/server-error') {
    resetNetworkErrorState()
  }
})

installGlobalErrorHandler(app)
installWindowErrorHandler()

app.mount('#app')
