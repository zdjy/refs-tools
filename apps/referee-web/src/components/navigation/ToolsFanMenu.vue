<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight } from '@lucide/vue'
import NavigationIcon from './NavigationIcon.vue'
import { fanAngle, toolsFanMore, toolsFanTools } from '../../navigation/tools-fan.presentation'
import { TOOLS_FAN_ID } from './useToolsFan'

const emit = defineEmits<{ close: [] }>()
const menu = ref<HTMLElement | null>(null)
/** 逐项角度写入 CSS 变量，由 scoped 的静态 transform 消费，不拼接动态工具类名。 */
const tools = toolsFanTools.map((tool, index) => ({
  ...tool,
  style: `--fan-angle:${fanAngle(index, toolsFanTools.length)}deg`,
}))

// 展开后焦点进入第一项，键盘用户不必再 Tab 穿过底栏其余栏目。
onMounted(() => menu.value?.querySelector('a')?.focus())
</script>

<template>
  <!-- 桌面断点隐藏：断点变化时 useToolsFan 也会收起，这里再由样式兜底，避免残留浮层。 -->
  <div class="fixed inset-0 z-20 tablet:hidden">
    <!-- 遮罩只承接鼠标收起；键盘路径为 Escape 与触发按钮的 aria-expanded。 -->
    <div aria-hidden="true" class="absolute inset-0 bg-ink/35" @click="emit('close')"></div>
    <nav
      :id="TOOLS_FAN_ID"
      ref="menu"
      aria-label="裁判工具快捷入口"
      class="fan-menu absolute bottom-[calc(2rem_+_env(safe-area-inset-bottom))] left-1/2 h-0 w-0"
    >
      <div v-for="tool in tools" :key="tool.id" class="fan-item absolute bottom-0 left-0 -ml-9 w-18 origin-bottom" :style="tool.style">
        <RouterLink :to="tool.path" class="fan-link group flex w-full flex-col items-center gap-1 rounded-xl text-ink no-underline" @click="emit('close')">
          <span class="grid size-14 place-items-center rounded-full border border-solid border-line bg-surface text-ink shadow-raised transition-all duration-200 ease-out group-hover:bg-sand group-hover:text-red group-active:scale-95">
            <NavigationIcon :name="tool.id" class="size-5" />
          </span>
          <!-- 标签加纯白底：扇面悬浮在正文之上，直接叠排会降低对比度。 -->
          <span class="rounded-full bg-surface px-2 py-0.5 text-xs leading-tight text-ink shadow-card">{{ tool.label }}</span>
        </RouterLink>
      </div>
      <!-- 「全部工具」落在弧面下方，沙金胶囊与圆形工具按钮区分层级。 -->
      <div class="absolute bottom-12 left-1/2 w-max -translate-x-1/2">
        <RouterLink :to="toolsFanMore.path" class="fan-link inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-solid border-line bg-sand px-4 text-sm font-medium whitespace-nowrap text-ink no-underline shadow-raised transition-all duration-200 ease-out hover:bg-facet active:scale-95" @click="emit('close')">
          {{ toolsFanMore.label }}
          <ChevronRight class="size-4" :stroke-width="1.5" aria-hidden="true" />
        </RouterLink>
      </div>
    </nav>
  </div>
</template>

<style scoped>
/* 扇形需要逐项旋转：绕按钮底边中心旋转后沿半径抬升，再反向旋转保持文字直立；
   工具类无法表达这条几何关系，故保留为单组件例外。 */
.fan-menu { --fan-radius: 144px; }
.fan-item { transform: rotate(var(--fan-angle)) translateY(calc(-1 * var(--fan-radius))) rotate(calc(-1 * var(--fan-angle))); }
.fan-link { animation: fan-link-in 200ms ease-out backwards; }
@keyframes fan-link-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
</style>
