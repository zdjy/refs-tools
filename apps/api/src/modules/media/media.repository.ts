import type { PoolClient } from 'pg'
import type { MediaProviderEvent } from '@refs-tools/contracts/media'
import type { MediaRepository, ObjectStat, StoredMedia } from './media.types.js'

type Row = {
  id: string; owner_user_id: string; purpose: StoredMedia['purpose']; object_key: string
  target_type: StoredMedia['target']['type']; target_id: string | null; status: StoredMedia['status']
  declared_content_type: string; expected_size_bytes: string; verified_size_bytes: string | null
  expires_at: Date; created_at: Date; etag: string | null; cleaned_at: Date | null
}
const columns = 'id,owner_user_id,purpose,object_key,target_type,target_id,status,declared_content_type,expected_size_bytes,verified_size_bytes,expires_at,created_at,etag,cleaned_at'
function map(row: Row): StoredMedia {
  return { id: row.id, ownerUserId: row.owner_user_id, purpose: row.purpose, objectKey: row.object_key,
    target: { type: row.target_type, id: row.target_id } as StoredMedia['target'], status: row.status,
    contentType: row.declared_content_type, expectedSizeBytes: Number(row.expected_size_bytes),
    verifiedSizeBytes: row.verified_size_bytes === null ? null : Number(row.verified_size_bytes),
    expiresAt: row.expires_at.toISOString(), createdAt: row.created_at.toISOString(), etag: row.etag, cleanedAt: row.cleaned_at?.toISOString() ?? null }
}

/** 媒体表的唯一写入适配器；账号锁使同用户的配额检查与创建串行化。 */
export class PgMediaRepository implements MediaRepository {
  constructor(private readonly connection: Pick<PoolClient, 'query'>) {}

  async lockAccount(userId: string) {
    const result = await this.connection.query<{ verified: boolean }>(
      "SELECT email_verified_at IS NOT NULL AS verified FROM users WHERE id=$1 AND status='active' FOR UPDATE", [userId])
    return result.rows[0] ?? null
  }

  async quota(owner: string, now: string) {
    const result = await this.connection.query<{ pending: string; daily: string }>(`SELECT
      count(*) FILTER (WHERE status='pending_upload' AND expires_at > $2) AS pending,
      count(*) FILTER (WHERE created_at > $2::timestamptz - interval '1 day') AS daily
      FROM media_objects WHERE owner_user_id=$1`, [owner, now])
    return { pending: Number(result.rows[0]!.pending), daily: Number(result.rows[0]!.daily) }
  }

  async findIntent(owner: string, key: string) {
    const result = await this.connection.query<Row & { request_fingerprint: string }>(
      `SELECT ${columns},request_fingerprint FROM media_objects WHERE owner_user_id=$1 AND idempotency_key=$2 FOR UPDATE`, [owner, key])
    const row = result.rows[0]
    return row ? { media: map(row), fingerprint: row.request_fingerprint } : null
  }

  async insert(media: StoredMedia, fileName: string | null, key: string, fingerprint: string) {
    await this.connection.query(`INSERT INTO media_objects
      (id,owner_user_id,purpose,object_key,target_type,target_id,original_file_name,declared_content_type,expected_size_bytes,status,expires_at,created_at,idempotency_key,request_fingerprint)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [media.id, media.ownerUserId, media.purpose, media.objectKey, media.target.type, media.target.id, fileName,
      media.contentType, media.expectedSizeBytes, media.status, media.expiresAt, media.createdAt, key, fingerprint])
  }

  async find(id: string) {
    const result = await this.connection.query<Row>(`SELECT ${columns} FROM media_objects WHERE id=$1 FOR UPDATE`, [id])
    return result.rows[0] ? map(result.rows[0]) : null
  }

  async transition(id: string, from: StoredMedia['status'], status: StoredMedia['status'], now: string, stat?: ObjectStat) {
    await this.connection.query(`UPDATE media_objects SET status=$3,
      verified_size_bytes=COALESCE($5,verified_size_bytes), etag=COALESCE($6,etag),
      verified_at=CASE WHEN $3='available' THEN $4 ELSE verified_at END,
      deleted_at=CASE WHEN $3='deleted' THEN $4 ELSE deleted_at END
      WHERE id=$1 AND status=$2`, [id, from, status, now, stat?.sizeBytes ?? null, stat?.etag ?? null])
  }

  async recordEvent(event: MediaProviderEvent, now: string) {
    const result = await this.connection.query(`INSERT INTO media_upload_events(provider_event_id,media_id,received_at)
      VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING provider_event_id`, [event.eventId, event.mediaId, now])
    return result.rowCount === 1
  }

  async cleanupCandidates(now: string, limit: number) {
    const result = await this.connection.query<Row>(`SELECT ${columns} FROM media_objects
      WHERE expires_at <= $1 AND cleaned_at IS NULL AND status <> 'available'
      ORDER BY expires_at,id LIMIT $2`, [now, limit])
    return result.rows.map(map)
  }

  async markCleaned(id: string, now: string) {
    await this.connection.query("UPDATE media_objects SET cleaned_at=$2 WHERE id=$1 AND status IN ('expired','rejected','deleted')", [id, now])
  }
}
