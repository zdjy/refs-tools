import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/index.css'
import App from './App.vue'
import { router } from './router/browser'
import { applyUiTokens } from './ui-tokens'
import { startAppShell } from './components/ui/useAppUpdate'

applyUiTokens(document.documentElement)
createApp(App).use(createPinia()).use(router).mount('#app')
startAppShell()
