import { describe, expect, it } from 'vitest'
import { MediaService } from '../../src/modules/media/media.service.js'
import { mediaHarness } from '../helpers/media.js'

describe('上传意图', () => {
  it('核验身份和用途后签发精确对象授权，超限不签发', async () => {
    const h = mediaHarness()
    const service = new MediaService(h.dependencies)
    const result = await service.create(h.actor, { purpose: 'forum_attachment', contentType: 'image/jpeg', sizeBytes: 100 }, 'intent-1')
    expect(result.upload.method).toBe('PUT')
    expect(result.objectKey).toMatch(/^media\//)
    await expect(service.create(h.actor, { purpose: 'forum_attachment', contentType: 'image/jpeg', sizeBytes: 2097153 }, 'intent-2')).rejects.toMatchObject({ code: 'MEDIA_TOO_LARGE' })
  })

  it('同一幂等键返回同一个 intent，载荷不同拒绝，配额不能靠换 key 绕过', async () => {
    const h = mediaHarness()
    const service = new MediaService(h.dependencies)
    const input = { purpose: 'forum_attachment' as const, contentType: 'image/jpeg', sizeBytes: 100 }
    const first = await service.create(h.actor, input, 'one')
    expect((await service.create(h.actor, input, 'one')).mediaId).toBe(first.mediaId)
    await expect(service.create(h.actor, { ...input, sizeBytes: 101 }, 'one')).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' })
    for (let i = 1; i < 10; i++) await service.create(h.actor, input, `quota-${i}`)
    await expect(service.create(h.actor, input, 'overflow')).rejects.toMatchObject({ code: 'RATE_LIMITED' })
  })
})
