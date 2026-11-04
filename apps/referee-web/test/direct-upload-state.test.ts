import { expect, it } from 'vitest'
import { createDirectUpload } from '../src/features/media/direct-upload.js'

it('网络中断保留文件和 intent，重试先确认已有对象，只有 API 确认可用才成功', async () => {
  let uploaded = false
  let calls = 0
  const file = Object.assign(new Blob(['image'], { type: 'image/jpeg' }), { name: 'photo.jpg' }) as File
  const state = createDirectUpload({
    async create() { calls++; return { mediaId: 'media-1', objectKey: 'media/test', upload: {
      method: 'PUT', url: 'https://storage.example/upload', headers: {}, expiresAt: '2026-11-05T00:00:00.000Z',
    } } },
    async renew() { throw new Error('不应续签') },
    async put() { uploaded = true; throw new Error('响应丢失') },
    async complete() { if (!uploaded) throw new Error('未上传'); return { id: 'media-1', status: 'available' } },
  })
  await state.start(file, { purpose: 'forum_attachment' })
  expect(state.snapshot().status).toBe('failed')
  await state.retry()
  expect(state.snapshot()).toMatchObject({ status: 'available', mediaId: 'media-1' })
  expect(calls).toBe(1)
})

it('取消后的迟到授权不上传文件，不覆盖新状态', async () => {
  let authorize!: (result: { mediaId: string; objectKey: string; upload: { method: 'PUT'; url: string; headers: {}; expiresAt: string } }) => void
  let uploaded = false
  const state = createDirectUpload({
    create: () => new Promise((resolve) => { authorize = resolve }),
    async renew() { throw new Error('unused') },
    async complete() { return { id: 'late', status: 'available' } },
    async put() { uploaded = true },
  })
  const file = Object.assign(new Blob(['image'], { type: 'image/jpeg' }), { name: 'photo.jpg' }) as File
  const pending = state.start(file, { purpose: 'forum_attachment' })
  state.cancel()
  authorize({ mediaId: 'late', objectKey: 'late', upload: { method: 'PUT', url: 'https://storage.example', headers: {}, expiresAt: '2099-01-01T00:00:00.000Z' } })
  await pending
  expect(state.snapshot().status).toBe('idle')
  expect(uploaded).toBe(false)
})
