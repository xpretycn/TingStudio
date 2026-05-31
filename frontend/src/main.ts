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

installGlobalErrorHandler(app)
installWindowErrorHandler()

app.mount('#app')
