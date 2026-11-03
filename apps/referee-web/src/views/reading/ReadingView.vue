<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, ArrowRight, BookOpen, MessageSquare } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import { editorialArticles, editorialNotice, findEditorial, type EditorialId } from '../../content/editorial'
const props = defineProps<{ articleId: EditorialId }>()
const article = computed(() => findEditorial(props.articleId))
const related = computed(() => editorialArticles.filter((item) => item.kind === article.value?.kind && item.id !== props.articleId).slice(0, 2))
</script>

<template>
  <NavigationShell>
    <template v-if="article">
      <RouterLink to="/" class="mb-5 inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-medium text-body no-underline transition-all duration-300 hover:text-red-hover active:scale-95"><ArrowLeft class="size-4" aria-hidden="true" />返回裁判手记</RouterLink>
      <article>
        <header class="relative overflow-hidden rounded-3xl bg-sand p-5 compact:p-8 xl:p-10">
          <div aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-facet [clip-path:polygon(75%_0,100%_0,100%_100%,0_100%)]"></div>
          <div class="relative max-w-[820px]">
            <p class="mt-0 mb-4 flex items-center gap-2 text-sm font-medium text-body"><component :is="article.kind === 'guide' ? BookOpen : MessageSquare" class="size-5" aria-hidden="true" />{{ article.label }}</p>
            <h1 class="m-0 text-3xl leading-snug font-bold tracking-tight text-ink compact:text-4xl">{{ article.title }}</h1>
            <p class="mt-5 mb-0 max-w-[700px] text-base leading-[1.9] text-body">{{ article.summary }}</p>
            <p class="mt-5 mb-0 text-xs leading-relaxed text-body">{{ article.kind === 'guide' ? '本站自编学习导读，不记录学习进度。' : '自编讨论示例，非真实用户帖子；发帖与回复尚未开放。' }}</p>
          </div>
        </header>
        <div class="mt-7 grid grid-cols-[minmax(0,1fr)] gap-7 tablet:grid-cols-[minmax(0,1fr)_240px] xl:gap-12">
          <nav aria-label="文章目录" class="self-start rounded-2xl border border-solid border-line bg-surface p-5 tablet:sticky tablet:top-6 tablet:col-start-2 tablet:row-start-1">
            <h2 class="mt-0 mb-3 text-sm font-bold text-ink">本篇阅读</h2>
            <a v-for="section in article.sections" :key="section.id" :href="`#${section.id}`" class="flex min-h-11 items-center rounded-full px-2 py-2 text-sm leading-relaxed text-body no-underline transition-all duration-300 hover:bg-soft hover:text-ink active:scale-[.98]">{{ section.title }}</a>
          </nav>
          <div class="min-w-0 rounded-2xl border border-solid border-line bg-surface p-5 compact:p-8 tablet:col-start-1 tablet:row-start-1 xl:p-10">
            <p class="mt-0 mb-8 border-0 border-l-2 border-solid border-red pl-4 text-lg leading-relaxed font-medium text-ink">{{ article.takeaway }}</p>
            <section v-for="section in article.sections" :key="section.id" class="mb-8 last:mb-0">
              <h2 :id="section.id" tabindex="-1" class="mt-0 mb-4 scroll-mt-6 text-xl leading-relaxed font-bold text-ink">{{ section.title }}</h2>
              <p v-for="paragraph in section.paragraphs" :key="paragraph" class="mt-0 mb-4 text-base leading-[2] text-body last:mb-0">{{ paragraph }}</p>
            </section>
            <aside class="mt-8 rounded-2xl bg-soft p-4 text-sm leading-relaxed text-body">{{ editorialNotice }}</aside>
          </div>
        </div>
      </article>
      <section class="mt-9" aria-labelledby="related-title">
        <h2 id="related-title" class="mt-0 mb-4 text-xl font-bold text-ink">{{ article.kind === 'guide' ? '继续研读' : '另一则讨论示例' }}</h2>
        <div class="grid gap-4 compact:grid-cols-2">
          <RouterLink v-for="item in related" :key="item.id" :to="item.path" class="flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-solid border-line bg-surface p-5 text-base leading-relaxed font-medium text-ink no-underline transition-all duration-300 hover:border-body hover:text-red-hover active:scale-[.98]">{{ item.title }}<ArrowRight class="size-5 shrink-0" aria-hidden="true" /></RouterLink>
        </div>
      </section>
      <RouterLink :to="article.kind === 'guide' ? '/learning' : '/forum'" class="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-soft px-5 py-3 text-sm font-medium text-ink no-underline transition-all duration-300 hover:bg-sand active:scale-95">{{ article.kind === 'guide' ? '查看学习中心建设状态' : '查看社区建设状态' }}<ArrowRight class="size-4" aria-hidden="true" /></RouterLink>
    </template>
  </NavigationShell>
</template>
