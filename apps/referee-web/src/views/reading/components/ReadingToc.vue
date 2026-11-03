<script setup lang="ts">
import type { EditorialSection } from '../../../content/editorial'

defineProps<{ sections: readonly EditorialSection[]; active: string }>()
</script>

<template>
  <nav aria-label="文章目录" class="self-start rounded-xl border border-solid border-line bg-surface p-5 tablet:sticky tablet:top-6 tablet:col-start-2 tablet:row-start-1">
    <h2 class="mt-0 mb-3 font-mono text-xs font-normal tracking-wider text-body uppercase">本篇阅读</h2>
    <a v-for="(section, index) in sections" :key="section.id" :href="`#${section.id}`" :aria-current="active === section.id ? 'location' : undefined" class="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm leading-relaxed no-underline transition-all duration-200 ease-out hover:text-ink active:scale-[.98]" :class="active === section.id ? 'bg-sand font-semibold text-ink shadow-selected' : 'text-body hover:bg-soft'">
      <span class="font-mono text-xs" :class="active === section.id ? 'text-red-hover' : ''">{{ String(index + 1).padStart(2, '0') }}</span>{{ section.title }}
    </a>
  </nav>
</template>
