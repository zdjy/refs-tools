import { describe, expect, it, vi } from 'vitest'
import { MediaCompletionService } from '../../src/modules/media/media-completion.service.js'
import { adminFixture } from './admin-fixture.js'

const reason = { reason: '核对违规附件' }
describe('平台文件治理', () => {
  it('跨 owner 查询和下载，最小投影及平台审计，不修改普通 owner 入口', async () => {
    const f = await adminFixture()
    expect((await f.service.list(f.admin, {})).items).toHaveLength(1)
    expect(await f.service.detail(f.admin, f.intent.mediaId)).not.toHaveProperty('objectKey')
    expect(await f.service.read(f.admin, f.intent.mediaId, reason)).toHaveProperty('url')
    expect(f.h.audits).toContainEqual(expect.objectContaining({ action: 'media.read_authorized', reason: reason.reason, scopeType: 'platform', scopeId: null }))
    await expect(f.service.list(f.h.actor, {})).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(new MediaCompletionService(f.h.dependencies).read(f.admin, f.intent.mediaId)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
  it('认证原件不能通过全平台治理入口绕过申请范围授权', async () => {
    const f = await adminFixture(); f.h.records.get(f.intent.mediaId)!.purpose = 'certification_evidence'
    const sign = vi.spyOn(f.dependencies.storage, 'signRead')
    await expect(f.service.read(f.admin, f.intent.mediaId, reason)).rejects.toMatchObject({ code: 'CERTIFICATION_ACCESS_REQUIRED' })
    expect(sign).not.toHaveBeenCalled()
  })
  it('非法筛选、空理由和敏感理由在存储调用前拒绝', async () => {
    const f = await adminFixture(), sign = vi.spyOn(f.dependencies.storage, 'signRead')
    await expect(f.service.list(f.admin, { page: '10001' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    await expect(f.service.remove(f.admin, f.intent.mediaId, { reason: ' ' })).rejects.toMatchObject({ code: 'REASON_REQUIRED' })
    await expect(f.service.read(f.admin, f.intent.mediaId, { reason: 'https://private.example' })).rejects.toMatchObject({ code: 'INVALID_AUDIT_EVENT' })
    expect(sign).not.toHaveBeenCalled()
  })
  it('签名期间撤权、删除或审计失败不能返回 URL', async () => {
    const f = await adminFixture()
    f.dependencies.storage.signRead = async () => { f.revoke(); return { url: 'https://private.example', expiresAt: new Date().toISOString() } }
    await expect(f.service.read(f.admin, f.intent.mediaId, reason)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    const g = await adminFixture()
    g.dependencies.storage.signRead = async () => { g.h.records.get(g.intent.mediaId)!.status = 'deleted'; return { url: 'https://private.example', expiresAt: new Date().toISOString() } }
    await expect(g.service.read(g.admin, g.intent.mediaId, reason)).rejects.toMatchObject({ code: 'MEDIA_NOT_AVAILABLE' })
    const j = await adminFixture(); j.repositories.audit.append = async () => { throw new Error('audit failure') }
    await expect(j.service.read(j.admin, j.intent.mediaId, reason)).rejects.toThrow('audit failure')
  })
  it.each(['certification_evidence', 'exam_answer', 'post_game_record'] as const)('平台管理员不能通用删除已核验 %s', async purpose => {
    const f = await adminFixture(); f.h.records.get(f.intent.mediaId)!.purpose = purpose
    await expect(f.service.remove(f.admin, f.intent.mediaId, reason)).rejects.toMatchObject({ code: 'MEDIA_RETENTION_REQUIRED' })
    expect(f.h.records.get(f.intent.mediaId)!.status).toBe('available')
  })
  it('物理删除失败仍不可读，可重试且每次实时授权并审计', async () => {
    const f = await adminFixture(); const remove = vi.spyOn(f.dependencies.storage, 'delete').mockRejectedValueOnce(new Error('storage failure'))
    await expect(f.service.remove(f.admin, f.intent.mediaId, reason)).rejects.toThrow('storage failure')
    expect(f.h.records.get(f.intent.mediaId)!.status).toBe('deleted')
    await expect(f.service.read(f.admin, f.intent.mediaId, reason)).rejects.toMatchObject({ code: 'MEDIA_NOT_AVAILABLE' })
    await f.service.remove(f.admin, f.intent.mediaId, reason); expect(remove).toHaveBeenCalledTimes(2)
    expect(f.h.audits.filter((e: any) => e.action === 'media.deleted')).toHaveLength(2)
    f.revoke(); await expect(f.service.remove(f.admin, f.intent.mediaId, reason)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(remove).toHaveBeenCalledTimes(2)
  })
  it('禁用或未验证账号不能读取元数据', async () => {
    const f = await adminFixture(); f.h.setVerified(false)
    await expect(f.service.list(f.admin, {})).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' })
    f.h.setActive(false); await expect(f.service.detail(f.admin, f.intent.mediaId)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
  })
})
