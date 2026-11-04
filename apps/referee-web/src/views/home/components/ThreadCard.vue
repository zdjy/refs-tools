<script setup lang="ts">
import { ChevronDown, MessageSquare } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import PersonaAvatar from '../../../components/content/PersonaAvatar.vue'
import { boards, findPersona, type SampleThread } from '../../../content/threads.sample'

defineProps<{ thread: SampleThread; open: boolean }>()
defineEmits<{ toggle: [id: string] }>()
const boardTitle = (id: string) => boards.find((board) => board.id === id)?.title
</script>

<template>
  <article class="border-0 border-b border-solid border-line px-4 py-5 transition-colors last:border-b-0 hover:bg-canvas/60 compact:px-6">
    <div class="flex items-start gap-3">
      <PersonaAvatar :shape="findPersona(thread.personaId).shape" class="mt-1 shrink-0" />
      <div class="min-w-0 grow">
        <p class="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-body"><span class="font-medium text-red-hover">{{ boardTitle(thread.board) }}</span><span>{{ thread.moment }}</span></p>
        <h3 class="mt-2 mb-0 text-base leading-relaxed font-semibold text-ink compact:text-lg">
          <RouterLink v-if="thread.articleId" :to="`/read/${thread.articleId}`" class="block min-h-11 content-center rounded-xl text-ink no-underline transition-all hover:text-red-hover active:scale-[.98]">{{ thread.title }}</RouterLink>
          <button v-else type="button" :aria-expanded="open" :aria-controls="`replies-${thread.id}`" class="block min-h-11 w-full cursor-pointer rounded-xl border-0 bg-transparent p-0 text-left text-inherit transition-all hover:text-red-hover active:scale-[.98]" @click="$emit('toggle', thread.id)">{{ thread.title }}</button>
        </h3>
        <p class="mt-1 mb-0 text-sm leading-relaxed text-body">{{ thread.body }}</p>
        <ul class="mt-3 mb-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-xs text-body" aria-label="话题标签"><li v-for="tag in thread.tags" :key="tag"># {{ tag }}</li></ul>
        <footer class="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p class="m-0 text-xs text-body">{{ findPersona(thread.personaId).name }}</p>
          <button type="button" :aria-expanded="open" :aria-controls="`replies-${thread.id}`" class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-soft px-3 text-xs font-medium text-body transition-all hover:bg-sand hover:text-ink active:scale-95" @click="$emit('toggle', thread.id)">
            <MessageSquare class="size-4" aria-hidden="true" />{{ thread.replies.length }} 条示例回应<ChevronDown class="size-3 transition-transform" :class="open ? 'rotate-180' : ''" aria-hidden="true" />
          </button>
        </footer>
      </div>
    </div>
    <div v-show="open" :id="`replies-${thread.id}`" class="mt-4 grid gap-3 compact:ml-12">
      <section v-for="(reply, index) in thread.replies" :key="index" class="rounded-xl bg-soft p-4" :aria-label="`示例回应 ${index + 1}`">
        <p class="m-0 text-xs leading-relaxed text-body"><span class="font-semibold text-ink">{{ findPersona(reply.personaId).name }}</span> · {{ reply.moment }}</p>
        <p class="mt-2 mb-0 text-sm leading-relaxed text-body">{{ reply.text }}</p>
      </section>
    </div>
  </article>
</template>
