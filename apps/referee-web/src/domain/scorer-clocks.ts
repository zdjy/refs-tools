import { createClock, remainingMs, toggleClock, type ClockKind, type ClockState, type WorkbenchSession } from './workbench'
import { replaceTeam, scorerEvent, type TeamSide } from './scorer'

function pause(clock: ClockState, now: number) {
  return clock.status === 'running' ? toggleClock(clock, now) : clock
}

/** 启停主钟并按 shotLinked 联动进攻钟；暂停中及主钟到零时拒绝启动。 */
export function toggleGame(session: WorkbenchSession, now: number): WorkbenchSession {
  const game = session.clocks.game
  if (game.status !== 'running' && session.scorer.timeoutTeam) throw new Error('请先结束球队暂停。')
  const nextGame = toggleClock(game, now)
  if (nextGame === game) return session
  let shot = session.clocks.shot
  if (session.scorer.shotLinked) {
    shot = nextGame.status === 'running'
      ? shot.status === 'running' ? shot : toggleClock(shot, now)
      : pause(shot, now)
  }
  return scorerEvent({ ...session, clocks: { ...session.clocks, game: nextGame, shot } }, `${nextGame.status === 'running' ? '开始' : '暂停'}比赛计时（${session.scorer.shotLinked ? '联动' : '独立'}）`, now)
}

/** 切换进攻钟联动模式；解联动先停进攻钟，重新联动跟随当前主钟状态。 */
export function toggleLink(session: WorkbenchSession, now: number): WorkbenchSession {
  const shotLinked = !session.scorer.shotLinked
  let shot = pause(session.clocks.shot, now)
  if (shotLinked && session.clocks.game.status === 'running') shot = toggleClock(shot, now)
  return scorerEvent({ ...session, scorer: { ...session.scorer, shotLinked }, clocks: { ...session.clocks, shot } }, `进攻钟${shotLinked ? '联动' : '独立'}模式`, now)
}

/** 精确调整剩余秒数；只允许停表修改，单位为秒，精度十分之一秒。 */
export function editClock(session: WorkbenchSession, kind: ClockKind, seconds: number, now: number): WorkbenchSession {
  if (session.clocks[kind].status === 'running') throw new Error('请先暂停该计时器再校正时间。')
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 7200 || Math.abs(seconds * 10 - Math.round(seconds * 10)) > 0.00001) {
    throw new Error('剩余时间须在 0–7200 秒之间，精确至 0.1 秒。')
  }
  const clock = { ...session.clocks[kind], durationMs: Math.max(100, Math.round(seconds * 1000)), elapsedBeforeStartMs: seconds === 0 ? 100 : 0, status: 'paused' as const, startedAt: null }
  return scorerEvent({ ...session, clocks: { ...session.clocks, [kind]: clock } }, `${clock.label}校正为 ${seconds} 秒`, now)
}

/** 消耗本节暂停配额，停止比赛与进攻钟，按会话配置启动球队暂停。 */
export function callTimeout(session: WorkbenchSession, side: TeamSide, now: number): WorkbenchSession {
  if (session.scorer.timeoutTeam) throw new Error('已有球队暂停进行中，请先结束。')
  const team = session.scorer.teams[side]
  if (team.timeoutsLeft <= 0) throw new Error('本节可用暂停已用尽。')
  const next = replaceTeam(session, side, { ...team, timeoutsLeft: team.timeoutsLeft - 1 })
  return scorerEvent({ ...next, scorer: { ...next.scorer, timeoutTeam: side }, clocks: {
    game: pause(session.clocks.game, now), shot: pause(session.clocks.shot, now),
    timeout: toggleClock(createClock('timeout', session.scorer.rules.timeoutDurationMs, '暂停计时'), now),
  } }, `${team.name} · 请求暂停`, now)
}

/** 结束球队暂停但不自动恢复比赛，避免未经记录员确认走表。 */
export function endTimeout(session: WorkbenchSession, now: number): WorkbenchSession {
  if (!session.scorer.timeoutTeam) return session
  return scorerEvent({ ...session, scorer: { ...session.scorer, timeoutTeam: null }, clocks: { ...session.clocks, timeout: pause(session.clocks.timeout, now) } }, '球队暂停结束（比赛未自动恢复）', now)
}

/** 恢复误扣的一次暂停，上限取本节配置；不改变正在进行的暂停。 */
export function restoreTimeout(session: WorkbenchSession, side: TeamSide, now: number): WorkbenchSession {
  const team = session.scorer.teams[side]
  if (team.timeoutsLeft >= session.scorer.rules.timeoutsPerPeriod) throw new Error('暂停次数已达本节配额。')
  return scorerEvent(replaceTeam(session, side, { ...team, timeoutsLeft: team.timeoutsLeft + 1 }), `${team.name} · 恢复一次暂停`, now)
}

/** 从时间戳处理到时；进攻到时只提示，不自动宣判违例，联动时停止主钟。 */
export function settleClocks(session: WorkbenchSession, now: number): WorkbenchSession {
  let next = session
  const kinds: ClockKind[] = ['game', 'shot', 'timeout']
  kinds.sort((a, b) => ((session.clocks[a].startedAt ?? now) + session.clocks[a].durationMs - session.clocks[a].elapsedBeforeStartMs)
    - ((session.clocks[b].startedAt ?? now) + session.clocks[b].durationMs - session.clocks[b].elapsedBeforeStartMs))
  for (const kind of kinds) {
    const clock = next.clocks[kind]
    if (clock.status !== 'running' || remainingMs(clock, now) > 0) continue
    // 到时瞬间固化关联时钟，避免后台恢复时把另一只时钟多扣至当前时刻。
    const expiredAt = (clock.startedAt ?? now) + clock.durationMs - clock.elapsedBeforeStartMs
    next = { ...next, clocks: { ...next.clocks, [kind]: pause(clock, expiredAt) } }
    if (kind === 'game') next.clocks.shot = pause(next.clocks.shot, expiredAt)
    if (kind === 'shot' && next.scorer.shotLinked) next.clocks.game = pause(next.clocks.game, expiredAt)
    if (kind === 'timeout') next = { ...next, scorer: { ...next.scorer, timeoutTeam: null } }
    next = scorerEvent(next, `${clock.label}已到时${kind === 'shot' ? '（提示，不代表违例裁决）' : ''}`, now)
  }
  return next
}

/** 进入下一节或加时；常规与加时时长来自快照，不循环回首节。 */
export function nextPeriod(session: WorkbenchSession, now: number): WorkbenchSession {
  const period = session.period + 1
  const durationMs = period > session.rules.periodCount ? session.scorer.rules.overtimeDurationMs : session.rules.periodDurationMs
  const teams = { ...session.scorer.teams }
  for (const side of ['home', 'away'] as const) teams[side] = {
    ...teams[side], timeoutsLeft: session.scorer.rules.timeoutsPerPeriod,
    periodScores: Array.from({ length: period }, (_, index) => teams[side].periodScores[index] ?? 0),
  }
  return scorerEvent({ ...session, period, fouls: { home: 0, away: 0 }, scorer: { ...session.scorer, teams, timeoutTeam: null }, clocks: {
    game: createClock('game', durationMs, '比赛计时'),
    shot: createClock('shot', session.rules.shotClockDurationMs, '进攻计时'), timeout: createClock('timeout', session.scorer.rules.timeoutDurationMs, '暂停计时'),
  } }, period > session.rules.periodCount ? `进入加时 ${period - session.rules.periodCount}` : `进入第 ${period} 节`, now)
}
