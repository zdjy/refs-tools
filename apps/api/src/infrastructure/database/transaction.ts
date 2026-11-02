import type { Pool, PoolClient } from 'pg'
import type { TransactionRunner } from '../../application/transaction.js'

/** 用同一连接提交或回滚事务；回滚失败时销毁连接，保留原始异常。 */
export async function withTransaction<T>(
  pool: Pick<Pool, 'connect'>,
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect()
  let destroy = false
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      destroy = true
    }
    throw error
  } finally {
    client.release(destroy)
  }
}

/** 在装配层注入 Repository 工厂；每次 run 均使用同一连接创建该事务的全部 Repository。 */
export function createTransactionRunner<Repositories>(
  pool: Pick<Pool, 'connect'>,
  createRepositories: (client: PoolClient) => Repositories,
): TransactionRunner<Repositories> {
  return {
    run: (work) => withTransaction(pool, (client) => work(createRepositories(client))),
  }
}
