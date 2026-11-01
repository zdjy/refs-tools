import { formatClock, remainingMs, type ClockKind, type ClockState } from '../../domain/workbench'

export const clockEntries: Array<{ kind: ClockKind; label: string }> = [
  { kind: 'game', label: '比赛计时' },
  { kind: 'shot', label: '进攻计时' },
  { kind: 'timeout', label: '暂停计时' },
]

export const ruleFields = [
  { key: 'periodCount', label: '比赛节数', max: 12 },
  { key: 'periodMinutes', label: '每节分钟', max: 60 },
  { key: 'shotSeconds', label: '进攻计时（秒）', max: 60 },
  { key: 'shortShotSeconds', label: '短进攻计时（秒）', max: 60 },
] as const

export function presentClock(clock: ClockState, now: number) {
  const remaining = remainingMs(clock, now)
  const expired = clock.status !== 'idle' && remaining === 0
  return {
    value: formatClock(remaining), expired,
    state: expired ? '已到时' : clock.status === 'running' ? '进行中' : clock.status === 'paused' ? '已暂停' : '待开始',
    action: clock.status === 'running' ? '暂停' : clock.status === 'paused' ? '恢复' : '开始',
    cannotStart: remaining === 0 && clock.status !== 'running',
  }
}

const timeFormat = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
export const formatTime = (at: number) => timeFormat.format(at)
export const formatDate = (at: number) => new Date(at).toLocaleDateString('zh-CN')
