import { computed, onScopeDispose, ref } from 'vue'
import { createSession, type ClockKind, type FoulCount, type RuleSet, type WorkbenchSession } from '../domain/workbench'
import {
  advancePeriod, changeSessionClock, setShotPreset, shotPresets,
} from '../domain/workbench-commands'
import { adjustFoul, correctScore, recordTeamStat, renameTeam, scorerEvent, setPossession, type TeamSide, type TeamStat } from '../domain/scorer'
import { callTimeout, editClock, endTimeout, restoreTimeout, settleClocks, toggleGame, toggleLink } from '../domain/scorer-clocks'
import { pauseSession } from './workbench-undo'
import type { WorkbenchPorts } from './workbench-ports'

/**
 * 编排工作台用例状态；不依赖 Pinia 或浏览器存储实现，由外层适配器注入端口。
 * @param ports 本地存储/导出端口；须在 Vue 活动作用域内创建以释放周期任务和资源。
 */
export function createWorkbenchState(ports: WorkbenchPorts) {
  const sessions = ref<WorkbenchSession[]>([])
  const activeId = ref('')
  const now = ref(Date.now())
  const storageError = ref('')
  const sessionNotice = ref('')
  const restoreFailed = ref(false)
  const commandError = ref('')
  const history = ref<Record<string, WorkbenchSession[]>>({})
  const undoCount = computed(() => history.value[activeId.value]?.length ?? 0)
  let ticker: ReturnType<typeof setInterval> | undefined
  const activeSession = computed(() => sessions.value.find((session) => session.id === activeId.value) ?? null)
  const presets = computed(() => activeSession.value ? shotPresets(activeSession.value.rules) : [])

  function restore() {
    try {
      const snapshot = ports.load()
      sessions.value = snapshot.sessions
      activeId.value = snapshot.activeId
      restoreFailed.value = false
      storageError.value = ''
      sessionNotice.value = activeId.value ? '已恢复本地比赛会话。数据保存在此设备，不会自动同步到业务比赛记录。' : ''
    } catch {
      restoreFailed.value = true
      storageError.value = '读取本地比赛记录失败。旧数据保持不变，请重试；清空前请先备份浏览器中的原始记录。'
    }
  }

  function initialize() {
    restore()
    now.value = Date.now()
    settle()
    if (!ticker) ticker = setInterval(settle, 100)
  }

  function persist(): boolean {
    if (restoreFailed.value) return false
    try {
      ports.save({ sessions: sessions.value, activeId: activeId.value })
      storageError.value = ''
      return true
    } catch {
      storageError.value = '本地存储不可用或空间不足。当前更改尚未保存，请重试或导出会话数据。'
      return false
    }
  }

  function settle() {
    const at = Date.now()
    now.value = at
    let changed = false
    sessions.value = sessions.value.map((session) => {
      const next = settleClocks(session, at)
      if (next !== session) changed = true
      return next
    })
    if (changed) persist()
  }

  function updateSession(updater: (session: WorkbenchSession, at: number) => WorkbenchSession) {
    settle()
    if (!activeSession.value) return
    const at = Date.now()
    const previous = activeSession.value
    try {
      const updated = updater(previous, at)
      if (updated === previous) return
      history.value[previous.id] = [...(history.value[previous.id] ?? []), pauseSession(previous, at)].slice(-40)
      sessions.value = sessions.value.map((session) => session.id === previous.id ? updated : session)
      commandError.value = ''
      persist()
    } catch (error) {
      commandError.value = error instanceof Error ? error.message : '操作失败，请重试。'
    }
  }

  function undo() {
    const snapshots = history.value[activeId.value]
    const snapshot = snapshots?.pop()
    if (!snapshot) return
    const at = Date.now()
    const restored = { ...pauseSession(snapshot, at), updatedAt: at }
    sessions.value = sessions.value.map((session) => session.id === activeId.value ? restored : session)
    sessionNotice.value = '已撤销上一步，计时器保持暂停，请核对后手动恢复。'
    commandError.value = ''
    persist()
  }

  /** 返回 false 表示恢复失败，未创建会话且调用方应保留当前表单。 */
  function startSession(rules: RuleSet): boolean {
    if (restoreFailed.value) return false
    const at = Date.now()
    const session = createSession(at, rules)
    sessions.value = [session, ...sessions.value]
    activeId.value = session.id
    sessionNotice.value = ''
    persist()
    return true
  }

  function selectSession(id: string) {
    if (!sessions.value.some((session) => session.id === id)) return
    activeId.value = id
    sessionNotice.value = ''
    commandError.value = ''
    persist()
  }

  function deleteSessions(ids: string[]) {
    const next = sessions.value.filter((session) => !ids.includes(session.id))
    const nextId = next.some((session) => session.id === activeId.value) ? activeId.value : next[0]?.id ?? ''
    try {
      ports.save({ sessions: next, activeId: nextId })
      for (const id of ids) delete history.value[id]
      sessions.value = next
      activeId.value = nextId
      restoreFailed.value = false
      storageError.value = ''
      sessionNotice.value = ''
    } catch {
      storageError.value = '无法访问本地存储，未能删除记录。当前会话仍然保留，请重试。'
    }
  }

  function exportSession() {
    if (!activeSession.value) return
    try {
      ports.download(activeSession.value)
      sessionNotice.value = '已发起会话导出，请确认浏览器已保存文件。文件可能包含比赛数据，请妥善保管。'
    } catch {
      sessionNotice.value = '导出失败，当前会话仍然保留，请重试导出。'
    }
  }

  onScopeDispose(() => {
    if (ticker) clearInterval(ticker)
    ports.dispose()
  })

  return {
    sessions, activeId, now, activeSession, presets, storageError, sessionNotice,
    restoreFailed, commandError, undoCount, undo, initialize, startSession, selectSession, exportSession,
    recordStat: (side: TeamSide, stat: TeamStat) => updateSession((session, at) => recordTeamStat(session, side, stat, at)),
    correctScore: (side: TeamSide, delta: number) => updateSession((session, at) => correctScore(session, side, delta, at)),
    renameTeam: (side: TeamSide, name: string) => updateSession((session, at) => renameTeam(session, side, name, at)),
    adjustFoul: (side: TeamSide, delta: number) => updateSession((session, at) => adjustFoul(session, side, delta, at)),
    setPossession: (side: TeamSide, held = false) => updateSession((session, at) => setPossession(session, side, at, held)),
    callTimeout: (side: TeamSide) => updateSession((session, at) => callTimeout(session, side, at)),
    endTimeout: () => updateSession(endTimeout),
    restoreTimeout: (side: TeamSide) => updateSession((session, at) => restoreTimeout(session, side, at)),
    toggleLink: () => updateSession(toggleLink),
    editClock: (kind: ClockKind, seconds: number) => updateSession((session, at) => editClock(session, kind, seconds, at)),
    retryStorage: () => restoreFailed.value ? restore() : persist(),
    removeSession: (id: string) => deleteSessions([id]),
    clearAll: () => deleteSessions(sessions.value.map((session) => session.id)),
    resetMatch: () => updateSession((session, at) => {
      const empty = createSession(at, { ...session.rules, scorerRules: session.scorer.rules })
      empty.scorer.teams.home.name = session.scorer.teams.home.name
      empty.scorer.teams.away.name = session.scorer.teams.away.name
      return scorerEvent({ ...empty, id: session.id, title: session.title, createdAt: session.createdAt, events: [] }, '重置整场比赛', at)
    }),
    switchPeriod: () => updateSession(advancePeriod),
    onFoul: (team: keyof FoulCount) => updateSession((session, at) => adjustFoul(session, team, 1, at)),
    applyPreset: (seconds: number) => updateSession((session, at) => setShotPreset(session, seconds, at)),
    toggleClock: (kind: ClockKind) => updateSession((session, at) => kind === 'game' ? toggleGame(session, at) : changeSessionClock(session, kind, 'toggle', at)),
    resetClock: (kind: ClockKind) => updateSession((session, at) => changeSessionClock(session, kind, 'reset', at)),
    clearEventLog: () => updateSession((session, at) => ({ ...session, events: [], updatedAt: at })),
  }
}

export type WorkbenchState = ReturnType<typeof createWorkbenchState>
