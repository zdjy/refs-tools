<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Pause, Play } from '@lucide/vue'
import { animate, type AnimationPlaybackControls } from 'motion'
import { prefersReducedMotion } from './reveal'

defineProps<{ items: readonly string[]; label: string }>()

const track = ref<HTMLElement | null>(null)
const paused = ref(false)
const reduced = prefersReducedMotion()
let run: AnimationPlaybackControls | undefined

onMounted(() => {
  if (reduced || !track.value) return
  // 内容复制两份，位移 -50% 后首尾无缝衔接。
  run = animate(track.value, { x: ['0%', '-50%'] }, { duration: 38, ease: 'linear', repeat: Infinity })
})
onBeforeUnmount(() => run?.stop())

function toggle() {
  paused.value = !paused.value
  if (paused.value) run?.pause()
  else run?.play()
}
</script>

<template>
  <div class="flex items-center gap-3">
    <div class="min-w-0 grow overflow-hidden" role="group" :aria-label="label">
      <div ref="track" class="flex w-max" :class="reduced ? 'w-full flex-wrap gap-y-2' : ''">
        <ul class="m-0 flex list-none items-center p-0" :class="reduced ? 'flex-wrap gap-y-2' : ''">
          <li v-for="item in items" :key="item" class="flex items-center whitespace-nowrap text-2xl font-bold tracking-tight text-ink compact:text-4xl">
            {{ item }}<span aria-hidden="true" class="mx-6 inline-block size-2.5 shrink-0 bg-red compact:mx-10"></span>
          </li>
        </ul>
        <ul v-if="!reduced" class="m-0 flex list-none items-center p-0" aria-hidden="true">
          <li v-for="item in items" :key="item" class="flex items-center whitespace-nowrap text-2xl font-bold tracking-tight text-ink compact:text-4xl">
            {{ item }}<span class="mx-6 inline-block size-2.5 shrink-0 bg-red compact:mx-10"></span>
          </li>
        </ul>
      </div>
    </div>
    <button v-if="!reduced" type="button" :aria-pressed="paused" aria-label="暂停滚动关键词" class="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-solid border-line bg-surface text-ink transition-all duration-200 ease-out hover:border-body active:scale-95" @click="toggle">
      <component :is="paused ? Play : Pause" class="size-4" aria-hidden="true" />
    </button>
  </div>
</template>
