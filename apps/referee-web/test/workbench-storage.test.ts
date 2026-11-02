import { describe, expect, it } from 'vitest'
import { ACTIVE_SESSION_KEY, STORAGE_KEY, createSession } from '../src/domain/workbench'
import { loadWorkbench, saveWorkbench } from '../src/infrastructure/workbench-storage'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
}

describe('工作台存储适配', () => {
  it('兼容现有 v1 存储，活动会话不存在时回退首个会话', () => {
    const storage = memoryStorage()
    const session = createSession(42)
    saveWorkbench(storage, { sessions: [session], activeId: 'missing' })
    expect(loadWorkbench(storage)).toEqual({ sessions: [session], activeId: session.id })
  })

  it('拒绝损坏或重复记录，不改写原始数据', () => {
    const storage = memoryStorage()
    for (const raw of ['{', '{}', '[{}]', JSON.stringify([{ ...createSession(), clocks: {} }])]) {
      storage.setItem(STORAGE_KEY, raw)
      expect(() => loadWorkbench(storage)).toThrow()
      expect(storage.getItem(STORAGE_KEY)).toBe(raw)
    }
    const session = createSession()
    storage.setItem(STORAGE_KEY, JSON.stringify([session, session]))
    expect(() => loadWorkbench(storage)).toThrow()
  })

  it('旧会话只读补齐空队伍，不把损坏的新记录当作旧记录重置', () => {
    const storage = memoryStorage()
    const { scorer: _, ...legacy } = createSession(42)
    const raw = JSON.stringify([legacy])
    storage.setItem(STORAGE_KEY, raw)
    expect(loadWorkbench(storage).sessions[0]?.scorer.teams.home.score).toBe(0)
    expect(loadWorkbench(storage).sessions[0]?.rules.id).toBe(legacy.rules.id)
    expect(storage.getItem(STORAGE_KEY)).toBe(raw)
    for (const scorer of [null, {}, { ...createSession(0).scorer, teams: {} }]) {
      storage.setItem(STORAGE_KEY, JSON.stringify([{ ...legacy, scorer }]))
      expect(() => loadWorkbench(storage)).toThrow()
    }
  })

  it('清空时移除两份存储键，并向调用者传播存储失败', () => {
    const storage = memoryStorage()
    const session = createSession()
    saveWorkbench(storage, { sessions: [session], activeId: session.id })
    saveWorkbench(storage, { sessions: [], activeId: '' })
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
    expect(storage.getItem(ACTIVE_SESSION_KEY)).toBeNull()
    expect(() => loadWorkbench({ getItem: () => { throw new Error('denied') } })).toThrow('denied')
  })
})
