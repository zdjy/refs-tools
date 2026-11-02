import { createScorer, STAT_LABELS, type ScorerRules, type ScorerState } from '../domain/scorer'

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

/** 校验本地规则快照，拒绝异常时长及无效配额。 */
export function isScorerRules(value: unknown): value is ScorerRules {
  return record(value) && count(value.overtimeDurationMs) && value.overtimeDurationMs > 0 && value.overtimeDurationMs <= 3_600_000
    && count(value.timeoutDurationMs) && value.timeoutDurationMs > 0 && value.timeoutDurationMs <= 300_000
    && count(value.timeoutsPerPeriod) && value.timeoutsPerPeriod > 0 && value.timeoutsPerPeriod <= 20
    && count(value.foulWarningLimit) && value.foulWarningLimit > 0 && value.foulWarningLimit <= 20
}

/** 对新队伍记录完整校验；缺失字段仅由旧版会话迁移入口补齐，损坏数据不回退为零。 */
export function isScorer(value: unknown): value is ScorerState {
  if (!record(value) || !isScorerRules(value.rules) || !record(value.teams)) return false
  const rules = value.rules
  return [null, 'home', 'away'].includes(value.possession as string | null)
    && [null, 'home', 'away'].includes(value.timeoutTeam as string | null) && typeof value.shotLinked === 'boolean'
    && ['home', 'away'].every((side) => {
      const team = (value.teams as Record<string, unknown>)[side]
      return record(team) && typeof team.name === 'string' && team.name.trim().length > 0 && team.name.length <= 40
        && count(team.score) && count(team.timeoutsLeft) && team.timeoutsLeft <= rules.timeoutsPerPeriod
        && Array.isArray(team.periodScores) && team.periodScores.every(count)
        && team.periodScores.reduce((sum: number, score: number) => sum + score, 0) === team.score
        && record(team.stats) && Object.keys(STAT_LABELS).every((stat) => count((team.stats as Record<string, unknown>)[stat]))
    })
}

/** 旧 v1 会话没有计分数据，仅在读取时补空队伍；不写回或改动原始规则版本。 */
export function migrateScorer(value: unknown): unknown {
  if (!record(value) || value.scorer !== undefined) return value
  return { ...value, scorer: createScorer() }
}
