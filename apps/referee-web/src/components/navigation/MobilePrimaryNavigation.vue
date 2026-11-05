<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import brandMark from '../../assets/brand/mark-light.png'
import { primaryNavigation } from '../../navigation/modules'
import { navigationCurrent } from '../../navigation/navigation.presentation'
import NavigationIcon from './NavigationIcon.vue'
import ToolsFanMenu from './ToolsFanMenu.vue'
import { usePillSlide } from './usePillSlide'
import { TOOLS_FAN_ID, useToolsFan } from './useToolsFan'

const route = useRoute()
const trigger = ref<HTMLElement | null>(null)
const { open, toggle, close } = useToolsFan(trigger)

/**
 * 工具按钮只展开扇面，不直接跳转；汇总页由扇形末项「全部工具」进入。
 * 该位置显示品牌方形标而非工具图标，因此按钮不渲染文字，可访问名称由 aria-label 提供。
 */
const toolsItem = primaryNavigation.find((item) => item.id === 'tools')!
const current = (item: (typeof primaryNavigation)[number]) => navigationCurrent(route.meta.navigation, route.path, item)
const toolsCurrent = () => navigationCurrent(route.meta.navigation, route.path, toolsItem)
// 滑动选中胶囊：宽度为单列，按当前栏目索引整列平移；无归属页面时隐藏。
const activeIndex = computed(() => primaryNavigation.findIndex((item) => item.id === route.meta.navigation))
const pillIndex = usePillSlide(activeIndex)
const pillStyle = computed(() => ({ transform: `translateX(${Math.max(pillIndex.value, 0) * 100}%)` }))

// v-for 内的模板 ref 会收集成数组，用函数 ref 只绑定工具触发按钮，供收起时恢复焦点。
function bindTrigger(element: unknown): void {
  trigger.value = element instanceof HTMLElement ? element : null
}
</script>

<template>
  <ToolsFanMenu v-if="open" @close="close()" />
  <nav aria-label="移动主导航" class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-0 border-t border-solid border-line bg-canvas/85 px-2 pt-1 pb-[max(4px,env(safe-area-inset-bottom))] backdrop-blur-xl tablet:hidden">
    <span aria-hidden="true" class="pointer-events-none absolute top-1 left-2 h-14 w-[calc((100%-1rem)/5)] transition-[transform,opacity] duration-[420ms] ease-(--ease-spring)" :class="activeIndex < 0 ? 'opacity-0' : 'opacity-100'" :style="pillStyle"><span class="block size-full rounded-2xl bg-sand"></span></span>
    <template v-for="item in primaryNavigation" :key="item.id">
      <button
        v-if="item.id === 'tools'"
        :ref="bindTrigger"
        type="button"
        :aria-label="item.title"
        :aria-expanded="open"
        :aria-controls="TOOLS_FAN_ID"
        :aria-current="toolsCurrent()"
        :class="['relative flex min-h-14 min-w-11 cursor-pointer flex-col items-center justify-center rounded-2xl border-0 px-1 py-2 no-underline transition-colors duration-200 ease-out active:scale-95', 'bg-transparent hover:bg-soft']"
        @click="toggle"
      >
        <img :src="brandMark" alt="" aria-hidden="true" class="size-7" />
      </button>
      <RouterLink
        v-else
        :to="item.path"
        :aria-current="current(item)"
        :class="['relative flex min-h-14 min-w-11 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-xs font-medium no-underline transition-colors duration-200 ease-out active:scale-95', current(item) ? 'font-semibold text-ink' : 'text-body hover:bg-soft hover:text-ink']"
      >
        <span v-if="current(item)" aria-hidden="true" class="absolute top-1.5 right-[calc(50%-18px)] size-1.5 rounded-full bg-accent"></span>
        <NavigationIcon :name="item.id" class="size-5 transition-transform duration-300 ease-(--ease-spring)" :class="current(item) ? 'scale-110' : ''" />
        <span>{{ item.title }}</span>
      </RouterLink>
    </template>
  </nav>
</template>
