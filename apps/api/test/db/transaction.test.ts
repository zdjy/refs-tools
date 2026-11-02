import type { PoolClient } from 'pg'
import { describe, expect, it, vi } from 'vitest'
import type { TransactionRunner } from '../../src/application/transaction.js'
import { createTransactionRunner, withTransaction } from '../../src/infrastructure/database/transaction.js'

function connectionFixture() {
  const query = vi.fn(async (_sql: string) => ({ rows: [] }))
  const release = vi.fn()
  const client = { query, release } as unknown as PoolClient
  const connect = vi.fn(async () => client)
  return { client, query, release, connect }
}

describe('数据库事务适配器', () => {
  it('同一连接执行事务及多个 Repository，提交后返回用例结果', async () => {
    const fixture = connectionFixture()
    const createRepositories = vi.fn((client: PoolClient) => ({
      records: { save: () => client.query('INSERT record') },
      audit: { append: () => client.query('INSERT audit') },
    }))
    const runner = createTransactionRunner(fixture, createRepositories)
    const result = await runner.run(async ({ records, audit }) => {
      await records.save()
      await audit.append()
      return '完成'
    })
    expect(result).toBe('完成')
    expect(createRepositories).toHaveBeenCalledExactlyOnceWith(fixture.client)
    expect(fixture.connect).toHaveBeenCalledTimes(1)
    expect(fixture.query.mock.calls.map(([sql]) => sql))
      .toEqual(['BEGIN', 'INSERT record', 'INSERT audit', 'COMMIT'])
    expect(fixture.release).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('Repository 工厂每次绑定当前事务，避免复用已释放连接', async () => {
    const first = connectionFixture()
    const second = connectionFixture()
    const pool = { connect: vi.fn().mockResolvedValueOnce(first.client).mockResolvedValueOnce(second.client) }
    const createRepositories = vi.fn((client: PoolClient) => ({ save: () => client.query('INSERT record') }))
    const runner = createTransactionRunner(pool, createRepositories)
    await runner.run(async (repository) => { await repository.save() })
    await runner.run(async (repository) => { await repository.save() })
    expect(createRepositories.mock.calls.map(([client]) => client)).toEqual([first.client, second.client])
    for (const fixture of [first, second]) {
      expect(fixture.query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'INSERT record', 'COMMIT'])
      expect(fixture.release).toHaveBeenCalledExactlyOnceWith(false)
    }
  })

  it('用例失败时回滚，保留原始业务异常', async () => {
    const fixture = connectionFixture()
    const error = new Error('业务失败')
    const runner = createTransactionRunner(fixture, () => ({}))
    await expect(runner.run(async () => { throw error })).rejects.toBe(error)
    expect(fixture.query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'ROLLBACK'])
    expect(fixture.release).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('Repository 装配失败也回滚并释放连接', async () => {
    const fixture = connectionFixture()
    const error = new Error('Repository 装配失败')
    const runner = createTransactionRunner(fixture, () => { throw error })
    await expect(runner.run(async () => undefined)).rejects.toBe(error)
    expect(fixture.query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'ROLLBACK'])
    expect(fixture.release).toHaveBeenCalledExactlyOnceWith(false)
  })

  it.each(['BEGIN', 'COMMIT'])('%s 失败时尝试回滚并释放连接', async (statement) => {
    const fixture = connectionFixture()
    const error = new Error('事务控制失败')
    fixture.query.mockImplementation(async (sql) => {
      if (sql === statement) throw error
      return { rows: [] }
    })
    const work = vi.fn(async () => undefined)
    await expect(withTransaction(fixture, work)).rejects.toBe(error)
    expect(fixture.query.mock.calls.at(-1)).toEqual(['ROLLBACK'])
    expect(work).toHaveBeenCalledTimes(statement === 'BEGIN' ? 0 : 1)
    expect(fixture.release).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('回滚失败时销毁连接且不覆盖原始异常', async () => {
    const fixture = connectionFixture()
    fixture.query.mockImplementation(async (sql) => {
      if (sql === 'ROLLBACK') throw new Error('连接失效')
      return { rows: [] }
    })
    const error = new Error('业务失败')
    await expect(withTransaction(fixture, async () => { throw error })).rejects.toBe(error)
    expect(fixture.release).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('获取连接失败时不执行用例', async () => {
    const error = new Error('连接池超时')
    const pool = { connect: vi.fn(async (): Promise<PoolClient> => { throw error }) }
    const createRepositories = vi.fn(() => ({}))
    const runner = createTransactionRunner(pool, createRepositories)
    const work = vi.fn(async () => undefined)
    await expect(runner.run(work)).rejects.toBe(error)
    expect(createRepositories).not.toHaveBeenCalled()
    expect(work).not.toHaveBeenCalled()
  })
})

describe('应用层事务端口', () => {
  it('用例可以仅依赖 Repository 契约运行，无需连接或查询能力', async () => {
    type Repositories = { records: { save: (id: string) => Promise<void> } }
    const save = vi.fn(async (_id: string) => undefined)
    const transaction: TransactionRunner<Repositories> = {
      run: (work) => work({ records: { save } }),
    }
    await transaction.run(async ({ records }) => { await records.save('record-1') })
    expect(save).toHaveBeenCalledExactlyOnceWith('record-1')
  })
})
