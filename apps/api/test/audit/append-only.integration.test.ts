import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { applyTestMigrations, createTestDatabase, withinRollback, type TestDatabase } from '../helpers/database.js'

describe('PostgreSQL 审计追加限制', () => {
  let db: TestDatabase
  const actor = randomUUID()
  beforeAll(async () => {
    db = await createTestDatabase()
    await applyTestMigrations(db.pool)
    await db.pool.query('INSERT INTO users (id,email,display_name) VALUES ($1,$2,$3)', [actor, 'audit@example.com', '裁判'])
  })
  afterAll(async () => { await db?.close() })

  it('允许追加，拒绝 UPDATE、DELETE 及 TRUNCATE', async () => {
    await db.pool.query(`INSERT INTO audit_events (id,actor_user_id,action,resource_type,resource_id,scope_type)
      VALUES ($1,$2,'audit.queried','audit_log',$2,'platform')`, [randomUUID(), actor])
    await expect(db.pool.query("UPDATE audit_events SET reason = '篡改'" )).rejects.toMatchObject({ code: '42501' })
    await expect(db.pool.query('DELETE FROM audit_events')).rejects.toMatchObject({ code: '42501' })
    await expect(db.pool.query('TRUNCATE audit_events')).rejects.toMatchObject({ code: '42501' })
    expect((await db.pool.query('SELECT count(*)::int AS count FROM audit_events')).rows).toEqual([{ count: 1 }])
  })

  it('最小权限运行账号能读写追加，但不能变更记录或关闭保护触发器', async () => {
    const before = (await db.pool.query('SELECT count(*)::int AS count FROM audit_events')).rows[0].count as number
    const role = `audit_test_${randomUUID().replaceAll('-', '')}`
    const schema = (await db.pool.query('SELECT current_schema() AS name')).rows[0].name as string
    await db.pool.query(`CREATE ROLE "${role}" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE`)
    try {
      await db.pool.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`)
      await db.pool.query(`GRANT SELECT,INSERT ON audit_events TO "${role}"`)
      await withinRollback(db.pool, async (client) => {
        await client.query(`SET LOCAL ROLE "${role}"`)
        await client.query(`INSERT INTO audit_events (id,actor_user_id,action,resource_type,resource_id,scope_type)
          VALUES ($1,$2,'audit.queried','audit_log',$2,'platform')`, [randomUUID(), actor])
        expect((await client.query('SELECT count(*)::int AS count FROM audit_events')).rows[0].count).toBe(before + 1)
      })
      for (const sql of ['UPDATE audit_events SET reason=NULL', 'DELETE FROM audit_events', 'TRUNCATE audit_events', 'ALTER TABLE audit_events DISABLE TRIGGER ALL']) {
        await expect(withinRollback(db.pool, async (client) => {
          await client.query(`SET LOCAL ROLE "${role}"`)
          await client.query(sql)
        })).rejects.toMatchObject({ code: '42501' })
      }
    } finally {
      await db.pool.query(`DROP OWNED BY "${role}"`)
      await db.pool.query(`DROP ROLE "${role}"`)
    }
  })
})
