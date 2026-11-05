<script setup lang="ts">
import { ArrowUpRight, ChevronDown } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import NavigationIcon from '../../../components/navigation/NavigationIcon.vue'
import { editorialNotice } from '../../../content/editorial'
import { modules } from '../../../navigation/modules'
import { moduleStatus, moduleTileClass } from '../../../navigation/navigation.presentation'
import { communityEntries, communityGuides } from '../community.presentation'
</script>

<template>
  <!-- 侧栏平铺：小标题下一条墨色细线，条目间用浅色细线分隔，不套卡片。 -->
  <aside class="grid min-w-0 content-start gap-8 compact:grid-cols-2 tablet:grid-cols-1" aria-label="工具与社区资料">
    <section aria-labelledby="guides-title">
      <h2 id="guides-title" class="mt-0 mb-0 border-0 border-b border-solid border-ink px-1 pb-2 text-[13px] font-semibold text-body">案头导读</h2>
      <ul class="m-0 list-none p-0">
        <li v-for="article in communityGuides" :key="article.id" class="border-0 border-b border-solid border-line last:border-b-0">
          <RouterLink :to="article.path" class="flex min-h-14 items-center justify-between gap-3 px-1 py-3 text-[15px] leading-[1.6] text-pretty text-ink no-underline transition-colors duration-200 hover:bg-surface/70 active:bg-surface">{{ article.title }}<ArrowUpRight class="size-4 shrink-0 text-body" aria-hidden="true" /></RouterLink>
        </li>
      </ul>
    </section>
    <section aria-labelledby="features-title">
      <h2 id="features-title" class="mt-0 mb-0 border-0 border-b border-solid border-ink px-1 pb-2 text-[13px] font-semibold text-body">学习与履职</h2>
      <nav aria-label="其他功能入口">
        <RouterLink v-for="id in communityEntries" :key="id" :to="modules[id].path" class="flex min-h-14 items-center gap-3 border-0 border-b border-solid border-line px-1 py-2 text-ink no-underline transition-colors duration-200 hover:bg-surface/70 active:bg-surface">
          <span class="grid size-8 shrink-0 place-items-center rounded-lg" :class="moduleTileClass(modules[id])"><NavigationIcon :name="id" class="size-4" /></span><span class="grow text-[15px] font-medium">{{ modules[id].title }}</span><span class="text-[13px] text-body">{{ moduleStatus(modules[id]) }}</span>
        </RouterLink>
      </nav>
      <p class="mt-2 mb-0 px-1 text-[13px] leading-[1.7] text-body">标注「建设中」的模块尚未开放，点击可查看建设说明。</p>
    </section>
    <section id="community-guide" tabindex="-1" class="scroll-mt-6 border-0 border-l border-solid border-ink py-1 pl-4" aria-labelledby="community-guide-title">
      <h2 id="community-guide-title" class="mt-0 mb-2 text-base font-bold text-ink">关于这里</h2>
      <p class="m-0 text-sm leading-[1.7] text-body">{{ editorialNotice }}</p>
      <p class="mt-3 mb-0 text-sm leading-[1.7] text-body">讨论时先描述可确认的事实，再列出依据与疑问；涉及具体罚则，请注明适用版本。</p>
      <details class="group mt-3 border-0 border-t border-solid border-line pt-2">
        <summary class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">社区当前状态<ChevronDown class="size-4 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
        <p class="mt-1 mb-0 text-sm leading-[1.7] text-body">当前仅展示内置讨论示例；人物、时间情境与回应均为自编，发帖、回复与点赞尚未开放。</p>
      </details>
    </section>
  </aside>
</template>
