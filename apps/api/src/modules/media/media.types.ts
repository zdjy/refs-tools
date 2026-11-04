import type { MediaObject, MediaProviderEvent, MediaTarget, UploadAuthorization } from '@refs-tools/contracts/media'
import type { TransactionRunner } from '../../application/transaction.js'
import type { AuthorizationRepository, PermissionEvaluator } from '../authorization/authorization.types.js'
import type { AuditRepository } from '../audit/audit.types.js'

export type StoredMedia = MediaObject & {
  objectKey: string; target: MediaTarget | { type: 'self'; id: string }; createdAt: string
  etag: string | null; cleanedAt: string | null
}
export type ObjectStat = { sizeBytes: number; contentType: string; etag: string; mediaId: string; ownerUserId: string }
export interface ObjectStorage {
  signUpload(media: StoredMedia, expiresSeconds: number): Promise<UploadAuthorization>
  stat(objectKey: string): Promise<ObjectStat | null>
  signRead(media: StoredMedia, expiresSeconds: number): Promise<{ url: string; expiresAt: string }>
  delete(objectKey: string): Promise<void>
}
export interface MediaRepository {
  lockAccount(userId: string): Promise<{ verified: boolean } | null>
  quota(owner: string, now: string): Promise<{ pending: number; daily: number }>
  insert(media: StoredMedia, fileName: string | null, key: string, fingerprint: string): Promise<void>
  findIntent(owner: string, key: string): Promise<{ media: StoredMedia; fingerprint: string } | null>
  find(id: string): Promise<StoredMedia | null>
  transition(id: string, from: StoredMedia['status'], status: StoredMedia['status'], now: string, stat?: ObjectStat): Promise<void>
  recordEvent(event: MediaProviderEvent, now: string): Promise<boolean>
  cleanupCandidates(now: string, limit: number): Promise<StoredMedia[]>
  markCleaned(id: string, now: string): Promise<void>
}
export type MediaRepositories = { media: MediaRepository; authorization: AuthorizationRepository; audit: AuditRepository }
/** 后续业务模块必须核对实际目标/状态/归属；未注入时拒绝，不能仅凭组织角色放行答卷或赛后资料。 */
export type MediaBusinessAccess = (repositories: MediaRepositories, actor: string, media: StoredMedia, action: 'upload' | 'read' | 'delete') => Promise<void>
export type MediaDependencies = {
  transaction: TransactionRunner<MediaRepositories>; storage: ObjectStorage; permissions: PermissionEvaluator
  now: () => Date; bucket: string; businessAccess?: MediaBusinessAccess
}
