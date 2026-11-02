import { randomUUID } from 'node:crypto'
import type { Pool } from 'pg'
import { PgAuthorizationRepository } from '../../src/modules/authorization/authorization.repository.js'
import { PgAuditRepository } from '../../src/modules/audit/audit.repository.js'
import { createTransactionRunner } from '../../src/infrastructure/database/transaction.js'

/** 只建立授权所需归属与状态；业务接口的建立流程留在所属模块测试。 */
export async function seedAuthorization(pool: Pool) {
  const ids = { owner: randomUUID(), actor: randomUUID(), outsider: randomUUID(), admin: randomUUID(),
    orgA: randomUUID(), orgB: randomUUID(), eventA: randomUUID(), eventB: randomUUID(),
    matchA: randomUUID(), matchB: randomUUID(), ownerBinding: randomUUID(), headBinding: randomUUID() }
  for (const user of [ids.owner, ids.actor, ids.outsider, ids.admin]) {
    await pool.query(`INSERT INTO users (id,email,display_name,email_verified_at) VALUES ($1,$2,'裁判',now())`, [user, `${user}@example.com`])
  }
  for (const org of [ids.orgA, ids.orgB]) {
    await pool.query("INSERT INTO organizations (id,owner_user_id,status) VALUES ($1,$2,'active')", [org, ids.owner])
  }
  for (const user of [ids.owner, ids.actor]) {
    await pool.query("INSERT INTO organization_memberships (id,organization_id,user_id,status) VALUES ($1,$2,$3,'active')", [randomUUID(), ids.orgA, user])
  }
  await pool.query("INSERT INTO events (id,organization_id,status) VALUES ($1,$2,'published'),($3,$4,'published')", [ids.eventA, ids.orgA, ids.eventB, ids.orgB])
  await pool.query("INSERT INTO matches (id,event_id,status) VALUES ($1,$2,'published'),($3,$4,'published')", [ids.matchA, ids.eventA, ids.matchB, ids.eventB])
  await pool.query(`INSERT INTO role_bindings (id,subject_user_id,role,scope_type,scope_id,granted_by,starts_at)
    VALUES ($1,$2,'owner','organization',$3,$2,'2026-11-01'), ($4,$5,'head_referee','event',$6,$2,'2026-11-01'),
    ($7,$8,'platform_admin','platform',NULL,$8,'2026-11-01')`,
  [ids.ownerBinding, ids.owner, ids.orgA, ids.headBinding, ids.actor, ids.eventA, randomUUID(), ids.admin])
  const transaction = createTransactionRunner(pool, (client) => ({
    authorization: new PgAuthorizationRepository(client), audit: new PgAuditRepository(client),
  }))
  return { ids, transaction, now: () => new Date('2026-11-02T12:00:00.000Z') }
}
