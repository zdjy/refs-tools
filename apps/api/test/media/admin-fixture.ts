import { randomUUID } from 'node:crypto'
import { vi } from 'vitest'
import type { AdminMedia, AdminMediaQuery } from '@refs-tools/contracts/admin-media'
import { AdminMediaService } from '../../src/modules/media/admin-media.service.js'
import { MediaCompletionService } from '../../src/modules/media/media-completion.service.js'
import type { AdminMediaDependencies, AdminMediaRepositories } from '../../src/modules/media/media.types.js'
import { mediaHarness } from '../helpers/media.js'

/** 治理测试共享真实媒体用例与授权引擎，IO 仅替换端口。 */
export async function adminFixture() {
  const h = mediaHarness(), admin = randomUUID();
  let allowed = true
  h.repositories.authorization.findBindings = async user => allowed && user === admin ? [{
    id: randomUUID(), subjectUserId: admin, role: 'platform_admin', scopeType: 'platform', scopeId: null,
    grantedBy: admin, startsAt: '2026-01-01T00:00:00.000Z', expiresAt: null, revokedAt: null,
  }] : []
  const media = new MediaCompletionService(h.dependencies)
  const intent = await media.create(h.actor, { purpose: 'forum_attachment', fileName: '测试.jpg', contentType: 'image/jpeg', sizeBytes: 100 }, 'admin-test')
  h.upload(intent.mediaId); await media.complete(h.actor, intent.mediaId)
  const detail = async (id: string): Promise<AdminMedia | null> => {
    const m = h.records.get(id)
    return m ? { id: m.id, ownerUserId: m.ownerUserId, purpose: m.purpose, status: m.status, contentType: m.contentType,
      expectedSizeBytes: m.expectedSizeBytes, verifiedSizeBytes: m.verifiedSizeBytes, expiresAt: m.expiresAt,
      target: m.target, createdAt: m.createdAt, fileName: '测试.jpg', verifiedAt: m.createdAt, deletedAt: null, cleanedAt: null } : null
  }
  const repositories: AdminMediaRepositories = { ...h.repositories, adminMedia: {
    detail: vi.fn(detail), list: vi.fn(async (query: AdminMediaQuery) => ({ items: [(await detail(intent.mediaId))!], total: 1, page: Number(query.page ?? '1'), pageSize: 20 as const })),
  } }
  const dependencies: AdminMediaDependencies = { ...h.dependencies, transaction: { run: work => h.dependencies.transaction.run(() => work(repositories)) } }
  return { h, admin, intent, repositories, dependencies, service: new AdminMediaService(dependencies), revoke() { allowed = false } }
}
