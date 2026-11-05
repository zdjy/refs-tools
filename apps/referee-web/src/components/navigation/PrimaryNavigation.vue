<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { desktopNavigation, modules } from '../../navigation/modules'
import { navigationCurrent } from '../../navigation/navigation.presentation'
import NavigationIcon from './NavigationIcon.vue'
import { usePillSlide } from './usePillSlide'

const route = useRoute()
const onWorkbench = computed(() => route.path === modules.workbench.path)
/** 工作台属于「工具」栏目，但在侧栏有独立入口；它被选中时，主栏目的胶囊不再占位。 */
const activeIndex = computed(() => onWorkbench.value ? -1 : desktopNavigation.findIndex((item) => item.id === route.meta.navigation))
// 行高 44px 加 4px 间距，与模板中的 min-h-11 / gap-1 对应，胶囊位移按此步长计算。
const pillIndex = usePillSlide(activeIndex)
const pillStyle = computed(() => ({ transform: `translateY(${Math.max(pillIndex.value, 0) * 48}px)` }))
</script>

<template>
  <nav aria-label="主导航" class="flex flex-col gap-1">
    <div class="relative flex flex-col gap-1">
      <!-- 滑动选中胶囊：在栏目之间用弹性曲线滑动，而不是各自闪现；当前栏目另由红点、aria-current 与加粗文字表达。 -->
      <span aria-hidden="true" class="absolute inset-x-0 top-0 h-11 rounded-xl bg-sand transition-[transform,opacity] duration-[420ms] ease-(--ease-spring)" :class="activeIndex < 0 ? 'opacity-0' : 'opacity-100'" :style="pillStyle"></span>
      <RouterLink v-for="item in desktopNavigation" :key="item.id" :to="item.path" :aria-current="navigationCurrent(route.meta.navigation, route.path, item)" :class="[
        'group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] no-underline transition-colors duration-200 ease-out active:scale-[.97]',
        activeIndex >= 0 && route.meta.navigation === item.id ? 'font-semibold text-ink' : 'font-medium text-body hover:bg-canvas hover:text-ink',
      ]">
        <NavigationIcon :name="item.id" class="size-[18px] shrink-0 transition-transform duration-300 ease-(--ease-spring) group-hover:scale-110" />
        <span class="grow">{{ item.title }}</span>
        <span v-if="activeIndex >= 0 && route.meta.navigation === item.id" aria-hidden="true" class="size-1.5 shrink-0 rounded-full bg-accent"></span>
      </RouterLink>
    </div>
    <div class="mt-4 border-0 border-t border-solid border-line/70 pt-4">
      <p class="mx-3 mt-0 mb-2 text-[13px] text-body">场边</p>
      <RouterLink :to="modules.workbench.path" :class="[
        'group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] no-underline transition-colors duration-200 ease-out active:scale-[.97]',
        onWorkbench ? 'bg-sand font-semibold text-ink' : 'font-medium text-body hover:bg-canvas hover:text-ink',
      ]">
        <NavigationIcon name="workbench" class="size-[18px] shrink-0 transition-transform duration-300 ease-(--ease-spring) group-hover:scale-110" />
        <span class="grow">本地工作台</span>
        <span v-if="onWorkbench" aria-hidden="true" class="size-1.5 shrink-0 rounded-full bg-accent"></span>
      </RouterLink>
    </div>
  </nav>
</template>
