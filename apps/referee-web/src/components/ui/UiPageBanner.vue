<script setup lang="ts">
import UiCourtLines from './UiCourtLines.vue'

/**
 * 页面横幅：沙金底、品牌折面与球场线稿。无业务含义，文案与操作由页面传入。
 * 装饰只在 compact 断点以上出现，并让正文列让出右侧，保证正文不压在折面上（对比度见 FS-0012）。
 * 状态由文字加色点共同表达，不单靠颜色。
 */
withDefaults(defineProps<{ title: string; description?: string; status?: string; tone?: 'available' | 'planned'; compact?: boolean; titleId?: string }>(), { tone: 'planned' })
const dot = { available: 'bg-green', planned: 'bg-muted' } as const
</script>

<template>
  <header class="relative overflow-hidden rounded-2xl border border-solid border-line bg-sand" :class="compact ? 'p-5 compact:p-6' : 'p-6 compact:p-8'" :aria-labelledby="titleId">
    <div aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-facet [clip-path:polygon(40%_0,100%_0,100%_100%,0_100%)] compact:block"></div>
    <UiCourtLines class="pointer-events-none absolute -right-4 -bottom-12 hidden h-52 w-auto text-body/30 compact:block" />
    <div class="relative compact:max-w-[64%]">
      <h1 :id="titleId" class="m-0 text-3xl leading-tight font-bold tracking-tight text-ink focus:outline-hidden compact:text-4xl">{{ title }}</h1>
      <p v-if="description" class="mt-3 mb-0 max-w-[60ch] leading-relaxed text-body" :class="compact ? 'text-sm' : 'text-base'">{{ description }}</p>
      <p v-if="status" class="mt-4 mb-0">
        <span class="inline-flex min-h-7 items-center gap-2 rounded-full border border-solid border-line bg-surface px-3 text-xs font-medium text-ink">
          <span class="size-2 rounded-full" :class="dot[tone]" aria-hidden="true"></span>{{ status }}
        </span>
      </p>
      <slot />
      <div v-if="$slots.actions" class="mt-5 flex flex-wrap gap-3"><slot name="actions" /></div>
    </div>
  </header>
</template>
