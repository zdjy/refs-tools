import type { WorkbenchSession } from './workbench'
import { withEvent } from './workbench'

export type TeamSide = 'home' | 'away'
export type TeamStat = 'ftMade' | 'ftMiss' | 'twoMade' | 'twoMiss' | 'threeMade' | 'threeMiss' | 'rebounds' | 'assists' | 'steals' | 'blocks' | 'turnovers' | 'technicalFouls'
export interface ScorerRules {
  overtimeDurationMs: number
  timeoutDurationMs: number
  /** 本工具按节分配暂停，不声称复现 FIBA/NBA 的半场或整场暂停规则。 */
  timeoutsPerPeriod: number
  foulWarningLimit: number
}
export interface TeamRecord {
  name: string
  score: number
  /** 分节比分含手动纠错；下标为节次减一。 */
  periodScores: number[]
  stats: Record<TeamStat, number>
  timeoutsLeft: number
}
export interface ScorerState {
  rules: ScorerRules
  teams: Record<TeamSide, TeamRecord>
  possession: TeamSide | null
  shotLinked: boolean
  timeoutTeam: TeamSide | null
}
export const DEFAULT_SCORER_RULES: ScorerRules = {
  overtimeDurationMs: 300_000, timeoutDurationMs: 60_000, timeoutsPerPeriod: 2, foulWarningLimit: 5,
}
export const STAT_LABELS: Record<TeamStat, string> = {
  ftMade: '罚球命中', ftMiss: '罚球不中', twoMade: '两分命中', twoMiss: '两分不中',
  threeMade: '三分命中', threeMiss: '三分不中', rebounds: '篮板', assists: '助攻',
  steals: '抢断', blocks: '盖帽', turnovers: '失误', technicalFouls: '技术犯规',
}

/** 创建队伍级空记录；暂停配额取会话规则，不包含任何球员信息。 */
export function createScorer(rules: ScorerRules = DEFAULT_SCORER_RULES): ScorerState {
  const team = (name: string): TeamRecord => ({
    name, score: 0, periodScores: [0], timeoutsLeft: rules.timeoutsPerPeriod,
    stats: Object.fromEntries(Object.keys(STAT_LABELS).map((key) => [key, 0])) as Record<TeamStat, number>,
  })
  return { rules: { ...rules }, teams: { home: team('主队'), away: team('客队') }, possession: null, shotLinked: true, timeoutTeam: null }
}

/** 记录本地队伍动作及比分/比赛时间快照；日志有界，不作为正式比赛记录。 */
export function scorerEvent(session: WorkbenchSession, label: string, now: number): WorkbenchSession {
  return withEvent(session, { id: `event-${now}-${session.events.length}`, at: now, label }, now)
}

/** 以不可变转换记录队伍技术统计；命中自动加分，技术犯规仅计球队统计，不推断处罚。 */
export function recordTeamStat(session: WorkbenchSession, side: TeamSide, stat: TeamStat, now: number): WorkbenchSession {
  if (!(stat in STAT_LABELS)) throw new Error('无效的技术统计项目。')
  const team = session.scorer.teams[side]
  const points = stat === 'ftMade' ? 1 : stat === 'twoMade' ? 2 : stat === 'threeMade' ? 3 : 0
  const periodScores = [...team.periodScores]
  periodScores[session.period - 1] = (periodScores[session.period - 1] ?? 0) + points
  const next = { ...team, score: team.score + points, periodScores, stats: { ...team.stats, [stat]: team.stats[stat] + 1 } }
  return scorerEvent(replaceTeam(session, side, next), `${team.name} · ${STAT_LABELS[stat]}${points ? ` +${points}` : ''}`, now)
}

/** 仅校正本节比分，不虚构投篮次数；比分不得小于零，投篮统计纠错请撤销原操作。 */
export function correctScore(session: WorkbenchSession, side: TeamSide, delta: number, now: number): WorkbenchSession {
  if (!Number.isInteger(delta)) throw new Error('比分调整须为整数。')
  const team = session.scorer.teams[side]
  const score = team.periodScores[session.period - 1] ?? 0
  if (score + delta < 0) throw new Error('本节比分不能小于零；此前节次的记录请通过撤销更正。')
  const periodScores = [...team.periodScores]
  periodScores[session.period - 1] = score + delta
  return scorerEvent(replaceTeam(session, side, { ...team, score: team.score + delta, periodScores }), `${team.name} · 比分纠错 ${delta > 0 ? '+' : ''}${delta}（不改投篮统计）`, now)
}

/** 替换指定队伍记录，不改变另一队或原会话。 */
export function replaceTeam(session: WorkbenchSession, side: TeamSide, team: TeamRecord): WorkbenchSession {
  return { ...session, scorer: { ...session.scorer, teams: { ...session.scorer.teams, [side]: team } } }
}

/** 修改队名，拒绝空白与超长输入，避免本地日志与导出失去队伍标识。 */
export function renameTeam(session: WorkbenchSession, side: TeamSide, name: string, now: number): WorkbenchSession {
  const value = name.trim()
  if (!value || value.length > 40) throw new Error('队名须为 1–40 个字符。')
  const next = replaceTeam(session, side, { ...session.scorer.teams[side], name: value })
  return scorerEvent({ ...next, title: `${next.scorer.teams.home.name} vs ${next.scorer.teams.away.name}` }, `队名修改为 ${value}`, now)
}

/** 调整本节球队犯规；阈值仅用于提示，不自动宣判罚球。 */
export function adjustFoul(session: WorkbenchSession, side: TeamSide, delta: number, now: number): WorkbenchSession {
  const count = session.fouls[side] + delta
  if (!Number.isInteger(count) || count < 0) throw new Error('球队犯规不能小于零。')
  return scorerEvent({ ...session, fouls: { ...session.fouls, [side]: count } }, `${session.scorer.teams[side].name} · 本节犯规 ${count}`, now)
}

/** 手动设置交替拥有箭头；争球切换由调用方显式指定，不推断实际控球队。 */
export function setPossession(session: WorkbenchSession, side: TeamSide, now: number, heldBall = false): WorkbenchSession {
  return scorerEvent({ ...session, scorer: { ...session.scorer, possession: side } }, `${heldBall ? '争球 · ' : ''}交替拥有箭头指向 ${session.scorer.teams[side].name}`, now)
}
