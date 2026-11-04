import { reactive, ref, shallowRef } from 'vue'
import type { Profile, UpdateProfileBody } from '@refs-tools/contracts/profile'
import { validateProfile } from '@refs-tools/domain'
import { ProfileApiError, profileApi, profileErrorMessage, profileLoadErrorMessage, type ProfileApi } from '../../api/profile.api'
import { mediaApi, type MediaApi } from '../../api/media.api'
import { createDirectUpload, type UploadState } from '../../features/media/direct-upload'
import { compressPreview } from '../../features/media/image-compression'

export type ProfileFieldKey = 'nickname' | 'legalName' | 'phone' | 'region' | 'addressDetail' | 'birthDate'
export type ProfileFieldsState = {
  nickname: string; legalName: string; phone: string
  regionCode: string | null; regionLabel: string | null
  addressDetail: string; birthDate: string | null
}
const emptyFields = (): ProfileFieldsState => ({ nickname: '', legalName: '', phone: '',
  regionCode: null, regionLabel: null, addressDetail: '', birthDate: null })
const fieldOfCode: Record<string, ProfileFieldKey> = {
  INVALID_NICKNAME: 'nickname', INVALID_LEGAL_NAME: 'legalName', INVALID_PHONE: 'phone',
  INVALID_REGION: 'region', INVALID_ADDRESS: 'addressDetail', INVALID_BIRTH_DATE: 'birthDate',
}
const trimmed = (value: string): string | null => value.trim() === '' ? null : value.trim()

/** 只把有变化的字段发给服务端；服务端按 users.version 拒绝陈旧写入。 */
function diff(value: Profile, fields: ProfileFieldsState): UpdateProfileBody {
  const body: UpdateProfileBody = { version: value.version }
  const nickname = fields.nickname.trim()
  if (nickname !== value.nickname) body.nickname = nickname
  if (trimmed(fields.legalName) !== value.legalName) body.legalName = trimmed(fields.legalName)
  if (trimmed(fields.phone) !== value.phone) body.phone = trimmed(fields.phone)
  if (fields.regionCode !== value.regionCode) { body.regionCode = fields.regionCode; body.regionLabel = fields.regionLabel }
  if (trimmed(fields.addressDetail) !== value.addressDetail) body.addressDetail = trimmed(fields.addressDetail)
  if (fields.birthDate !== value.birthDate) body.birthDate = fields.birthDate
  return body
}

/** 把局部更新合并回完整字段，供本地预校验使用。 */
function mergedFields(body: UpdateProfileBody, current: Profile): ProfileFieldsState {
  return {
    nickname: body.nickname ?? current.nickname,
    legalName: body.legalName !== undefined ? body.legalName ?? '' : current.legalName ?? '',
    phone: body.phone !== undefined ? body.phone ?? '' : current.phone ?? '',
    regionCode: body.regionCode !== undefined ? body.regionCode : current.regionCode,
    regionLabel: body.regionLabel !== undefined ? body.regionLabel : current.regionLabel,
    addressDetail: body.addressDetail !== undefined ? body.addressDetail ?? '' : current.addressDetail ?? '',
    birthDate: body.birthDate !== undefined ? body.birthDate : current.birthDate,
  }
}

/**
 * 账号设置页的档案状态：读取、字段合并、乐观锁保存与头像直传。
 * 表单对象由本 Composable 拥有，展示组件只负责绑定输入。
 */
export function useProfileSettings(api: ProfileApi = profileApi, media: MediaApi = mediaApi) {
  const profile = ref<Profile | null>(null)
  const fields = reactive<ProfileFieldsState>(emptyFields())
  const avatarUrl = ref('')
  const avatar = shallowRef<UploadState>({ status: 'idle', fileName: null, mediaId: null, error: null })
  const loading = ref(false), saving = ref(false)
  const loadError = ref(''), saveError = ref(''), saved = ref('')
  const fieldError = ref<{ field: ProfileFieldKey; message: string } | null>(null)
  let upload: ReturnType<typeof createDirectUpload> | null = null
  let avatarRevision = 0

  function apply(value: Profile) {
    profile.value = value
    Object.assign(fields, {
      nickname: value.nickname, legalName: value.legalName ?? '', phone: value.phone ?? '',
      regionCode: value.regionCode, regionLabel: value.regionLabel,
      addressDetail: value.addressDetail ?? '', birthDate: value.birthDate,
    })
    void refreshAvatar()
  }

  /** 签名 URL 只保存在内存，用于当前页展示；不回写档案也不持久化。 */
  async function refreshAvatar() {
    const mediaId = profile.value?.avatarMediaId ?? null
    const revision = ++avatarRevision
    if (!mediaId) { avatarUrl.value = ''; return }
    try {
      const { url } = await api.avatarUrl(mediaId)
      if (revision === avatarRevision) avatarUrl.value = url
    } catch { if (revision === avatarRevision) avatarUrl.value = '' }
  }

  async function load() {
    loading.value = true
    loadError.value = ''
    try { apply(await api.read()) }
    catch (error) { loadError.value = profileLoadErrorMessage(error) }
    finally { loading.value = false }
  }

  async function save(): Promise<boolean> {
    const current = profile.value
    if (!current || saving.value) return false
    saveError.value = ''; saved.value = ''; fieldError.value = null
    const body = diff(current, fields)
    if (Object.keys(body).length === 1) { saved.value = '没有需要保存的修改。'; return true }
    const next = mergedFields(body, current)
    const invalid = validateProfile({ ...next, avatarMediaId: current.avatarMediaId }, new Date().toISOString().slice(0, 10))
    if (invalid) {
      fieldError.value = { field: fieldOfCode[invalid]!, message: profileErrorMessage(new ProfileApiError(invalid, 422)) }
      return false
    }
    saving.value = true
    try {
      apply(await api.update(body))
      saved.value = '账号资料已保存。'
      return true
    } catch (error) {
      const code = error instanceof ProfileApiError ? error.code : ''
      if (code === 'VERSION_CONFLICT') { saveError.value = profileErrorMessage(error); await load() }
      else if (fieldOfCode[code]) fieldError.value = { field: fieldOfCode[code]!, message: profileErrorMessage(error) }
      else saveError.value = profileErrorMessage(error)
      return false
    } finally { saving.value = false }
  }

  async function saveAvatar(mediaId: string | null): Promise<void> {
    const current = profile.value
    if (!current) return
    saveError.value = ''; saved.value = ''
    saving.value = true
    try {
      apply(await api.update({ version: current.version, avatarMediaId: mediaId }))
      avatar.value = { status: 'idle', fileName: null, mediaId: null, error: null }
      saved.value = mediaId ? '头像已更新。' : '头像已移除。'
    } catch (error) {
      if (error instanceof ProfileApiError && error.code === 'VERSION_CONFLICT') { await load() }
      saveError.value = profileErrorMessage(error)
      avatar.value = { ...avatar.value, status: 'failed', error: '头像已上传，但保存到档案失败。请重试。' }
    } finally { saving.value = false }
  }

  /** 头像复用直传链路：本地压缩为 JPEG 预览后再申请 avatar 用途的上传授权。 */
  async function pickAvatar(file: File) {
    if (!profile.value) return
    let prepared = file
    try { prepared = await compressPreview(file) }
    catch (error) {
      avatar.value = { status: 'failed', fileName: file.name, mediaId: null, error: (error as Error).message }
      return
    }
    upload = createDirectUpload(media, (state) => { avatar.value = state })
    await upload.start(prepared, { purpose: 'avatar' })
    if (avatar.value.status === 'available' && avatar.value.mediaId) await saveAvatar(avatar.value.mediaId)
  }

  async function retryAvatar() {
    if (!upload) return
    await upload.retry()
    if (avatar.value.status === 'available' && avatar.value.mediaId) await saveAvatar(avatar.value.mediaId)
  }

  return { profile, fields, avatarUrl, avatar, loading, saving, loadError, saveError, saved, fieldError,
    load, save, pickAvatar, retryAvatar, removeAvatar: () => saveAvatar(null) }
}
