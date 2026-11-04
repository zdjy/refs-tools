import { randomUUID } from 'node:crypto'
import { expect, it } from 'vitest'
import { MediaCompletionService } from '../../src/modules/media/media-completion.service.js'
import { mediaHarness } from '../helpers/media.js'

const file = { purpose: 'certification_evidence' as const, contentType: 'image/jpeg', sizeBytes: 100 }
it('非本人、成员退出、账号停用和未验证邮箱不能获取新上传授权', async () => {
  const h = mediaHarness()
  const service = new MediaCompletionService(h.dependencies)
  const intent = await service.create(h.actor, { ...file, target: { type: 'organization', id: randomUUID() } }, 'one')
  await expect(service.renew(randomUUID(), intent.mediaId)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  h.setMember(false)
  await expect(service.renew(h.actor, intent.mediaId)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  h.setMember(true); h.setVerified(false)
  await expect(service.renew(h.actor, intent.mediaId)).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' })
  h.setActive(false)
  await expect(service.renew(h.actor, intent.mediaId)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
})

it('无业务授权实现时不能伪造考试尝试或比赛目标', async () => {
  const h = mediaHarness()
  const service = new MediaCompletionService(h.dependencies)
  for (const [purpose, type] of [['exam_answer', 'attempt'], ['post_game_record', 'match']] as const) {
    await expect(service.create(h.actor, { ...file, purpose, target: { type, id: randomUUID() } }, purpose)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  }
})

it('存储 IO 后重新检查授权，撤权不返回已签链接或核验结果', async () => {
  const h = mediaHarness()
  const service = new MediaCompletionService(h.dependencies)
  const intent = await service.create(h.actor, file, 'one')
  h.upload(intent.mediaId)
  const stat = h.dependencies.storage.stat
  h.dependencies.storage.stat = async (key) => { h.setActive(false); return stat(key) }
  await expect(service.complete(h.actor, intent.mediaId)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
})
