import { randomUUID } from 'node:crypto'
import { expect, it } from 'vitest'
import { MediaCompletionService } from '../../src/modules/media/media-completion.service.js'
import { mediaHarness } from '../helpers/media.js'

/** 头像需要跨用户展示，其余用途维持只有归属者能读取。 */
it('头像对登录用户开放读取，其他用途仍对非本人隐藏', async () => {
  const h = mediaHarness()
  const service = new MediaCompletionService(h.dependencies)
  const avatar = await service.create(h.actor, { purpose: 'avatar', contentType: 'image/jpeg', sizeBytes: 1024 }, 'avatar')
  h.upload(avatar.mediaId)
  await service.complete(h.actor, avatar.mediaId)
  const stranger = randomUUID()
  expect(await service.read(stranger, avatar.mediaId)).toHaveProperty('url')

  const attachment = await service.create(h.actor, { purpose: 'forum_attachment', contentType: 'image/jpeg', sizeBytes: 1024 }, 'attachment')
  h.upload(attachment.mediaId)
  await service.complete(h.actor, attachment.mediaId)
  await expect(service.read(stranger, attachment.mediaId)).rejects.toMatchObject({ code: 'NOT_FOUND' })
})

it('头像只能是图片且目标必须是本人，不接受平台或组织目标', async () => {
  const h = mediaHarness()
  const service = new MediaCompletionService(h.dependencies)
  await expect(service.create(h.actor, { purpose: 'avatar', contentType: 'application/pdf', sizeBytes: 1024 }, 'pdf'))
    .rejects.toMatchObject({ code: 'MEDIA_TYPE_NOT_ALLOWED' })
  await expect(service.create(h.actor, { purpose: 'avatar', contentType: 'image/jpeg', sizeBytes: 1024,
    target: { type: 'organization', id: randomUUID() } }, 'org')).rejects.toMatchObject({ code: 'NOT_FOUND' })
})
