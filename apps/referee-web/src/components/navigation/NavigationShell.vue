<script setup lang="ts">
import { RouterLink } from 'vue-router'
import SkipLink from './SkipLink.vue'
import NavigationIdentity from './NavigationIdentity.vue'
import PrimaryNavigation from './PrimaryNavigation.vue'
</script>

<template>
  <div class="min-h-screen bg-canvas">
    <SkipLink />
    <header class="border-0 border-b border-solid border-line bg-canvas/90 backdrop-blur-md tablet:sticky tablet:top-0 tablet:z-40">
      <div class="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3 compact:px-6 tablet:gap-4 xl:px-8">
        <RouterLink to="/" class="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-bold text-ink no-underline hover:text-red"><span aria-hidden="true" class="grid size-8 place-items-center rounded-full bg-ink text-surface">R</span><span>裁判工具箱</span></RouterLink>
        <PrimaryNavigation />
        <div class="min-w-0 max-w-[48%] tablet:max-w-[240px]"><NavigationIdentity /></div>
      </div>
    </header>
    <main id="main" tabindex="-1" class="mx-auto max-w-[1280px] px-4 pt-6 pb-[calc(100px+env(safe-area-inset-bottom))] compact:px-6 tablet:pt-8 tablet:pb-12 xl:px-8">
      <slot />
    </main>
    <PrimaryNavigation mobile />
  </div>
</template>
