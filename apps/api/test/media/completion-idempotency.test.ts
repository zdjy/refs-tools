import { expect, it } from 'vitest'
import { MediaCompletionService } from '../../src/modules/media/media-completion.service.js'
import { mediaHarness } from '../helpers/media.js'

it('complete 不信任客户端完成声明，HEAD 通过后才可读，重试返回同一可用状态', async () => {
  const h = mediaHarness()
  const service = new MediaCompletionService(h.dependencies)
  const intent = await service.create(h.actor, { purpose: 'forum_attachment', contentType: 'image/jpeg', sizeBytes: 100 }, 'one')
  await expect(service.complete(h.actor, intent.mediaId)).rejects.toMatchObject({ code: 'OBJECT_NOT_FOUND' })
  h.upload(intent.mediaId)
  expect(await service.complete(h.actor, intent.mediaId)).toMatchObject({ status: 'available', verifiedSizeBytes: 100 })
  expect(await service.complete(h.actor, intent.mediaId)).toMatchObject({ status: 'available' })
  expect(await service.read(h.actor, intent.mediaId)).toMatchObject({ url: 'https://storage.example/read' })
})

it('大小/类型/归属不符的对象被拒绝，修正存储对象或迟到通知都不能复活', async () => {
  for (const override of [{ sizeBytes: 101 }, { contentType: 'text/html' }, { ownerUserId: 'other' }, { mediaId: 'other' }]) {
    const h = mediaHarness()
    const service = new MediaCompletionService(h.dependencies)
    const intent = await service.create(h.actor, { purpose: 'forum_attachment', contentType: 'image/png', sizeBytes: 100 }, 'one')
    h.upload(intent.mediaId, override)
    await expect(service.complete(h.actor, intent.mediaId)).rejects.toMatchObject({ code: 'MEDIA_VERIFICATION_FAILED' })
    h.upload(intent.mediaId)
    await expect(service.complete(h.actor, intent.mediaId)).rejects.toMatchObject({ code: 'MEDIA_VERIFICATION_FAILED' })
  }
})

it('过期禁止续签和完成，清理终态孤儿且不删除 available 对象', async () => {
  const h = mediaHarness()
  const service = new MediaCompletionService(h.dependencies)
  const intent = await service.create(h.actor, { purpose: 'forum_attachment', contentType: 'image/png', sizeBytes: 100 }, 'one')
  h.upload(intent.mediaId)
  h.setNow(new Date('2026-11-04T00:16:00.000Z'))
  await expect(service.renew(h.actor, intent.mediaId)).rejects.toMatchObject({ code: 'UPLOAD_INTENT_CLOSED' })
  await expect(service.complete(h.actor, intent.mediaId)).rejects.toMatchObject({ code: 'MEDIA_VERIFICATION_FAILED' })
  expect(await service.cleanup()).toEqual({ cleaned: 1 })
  expect(await service.cleanup()).toEqual({ cleaned: 0 })
})

it('删除幂等且审计不包含签名 URL，留存证据不可通用删除', async () => {
  const h = mediaHarness()
  const service = new MediaCompletionService(h.dependencies)
  const intent = await service.create(h.actor, { purpose: 'certification_evidence', contentType: 'image/png', sizeBytes: 100 }, 'one')
  h.upload(intent.mediaId)
  await service.complete(h.actor, intent.mediaId)
  await expect(service.remove(h.actor, intent.mediaId)).rejects.toMatchObject({ code: 'MEDIA_RETENTION_REQUIRED' })
  const forum = await service.create(h.actor, { purpose: 'forum_attachment', contentType: 'image/png', sizeBytes: 100 }, 'two')
  expect(await service.remove(h.actor, forum.mediaId)).toEqual({ status: 'deleted' })
  expect(await service.remove(h.actor, forum.mediaId)).toEqual({ status: 'deleted' })
  expect(h.audits).toHaveLength(1)
  expect(JSON.stringify(h.audits)).not.toContain('https:')
})
