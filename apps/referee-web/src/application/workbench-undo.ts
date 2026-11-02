import { elapsedMs, type WorkbenchSession } from '../domain/workbench'

/** 快照固化每只时钟的已用时间；撤销不重新启动旧时间锚点，避免恢复后跳时。 */
export function pauseSession(session: WorkbenchSession, now: number): WorkbenchSession {
  return {
    ...session,
    clocks: Object.fromEntries(Object.entries(session.clocks).map(([kind, clock]) => [kind, {
      ...clock, status: clock.status === 'idle' ? 'idle' : 'paused', startedAt: null,
      elapsedBeforeStartMs: elapsedMs(clock, now),
    }])) as WorkbenchSession['clocks'],
  }
}
