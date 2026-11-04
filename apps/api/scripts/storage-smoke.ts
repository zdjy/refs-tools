import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createS3Storage } from '../src/providers/object-storage/s3.js'
import type { StoredMedia } from '../src/modules/media/media.types.js'

const { storage, bucket } = createS3Storage(process.env)
const id = randomUUID()
const media = { id, ownerUserId: randomUUID(), objectKey: `media/storage-smoke/${id}`, contentType: 'image/jpeg' } as StoredMedia
const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
let uploaded = false
try {
  const upload = await storage.signUpload(media, 60)
  const origin = process.env['AUTH_PUBLIC_ORIGIN'] ?? 'https://localhost:8443'
  const preflight = await fetch(upload.url, { method: 'OPTIONS', headers: { Origin: origin,
    'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': Object.keys(upload.headers).join(', ') } })
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin)
  const deniedOrigin = await fetch(upload.url, { method: 'OPTIONS', headers: { Origin: 'https://untrusted.example.com',
    'Access-Control-Request-Method': 'PUT' } })
  assert.equal(deniedOrigin.headers.get('access-control-allow-origin'), null)
  const altered = await fetch(upload.url, { method: 'PUT', headers: { ...upload.headers, 'Content-Type': 'text/html' }, body: bytes })
  assert.equal(altered.status, 403)
  const put = await fetch(upload.url, { method: 'PUT', headers: { ...upload.headers, Origin: origin }, body: bytes })
  assert.equal(put.status, 200)
  uploaded = true
  assert.equal(put.headers.get('access-control-allow-origin'), origin)
  const duplicate = await fetch(upload.url, { method: 'PUT', headers: upload.headers, body: bytes })
  assert.equal(duplicate.status, 412)
  const withoutCondition = { ...upload.headers }
  delete withoutCondition['If-None-Match']
  const unsignedCondition = await fetch(upload.url, { method: 'PUT', headers: withoutCondition, body: bytes })
  assert.ok([400, 403].includes(unsignedCondition.status))
  const stat = await storage.stat(media.objectKey)
  assert.equal(stat?.sizeBytes, bytes.length)
  assert.equal(stat?.contentType, media.contentType)
  assert.equal(stat?.mediaId, media.id)
  assert.equal(stat?.ownerUserId, media.ownerUserId)
  assert.ok(stat?.etag)
  const read = await storage.signRead(media, 60)
  const get = await fetch(read.url)
  assert.equal(get.status, 200)
  assert.equal(get.headers.get('cache-control'), 'no-store')
  assert.equal(get.headers.get('content-disposition'), 'attachment')
  assert.deepEqual(new Uint8Array(await get.arrayBuffer()), bytes)
  const anonymous = await fetch(`${process.env['S3_PUBLIC_ENDPOINT']}/${bucket}/${media.objectKey}`)
  assert.equal(anonymous.status, 403)
  await storage.delete(media.objectKey)
  uploaded = false
  assert.equal(await storage.stat(media.objectKey), null)
  console.log('S3 实际直传、CORS、签名防篡改、禁止覆盖、私有读、HEAD 与删除检查通过')
} finally {
  if (uploaded) await storage.delete(media.objectKey)
}
