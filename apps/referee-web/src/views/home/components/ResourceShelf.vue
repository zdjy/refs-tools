<script setup lang="ts">
import { ArrowUpRight, BookOpen } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { deskResources } from '../home.presentation'
</script>

<template>
  <aside class="min-w-0 rounded-3xl bg-sand p-5 compact:p-7" aria-labelledby="resources-title">
    <div class="flex items-center justify-between gap-3">
      <p class="m-0 text-xs font-semibold text-body">留在手边，随时翻阅</p>
      <BookOpen class="size-5 text-body" :stroke-width="1.5" aria-hidden="true" />
    </div>
    <h2 id="resources-title" class="mt-3 mb-0 text-2xl font-bold tracking-tight text-ink compact:text-3xl">案头资料</h2>
    <p class="mt-3 mb-6 text-sm leading-relaxed text-body">先看提纲，再进入正文。以下为自编阅读材料，不是官方规则文件。</p>
    <article v-for="article in deskResources" :key="article.id" class="mt-4 rounded-2xl border border-solid border-line bg-surface p-5 shadow-card">
      <p class="mt-0 mb-2 text-xs font-medium text-red-hover">{{ article.label }} / 自编导读</p>
      <h3 class="m-0 text-lg leading-relaxed font-bold tracking-tight text-ink">{{ article.title }}</h3>
      <ul class="mt-4 mb-0 list-none p-0">
        <li v-for="section in article.outline" :key="section.path" class="border-0 border-t border-solid border-line">
          <RouterLink :to="section.path" class="group flex min-h-11 items-center justify-between gap-3 rounded-xl py-3 text-sm leading-relaxed text-body no-underline transition-all duration-300 ease-[cubic-bezier(.25,.1,.25,1)] hover:text-red-hover active:scale-[.98]">
            <span>{{ section.title }}</span><ArrowUpRight class="size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </RouterLink>
        </li>
      </ul>
    </article>
    <p class="mt-5 mb-0 text-xs leading-relaxed text-body">引用规则时，请核对发布机构、版本、生效日期与本场赛事规程。</p>
  </aside>
</template>
