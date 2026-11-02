import type { Pool } from 'pg'
import { withTransaction } from './transaction.js'
import { deleteExpiredAuthRecords } from '../../modules/auth/auth-maintenance.repository.js'

/** 以有限批次回收认证短期记录；调用方负责调度、连接预算和生命周期。 */
export async function cleanupAuthRecords(pool: Pool, now = new Date(), batch = 500) {
  if (!Number.isSafeInteger(batch) || batch < 1 || batch > 1000) throw new Error('Invalid cleanup batch')
  return withTransaction(pool, (client) => deleteExpiredAuthRecords(client, now, batch))
}
