import { expect, it } from 'vitest'
import { createOssStorage } from '../../src/providers/object-storage/oss.js'
import { mediaHarness } from '../helpers/media.js'
import { MediaCompletionService } from '../../src/modules/media/media-completion.service.js'

it('SDK 签名绑定精确 key、类型、owner 和禁止覆盖头，读取强制下载及 no-store', async () => {
  const h = mediaHarness()
  const service = new MediaCompletionService(h.dependencies)
  const created = await service.create(h.actor, { purpose: 'forum_attachment', contentType: 'image/jpeg', sizeBytes: 100 }, 'one')
  const media = h.records.get(created.mediaId)!
  const { storage } = createOssStorage({ OSS_BUCKET: 'synthetic-bucket', OSS_REGION: 'oss-cn-hangzhou',
    OSS_ACCESS_KEY_ID: 'synthetic-key-id', OSS_ACCESS_KEY_SECRET: 'synthetic-key-secret' })
  const upload = await storage.signUpload(media, 300)
  expect(new URL(upload.url).pathname).toBe(`/${media.objectKey}`)
  expect(upload.headers).toMatchObject({ 'Content-Type': 'image/jpeg', 'x-oss-forbid-overwrite': 'true',
    'x-oss-meta-media-id': media.id, 'x-oss-meta-owner-id': media.ownerUserId })
  const altered = await storage.signUpload({ ...media, contentType: 'text/html' }, 300)
  expect(new URL(altered.url).searchParams.get('Signature')).not.toBe(new URL(upload.url).searchParams.get('Signature'))
  const read = await storage.signRead(media, 60)
  expect(new URL(read.url).searchParams.get('response-cache-control')).toBe('no-store')
  expect(new URL(read.url).searchParams.get('response-content-disposition')).toBe('attachment')
  expect(new URL((await storage.signRead(media, 60, 'inline')).url).searchParams.get('response-content-disposition')).toBe('inline')
})
