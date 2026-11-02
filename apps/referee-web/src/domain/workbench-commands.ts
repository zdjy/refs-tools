import { DEFAULT_SCORER_RULES } from './scorer'
import { nextPeriod } from './scorer-clocks'
import {
  DEFAULT_RULES, resetClock, toggleClock, withEvent,
  type ClockKind, type RuleSet, type WorkbenchSession,
} from './workbench'

/** 创建表单使用分钟/秒；null 表示尚未填写，不隐式回退到默认参数。 */
export interface WorkbenchRuleInput {
  periodCount: number | null
  periodMinutes: number | null
  shotSeconds: number | null
  shortShotSeconds: number | null
  overtimeMinutes?: number | null
  timeoutSeconds?: number | null
  timeoutsPerPeriod?: number | null
  foulWarningLimit?: number | null
}

/** 从 DEFAULT_RULES 生成表单初值，将毫秒换算为输入所用的分钟/秒。 */
export function defaultRuleInput(): WorkbenchRuleInput {
  return {
    periodCount: DEFAULT_RULES.periodCount,
    periodMinutes: DEFAULT_RULES.periodDurationMs / 60_000,
    shotSeconds: DEFAULT_RULES.shotClockDurationMs / 1000,
    shortShotSeconds: DEFAULT_RULES.shortShotClockDurationMs / 1000,
    overtimeMinutes: DEFAULT_SCORER_RULES.overtimeDurationMs / 60_000,
    timeoutSeconds: DEFAULT_SCORER_RULES.timeoutDurationMs / 1000,
    timeoutsPerPeriod: DEFAULT_SCORER_RULES.timeoutsPerPeriod,
    foulWarningLimit: DEFAULT_SCORER_RULES.foulWarningLimit,
  }
}

/**
 * 校验完整输入并统一换算为毫秒，不以默认值掩盖缺失参数（spec 0002 §4.6）。
 * @param input 节数须为 1–12 的整数，每节分钟与两种进攻秒数须为 1–60 的整数。
 * @param now 创建时刻的 Unix 时间戳（毫秒），用于生成本次自定义规则标识。
 * @throws 输入缺失、非整数或越界时抛出可展示的参数错误。
 */
export function rulesFromInput(input: WorkbenchRuleInput, now: number): RuleSet {
  const fields = [input.periodCount, input.periodMinutes, input.shotSeconds, input.shortShotSeconds]
  if (fields.some((value) => value === null || !Number.isInteger(value) || value < 1)
    || input.periodCount! > 12 || fields.slice(1).some((value) => value! > 60)) {
    throw new Error('请填写完整参数：节数为 1–12 的整数，分钟和秒数为 1–60 的整数。')
  }
  const extra = {
    overtimeMinutes: input.overtimeMinutes === undefined ? 5 : input.overtimeMinutes,
    timeoutSeconds: input.timeoutSeconds === undefined ? 60 : input.timeoutSeconds,
    timeoutsPerPeriod: input.timeoutsPerPeriod === undefined ? 2 : input.timeoutsPerPeriod,
    foulWarningLimit: input.foulWarningLimit === undefined ? 5 : input.foulWarningLimit,
  }
  if (Object.values(extra).some((value) => value === null || !Number.isInteger(value) || value < 1)
    || extra.overtimeMinutes! > 60 || extra.timeoutSeconds! > 300 || extra.timeoutsPerPeriod! > 20 || extra.foulWarningLimit! > 20) {
    throw new Error('请检查加时、暂停时长、每节暂停次数及犯规提示阈值。')
  }
  return {
    id: `custom-${now}`, label: '自定义规则参数', periodCount: input.periodCount!,
    periodDurationMs: input.periodMinutes! * 60_000,
    shotClockDurationMs: input.shotSeconds! * 1000,
    shortShotClockDurationMs: input.shortShotSeconds! * 1000,
    scorerRules: { overtimeDurationMs: extra.overtimeMinutes! * 60_000, timeoutDurationMs: extra.timeoutSeconds! * 1000,
      timeoutsPerPeriod: extra.timeoutsPerPeriod!, foulWarningLimit: extra.foulWarningLimit! },
  }
}

/**
 * 将计时状态变更与操作日志合并为一次会话转换，避免两者分开保存。
 * @param now 操作时刻的 Unix 时间戳（毫秒）。
 * @returns 无法启动已到时计时器时返回原会话，不追加无效操作日志。
 */
export function changeSessionClock(session: WorkbenchSession, kind: ClockKind, action: 'toggle' | 'reset', now: number): WorkbenchSession {
  const previous = session.clocks[kind]
  if (kind === 'timeout' && session.scorer.timeoutTeam) throw new Error('请使用结束球队暂停，避免暂停状态与计时不一致。')
  if (kind === 'shot' && session.scorer.shotLinked && action === 'toggle') throw new Error('进攻钟处于联动模式，请操作比赛计时或先切换独立模式。')
  if (kind === 'shot' && session.scorer.timeoutTeam && action === 'toggle') throw new Error('球队暂停中不能启动进攻钟。')
  let clock = action === 'reset' ? resetClock(previous) : toggleClock(previous, now)
  if (kind === 'shot' && action === 'reset' && session.scorer.shotLinked && session.clocks.game.status === 'running') clock = toggleClock(clock, now)
  const shot = kind === 'game' && action === 'reset' && session.clocks.shot.status === 'running'
    ? toggleClock(session.clocks.shot, now) : session.clocks.shot
  if (clock === previous) return session
  const verb = action === 'reset' ? '重置' : previous.status === 'running' ? '暂停' : previous.status === 'paused' ? '恢复' : '开始'
  return withEvent({ ...session, clocks: { ...session.clocks, shot, [kind]: clock } }, {
    id: `event-${now}-${kind}-${verb}`, at: now, label: `${verb}${previous.label}`,
  }, now)
}

/** 进入下一节，常规节次结束后显式进入加时；使用会话固定的规则参数。 */
export function advancePeriod(session: WorkbenchSession, now: number): WorkbenchSession {
  return nextPeriod(session, now)
}

/**
 * 将进攻计时重置为当前会话允许的手动提示预设，不代表最终裁决（MVP-001 §9.1）。
 * @param seconds 以秒计的预设值，须来自 shotPresets(session.rules)。
 * @param now 操作时刻的 Unix 时间戳（毫秒）。
 * @throws 不属于当前预设集合时抛出可展示的参数错误。
 */
export function setShotPreset(session: WorkbenchSession, seconds: number, now: number): WorkbenchSession {
  if (!shotPresets(session.rules).includes(seconds)) throw new Error('请选择当前规则配置中的计时参数。')
  const initial = resetClock({ ...session.clocks.shot, durationMs: seconds * 1000 })
  const shot = session.scorer.shotLinked && session.clocks.game.status === 'running' ? toggleClock(initial, now) : initial
  return withEvent({ ...session, clocks: { ...session.clocks, shot } }, {
    id: `event-${now}-preset`, at: now, label: `进攻计时设置为 ${seconds} 秒`, detail: '操作提示，不代表最终裁决',
  }, now)
}

/**
 * 从规则快照的 shotClockDurationMs/shortShotClockDurationMs 换算预设，不再取当前默认值。
 * @returns 去重且保序的秒数列表，另保留 MVP-001 §9.1 的独立 8 秒手动提示。
 */
export function shotPresets(rules: RuleSet): number[] {
  return [...new Set([rules.shotClockDurationMs / 1000, rules.shortShotClockDurationMs / 1000, 8])]
}

