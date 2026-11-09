import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { learningHarness } from '../helpers/learning.js'
import { MediaService } from '../../src/modules/media/media.service.js'
import { AdminMediaService } from '../../src/modules/media/admin-media.service.js'

describe('学习媒体下载策略', () => {
  it('未验证邮箱读者可在线查看，禁用下载时拒绝 attachment；URL 不进入审计', async () => {
    const h = learningHarness()
    await h.publishing.publish(h.actor, h.id, 1, 1); h.setVerified(false)
    await expect(h.media.read(h.actor, h.id, h.mediaId, 'download')).rejects.toMatchObject({ code: 'LEARNING_DOWNLOAD_DISABLED' })
    await expect(h.media.read(h.actor, h.id, h.mediaId, 'view')).resolves.toHaveProperty('url')
    expect(h.dependencies.storage!.signRead).toHaveBeenCalledWith(expect.anything(), 60, 'inline')
    expect(JSON.stringify(h.audits)).not.toContain('https://')
    await expect(h.media.read(h.actor, h.id, randomUUID(), 'view')).rejects.toMatchObject({ statusCode: 404 })
  })
  it('允许下载时强制 attachment，签名期间下线不返回链接', async () => {
    const h = learningHarness()
    h.versions.set(1, { ...h.versions.get(1)!, allowDownload: true })
    await h.publishing.publish(h.actor, h.id, 1, 1)
    await h.media.read(h.actor, h.id, h.mediaId, 'download')
    expect(h.dependencies.storage!.signRead).toHaveBeenCalledWith(expect.anything(), 60, 'attachment')
    vi.mocked(h.dependencies.storage!.signRead).mockImplementationOnce(async () => {
      await h.publishing.unpublish(h.actor, h.id, 2)
      return { url: 'https://storage.example/stale', expiresAt: '2026-11-04T00:01:00.000Z' }
    })
    await expect(h.media.read(h.actor, h.id, h.mediaId, 'view')).rejects.toMatchObject({ statusCode: 404 })
  })
  it('签名期间账号停用、媒体删除或资料修订均拒绝返回授权', async () => {
    for (const change of ['account', 'media', 'revision']) {
      const h = learningHarness()
      await h.publishing.publish(h.actor, h.id, 1, 1)
      vi.mocked(h.dependencies.storage!.signRead).mockImplementationOnce(async () => {
        if (change === 'account') h.setActive(false)
        if (change === 'media') h.records.set(h.mediaId, { ...h.records.get(h.mediaId)!, status: 'deleted' })
        if (change === 'revision') h.setRecord({ revision: 3 })
        return { url: 'https://storage.example/stale', expiresAt: '2026-11-04T00:01:00.000Z' }
      })
      await expect(h.media.read(h.actor, h.id, h.mediaId, 'view')).rejects.toHaveProperty('statusCode')
    }
  })
  it('普通与治理删除入口均拒绝销毁历史版本引用的媒体', async () => {
    const h = learningHarness()
    h.repositories.media.hasLearningReferences = async () => true
    const d = { ...h.dependencies, storage: h.dependencies.storage!, bucket: 'test' }
    await expect(new MediaService(d).remove(h.actor, h.mediaId)).rejects.toMatchObject({ code: 'MEDIA_RETENTION_REQUIRED' })
    const admin = new AdminMediaService({ ...d, storage: h.dependencies.storage!, transaction: {
      run: work => work({ ...h.repositories, adminMedia: { list: vi.fn(), detail: vi.fn() } }),
    } })
    await expect(admin.remove(h.actor, h.mediaId, { reason: '删除文件' })).rejects.toMatchObject({ code: 'MEDIA_RETENTION_REQUIRED' })
  })
})
