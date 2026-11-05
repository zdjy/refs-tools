<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { LogIn } from '@lucide/vue'
import UiLoadingRegion from '../../../components/ui/UiLoadingRegion.vue'
import { linkButton } from '../organizations.presentation'

/** 组织数据都是私有的：确认登录前显示骨架，匿名时给出登录入口而不是空列表。 */
defineProps<{ status: 'unknown' | 'loading' | 'authenticated' | 'anonymous' | 'error' }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <UiLoadingRegion v-if="status === 'unknown' || status === 'loading'" :loading="true" label="确认登录状态" :lines="3" @retry="$emit('retry')" />
  <section v-else class="grid max-w-[520px] gap-4 rounded-2xl border border-solid border-line bg-surface p-6 shadow-card">
    <h2 class="m-0 text-xl text-ink">{{ status === 'error' ? '暂时无法确认登录状态' : '登录后管理你的组织' }}</h2>
    <p class="m-0 text-sm leading-relaxed text-body">
      {{ status === 'error' ? '网络可能不稳定，请重试连接。' : '创建或加入组织、回应邀请、管理成员都需要先登录并验证邮箱。' }}
    </p>
    <div class="flex flex-wrap gap-3">
      <button v-if="status === 'error'" type="button" :class="linkButton.primary" @click="$emit('retry')">重试连接</button>
      <RouterLink v-else to="/login" :class="linkButton.primary"><LogIn class="size-4" :stroke-width="1.75" aria-hidden="true" />前往登录</RouterLink>
    </div>
  </section>
</template>
