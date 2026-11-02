import { formatClock, type WorkbenchSession } from '../../domain/workbench'
import { STAT_LABELS, type TeamRecord, type TeamStat } from '../../domain/scorer'

/** 按队伍汇总命中/出手与命中率，不将手动比分纠错计入投篮次数。 */
export function shootingSummary(team: TeamRecord) {
  const s = team.stats
  const ratio = (made: number, missed: number) => `${made}/${made + missed} (${made + missed ? (made / (made + missed) * 100).toFixed(1) : '0.0'}%)`
  return { field: ratio(s.twoMade + s.threeMade, s.twoMiss + s.threeMiss), three: ratio(s.threeMade, s.threeMiss), free: ratio(s.ftMade, s.ftMiss) }
}

/** 生成带 BOM 的 RFC 4180 风格 CSV，防止以公式前缀开头的队名在表格软件中执行。 */
export function toCsv(rows: (string | number)[][]): string {
  const cell = (value: string | number) => {
    const text = String(value)
    const safe = /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text
    return `"${safe.replaceAll('"', '""')}"`
  }
  return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n')
}

/** 导出队伍总分、分节比分及统计；不包含球员数据。 */
export function boxScoreCsv(session: WorkbenchSession): string {
  const stats = Object.keys(STAT_LABELS) as TeamStat[]
  return toCsv([
    ['队伍', '总分', '分节比分', '投篮', '三分', '罚球', ...stats.map((stat) => STAT_LABELS[stat])],
    ...(['home', 'away'] as const).map((side) => {
      const team = session.scorer.teams[side]
      const shooting = shootingSummary(team)
      return [team.name, team.score, Array.from({ length: session.period }, (_, i) => team.periodScores[i] ?? 0).join(' / '), shooting.field, shooting.three, shooting.free, ...stats.map((stat) => team.stats[stat])]
    }),
  ])
}

/** 流水按时间从早到晚导出，最多包含会话保留的最近 200 条。 */
export function eventLogCsv(session: WorkbenchSession): string {
  return toCsv([['节次', '比赛剩余时间', '比分', '操作时间', '事件', '详情'], ...[...session.events].reverse().map((event) => [
    event.period ?? '', event.gameRemainingMs === undefined ? '' : formatClock(event.gameRemainingMs), event.score ?? '',
    new Date(event.at).toISOString(), event.label, event.detail ?? '',
  ])])
}
