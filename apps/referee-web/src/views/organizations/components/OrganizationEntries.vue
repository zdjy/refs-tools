<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ChevronRight, KeyRound, Search, SquarePlus } from '@lucide/vue'

/**
 * 三条通向其他页面的入口，用一块分隔列表而不是三张等大的图标卡，
 * 因为它们是同一个决定（我要去哪里找组织）的三种答案，不是三个独立的功能板块。
 */
const entries = [
  { to: '/organizations/discover#code', icon: KeyRound, title: '输入成员码加入', hint: '组织管理者发给你的成员码，兑换后立即成为成员。' },
  { to: '/organizations/discover', icon: Search, title: '浏览组织目录', hint: '按名称或地区查找已开通的组织，提交加入申请后等待审核。' },
  { to: '/organizations/new', icon: SquarePlus, title: '申请创建组织', hint: '提交资料给平台审核，通过后你将成为组织负责人。' },
] as const
</script>

<template>
  <nav aria-label="加入或创建组织">
    <ul class="m-0 grid list-none gap-0 overflow-hidden rounded-2xl border border-solid border-line bg-surface p-0 shadow-card">
      <li v-for="entry in entries" :key="entry.to" class="border-0 border-b border-solid border-line last:border-b-0">
        <RouterLink :to="entry.to" class="group flex min-h-16 items-center gap-4 p-4 text-ink no-underline transition-colors duration-200 hover:bg-canvas focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-red compact:p-5">
          <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-soft"><component :is="entry.icon" class="size-5" :stroke-width="1.5" aria-hidden="true" /></span>
          <span class="grid min-w-0 flex-1 gap-0.5">
            <span class="text-base font-semibold">{{ entry.title }}</span>
            <span class="text-[13px] leading-relaxed text-body">{{ entry.hint }}</span>
          </span>
          <ChevronRight class="size-5 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" :stroke-width="1.75" aria-hidden="true" />
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
