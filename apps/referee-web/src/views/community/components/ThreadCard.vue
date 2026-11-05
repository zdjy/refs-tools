<script setup lang="ts">
import { ChevronDown, MessageSquare } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import PersonaAvatar from '../../../components/content/PersonaAvatar.vue'
import { boards, findPersona, type SampleThread } from '../../../content/threads.sample'

defineProps<{ thread: SampleThread; open: boolean; index: number }>()
defineEmits<{ toggle: [id: string] }>()
const boardTitle = (id: string) => boards.find((board) => board.id === id)?.title
</script>

<template>
  <!-- 分组列表中的一行：外层白色圆角容器由信息流提供，行间用缩进细线分隔。 -->
  <article :style="{ animationDelay: `${Math.min(index, 6) * 55}ms` }" class="animate-rise border-0 border-b border-solid border-line px-1 py-5 transition-colors duration-200 hover:bg-surface/60">
    <div class="flex items-start gap-3">
      <PersonaAvatar :shape="findPersona(thread.personaId).shape" class="mt-1 shrink-0" />
      <div class="min-w-0 grow">
        <p class="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-body"><span class="font-semibold text-accent-hover">{{ boardTitle(thread.board) }}</span><span>{{ findPersona(thread.personaId).name }}</span><span>{{ thread.moment }}</span></p>
        <!-- 标题与正文摘要都在信息流内截断，超长文本以省略号收尾，完整内容留在阅读页或回应区。 -->
        <h3 class="mt-1 mb-0 text-lg leading-[1.5] font-bold tracking-[-0.01em] text-ink">
          <RouterLink v-if="thread.articleId" :to="`/read/${thread.articleId}`" class="block min-h-11 content-center rounded-xl text-ink no-underline transition-colors duration-200 hover:text-accent-hover active:scale-[.98]"><span class="line-clamp-2">{{ thread.title }}</span></RouterLink>
          <button v-else type="button" :aria-expanded="open" :aria-controls="`replies-${thread.id}`" class="block min-h-11 w-full cursor-pointer rounded-xl border-0 bg-transparent p-0 text-left text-inherit transition-colors duration-200 hover:text-accent-hover active:scale-[.98]" @click="$emit('toggle', thread.id)"><span class="line-clamp-2">{{ thread.title }}</span></button>
        </h3>
        <p class="mt-1 mb-0 line-clamp-3 text-base leading-[1.7] text-body">{{ thread.body }}</p>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <ul class="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-[13px] text-body" aria-label="话题标签"><li v-for="tag in thread.tags" :key="tag"># {{ tag }}</li></ul>
          <button type="button" :aria-expanded="open" :aria-controls="`replies-${thread.id}`" class="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-soft px-3 text-[13px] font-medium text-body transition-colors duration-200 hover:bg-sand hover:text-ink active:scale-95" @click="$emit('toggle', thread.id)">
            <MessageSquare class="size-4" :stroke-width="1.5" aria-hidden="true" /><span class="font-mono">{{ thread.replies.length }}</span> 条示例回应<ChevronDown class="size-3 transition-transform" :class="open ? 'rotate-180' : ''" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
    <!-- 回应区用 grid 行高 0fr→1fr 展开；inert 让收起时的内容既不可聚焦也不进入无障碍树。 -->
    <div :id="`replies-${thread.id}`" :inert="!open" class="grid transition-[grid-template-rows,opacity] duration-[380ms] ease-(--ease-ios)" :class="open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'">
      <div class="min-h-0 overflow-hidden"><div class="mt-4 grid gap-4 compact:ml-12">
      <section v-for="(reply, replyIndex) in thread.replies" :key="replyIndex" class="border-0 border-l border-solid border-line pl-4" :aria-label="`示例回应 ${replyIndex + 1}`">
        <p class="m-0 text-[13px] leading-[1.7] text-body"><span class="font-semibold text-ink">{{ findPersona(reply.personaId).name }}</span> · {{ reply.moment }}</p>
        <p class="mt-2 mb-0 text-base leading-[1.7] text-body">{{ reply.text }}</p>
      </section>
    </div></div></div>
  </article>
</template>
