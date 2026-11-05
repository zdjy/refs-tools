<script setup lang="ts">
import { ArrowUpRight, BookOpen, ChevronDown, ClipboardList, Languages } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import NavigationIcon from '../../../components/navigation/NavigationIcon.vue'
import { editorialNotice } from '../../../content/editorial'
import { modules } from '../../../navigation/modules'
import { moduleStatus } from '../../../navigation/navigation.presentation'
import { communityEntries, communityGuides } from '../community.presentation'
</script>

<template>
  <aside class="grid min-w-0 content-start gap-5 compact:grid-cols-2 tablet:grid-cols-1" aria-label="工具与社区资料">
    <section class="overflow-hidden rounded-2xl border border-solid border-line bg-sand p-5" aria-labelledby="courtside-title">
      <h2 id="courtside-title" class="mt-0 mb-1 text-base font-bold text-ink">场边工具</h2>
      <p class="mt-0 mb-4 text-xs leading-relaxed text-body">上场前，先把工具准备好。</p>
      <RouterLink :to="modules.workbench.path" class="flex min-h-14 items-center gap-3 rounded-xl bg-surface px-3 py-3 text-ink no-underline shadow-card transition-all hover:shadow-lift active:scale-[.98]">
        <ClipboardList class="size-5 shrink-0" aria-hidden="true" /><span class="grow"><span class="block text-sm font-semibold">本地比赛工作台</span><span class="mt-1 block text-xs text-body">记分、统计与计时 · Beta</span></span><ArrowUpRight class="size-4 shrink-0" aria-hidden="true" />
      </RouterLink>
      <RouterLink :to="modules.gb2312.path" class="mt-2 flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink no-underline transition-all hover:bg-surface/60 active:scale-[.98]"><Languages class="size-5 shrink-0" aria-hidden="true" /><span class="grow">GB 2312 区位码</span><ArrowUpRight class="size-4 shrink-0" aria-hidden="true" /></RouterLink>
      <p class="mt-4 mb-0 border-0 border-t border-solid border-line pt-3 text-xs leading-relaxed text-body">工作台记录仅存当前设备，不自动同步。已加载的工作台可离线操作，首次离线打开暂不保证可用。</p>
    </section>
    <section class="rounded-2xl border border-solid border-line bg-surface p-5 shadow-card" aria-labelledby="guides-title">
      <h2 id="guides-title" class="mt-0 mb-3 flex items-center gap-2 text-base font-bold text-ink"><BookOpen class="size-4 text-body" aria-hidden="true" />案头导读</h2>
      <ul class="m-0 list-none p-0">
        <li v-for="article in communityGuides" :key="article.id" class="border-0 border-b border-solid border-line last:border-b-0">
          <RouterLink :to="article.path" class="flex min-h-14 items-center justify-between gap-3 rounded-xl py-3 text-sm leading-relaxed text-ink no-underline transition-all hover:text-red-hover active:scale-[.98]">{{ article.title }}<ArrowUpRight class="size-4 shrink-0 text-body" aria-hidden="true" /></RouterLink>
        </li>
      </ul>
    </section>
    <section class="rounded-2xl border border-solid border-line bg-soft/80 p-5" aria-labelledby="features-title">
      <h2 id="features-title" class="mt-0 mb-3 text-base font-bold text-ink">学习与履职</h2>
      <nav aria-label="其他功能入口" class="grid grid-cols-2 gap-2">
        <RouterLink v-for="id in communityEntries" :key="id" :to="modules[id].path" class="flex min-h-16 items-center gap-2 rounded-xl px-2 py-2 text-ink no-underline transition-all hover:bg-surface active:scale-[.98]">
          <NavigationIcon :name="id" class="size-4 shrink-0 text-body" /><span class="min-w-0"><span class="block text-xs font-medium">{{ modules[id].title }}</span><span class="mt-1 block text-xs text-body">{{ moduleStatus(modules[id]) }}</span></span>
        </RouterLink>
      </nav>
      <p class="mt-3 mb-0 text-xs leading-relaxed text-body">标注「建设中」的模块尚未开放，点击可查看建设说明。</p>
    </section>
    <section id="community-guide" tabindex="-1" class="scroll-mt-24 rounded-2xl border border-solid border-line bg-surface p-5" aria-labelledby="community-guide-title">
      <h2 id="community-guide-title" class="mt-0 mb-3 text-base font-bold text-ink">关于这里</h2>
      <p class="m-0 text-xs leading-relaxed text-body">{{ editorialNotice }}</p>
      <p class="mt-3 mb-0 text-xs leading-relaxed text-body">讨论时先描述可确认的事实，再列出依据与疑问；涉及具体罚则，请注明适用版本。</p>
      <details class="group mt-3 border-0 border-t border-solid border-line pt-2">
        <summary class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-full text-xs font-medium text-body [&::-webkit-details-marker]:hidden">社区当前状态<ChevronDown class="size-4 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
        <p class="mt-1 mb-0 text-xs leading-relaxed text-body">当前仅展示内置讨论示例；人物、时间情境与回应均为自编，发帖、回复与点赞尚未开放。</p>
      </details>
    </section>
  </aside>
</template>
