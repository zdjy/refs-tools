import { randomUUID } from 'node:crypto'
import { permissions } from './permissions.js'
import type { MediaDependencies, MediaRepositories, ObjectStat, StoredMedia } from '../../src/modules/media/media.types.js'

/** 持久化与存储边界的内存替身，不替换媒体 Service 或授权引擎。 */
export function mediaHarness() {
  const actor = randomUUID()
  const objects = new Map<string, ObjectStat>()
  const records = new Map<string, StoredMedia>()
  const intents = new Map<string, { id: string; fingerprint: string }>()
  const events = new Set<string>()
  const audits: unknown[] = []
  let now = new Date('2026-11-04T00:00:00.000Z')
  let verified = true
  let active = true
  let member = true
  let inside = false
  const repositories: MediaRepositories = {
    media: {
      async lockAccount() { return active ? { verified } : null },
      async quota(owner, at) { return { pending: [...records.values()].filter((m) => m.ownerUserId === owner && m.status === 'pending_upload' && m.expiresAt > at).length, daily: records.size } },
      async insert(media, _name, key, fingerprint) { records.set(media.id, { ...media }); intents.set(`${media.ownerUserId}:${key}`, { id: media.id, fingerprint }) },
      async findIntent(owner, key) { const found = intents.get(`${owner}:${key}`); return found ? { media: records.get(found.id)!, fingerprint: found.fingerprint } : null },
      async find(id) { const media = records.get(id); return media ? { ...media } : null },
      async transition(id, from, status, _at, stat) { const media = records.get(id)!; if (media.status === from) records.set(id, { ...media, status, ...(stat ? { verifiedSizeBytes: stat.sizeBytes, etag: stat.etag } : {}) }) },
      async recordEvent(event) { if (events.has(event.eventId)) return false; events.add(event.eventId); return true },
      async cleanupCandidates(at, limit) { return [...records.values()].filter((m) => m.expiresAt <= at && !m.cleanedAt && m.status !== 'available').slice(0, limit) },
      async markCleaned(id, at) { records.set(id, { ...records.get(id)!, cleanedAt: at }) },
    },
    authorization: {
      async findBindings() { return [] }, async insertBinding() { return false }, async findBinding() { return null }, async revokeBinding() { return false },
      async isActiveMember() { return member },
      async resolveScope(ref) { return { type: ref.type, id: ref.id, organizationId: ref.type === 'organization' ? ref.id : null,
        eventId: null, matchId: null, ownerUserId: actor, organizationStatus: 'active', state: null } },
    },
    audit: { async append(event) { audits.push(event) }, async list() { return { items: [], nextCursor: null } } },
  }
  const dependencies: MediaDependencies = {
    permissions, bucket: 'test-bucket', now: () => now,
    transaction: { async run(work) { inside = true; try { return await work(repositories) } finally { inside = false } } },
    storage: {
      async signUpload(media, seconds) { if (inside) throw new Error('事务内存储调用'); return { method: 'PUT', url: 'https://storage.example/upload',
        headers: { 'Content-Type': media.contentType }, expiresAt: new Date(now.getTime() + seconds * 1000).toISOString() } },
      async stat(key) { if (inside) throw new Error('事务内存储调用'); return objects.get(key) ?? null },
      async signRead(_media, seconds) { if (inside) throw new Error('事务内存储调用'); return { url: 'https://storage.example/read', expiresAt: new Date(now.getTime() + seconds * 1000).toISOString() } },
      async delete(key) { if (inside) throw new Error('事务内存储调用'); objects.delete(key) },
    },
  }
  return { actor, objects, records, dependencies, audits, repositories,
    setNow(value: Date) { now = value }, setVerified(value: boolean) { verified = value },
    setActive(value: boolean) { active = value }, setMember(value: boolean) { member = value },
    upload(id: string, override: Partial<ObjectStat> = {}) { const media = records.get(id)!; objects.set(media.objectKey, {
      sizeBytes: media.expectedSizeBytes, contentType: media.contentType, etag: 'trusted-etag', mediaId: id, ownerUserId: actor, ...override,
    }) },
  }
}
