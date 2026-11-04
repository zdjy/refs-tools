<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, ArrowRight } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import { useUiActiveSection } from '../../components/ui/motion/useUiActiveSection'
import { useUiScrollProgress } from '../../components/ui/motion/useUiScrollProgress'
import { editorialArticles, editorialNotice, findEditorial, nextEditorial, type EditorialId } from '../../content/editorial'
import ReadingHeader from './components/ReadingHeader.vue'
import ReadingNext from './components/ReadingNext.vue'
import ReadingReplies from './components/ReadingReplies.vue'
import ReadingToc from './components/ReadingToc.vue'
import { threadForArticle } from './reading.presentation'

const props = defineProps<{ articleId: EditorialId }>()
const article = computed(() => findEditorial(props.articleId))
const next = computed(() => nextEditorial(props.articleId))
const related = computed(() => editorialArticles.filter((item) => item.kind === article.value?.kind && item.id !== props.articleId && item.id !== next.value?.id).slice(0, 2))
const thread = computed(() => threadForArticle(props.articleId))
const bar = ref<HTMLElement | null>(null)
const body = ref<HTMLElement | null>(null)
const sectionIds = computed(() => article.value?.sections.map((section) => section.id) ?? [])
const active = useUiActiveSection(sectionIds)
useUiScrollProgress(bar, body)
</script>

<template>
  <NavigationShell>
    <div aria-hidden="true" class="pointer-events-none fixed inset-x-0 top-0 z-40 h-1 bg-transparent"><div ref="bar" class="h-full origin-left scale-x-(--progress) bg-red" style="--progress: 0"></div></div>
    <template v-if="article">
      <RouterLink to="/" class="mb-5 inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-medium text-body no-underline transition-all duration-200 hover:text-red-hover active:scale-95"><ArrowLeft class="size-4" aria-hidden="true" />返回社区首页</RouterLink>
      <article>
        <ReadingHeader :article="article" />
        <div ref="body" class="mt-7 grid grid-cols-[minmax(0,1fr)] gap-7 tablet:grid-cols-[minmax(0,1fr)_260px] xl:gap-12">
          <ReadingToc :sections="article.sections" :active="active" />
          <div class="min-w-0 rounded-xl border border-solid border-line bg-surface p-5 compact:p-8 tablet:col-start-1 tablet:row-start-1 xl:p-12">
            <p class="mt-0 mb-10 border-0 border-l border-solid border-red pl-5 text-xl leading-relaxed font-medium text-ink compact:text-2xl">{{ article.takeaway }}</p>
            <section v-for="(section, index) in article.sections" :key="section.id" class="mb-10 last:mb-0">
              <h2 :id="section.id" tabindex="-1" class="mt-0 mb-5 flex scroll-mt-6 items-baseline gap-4 text-2xl leading-snug font-bold tracking-tight text-ink compact:text-3xl"><span class="font-mono text-sm font-normal text-red-hover">{{ String(index + 1).padStart(2, '0') }}</span>{{ section.title }}</h2>
              <p v-for="paragraph in section.paragraphs" :key="paragraph" class="mt-0 mb-5 text-base leading-[2] text-body last:mb-0">{{ paragraph }}</p>
            </section>
            <aside class="mt-10 rounded-xl bg-soft p-4 text-sm leading-relaxed text-body">{{ editorialNotice }}</aside>
          </div>
        </div>
      </article>
      <ReadingReplies v-if="thread" :thread="thread" />
      <ReadingNext v-if="next" :next="next" :related="related" />
      <RouterLink :to="article.kind === 'guide' ? '/learning' : '/forum'" class="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-soft px-5 py-3 text-sm font-medium text-ink no-underline transition-all duration-200 hover:bg-sand active:scale-95">{{ article.kind === 'guide' ? '查看学习中心建设状态' : '查看社区建设状态' }}<ArrowRight class="size-4" aria-hidden="true" /></RouterLink>
    </template>
  </NavigationShell>
</template>
