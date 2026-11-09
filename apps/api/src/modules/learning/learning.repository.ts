import type { LearningAsset, LearningContent, LearningQuery, LearningVersion } from '@refs-tools/contracts/learning'
import type { PageQuery } from '@refs-tools/contracts/pagination'
import type { LearningRepository } from './learning.types.js'
import { PgLearningCategoriesRepository } from './learning-categories.repository.js'

type AssetRow = { id: string; status: LearningAsset['status']; revision: number; latest_version: number; published_version: number | null }
const assetColumns = 'id,status,revision,latest_version,published_version'
function asset(row: AssetRow): LearningAsset { return { id: row.id, status: row.status, revision: row.revision,
  latestVersion: row.latest_version, publishedVersion: row.published_version } }
type VersionRow = { asset_id: string; version: number; title: string; summary: string; body: LearningContent['body']; allow_download: boolean;
  created_by: string; created_at: Date; category_ids: string[]; media_ids: string[] }
const versionColumns = 'v.asset_id,v.version,v.title,v.summary,v.body,v.allow_download,v.created_by,v.created_at,v.category_ids,v.media_ids'
function version(row: VersionRow): LearningVersion { return { assetId: row.asset_id, version: row.version, title: row.title,
  summary: row.summary, body: row.body, allowDownload: row.allow_download, categoryIds: row.category_ids, mediaIds: row.media_ids,
  createdBy: row.created_by, createdAt: row.created_at.toISOString() } }
const listFrom = `FROM learning_assets a JOIN learning_asset_versions v ON v.asset_id=a.id
  AND v.version=CASE WHEN $1 THEN a.latest_version ELSE a.published_version END
  WHERE ($1 OR a.status='published') AND ($2::text IS NULL OR strpos(lower(v.title||' '||v.summary),lower($2))>0)
  AND ($3::uuid IS NULL OR EXISTS (SELECT 1 FROM learning_asset_categories c JOIN learning_categories k ON k.id=c.category_id
    WHERE c.asset_id=a.id AND c.asset_version=v.version AND c.category_id=$3 AND k.status='active'))`

/** 资料聚合的版本及分类/媒体引用均为追加式；逻辑实体用 revision 拒绝并发覆盖。 */
export class PgLearningRepository extends PgLearningCategoriesRepository implements LearningRepository {
  async create(record: LearningAsset, actor: string, key: string, fingerprint: string) {
    const result = await this.connection.query(`INSERT INTO learning_assets(id,status,revision,latest_version,published_version,created_by,idempotency_key,request_fingerprint)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(created_by,idempotency_key) DO NOTHING RETURNING id`,
    [record.id, record.status, record.revision, record.latestVersion, record.publishedVersion, actor, key, fingerprint])
    return result.rowCount === 1
  }

  async findCreation(actor: string, key: string) {
    const result = await this.connection.query<AssetRow & { request_fingerprint: string }>(`SELECT ${assetColumns},request_fingerprint
      FROM learning_assets WHERE created_by=$1 AND idempotency_key=$2 FOR UPDATE`, [actor, key])
    const row = result.rows[0]
    return row ? { asset: asset(row), fingerprint: row.request_fingerprint } : null
  }

  async asset(id: string) {
    const result = await this.connection.query<AssetRow>(`SELECT ${assetColumns} FROM learning_assets WHERE id=$1 FOR UPDATE`, [id])
    return result.rows[0] ? asset(result.rows[0]) : null
  }

  async version(id: string, number: number) {
    const result = await this.connection.query<VersionRow>(`SELECT ${versionColumns} FROM learning_asset_versions v WHERE asset_id=$1 AND version=$2`, [id, number])
    return result.rows[0] ? version(result.rows[0]) : null
  }

  async versions(id: string, query: PageQuery) {
    const page = Number(query.page ?? 1), pageSize = Number(query.pageSize ?? 20)
    const count = await this.connection.query<{ total: string }>('SELECT count(*) AS total FROM learning_asset_versions WHERE asset_id=$1', [id])
    const rows = await this.connection.query<VersionRow>(`SELECT ${versionColumns} FROM learning_asset_versions v
      WHERE asset_id=$1 ORDER BY version DESC LIMIT $2 OFFSET $3`, [id, pageSize, (page - 1) * pageSize])
    return { items: rows.rows.map(version), total: Number(count.rows[0]!.total), page, pageSize }
  }

  async list(query: LearningQuery, management: boolean) {
    const page = Number(query.page ?? 1), pageSize = Number(query.pageSize ?? 20)
    const values = [management, query.q ?? null, query.categoryId ?? null]
    const count = await this.connection.query<{ total: string }>(`SELECT count(*) AS total ${listFrom}`, values)
    const rows = await this.connection.query<{ id: string; status: LearningAsset['status']; revision: number; version: number;
      title: string; summary: string; allow_download: boolean }>(`SELECT a.id,a.status,a.revision,v.version,v.title,v.summary,v.allow_download
      ${listFrom} ORDER BY a.id DESC LIMIT $4 OFFSET $5`, [...values, pageSize, (page - 1) * pageSize])
    return { items: rows.rows.map(r => ({ id: r.id, status: r.status, revision: r.revision, version: r.version,
      title: r.title, summary: r.summary, allowDownload: r.allow_download })), total: Number(count.rows[0]!.total), page, pageSize }
  }

  async appendVersion(id: string, number: number, input: LearningContent, actor: string, at: string) {
    await this.connection.query(`INSERT INTO learning_asset_versions(asset_id,version,title,summary,body,allow_download,created_by,created_at,category_ids,media_ids)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [id, number, input.title, input.summary, JSON.stringify(input.body), input.allowDownload, actor, at, input.categoryIds, input.mediaIds])
    await this.connection.query(`INSERT INTO learning_asset_categories(asset_id,asset_version,category_id)
      SELECT $1,$2,unnest($3::uuid[])`, [id, number, input.categoryIds])
    await this.connection.query(`INSERT INTO learning_asset_media(asset_id,asset_version,media_id)
      SELECT $1,$2,unnest($3::uuid[])`, [id, number, input.mediaIds])
  }

  async recordPublication(record: LearningAsset, actor: string, at: string) {
    await this.connection.query(`INSERT INTO learning_publications(asset_id,asset_version,revision,published_by,published_at)
      VALUES($1,$2,$3,$4,$5)`, [record.id, record.publishedVersion, record.revision, actor, at])
  }

  async save(record: LearningAsset, expectedRevision: number) {
    const result = await this.connection.query(`UPDATE learning_assets SET status=$2,revision=$3,latest_version=$4,published_version=$5
      WHERE id=$1 AND revision=$6 RETURNING id`, [record.id, record.status, record.revision, record.latestVersion, record.publishedVersion, expectedRevision])
    return result.rowCount === 1
  }
}
