import { createApp } from 'vue'
import './styles/index.css'
import App from './App.vue'
import { applyUiTokens } from './ui-tokens'

applyUiTokens(document.documentElement)
createApp(App).mount('#app')
