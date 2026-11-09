import type { PoolClient } from 'pg'
import type { Certification, CertificationHistory, CertificationScope, CertificationSummary } from '@refs-tools/contracts/certifications'
import type { PageQuery, Paged } from '@refs-tools/contracts/pagination'
import { effectiveCertificationStatus } from '@refs-tools/domain'
import type { CertificationFilter, CertificationsRepository } from './certifications.types.js'
import { PgCertificationAppealsRepository } from './certification-appeals.repository.js'
import { PgCertificationListRepository } from './certification-list.repository.js'

type Row = { payload: Certification; organization_active: boolean; member_active: boolean }
const effect = `COALESCE(o.status='active',true) AS organization_active,
  (c.scope_type='platform' OR EXISTS(SELECT 1 FROM organization_memberships m
    WHERE m.organization_id=c.organization_id AND m.user_id=c.subject_user_id AND m.status='active')) AS member_active`
const from = 'FROM certifications c LEFT JOIN organizations o ON o.id=c.organization_id'
function map(row: Row): Certification {
  return { ...row.payload, effectiveStatus: effectiveCertificationStatus(row.payload.status, row.organization_active, row.member_active) }
}
function paging(query: PageQuery) { return { page: Number(query.page ?? '1'), pageSize: Number(query.pageSize ?? '20') } }

/** 认证聚合拥有当前记录、不可变版本与材料引用；外部表仅作最小授权/资格投影。 */
export class PgCertificationsRepository extends PgCertificationAppealsRepository implements CertificationsRepository {
  constructor(private readonly db: Pick<PoolClient, 'query'>) { super(db) }

  async locate(id: string) {
    const result = await this.db.query<{ subject_user_id: string; scope_type: CertificationScope['type']; organization_id: string | null }>(
      'SELECT subject_user_id,scope_type,organization_id FROM certifications WHERE id=$1', [id])
    const row = result.rows[0]
    return row ? { subjectUserId: row.subject_user_id, scope: { type: row.scope_type, organizationId: row.organization_id } as CertificationScope } : null
  }

  async lockOrganization(id: string) {
    const result = await this.db.query<{ active: boolean }>("SELECT status='active' AS active FROM organizations WHERE id=$1 FOR UPDATE", [id])
    return result.rows[0] ?? null
  }

  async find(id: string) {
    const result = await this.db.query<Row>(`SELECT c.payload,${effect} ${from} WHERE c.id=$1 FOR UPDATE OF c`, [id])
    return result.rows[0] ? map(result.rows[0]) : null
  }

  async current(subject: string, scope: CertificationScope) {
    const result = await this.db.query<Row>(`SELECT c.payload,${effect} ${from}
      WHERE c.subject_user_id=$1 AND c.scope_type=$2 AND c.organization_id IS NOT DISTINCT FROM $3 FOR UPDATE OF c`,
    [subject, scope.type, scope.organizationId])
    return result.rows[0] ? map(result.rows[0]) : null
  }

  async request(subject: string, key: string) {
    const result = await this.db.query<{ id: string; request_fingerprint: string }>(
      'SELECT id,request_fingerprint FROM certifications WHERE subject_user_id=$1 AND idempotency_key=$2', [subject, key])
    const row = result.rows[0]
    return row ? { id: row.id, fingerprint: row.request_fingerprint } : null
  }

  async insert(record: Certification, key: string, fingerprint: string) {
    await this.db.query(`INSERT INTO certifications(id,subject_user_id,scope_type,organization_id,status,version,payload,idempotency_key,request_fingerprint,created_at,updated_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [record.id, record.subjectUserId, record.scope.type, record.scope.organizationId,
      record.status, record.version, JSON.stringify(record), key, fingerprint, record.createdAt, record.updatedAt])
  }

  async save(record: Certification, expectedVersion: number) {
    const result = await this.db.query(`UPDATE certifications SET payload=$3,status=$4,version=$5,updated_at=$6 WHERE id=$1 AND version=$2 RETURNING id`,
      [record.id, expectedVersion, JSON.stringify(record), record.status, record.version, record.updatedAt])
    return result.rowCount === 1
  }

  async list(filter: CertificationFilter, query: PageQuery): Promise<Paged<CertificationSummary>> {
    return new PgCertificationListRepository(this.db).list(filter, query)
  }

  async reviewList(filter: CertificationFilter, query: PageQuery) {
    return new PgCertificationListRepository(this.db).reviewList(filter, query)
  }

  async prerequisiteOrganizations(subject: string) {
    const result = await this.db.query<{ organization_id: string }>(
      "SELECT organization_id FROM certifications WHERE subject_user_id=$1 AND scope_type='organization' ORDER BY organization_id", [subject])
    return result.rows.map(row => row.organization_id)
  }

  async hasPrerequisite(subject: string, organizationIds: string[]) {
    // 锁定现有组织/成员/认证依据；退出、冻结或撤销不能在本事务提交前使其失效。
    const result = await this.db.query(`SELECT c.id FROM certifications c JOIN organizations o ON o.id=c.organization_id
      JOIN organization_memberships m ON m.organization_id=c.organization_id AND m.user_id=c.subject_user_id
      WHERE c.subject_user_id=$1 AND c.scope_type='organization' AND c.status='approved' AND o.status='active' AND m.status='active'
      AND c.organization_id=ANY($2::uuid[]) ORDER BY c.id FOR SHARE OF c,o,m`, [subject, organizationIds])
    return result.rows.length > 0
  }

  async appendHistory(record: Certification, actor: string, action: string, now: string) {
    await this.db.query(`INSERT INTO certification_history(certification_id,version,record,actor_user_id,action,created_at)
      VALUES($1,$2,$3,$4,$5,$6)`, [record.id, record.version, JSON.stringify(record), actor, action, now])
    const ids = [...record.evidenceMediaIds, ...record.historyMediaIds]
    const kinds = [...record.evidenceMediaIds.map(() => 'evidence'), ...record.historyMediaIds.map(() => 'history')]
    await this.db.query(`INSERT INTO certification_media(certification_id,version,media_id,kind)
      SELECT $1,$2,media_id,kind FROM unnest($3::uuid[],$4::text[]) AS t(media_id,kind)`, [record.id, record.version, ids, kinds])
  }

  async history(id: string, query: PageQuery): Promise<Paged<CertificationHistory>> {
    const { page, pageSize } = paging(query)
    const count = await this.db.query<{ total: string }>('SELECT count(*) AS total FROM certification_history WHERE certification_id=$1', [id])
    const rows = await this.db.query<{ record: Certification; actor_user_id: string; action: string; created_at: Date }>(
      `SELECT record,actor_user_id,action,created_at FROM certification_history WHERE certification_id=$1 ORDER BY version DESC LIMIT $2 OFFSET $3`, [id, pageSize, (page - 1) * pageSize])
    return { items: rows.rows.map(row => ({ record: row.record, actorUserId: row.actor_user_id, action: row.action, createdAt: row.created_at.toISOString() })),
      total: Number(count.rows[0]!.total), page, pageSize }
  }

  async hasEvidence(id: string, mediaId: string, appealId?: string) {
    const result = appealId ? await this.db.query(`SELECT id FROM certification_appeals
      WHERE certification_id=$1 AND id=$3 AND (payload->'evidenceMediaIds' ? $2::text
        OR EXISTS(SELECT 1 FROM certification_media m WHERE m.certification_id=$1 AND m.media_id=$2::uuid))`, [id, mediaId, appealId])
      : await this.db.query('SELECT media_id FROM certification_media WHERE certification_id=$1 AND media_id=$2', [id, mediaId])
    return result.rows.length > 0
  }

  async mediaReferences(mediaId: string) {
    const result = await this.db.query<{ id: string; subject_user_id: string; scope_type: CertificationScope['type']; organization_id: string | null }>(
      `SELECT c.id,c.subject_user_id,c.scope_type,c.organization_id FROM certifications c WHERE
        EXISTS(SELECT 1 FROM certification_media m WHERE m.certification_id=c.id AND m.media_id=$1)
        OR EXISTS(SELECT 1 FROM certification_appeals a WHERE a.certification_id=c.id AND a.payload->'evidenceMediaIds' ? $1::text)`, [mediaId])
    return result.rows.map(row => ({ id: row.id, subjectUserId: row.subject_user_id,
      scope: { type: row.scope_type, organizationId: row.organization_id } as CertificationScope }))
  }
}
