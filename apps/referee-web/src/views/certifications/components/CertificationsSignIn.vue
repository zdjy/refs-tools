<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { LogIn } from '@lucide/vue'
import UiLoadingRegion from '../../../components/ui/UiLoadingRegion.vue'

/** 认证记录与材料均为私有数据：确认登录前显示加载态，匿名时只给登录入口。 */
defineProps<{ status: 'unknown' | 'loading' | 'authenticated' | 'anonymous' | 'error' }>()
defineEmits<{ retry: [] }>()
const primary = 'inline-flex min-h-11 items-center gap-2 rounded-full border-0 bg-ink px-5 text-sm font-medium text-surface no-underline transition-all duration-200 hover:bg-black active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
</script>

<template>
  <UiLoadingRegion v-if="status === 'unknown' || status === 'loading'" :loading="true" label="确认登录状态" :lines="3" @retry="$emit('retry')" />
  <section v-else class="grid max-w-[520px] gap-4 border-0 border-t border-solid border-ink pt-6">
    <h2 class="m-0 text-xl text-ink">{{ status === 'error' ? '暂时无法确认登录状态' : '登录后管理认证与资质' }}</h2>
    <p class="m-0 text-sm leading-relaxed text-body">
      {{ status === 'error' ? '网络可能不稳定，请重试连接。' : '提交认证、补件、查看材料与申诉都需要先登录并验证邮箱。' }}
    </p>
    <div class="flex flex-wrap gap-3">
      <button v-if="status === 'error'" type="button" :class="primary" @click="$emit('retry')">重试连接</button>
      <RouterLink v-else to="/login" :class="primary"><LogIn class="size-4" :stroke-width="1.75" aria-hidden="true" />前往登录</RouterLink>
    </div>
  </section>
</template>
