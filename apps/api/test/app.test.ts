import { afterEach, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'

describe('API application', () => {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined

  afterEach(async () => {
    await app?.close()
  })

  it('exposes a health endpoint under the versioned API prefix', async () => {
    app = await buildApp({ logger: false })

    const response = await app.inject({ method: 'GET', url: '/api/v1/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      data: { status: 'ok' },
    })
  })

  it('maps unknown routes to the standard not-found error envelope', async () => {
    app = await buildApp({ logger: false })

    const response = await app.inject({ method: 'GET', url: '/api/v1/does-not-exist' })
    const body = response.json()

    expect(response.statusCode).toBe(404)
    expect(body.error.code).toBe('NOT_FOUND')
    expect(body.error.message).toBe('请求的资源不存在')
    expect(body.error.requestId).toEqual(expect.any(String))
  })
})
