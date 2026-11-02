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
  { key: 'overtimeMinutes', label: '加时时长（分钟）', max: 60 },
  { key: 'timeoutSeconds', label: '暂停时长（秒）', max: 300 },
  { key: 'timeoutsPerPeriod', label: '每节暂停配额', max: 20 },
  { key: 'foulWarningLimit', label: '球队犯规提示阈值', max: 20 },
] as const

/**
 * 将计时状态投影为展示文案；到时独立于运行状态，不靠刷新过程改写领域对象。
 * @param now 当前 Unix 时间戳（毫秒），与计时器时间基准一致。
 */
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
/**
 * 按设备本地时区显示操作时间，不改变导出记录的绝对时间。
 * @param at Unix 时间戳（毫秒）。
 */
export const formatTime = (at: number) => timeFormat.format(at)
/**
 * 按设备本地时区显示会话日期，区别于导出文件名中的 UTC 日期。
 * @param at Unix 时间戳（毫秒）。
 */
export const formatDate = (at: number) => new Date(at).toLocaleDateString('zh-CN')
