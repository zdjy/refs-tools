<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { primaryNavigation } from '../../navigation/modules'
import { navigationCurrent } from '../../navigation/navigation.presentation'
import NavigationIcon from './NavigationIcon.vue'
import ToolsFanMenu from './ToolsFanMenu.vue'
import { TOOLS_FAN_ID, useToolsFan } from './useToolsFan'

const route = useRoute()
const trigger = ref<HTMLElement | null>(null)
const { open, toggle, close } = useToolsFan(trigger)

/** 工具按钮只展开扇面，不直接跳转；汇总页由扇形末项「更多」进入。 */
const toolsItem = primaryNavigation.find((item) => item.id === 'tools')!
const current = (item: (typeof primaryNavigation)[number]) => navigationCurrent(route.meta.navigation, route.path, item)
const toolsCurrent = () => navigationCurrent(route.meta.navigation, route.path, toolsItem)

// v-for 内的模板 ref 会收集成数组，用函数 ref 只绑定工具触发按钮，供收起时恢复焦点。
function bindTrigger(element: unknown): void {
  trigger.value = element instanceof HTMLElement ? element : null
}
</script>

<template>
  <ToolsFanMenu v-if="open" @close="close()" />
  <nav aria-label="移动主导航" class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-0 border-t border-solid border-line bg-canvas/85 px-1 pt-1 pb-[max(4px,env(safe-area-inset-bottom))] backdrop-blur-xl tablet:hidden">
    <template v-for="item in primaryNavigation" :key="item.id">
      <button
        v-if="item.id === 'tools'"
        :ref="bindTrigger"
        type="button"
        :aria-expanded="open"
        :aria-controls="TOOLS_FAN_ID"
        :aria-current="toolsCurrent()"
        :class="['flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-medium no-underline transition-all duration-200 ease-out hover:bg-soft hover:text-ink active:scale-95', toolsCurrent() ? 'bg-sand font-semibold text-ink shadow-selected' : 'text-body']"
        @click="toggle"
      >
        <NavigationIcon name="tools" :class="['size-5', toolsCurrent() ? 'text-red' : '']" />
        <span>{{ item.title }}</span>
      </button>
      <RouterLink
        v-else
        :to="item.path"
        :aria-current="current(item)"
        :class="['flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-medium no-underline transition-all duration-200 ease-out hover:bg-soft hover:text-ink active:scale-95', current(item) ? 'bg-sand font-semibold text-ink shadow-selected' : 'text-body']"
      >
        <NavigationIcon :name="item.id" :class="['size-5', current(item) ? 'text-red' : '']" />
        <span>{{ item.title }}</span>
      </RouterLink>
    </template>
  </nav>
</template>
