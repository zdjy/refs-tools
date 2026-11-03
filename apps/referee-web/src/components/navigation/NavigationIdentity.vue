<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { identityPresentation } from '../../navigation/identity.presentation'
const auth = useAuthStore()
const identity = computed(() => identityPresentation(auth.status, auth.user?.displayName))
onMounted(() => { void auth.restore() })
</script>

<template>
  <div class="min-w-0 text-xs text-body" aria-live="polite">
    <p v-if="identity.kind === 'pending'" class="m-0 leading-relaxed">{{ identity.text }}</p>
    <div v-else-if="identity.kind === 'error'" class="flex flex-wrap items-center gap-x-2">
      <span>{{ identity.text }}</span>
      <button class="min-h-11 min-w-11 rounded-full border-0 bg-soft px-3 font-medium text-ink transition-all duration-200 hover:bg-sand active:scale-95" @click="auth.restore(true)">重试</button>
    </div>
    <RouterLink v-else-if="identity.kind === 'account'" to="/account" class="inline-flex min-h-11 min-w-11 items-center gap-1 py-1 text-ink no-underline hover:text-red"><span class="min-w-0 wrap-anywhere">{{ identity.text }}</span><span class="shrink-0"> / 账号</span></RouterLink>
    <div v-else class="flex items-center gap-2">
      <RouterLink to="/login" class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-ink px-4 font-medium text-surface no-underline transition-all duration-200 active:scale-95">登录</RouterLink>
      <RouterLink to="/register" class="hidden min-h-11 min-w-11 items-center justify-center px-2 text-ink no-underline hover:text-red tablet:inline-flex">注册</RouterLink>
    </div>
  </div>
</template>
