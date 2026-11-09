import type { PoolClient } from 'pg'
import type { CertificationAppeal } from '@refs-tools/contracts/certifications'
import type { PageQuery, Paged } from '@refs-tools/contracts/pagination'

/** 申诉持久化属于认证聚合，独立拆文件以限制 SQL 文件规模。 */
export class PgCertificationAppealsRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  async hasPendingAppeal(certificationId: string) {
    const result = await this.connection.query("SELECT id FROM certification_appeals WHERE certification_id=$1 AND status='pending'", [certificationId])
    return result.rows.length > 0
  }

  async insertAppeal(appeal: CertificationAppeal) {
    const result = await this.connection.query(`INSERT INTO certification_appeals
      (id,certification_id,appellant_id,original_reviewer_id,reviewer_id,status,payload,created_at)
      VALUES($1,$2,$3,$4,NULL,'pending',$5,$6) ON CONFLICT (certification_id) WHERE status='pending' DO NOTHING RETURNING id`,
    [appeal.id, appeal.certificationId, appeal.appellantId, appeal.originalReviewerId, JSON.stringify(appeal), appeal.createdAt])
    return result.rowCount === 1
  }

  async appeal(certificationId: string, id: string) {
    const result = await this.connection.query<{ payload: CertificationAppeal }>(
      'SELECT payload FROM certification_appeals WHERE certification_id=$1 AND id=$2 FOR UPDATE', [certificationId, id])
    return result.rows[0]?.payload ?? null
  }

  async saveAppeal(appeal: CertificationAppeal) {
    const result = await this.connection.query(`UPDATE certification_appeals SET status=$3,reviewer_id=$4,payload=$5
      WHERE id=$1 AND certification_id=$2 AND status='pending' RETURNING id`,
    [appeal.id, appeal.certificationId, appeal.status, appeal.reviewerId, JSON.stringify(appeal)])
    return result.rowCount === 1
  }

  async appeals(certificationId: string, query: PageQuery): Promise<Paged<CertificationAppeal>> {
    const page = Number(query.page ?? '1'), pageSize = Number(query.pageSize ?? '20')
    const count = await this.connection.query<{ total: string }>('SELECT count(*) AS total FROM certification_appeals WHERE certification_id=$1', [certificationId])
    const result = await this.connection.query<{ payload: CertificationAppeal }>(
      'SELECT payload FROM certification_appeals WHERE certification_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3',
      [certificationId, pageSize, (page - 1) * pageSize])
    return { items: result.rows.map(row => row.payload), total: Number(count.rows[0]!.total), page, pageSize }
  }
}
