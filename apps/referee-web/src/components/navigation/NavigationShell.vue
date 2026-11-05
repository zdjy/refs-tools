<script setup lang="ts">
import BrandLink from './BrandLink.vue'
import SkipLink from './SkipLink.vue'
import UiBackdropToggle from '../ui/UiBackdropToggle.vue'
import UiCourtBackdrop from '../ui/UiCourtBackdrop.vue'
import NavigationIdentity from './NavigationIdentity.vue'
import PrimaryNavigation from './PrimaryNavigation.vue'
import MobilePrimaryNavigation from './MobilePrimaryNavigation.vue'
</script>

<template>
  <div class="isolate min-h-screen bg-canvas tablet:grid tablet:grid-cols-[224px_minmax(0,1fr)]">
    <UiCourtBackdrop />
    <SkipLink />
    <!-- 桌面端左侧导航栏：次级表面加毛玻璃（macos_fiba.md §3）；两处账号入口由 CSS 互斥显示。 -->
    <aside class="hidden border-0 border-r border-solid border-line bg-soft/80 px-3 py-4 backdrop-blur-xl tablet:sticky tablet:top-0 tablet:flex tablet:h-screen tablet:flex-col tablet:gap-6">
      <div class="px-2"><BrandLink /></div>
      <PrimaryNavigation />
      <div class="mt-auto flex min-w-0 flex-col gap-2"><UiBackdropToggle /><NavigationIdentity placement="up" /></div>
    </aside>
    <div class="min-w-0">
      <header class="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-0 border-b border-solid border-line bg-canvas/90 px-4 backdrop-blur-md compact:px-6 tablet:hidden">
        <BrandLink />
        <div class="flex min-w-0 max-w-[70%] items-center gap-1"><UiBackdropToggle compact /><NavigationIdentity /></div>
      </header>
      <!-- 页面内容挂载时整体浮入一次；只用 backwards 填充，结束后不残留 transform，避免影响 fixed 子元素。 -->
      <main id="main" tabindex="-1" class="mx-auto max-w-[1080px] animate-rise px-4 pt-6 pb-[calc(100px+env(safe-area-inset-bottom))] compact:px-6 tablet:px-8 tablet:pt-10 tablet:pb-16">
        <slot />
      </main>
    </div>
    <MobilePrimaryNavigation />
  </div>
</template>
