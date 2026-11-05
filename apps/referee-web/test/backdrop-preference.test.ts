import { describe, expect, it } from 'vitest'
import { BACKDROP_MOTION_KEY, readBackdropMotion, writeBackdropMotion } from '../src/infrastructure/backdrop-preference'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
    data,
  }
}

describe('背景动效偏好', () => {
  it('没有保存过偏好时默认开启', () => {
    expect(readBackdropMotion(memoryStorage())).toBe(true)
  })

  it('保存后能读回，关闭与再次开启都生效', () => {
    const storage = memoryStorage()
    writeBackdropMotion(storage, false)
    expect(storage.data.get(BACKDROP_MOTION_KEY)).toBe('off')
    expect(readBackdropMotion(storage)).toBe(false)
    writeBackdropMotion(storage, true)
    expect(readBackdropMotion(storage)).toBe(true)
  })

  it('无法识别的值回到默认开启，而不是误判为关闭', () => {
    expect(readBackdropMotion(memoryStorage({ [BACKDROP_MOTION_KEY]: 'garbage' }))).toBe(true)
  })

  it('存储缺失或读写抛出异常时不影响调用方', () => {
    const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('quota') } }
    expect(readBackdropMotion(undefined)).toBe(true)
    expect(readBackdropMotion(broken)).toBe(true)
    expect(() => writeBackdropMotion(broken, false)).not.toThrow()
    expect(() => writeBackdropMotion(undefined, false)).not.toThrow()
  })
})
