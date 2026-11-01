import {
  DEFAULT_RULES, resetClock, toggleClock, withEvent,
  type ClockKind, type RuleSet, type WorkbenchSession,
} from './workbench'

export interface WorkbenchRuleInput {
  periodCount: number | null
  periodMinutes: number | null
  shotSeconds: number | null
  shortShotSeconds: number | null
}

export function defaultRuleInput(): WorkbenchRuleInput {
  return {
    periodCount: DEFAULT_RULES.periodCount,
    periodMinutes: DEFAULT_RULES.periodDurationMs / 60_000,
    shotSeconds: DEFAULT_RULES.shotClockDurationMs / 1000,
    shortShotSeconds: DEFAULT_RULES.shortShotClockDurationMs / 1000,
  }
}

export function rulesFromInput(input: WorkbenchRuleInput, now: number): RuleSet {
  const fields = [input.periodCount, input.periodMinutes, input.shotSeconds, input.shortShotSeconds]
  if (fields.some((value) => value === null || !Number.isInteger(value) || value < 1)
    || input.periodCount! > 12 || fields.slice(1).some((value) => value! > 60)) {
    throw new Error('请填写完整参数：节数为 1–12 的整数，分钟和秒数为 1–60 的整数。')
  }
  return {
    id: `custom-${now}`, label: '自定义规则参数', periodCount: input.periodCount!,
    periodDurationMs: input.periodMinutes! * 60_000,
    shotClockDurationMs: input.shotSeconds! * 1000,
    shortShotClockDurationMs: input.shortShotSeconds! * 1000,
  }
}

export function changeSessionClock(session: WorkbenchSession, kind: ClockKind, action: 'toggle' | 'reset', now: number): WorkbenchSession {
  const previous = session.clocks[kind]
  const clock = action === 'reset' ? resetClock(previous) : toggleClock(previous, now)
  if (clock === previous) return session
  const verb = action === 'reset' ? '重置' : previous.status === 'running' ? '暂停' : previous.status === 'paused' ? '恢复' : '开始'
  return withEvent({ ...session, clocks: { ...session.clocks, [kind]: clock } }, {
    id: `event-${now}-${kind}-${verb}`, at: now, label: `${verb}${previous.label}`,
  }, now)
}

export function advancePeriod(session: WorkbenchSession, now: number): WorkbenchSession {
  const period = session.period >= session.rules.periodCount ? 1 : session.period + 1
  return withEvent({
    ...session, period, fouls: { home: 0, away: 0 },
    clocks: {
      ...session.clocks,
      game: resetClock({ ...session.clocks.game, durationMs: session.rules.periodDurationMs }),
      shot: resetClock({ ...session.clocks.shot, durationMs: session.rules.shotClockDurationMs }),
    },
  }, { id: `event-${now}-period`, at: now, label: `进入第 ${period} 节` }, now)
}

export function setShotPreset(session: WorkbenchSession, seconds: number, now: number): WorkbenchSession {
  if (!shotPresets(session.rules).includes(seconds)) throw new Error('请选择当前规则配置中的计时参数。')
  const shot = resetClock({ ...session.clocks.shot, durationMs: seconds * 1000 })
  return withEvent({ ...session, clocks: { ...session.clocks, shot } }, {
    id: `event-${now}-preset`, at: now, label: `进攻计时设置为 ${seconds} 秒`, detail: '操作提示，不代表最终裁决',
  }, now)
}

export function shotPresets(rules: RuleSet): number[] {
  return [...new Set([rules.shotClockDurationMs / 1000, rules.shortShotClockDurationMs / 1000, 8])]
}

