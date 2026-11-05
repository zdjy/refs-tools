<script setup lang="ts">
import type { EditorialSection } from '../../../content/editorial'

defineProps<{ sections: readonly EditorialSection[]; active: string }>()
</script>

<template>
  <nav aria-label="文章目录" class="self-start rounded-xl border border-solid border-line bg-surface p-5 tablet:sticky tablet:top-6 tablet:col-start-2 tablet:row-start-1">
    <h2 class="mt-0 mb-3 text-sm font-bold text-ink">本篇阅读</h2>
    <a v-for="section in sections" :key="section.id" :href="`#${section.id}`" :aria-current="active === section.id ? 'location' : undefined" class="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm leading-relaxed no-underline transition-all duration-200 ease-out hover:text-ink active:scale-[.98]" :class="active === section.id ? 'bg-sand font-semibold text-ink shadow-selected' : 'text-body hover:bg-soft'">
      <span class="size-1.5 shrink-0 rounded-full" :class="active === section.id ? 'bg-red' : 'bg-line'" aria-hidden="true"></span>{{ section.title }}
    </a>
  </nav>
</template>
