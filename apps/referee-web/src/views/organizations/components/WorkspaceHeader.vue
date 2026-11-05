<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import type { MyOrganization } from '@refs-tools/contracts/organization-self'
import { organizationStatusText, roleLabels } from '../organizations.presentation'

/**
 * 工作区页头：组织名用超大字号作为页面的唯一视觉重心，状态与本人角色并排，
 * 非运行状态把原因写在标题下方，用户一眼就知道为什么部分功能不可用。
 */
defineProps<{ organization: MyOrganization }>()
const dot = { pending_review: 'bg-muted', active: 'bg-green', frozen: 'bg-muted', rejected: 'bg-red', dissolved: 'bg-muted' } as const
</script>

<template>
  <header class="grid gap-4 rounded-2xl border border-solid border-line bg-sand p-5 compact:p-8">
    <RouterLink to="/organizations" class="inline-flex min-h-11 w-fit items-center gap-2 text-sm text-ink no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red">
      <ArrowLeft class="size-4" :stroke-width="1.75" aria-hidden="true" />我的组织
    </RouterLink>
    <h1 class="m-0 text-[32px] leading-[1.1] font-bold tracking-[-0.03em] text-ink wrap-anywhere focus:outline-hidden compact:text-5xl tablet:text-6xl">{{ organization.name }}</h1>
    <p class="m-0 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink">
      <span class="inline-flex items-center gap-2 rounded-full border border-solid border-line bg-surface px-3 py-1 text-xs font-medium">
        <span class="size-2 rounded-full" :class="dot[organization.status]" aria-hidden="true"></span>{{ organizationStatusText[organization.status].label }}
      </span>
      <span v-if="organization.region">{{ organization.region }}</span>
      <span v-for="role in organization.roles" :key="role" class="rounded-full border border-solid border-line bg-surface px-3 py-1 text-xs font-medium">{{ roleLabels[role] }}</span>
    </p>
    <p v-if="organizationStatusText[organization.status].hint" role="status" class="m-0 max-w-[64ch] text-sm leading-relaxed text-ink">{{ organizationStatusText[organization.status].hint }}</p>
  </header>
</template>
