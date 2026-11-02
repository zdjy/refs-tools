import './styles/index.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createWebHistory } from 'vue-router'
import { createAdminRouter } from './router'
import { applyUiTokens } from './ui-tokens'
import App from './App.vue'

applyUiTokens(document.documentElement)
createApp(App).use(createPinia()).use(createAdminRouter(createWebHistory(import.meta.env.BASE_URL))).mount('#app')
