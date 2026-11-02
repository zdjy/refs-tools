import type { PoolClient } from 'pg'
import type { AuditEvent, AuditList, AuditSummary } from '@refs-tools/contracts/audit'
import type { AuditFilter, AuditRepository } from './audit.types.js'

type AuditRow = {
  id: string; actor_user_id: string; action: AuditSummary['action']; resource_type: AuditSummary['resourceType']
  resource_id: string; scope_type: AuditSummary['scopeType']; scope_id: string | null; reason: string | null; created_at: Date
}
function mapSummary(row: AuditRow): AuditSummary {
  return { id: row.id, actorUserId: row.actor_user_id, action: row.action, resourceType: row.resource_type,
    resourceId: row.resource_id, scopeType: row.scope_type, scopeId: row.scope_id,
    reason: row.reason, createdAt: row.created_at.toISOString() }
}

/** 审计查询仅返回目的限定摘要；事件不提供更新/删除端口。 */
export class PgAuditRepository implements AuditRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  async append(event: AuditEvent & { organizationId: string | null }): Promise<void> {
    await this.connection.query(`INSERT INTO audit_events
      (id,actor_user_id,action,resource_type,resource_id,scope_type,scope_id,organization_id,reason,before,after,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [event.id, event.actorUserId, event.action, event.resourceType, event.resourceId, event.scopeType,
      event.scopeId, event.organizationId, event.reason, event.before, event.after, event.createdAt])
  }

  async list(filter: AuditFilter): Promise<AuditList> {
    // 游标锚点也限定组织，跨组织 cursor 不泄露行或时间；UUID 避免 JS 日期精度损失。
    const result = await this.connection.query<AuditRow>(`SELECT id,actor_user_id,action,resource_type,resource_id,scope_type,scope_id,reason,created_at
      FROM audit_events WHERE ($1::uuid IS NULL OR organization_id=$1)
      AND ($2::text IS NULL OR scope_type=$2) AND ($3::uuid IS NULL OR scope_id=$3)
      AND ($4::text IS NULL OR resource_type=$4) AND ($5::uuid IS NULL OR resource_id=$5)
      AND ($6::uuid IS NULL OR (created_at,id) < (SELECT created_at,id FROM audit_events
        WHERE id=$6 AND ($1::uuid IS NULL OR organization_id=$1)))
      ORDER BY created_at DESC,id DESC LIMIT $7`,
    [filter.organizationId ?? null, filter.scopeType ?? null, filter.scopeId ?? null,
      filter.resourceType ?? null, filter.resourceId ?? null, filter.cursor ?? null, filter.limit + 1])
    const rows = result.rows.slice(0, filter.limit)
    return { items: rows.map(mapSummary), nextCursor: result.rows.length > filter.limit ? rows.at(-1)!.id : null }
  }
}
