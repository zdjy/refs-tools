import { computed, ref } from 'vue'
import type { BoardId } from '../../content/threads.sample'
import { threadsByBoard } from './home.presentation'

/** 论坛信息流的界面状态：当前版块与已展开的帖子。均为临时界面状态，不写入存储。 */
export function useThreadFeed() {
  const board = ref<BoardId | 'all'>('all')
  const expanded = ref<ReadonlySet<string>>(new Set())
  const threads = computed(() => threadsByBoard(board.value))

  function toggle(id: string) {
    const next = new Set(expanded.value)
    if (!next.delete(id)) next.add(id)
    expanded.value = next
  }

  return { board, threads, expanded, toggle }
}
