import { afterEach, expect, it, vi } from 'vitest'
import { S3Client } from '@aws-sdk/client-s3'
import { createS3Storage } from '../../src/providers/object-storage/s3.js'
import { mediaHarness } from '../helpers/media.js'
import { MediaCompletionService } from '../../src/modules/media/media-completion.service.js'

const env = { S3_BUCKET: 'synthetic-bucket', S3_REGION: 'us-east-1', S3_ENDPOINT: 'http://minio:9000',
  S3_PUBLIC_ENDPOINT: 'https://localhost:9443', S3_ACCESS_KEY_ID: 'synthetic-key', S3_SECRET_ACCESS_KEY: 'synthetic-secret' }
afterEach(() => vi.restoreAllMocks())

it('浏览器签名使用外部地址，并绑定精确 key、类型、归属和禁止覆盖条件', async () => {
  const h = mediaHarness()
  const created = await new MediaCompletionService(h.dependencies).create(h.actor,
    { purpose: 'forum_attachment', contentType: 'image/jpeg', sizeBytes: 100 }, 'one')
  const media = h.records.get(created.mediaId)!
  const { storage } = createS3Storage(env)
  const upload = await storage.signUpload(media, 300)
  const url = new URL(upload.url)
  expect(url.origin).toBe(env.S3_PUBLIC_ENDPOINT)
  expect(url.pathname).toBe(`/${env.S3_BUCKET}/${media.objectKey}`)
  expect(url.searchParams.get('X-Amz-Expires')).toBe('300')
  expect(url.searchParams.get('X-Amz-SignedHeaders')?.split(';')).toEqual([
    'content-type', 'host', 'if-none-match', 'x-amz-meta-media-id', 'x-amz-meta-owner-id',
  ])
  expect(upload.headers).toEqual({ 'Content-Type': 'image/jpeg', 'If-None-Match': '*',
    'x-amz-meta-media-id': media.id, 'x-amz-meta-owner-id': media.ownerUserId })
  expect(url.searchParams.has('x-amz-checksum-crc32')).toBe(false)
  for (const changed of [{ ...media, contentType: 'text/html' }, { ...media, ownerUserId: 'another-owner' }]) {
    const altered = new URL((await storage.signUpload(changed, 300)).url)
    expect(altered.searchParams.get('X-Amz-Signature')).not.toBe(url.searchParams.get('X-Amz-Signature'))
  }
  const read = new URL((await storage.signRead(media, 60)).url)
  expect(read.origin).toBe(env.S3_PUBLIC_ENDPOINT)
  expect(read.searchParams.get('X-Amz-Expires')).toBe('60')
  expect(read.searchParams.get('response-cache-control')).toBe('no-store')
  expect(read.searchParams.get('response-content-disposition')).toBe('attachment')
})

it('HEAD 映射可信元数据，只有 404 表示缺失，删除限定 Bucket/key', async () => {
  const send = vi.spyOn(S3Client.prototype, 'send')
  send.mockResolvedValueOnce({ ContentLength: 42, ContentType: 'image/jpeg', ETag: 'etag',
    Metadata: { 'media-id': 'media', 'owner-id': 'owner' } } as never)
  const { storage } = createS3Storage(env)
  expect(await storage.stat('media/owner/id')).toEqual({ sizeBytes: 42, contentType: 'image/jpeg',
    etag: 'etag', mediaId: 'media', ownerUserId: 'owner' })
  const client = send.mock.contexts[0] as unknown as S3Client
  expect(await client.config.endpoint?.()).toMatchObject({ hostname: 'minio', port: 9000 })
  send.mockRejectedValueOnce({ $metadata: { httpStatusCode: 404 } })
  expect(await storage.stat('media/owner/missing')).toBeNull()
  const denied = { $metadata: { httpStatusCode: 403 } }
  send.mockRejectedValueOnce(denied)
  await expect(storage.stat('media/owner/denied')).rejects.toBe(denied)
  send.mockResolvedValueOnce({} as never)
  await storage.delete('media/owner/id')
  expect(send.mock.calls.at(-1)?.[0].input).toEqual({ Bucket: env.S3_BUCKET, Key: 'media/owner/id' })
})

it('缺失配置或带路径、凭据的 endpoint 必须拒绝', () => {
  expect(() => createS3Storage({})).toThrow('S3_BUCKET')
  for (const value of ['https://user:pass@example.com', 'https://example.com/bucket', 'ftp://example.com', 'https://example.com?key=x']) {
    expect(() => createS3Storage({ ...env, S3_PUBLIC_ENDPOINT: value })).toThrow('S3_PUBLIC_ENDPOINT')
  }
})
