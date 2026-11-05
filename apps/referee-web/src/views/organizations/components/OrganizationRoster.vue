<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowUpRight, ChevronRight } from '@lucide/vue'
import type { MyOrganization } from '@refs-tools/contracts/organization-self'
import { vReveal } from '../../../components/ui/motion/reveal'
import { organizationStatusText, roleLabels } from '../organizations.presentation'

/**
 * 名册：本人所在的每个组织一行，首字母方块作为稳定的视觉锚点。
 * 可进入工作区的（有成员关系）渲染为链接；仅负责人的待审核/被驳回申请渲染为静态说明，
 * 并写清原因与下一步，而不是只给一个状态标签。
 * 错开入场最多前 6 行，长列表后段行不因序号累积出长时间延迟。
 */
defineProps<{ items: readonly MyOrganization[] }>()
const dot = { pending_review: 'bg-muted', active: 'bg-green', frozen: 'bg-muted', rejected: 'bg-danger', dissolved: 'bg-muted' } as const
</script>

<template>
  <ul id="roster-list" class="m-0 grid list-none gap-0 border-0 border-y border-solid border-line p-0">
    <li v-for="(item, index) in items" :key="item.id" v-reveal="{ delay: Math.min(index, 6) * 0.05, y: 14 }" class="border-0 border-b border-solid border-line last:border-b-0">
      <component :is="item.membership ? RouterLink : 'div'" v-bind="item.membership ? { to: `/organizations/${item.id}` } : {}"
        class="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4 text-ink no-underline compact:p-5"
        :class="item.membership ? 'transition-colors duration-200 hover:bg-canvas focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent' : ''">
        <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-sand text-xl font-bold text-ink compact:size-14 compact:text-2xl" aria-hidden="true">{{ item.name.slice(0, 1) }}</span>
        <span class="grid min-w-0 gap-1.5">
          <span class="text-lg leading-snug font-bold tracking-tight wrap-anywhere compact:text-xl">{{ item.name }}</span>
          <span class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-body">
            <span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full" :class="dot[item.status]" aria-hidden="true"></span>{{ item.membership?.status === 'pending' ? '加入申请待审核' : organizationStatusText[item.status].label }}</span>
            <span v-if="item.region">{{ item.region }}</span>
            <span v-for="role in item.roles" :key="role" class="rounded-full border border-solid border-line bg-soft px-2.5 py-0.5 text-xs font-medium text-ink">{{ roleLabels[role] }}</span>
          </span>
          <span v-if="organizationStatusText[item.status].hint && !item.membership" class="text-[13px] leading-relaxed text-body">{{ organizationStatusText[item.status].hint }}</span>
          <span v-if="item.governanceReason && item.status === 'rejected'" class="text-[13px] leading-relaxed text-ink">平台说明：{{ item.governanceReason }}</span>
        </span>
        <ChevronRight v-if="item.membership" class="size-5 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink motion-reduce:transition-none" :stroke-width="1.75" aria-hidden="true" />
        <RouterLink v-else-if="item.status === 'rejected'" to="/organizations/new"
          class="inline-flex min-h-11 items-center gap-1 rounded-full border border-solid border-line bg-soft px-4 text-sm font-medium text-ink no-underline hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">重新申请<ArrowUpRight class="size-4" :stroke-width="1.75" aria-hidden="true" /></RouterLink>
      </component>
    </li>
  </ul>
</template>
