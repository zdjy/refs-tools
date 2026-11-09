<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ChevronRight, SquarePlus, UserPlus } from '@lucide/vue'

/**
 * 两条通向其他页面的入口，用一块分隔列表而不是两张等大的图标卡，
 * 因为它们是同一个决定（加入已有组织还是自己新建）的两种答案，不是两个独立的功能板块。
 * 成员码兑换与目录检索共用同一个加入页：用户通常只知道其中一种凭据，
 * 拆成两个入口只会让他在点进去之前先做一次无意义的自我分类。
 */
const entries = [
  { to: '/organizations/discover', icon: UserPlus, title: '加入新组织', hint: '有成员码就直接兑换；没有就按名称或地区在目录里找，提交申请后等待审核。' },
  { to: '/organizations/new', icon: SquarePlus, title: '申请创建组织', hint: '提交资料给平台审核，通过后你将成为组织负责人。' },
] as const
</script>

<template>
  <nav aria-label="加入新组织或申请创建组织">
    <ul class="m-0 grid list-none gap-0 border-0 border-y border-solid border-line p-0">
      <li v-for="entry in entries" :key="entry.to" class="border-0 border-b border-solid border-line last:border-b-0">
        <RouterLink :to="entry.to" class="group flex min-h-16 items-center gap-4 p-4 text-ink no-underline transition-colors duration-200 hover:bg-canvas focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent compact:p-5">
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
