import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app.js'
import { MediaCompletionService } from '../../src/modules/media/media-completion.service.js'
import { mediaHarness } from '../helpers/media.js'

const origin = 'https://refs.example.com'
it('Cookie/Origin 门禁、JSON 上限、no-store 和精确授权响应', async () => {
  const h = mediaHarness()
  const service = new MediaCompletionService(h.dependencies)
  const app = await buildApp({}, { media: { service, publicOrigin: origin, sessions: {
    async requireSession(token) { if (token !== 'test') throw new Error('invalid test cookie'); return { user: { id: h.actor, email: 'synthetic@example.com', displayName: '测试', emailVerified: true, hasPassword: false }, expiresAt: '2026-11-05T00:00:00.000Z' } },
  } } })
  try {
    const body = { purpose: 'forum_attachment', contentType: 'image/jpeg', sizeBytes: 100 }
    expect((await app.inject({ method: 'POST', url: '/api/v1/media/upload-intents', payload: body })).statusCode).toBe(403)
    const response = await app.inject({ method: 'POST', url: '/api/v1/media/upload-intents', payload: body,
      headers: { origin, cookie: '__Host-refs_session=test', 'idempotency-key': 'one' } })
    expect(response.statusCode).toBe(201)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.json().data.upload.method).toBe('PUT')
    expect((await app.inject({ method: 'POST', url: '/api/v1/media/upload-intents', payload: 'x'.repeat(5000),
      headers: { origin, 'content-type': 'application/json', 'idempotency-key': 'two' } })).statusCode).toBe(413)
  } finally { await app.close() }
})

it('事件桥拒绝伪造和过期签名，可信重复事件只更新一次且不绕过 HEAD', async () => {
  const h = mediaHarness()
  const service = new MediaCompletionService(h.dependencies)
  const secret = 'synthetic-event-secret-at-least-32-bytes'
  const app = await buildApp({}, { storageEvents: { service, secret, now: h.dependencies.now } })
  try {
    const intent = await service.create(h.actor, { purpose: 'forum_attachment', contentType: 'image/jpeg', sizeBytes: 100 }, 'event')
    h.upload(intent.mediaId)
    const body = JSON.stringify({ eventId: 'event-1', mediaId: intent.mediaId, bucket: 'test-bucket', objectKey: intent.objectKey, type: 'ObjectCreated' })
    const timestamp = String(h.dependencies.now().getTime())
    const signature = createHmac('sha256', secret).update(`${timestamp}\n${body}`).digest('hex')
    const request = { method: 'POST' as const, url: '/api/v1/media/provider-events/oss', payload: body,
      headers: { 'content-type': 'application/json', 'x-refs-timestamp': timestamp, 'x-refs-signature': signature } }
    expect((await app.inject({ ...request, headers: { ...request.headers, 'x-refs-signature': '0'.repeat(64) } })).statusCode).toBe(403)
    expect((await app.inject(request)).statusCode).toBe(200)
    expect((await app.inject(request)).statusCode).toBe(200)
    expect(await service.complete(h.actor, intent.mediaId)).toMatchObject({ status: 'available' })
  } finally { await app.close() }
})
