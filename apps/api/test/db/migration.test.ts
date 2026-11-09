import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Pool } from 'pg'
import {
  applyTestMigrations, createTestDatabase, migrationsDirectory, withinRollback,
  type TestDatabase,
} from '../helpers/database.js'
import { appliedMigrations, loadMigrations, migrateDown, migrateUp } from '../../src/infrastructure/database/migrations.js'
import { createTransactionRunner, withTransaction } from '../../src/infrastructure/database/transaction.js'

const migrations = await loadMigrations(migrationsDirectory)
const migrationIds = ['0001', '0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009', '0010', '0011', '0012']

describe('迁移文件', () => {
  it('加载可执行及可回滚的核心迁移', () => {
    expect(migrations.map(({ id }) => id)).toEqual(migrationIds)
    expect(migrations[0]?.up).toContain('CREATE FUNCTION set_updated_at()')
    expect(migrations[0]?.down).toContain('DROP FUNCTION set_updated_at()')
  })
})

describe.skipIf(!process.env['TEST_DATABASE_URL'])('PostgreSQL 基架', () => {
  let database: TestDatabase | undefined
  let pool: Pool

  beforeAll(async () => {
    database = await createTestDatabase()
    pool = database.pool
  })
  beforeEach(async () => { await database!.reset() })
  afterAll(async () => { await database?.close() })

  it('空 schema 可迁移、幂等重跑、回滚后重新应用', async () => {
    expect(await applyTestMigrations(pool)).toEqual(migrationIds)
    expect(await applyTestMigrations(pool)).toEqual([])
    expect(await migrateDown(pool, migrations)).toBe('0012')
    expect((await pool.query("SELECT to_regclass('learning_assets') AS table")).rows[0].table).toBeNull()
    expect(await migrateDown(pool, migrations)).toBe('0011')
    expect((await pool.query("SELECT to_regclass('certifications') AS table")).rows[0].table).toBeNull()
    expect(await migrateDown(pool, migrations)).toBe('0010')
    expect((await pool.query("SELECT to_regclass('platform_organization_invites') AS table")).rows[0].table).toBeNull()
    expect((await pool.query("SELECT to_regclass('organization_ownership_transfers') AS table")).rows[0].table).toBeNull()
    expect(await migrateDown(pool, migrations)).toBe('0009')
    expect((await pool.query("SELECT to_regclass('organization_join_codes') AS table")).rows[0].table).toBeNull()
    expect(await migrateDown(pool, migrations)).toBe('0008')
    expect((await pool.query("SELECT to_regclass('referee_profiles') AS table")).rows[0].table).toBeNull()
    expect(await migrateDown(pool, migrations)).toBe('0007')
    expect((await pool.query("SELECT to_regclass('organization_invitations') AS table")).rows[0].table).toBeNull()
    expect((await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='organization_memberships' AND column_name='version'")).rows).toEqual([])
    expect(await migrateDown(pool, migrations)).toBe('0006')
    expect((await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='organizations' AND column_name='version'")).rows).toEqual([])
    expect(await migrateDown(pool, migrations)).toBe('0005')
    expect((await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='users' AND column_name='deleted_at'")).rows).toEqual([])
    expect(await migrateDown(pool, migrations)).toBe('0004')
    expect((await pool.query("SELECT to_regclass('media_objects') AS table")).rows[0].table).toBeNull()
    expect(await migrateDown(pool, migrations)).toBe('0003')
    expect((await pool.query("SELECT to_regclass('audit_events') AS table")).rows[0].table).toBeNull()
    expect((await pool.query("SELECT to_regclass('organizations') AS table")).rows[0].table).toBeNull()
    expect(await migrateDown(pool, migrations)).toBe('0002')
    expect((await pool.query("SELECT to_regclass('users') AS table")).rows[0].table).toBeNull()
    expect(await migrateDown(pool, migrations)).toBe('0001')
    const result = await pool.query("SELECT to_regprocedure('set_updated_at()') AS function")
    expect(result.rows[0].function).toBeNull()
    expect(await appliedMigrations(pool)).toEqual([])
    expect(await migrateDown(pool, migrations)).toBeNull()
    expect(await applyTestMigrations(pool)).toEqual(migrationIds)
  })

  it('并发迁移只应用一次', async () => {
    const results = await Promise.all([applyTestMigrations(pool), applyTestMigrations(pool)])
    expect(results.flat()).toEqual(migrationIds)
    expect(await appliedMigrations(pool)).toHaveLength(migrationIds.length)
  })

  it('失败的迁移连同 DDL 一起回滚', async () => {
    await applyTestMigrations(pool)
    await expect(migrateUp(pool, [...migrations, {
      id: '9999', name: 'broken',
      up: 'CREATE TABLE failed_migration (id integer); SELECT 1 / 0;',
      down: 'DROP TABLE failed_migration;',
    }])).rejects.toMatchObject({ code: '22012' })
    const result = await pool.query("SELECT to_regclass('failed_migration') AS table")
    expect(result.rows[0].table).toBeNull()
    expect(await appliedMigrations(pool)).toHaveLength(migrationIds.length)
  })

  it('唯一约束及外键拒绝非法写入', async () => {
    await applyTestMigrations(pool)
    await pool.query(`
      CREATE TABLE constraint_parent (id integer PRIMARY KEY);
      CREATE TABLE constraint_child (id integer PRIMARY KEY, parent_id integer REFERENCES constraint_parent);
      INSERT INTO constraint_parent VALUES (1);
    `)
    await expect(pool.query('INSERT INTO constraint_parent VALUES (1)'))
      .rejects.toMatchObject({ code: '23505' })
    await expect(pool.query('INSERT INTO constraint_child VALUES (1, 999)'))
      .rejects.toMatchObject({ code: '23503' })
  })

  it('提交事务，异常回滚，连接可重复使用', async () => {
    await pool.query('CREATE TABLE transaction_probe (id integer PRIMARY KEY)')
    await withTransaction(pool, async (client) => { await client.query('INSERT INTO transaction_probe VALUES (1)') })
    const error = new Error('业务失败')
    await expect(withTransaction(pool, async (client) => {
      await client.query('INSERT INTO transaction_probe VALUES (2)')
      throw error
    })).rejects.toBe(error)
    await withinRollback(pool, async (client) => { await client.query('INSERT INTO transaction_probe VALUES (3)') })
    const result = await pool.query('SELECT id FROM transaction_probe ORDER BY id')
    expect(result.rows).toEqual([{ id: 1 }])
  })

  it('事务端口将多个 Repository 绑定到同一事务，失败时一起回滚', async () => {
    await pool.query('CREATE TABLE repository_probe (id integer PRIMARY KEY)')
    const transaction = createTransactionRunner(pool, (client) => ({
      records: { save: () => client.query('INSERT INTO repository_probe VALUES (1)') },
      audit: { append: () => client.query('INSERT INTO repository_probe VALUES (2)') },
    }))
    const error = new Error('业务失败')
    await expect(transaction.run(async ({ records, audit }) => {
      await records.save()
      await audit.append()
      throw error
    })).rejects.toBe(error)
    expect((await pool.query('SELECT id FROM repository_probe')).rows).toEqual([])
    await transaction.run(async ({ records, audit }) => {
      await records.save()
      await audit.append()
    })
    expect((await pool.query('SELECT id FROM repository_probe ORDER BY id')).rows).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('测试池达到两条连接后等待并超时，释放后恢复', async () => {
    const first = await pool.connect()
    const second = await pool.connect()
    try {
      await expect(pool.connect()).rejects.toThrow(/timeout/i)
      expect(pool.totalCount).toBe(2)
    } finally {
      first.release()
      second.release()
    }
    expect((await pool.query('SELECT 1 AS value')).rows).toEqual([{ value: 1 }])
  })
})
