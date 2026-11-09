import type { PoolClient } from 'pg'
import type { Certification, CertificationReviewSummary, CertificationSummary } from '@refs-tools/contracts/certifications'
import type { PageQuery, Paged } from '@refs-tools/contracts/pagination'
import { effectiveCertificationStatus } from '@refs-tools/domain'
import type { CertificationFilter } from './certifications.types.js'

type Row = { payload: Certification; organization_active: boolean; member_active: boolean; display_name: string; legal_name: string | null }
const from = `FROM certifications c LEFT JOIN organizations o ON o.id=c.organization_id
  JOIN users u ON u.id=c.subject_user_id LEFT JOIN referee_profiles p ON p.user_id=u.id`
const effect = `COALESCE(o.status='active',true) AS organization_active,
  (c.scope_type='platform' OR EXISTS(SELECT 1 FROM organization_memberships m
    WHERE m.organization_id=c.organization_id AND m.user_id=c.subject_user_id AND m.status='active')) AS member_active`
function summary(row: Row): CertificationSummary {
  const { id, subjectUserId, scope, level, status, reviewedAt, version, createdAt, updatedAt } = row.payload
  return { id, subjectUserId, scope, level, status, reviewedAt, version, createdAt, updatedAt,
    effectiveStatus: effectiveCertificationStatus(status, row.organization_active, row.member_active) }
}

/** 认证模块拥有的最小审核投影，跨模块只读实名/昵称；本人摘要不查询身份字段。 */
export class PgCertificationListRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  private async rows(filter: CertificationFilter, query: PageQuery, identity: boolean) {
    const page = Number(query.page ?? '1'), pageSize = Number(query.pageSize ?? '20')
    const values = [filter.subjectUserId ?? null, filter.scope?.type ?? null, filter.scope?.organizationId ?? null,
      filter.queue ?? false, filter.appealQueue ?? false, filter.records ?? false, filter.status ?? null]
    const where = `WHERE ($1::uuid IS NULL OR c.subject_user_id=$1) AND ($2::text IS NULL OR c.scope_type=$2)
      AND ($2::text IS NULL OR c.organization_id IS NOT DISTINCT FROM $3::uuid)
      AND (NOT $5::boolean OR EXISTS(SELECT 1 FROM certification_appeals a WHERE a.certification_id=c.id AND a.status='pending'))
      AND (NOT $6::boolean OR c.status<>'draft') AND ($7::text IS NULL OR c.status=$7)
      AND (NOT $4::boolean OR (c.status='under_review' AND (c.scope_type='platform' OR
        (o.status='active' AND EXISTS(SELECT 1 FROM organization_memberships m WHERE m.organization_id=c.organization_id AND m.user_id=c.subject_user_id AND m.status='active')))))`
    const count = await this.connection.query<{ total: string }>(`SELECT count(*) AS total ${from} ${where}`, values)
    const result = await this.connection.query<Row>(`SELECT c.payload,${effect}${identity ? ',u.display_name,p.legal_name' : ''} ${from} ${where}
      ORDER BY c.created_at DESC,c.id DESC LIMIT $8 OFFSET $9`, [...values, pageSize, (page - 1) * pageSize])
    return { rows: result.rows, total: Number(count.rows[0]!.total), page, pageSize }
  }

  /** 本人摘要不返回身份或证书明细。 */
  async list(filter: CertificationFilter, query: PageQuery): Promise<Paged<CertificationSummary>> {
    const { rows, ...paging } = await this.rows(filter, query, false)
    return { ...paging, items: rows.map(summary) }
  }

  /** 调用方须先完成范围授权并在同事务记录读取审计。 */
  async reviewList(filter: CertificationFilter, query: PageQuery): Promise<Paged<CertificationReviewSummary>> {
    const { rows, ...paging } = await this.rows(filter, query, true)
    return { ...paging, items: rows.map(row => ({ ...summary(row), applicant: { nickname: row.display_name, legalName: row.legal_name } })) }
  }
}
