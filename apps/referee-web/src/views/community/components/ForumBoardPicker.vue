<script setup lang="ts">
import { Menu } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { BoardId } from '../../../content/threads.sample'
import { boardTabs } from '../community.presentation'
import ForumBoardDrawer from './ForumBoardDrawer.vue'

/** 触发按钮在 tablet 断点（960px）隐藏，与该断点保持一致，见样式规约的断点表。 */
const DESKTOP_QUERY = '(min-width: 960px)'

const props = defineProps<{ board: BoardId | 'all' }>()
const emit = defineEmits<{ select: [board: BoardId | 'all'] }>()
const open = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const current = computed(() => boardTabs.find((tab) => tab.id === props.board)?.title ?? '全部讨论')

function choose(board: BoardId | 'all') {
  emit('select', board)
  open.value = false
}

// 抽屉关闭后把焦点还给触发按钮；若已切到桌面布局（触发行被隐藏），则落到当前选中的胶囊。
// 抽屉离场结束时会先把焦点退给打开前的元素（通常是路由聚焦的页面标题），因此延后一个任务再定位，
// 否则会被这次回退覆盖，键盘用户会丢失位置。
function restoreFocus() {
  setTimeout(() => {
    if (trigger.value?.getClientRects().length) trigger.value.focus({ preventScroll: true })
    else document.querySelector<HTMLButtonElement>('[aria-controls="thread-list"][aria-pressed="true"]')?.focus({ preventScroll: true })
  }, 0)
}

// 转桌面布局时触发按钮变为 display:none，抽屉必须随之收起并释放滚动锁。
// 用媒体查询而不是观察按钮自身：元素切到 display:none 后浏览器不再向 ResizeObserver 派发尺寸变更，抽屉会停在打开状态。
const desktop = typeof window === 'undefined' ? undefined : window.matchMedia(DESKTOP_QUERY)
function onBreakpoint() {
  if (desktop?.matches) open.value = false
}

onMounted(() => desktop?.addEventListener('change', onBreakpoint))
onBeforeUnmount(() => desktop?.removeEventListener('change', onBreakpoint))
</script>

<template>
  <!-- 手机端版块入口：三条横线按钮与搜索栏同处一行，为列表省出一行高度；当前版块名由结果计数行与抽屉内选中态表达。 -->
  <button ref="trigger" type="button" :aria-label="`切换讨论版块，当前为${current}`" aria-haspopup="dialog" aria-controls="forum-board-drawer" :aria-expanded="open" class="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-solid border-line bg-soft text-ink transition-all duration-200 ease-(--ease-ios) hover:bg-surface active:scale-95 tablet:hidden" @click="open = true">
    <Menu class="size-5" :stroke-width="2" aria-hidden="true" />
  </button>
  <ForumBoardDrawer :open="open" :board="board" @update:open="open = $event" @select="choose" @closed="restoreFocus" />
</template>
