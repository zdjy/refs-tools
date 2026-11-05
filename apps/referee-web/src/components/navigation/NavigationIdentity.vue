<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useAvatarStore } from '../../stores/avatar'
import { identityPresentation } from '../../navigation/identity.presentation'
import UserMenu from './UserMenu.vue'
withDefaults(defineProps<{ placement?: 'down' | 'up' }>(), { placement: 'down' })
const auth = useAuthStore()
const avatarStore = useAvatarStore()
const identity = computed(() => identityPresentation(auth.status, auth.user?.displayName))
// 会话只带媒体 ID，签名 URL 按需换取；ID 变化（含换账号、换头像）时重新解析。
watch(() => auth.user?.avatarMediaId ?? null, (mediaId) => { void avatarStore.ensure(mediaId) }, { immediate: true })
onMounted(() => { void auth.restore() })
</script>

<template>
  <div class="min-w-0 text-xs text-body">
    <p v-if="identity.kind === 'pending'" class="m-0 leading-relaxed" aria-live="polite">{{ identity.text }}</p>
    <div v-else-if="identity.kind === 'error'" class="flex flex-wrap items-center gap-x-2" aria-live="polite">
      <span>{{ identity.text }}</span>
      <button class="min-h-11 min-w-11 rounded-full border-0 bg-soft px-3 font-medium text-ink transition-all duration-200 hover:bg-sand active:scale-95" @click="auth.restore(true)">重试</button>
    </div>
    <UserMenu v-else-if="identity.kind === 'account'" :name="identity.text" :avatar-url="avatarStore.url" :placement="placement" />
    <div v-else class="flex items-center gap-2">
      <RouterLink to="/login" class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-ink px-4 font-medium text-surface no-underline transition-all duration-200 active:scale-95">登录</RouterLink>
      <RouterLink to="/register" class="inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-ink no-underline hover:text-accent-hover">注册</RouterLink>
    </div>
  </div>
</template>
