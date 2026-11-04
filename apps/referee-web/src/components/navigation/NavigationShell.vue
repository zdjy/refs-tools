<script setup lang="ts">
import { RouterLink } from 'vue-router'
import brandLockup from '../../assets/brand/lockup-compact.png'
import SkipLink from './SkipLink.vue'
import NavigationIdentity from './NavigationIdentity.vue'
import PrimaryNavigation from './PrimaryNavigation.vue'
import MobilePrimaryNavigation from './MobilePrimaryNavigation.vue'
</script>

<template>
  <div class="min-h-screen bg-canvas">
    <SkipLink />
    <header class="border-0 border-b border-solid border-line bg-canvas/90 backdrop-blur-md tablet:sticky tablet:top-0 tablet:z-40">
      <div class="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3 compact:px-6 tablet:gap-4 xl:px-8">
        <!-- 品牌组合标：紧凑版母版已去底，文字由 alt 提供可访问名称，不再重复渲染文本。 -->
        <RouterLink to="/" class="inline-flex min-h-11 shrink-0 items-center no-underline"><img :src="brandLockup" alt="裁判工具箱" class="h-8 w-auto tablet:h-10" /></RouterLink>
        <PrimaryNavigation />
        <div class="min-w-0 max-w-[48%] tablet:max-w-[240px]"><NavigationIdentity /></div>
      </div>
    </header>
    <main id="main" tabindex="-1" class="mx-auto max-w-[1280px] px-4 pt-6 pb-[calc(100px+env(safe-area-inset-bottom))] compact:px-6 tablet:pt-8 tablet:pb-12 xl:px-8">
      <slot />
    </main>
    <MobilePrimaryNavigation />
  </div>
</template>
