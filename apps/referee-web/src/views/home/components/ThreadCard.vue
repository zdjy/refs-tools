<script setup lang="ts">
import { ArrowRight, ChevronDown, MessageSquare, ThumbsUp } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import PersonaAvatar from '../../../components/content/PersonaAvatar.vue'
import { boards, findPersona, type SampleThread } from '../../../content/threads.sample'

defineProps<{ thread: SampleThread; open: boolean }>()
defineEmits<{ toggle: [id: string] }>()
const boardTitle = (id: string) => boards.find((board) => board.id === id)?.title
</script>

<template>
  <article class="rounded-xl border border-solid border-line bg-surface p-5 shadow-card transition-all duration-200 ease-out hover:shadow-lift compact:p-7">
    <header class="flex items-center gap-3">
      <PersonaAvatar :shape="findPersona(thread.personaId).shape" />
      <div class="min-w-0">
        <p class="m-0 text-sm font-semibold text-ink">{{ findPersona(thread.personaId).name }}</p>
        <p class="m-0 text-xs text-body">{{ boardTitle(thread.board) }} · {{ thread.moment }}</p>
      </div>
      <span class="ml-auto shrink-0 rounded-full bg-soft px-3 py-1 font-mono text-xs text-body">示例</span>
    </header>
    <h3 class="mt-5 mb-0 text-xl leading-snug font-bold tracking-tight text-ink compact:text-2xl">
      <RouterLink v-if="thread.articleId" :to="`/read/${thread.articleId}`" class="text-ink no-underline transition-colors duration-200 hover:text-red-hover">{{ thread.title }}</RouterLink>
      <template v-else>{{ thread.title }}</template>
    </h3>
    <p class="mt-3 mb-0 text-sm leading-[1.85] text-body">{{ thread.body }}</p>
    <ul class="m-0 mt-4 flex list-none flex-wrap gap-2 p-0" aria-label="话题标签">
      <li v-for="tag in thread.tags" :key="tag" class="rounded-full bg-soft px-3 py-1 text-xs font-medium text-body">{{ tag }}</li>
    </ul>
    <footer class="mt-5 flex flex-wrap items-center justify-between gap-3 border-0 border-t border-solid border-line pt-4">
      <p class="m-0 flex items-center gap-4 text-xs text-body">
        <span class="inline-flex items-center gap-1.5"><ThumbsUp class="size-4" aria-hidden="true" />{{ thread.helpful }} 觉得有用（示例值）</span>
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" :aria-expanded="open" :aria-controls="`replies-${thread.id}`" class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-solid border-line bg-surface px-4 text-sm font-medium text-ink transition-all duration-200 ease-out hover:border-body active:scale-95" @click="$emit('toggle', thread.id)">
          <MessageSquare class="size-4" aria-hidden="true" />{{ thread.replies.length }} 条示例回应<ChevronDown class="size-4 transition-transform duration-200" :class="open ? 'rotate-180' : ''" aria-hidden="true" />
        </button>
        <RouterLink v-if="thread.articleId" :to="`/read/${thread.articleId}`" class="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-surface no-underline transition-all duration-200 ease-out hover:bg-black active:scale-95">阅读全文<ArrowRight class="size-4" aria-hidden="true" /><span class="sr-only">：{{ thread.title }}</span></RouterLink>
      </div>
    </footer>
    <div v-show="open" :id="`replies-${thread.id}`" class="mt-4 grid gap-3">
      <section v-for="(reply, index) in thread.replies" :key="index" class="rounded-xl bg-soft p-4" :aria-label="`示例回应 ${index + 1}`">
        <p class="m-0 flex items-center gap-2 text-xs text-body"><PersonaAvatar :shape="findPersona(reply.personaId).shape" class="size-7" /><span class="font-semibold text-ink">{{ findPersona(reply.personaId).name }}</span> · {{ reply.moment }}</p>
        <p class="mt-2 mb-0 text-sm leading-relaxed text-body">{{ reply.text }}</p>
        <p class="mt-2 mb-0 font-mono text-xs text-body">{{ reply.helpful }} 觉得有用（示例值）</p>
      </section>
    </div>
  </article>
</template>
