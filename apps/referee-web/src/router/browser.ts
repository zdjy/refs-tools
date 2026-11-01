import { createWebHistory } from 'vue-router'
import { createAppRouter } from './index'

export const router = createAppRouter(createWebHistory(import.meta.env.BASE_URL))
