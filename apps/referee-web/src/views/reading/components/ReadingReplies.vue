<script setup lang="ts">
import { ThumbsUp } from '@lucide/vue'
import PersonaAvatar from '../../../components/content/PersonaAvatar.vue'
import { vReveal } from '../../../components/ui/motion/reveal'
import { findPersona, type SampleThread } from '../../../content/threads.sample'

defineProps<{ thread: SampleThread }>()
</script>

<template>
  <section class="mt-8" aria-labelledby="replies-title">
    <h2 id="replies-title" class="m-0 text-2xl font-bold tracking-tight text-ink compact:text-3xl">{{ thread.replies.length }} 条示例回应</h2>
    <p class="mt-3 mb-0 text-sm leading-relaxed text-body">回应人物均为示例角色，数值为示例值，并非真实用户内容。真实回复与点赞尚未开放。</p>
    <div class="mt-6 grid gap-4">
      <article v-for="(reply, index) in thread.replies" :key="index" v-reveal="{ delay: index * 0.06, y: 18 }" class="border-0 border-t border-solid border-ink pt-5 compact:p-6">
        <header class="flex items-center gap-3">
          <PersonaAvatar :shape="findPersona(reply.personaId).shape" />
          <div class="min-w-0"><p class="m-0 text-sm font-semibold text-ink">{{ findPersona(reply.personaId).name }}</p><p class="m-0 text-xs text-body">{{ reply.moment }}</p></div>
          <span class="ml-auto shrink-0 rounded-full bg-soft px-3 py-1 font-mono text-xs text-body">示例</span>
        </header>
        <p class="mt-4 mb-0 text-sm leading-[1.85] text-body compact:text-base">{{ reply.text }}</p>
        <p class="mt-4 mb-0 inline-flex items-center gap-2 text-xs text-body"><ThumbsUp class="size-4" aria-hidden="true" />{{ reply.helpful }} 觉得有用（示例值）</p>
      </article>
    </div>
  </section>
</template>
