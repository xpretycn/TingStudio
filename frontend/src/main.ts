import { createApp } from 'vue'
import { createPinia } from 'pinia'
import TDesign from 'tdesign-vue-next'
import 'tdesign-vue-next/es/style/index.css'
import App from './App.vue'
import router from './router'
import './assets/styles/main.scss'
import { installGlobalErrorHandler, installWindowErrorHandler } from '@/utils/errorHandler'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(TDesign)

installGlobalErrorHandler(app)
installWindowErrorHandler()

app.mount('#app')
