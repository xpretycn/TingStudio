import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { LoadingPlugin, LoadingDirective } from 'tdesign-vue-next'
import App from './App.vue'
import router from './router'
import './assets/styles/main.scss'
import { installGlobalErrorHandler, installWindowErrorHandler } from '@/utils/errorHandler'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(LoadingPlugin)
app.directive('loading', LoadingDirective)

// 监听 http 层抛出的导航事件，集中由 router 处理，避免 http.ts 反向依赖 router 形成循环
window.addEventListener('app:navigate', (event) => {
  const detail = (event as CustomEvent<{ path: string }>).detail
  if (detail?.path) {
    router.push(detail.path)
  }
})

installGlobalErrorHandler(app)
installWindowErrorHandler()

app.mount('#app')
