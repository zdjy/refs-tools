import { onMounted, onScopeDispose, ref, watch } from 'vue'
import type { WorkbenchSession } from '../../domain/workbench'
import { createScorerAudio } from '../../infrastructure/scorer-audio'
import { downloadScorerFile } from '../../infrastructure/scorer-download'
import { boxScoreCsv, eventLogCsv } from './scorer-export'

interface ConsoleCommands {
  activeSession: WorkbenchSession | null
  toggleClock(kind: 'game'): void
  applyPreset(seconds: number): void
  setPossession(side: 'home' | 'away', held?: boolean): void
  undo(): void
}

/** 编排记录台声音、快捷键及导出界面状态；不改变比赛规则或引入远端同步。 */
export function useScorerConsole(workbench: ConsoleCommands) {
  const boxScoreVisible = ref(false)
  const shortcutsEnabled = ref(false)
  const muted = ref(true)
  const feedback = ref('')
  const audio = createScorerAudio()

  async function sound(kind: 'whistle' | 'buzzer') {
    feedback.value = kind === 'whistle' ? '哨音提示' : '蜂鸣提示'
    if (muted.value) { feedback.value += '（当前静音）'; return }
    try { await audio.play(kind) } catch { feedback.value += '：声音不可用，请使用视觉提示并检查设备音量。' }
  }
  function toggleMute() {
    muted.value = !muted.value
    if (!muted.value) void sound('buzzer')
  }
  watch(() => workbench.activeSession?.events[0], (event, previous) => {
    if (previous && event !== previous && event?.label.includes('已到时')) void sound('buzzer')
  })

  function exportCsv(kind: 'stats' | 'events') {
    if (!workbench.activeSession) return
    try {
      downloadScorerFile(kind === 'stats' ? '球队技术统计.csv' : '比赛事件流水.csv', kind === 'stats' ? boxScoreCsv(workbench.activeSession) : eventLogCsv(workbench.activeSession))
      feedback.value = '已发起导出，请确认文件已保存；文件包含比赛数据，请妥善保管。'
    } catch { feedback.value = '导出失败，当前记录未删除，请重试。' }
  }

  function onKey(event: KeyboardEvent) {
    if (!shortcutsEnabled.value || !workbench.activeSession || event.repeat || event.isComposing) return
    const target = event.target instanceof Element ? event.target : null
    if (document.querySelector('[aria-modal="true"], [role="dialog"], [role="tooltip"]') || target?.closest('input, textarea, select, [contenteditable="true"], [role="spinbutton"]')) return
    // Space 在按钮与链接上仍保留原生激活行为；字母快捷键不因最近点击按钮而失效。
    if (event.key === ' ' && target?.closest('button, a, summary')) return
    if (event.altKey || event.shiftKey) return
    if (event.ctrlKey || event.metaKey) {
      if (event.key.toLowerCase() === 'z') { event.preventDefault(); workbench.undo() }
      return
    }
    const session = workbench.activeSession
    const key = event.key.toLowerCase()
    const actions: Record<string, () => void> = {
      ' ': () => workbench.toggleClock('game'), r: () => workbench.applyPreset(session.rules.shotClockDurationMs / 1000),
      t: () => workbench.applyPreset(session.rules.shortShotClockDurationMs / 1000),
      p: () => workbench.setPossession(session.scorer.possession === 'home' ? 'away' : 'home'),
      h: () => { void sound('buzzer') },
    }
    if (actions[key]) { event.preventDefault(); actions[key]() }
  }
  onMounted(() => window.addEventListener('keydown', onKey))
  onScopeDispose(() => { window.removeEventListener('keydown', onKey); audio.dispose() })
  return { boxScoreVisible, shortcutsEnabled, muted, feedback, sound, toggleMute, exportCsv }
}
