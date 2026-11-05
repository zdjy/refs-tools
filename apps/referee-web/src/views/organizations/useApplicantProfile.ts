import { computed, reactive } from 'vue'
import { profileApi, ProfileApiError, type ProfileApi } from '../../api/profile.api'

export type ApplicantStatus = 'idle' | 'loading' | 'ready' | 'error'

/** 读取失败只给出可重试的说明，不暗示资料为空，也不放行提交。 */
function loadErrorMessage(error: unknown): string {
  const code = error instanceof ProfileApiError ? error.code : ''
  if (code === 'OFFLINE') return '当前处于离线状态，无法读取你的账号资料。恢复网络后请重新读取。'
  if (code === 'UNAUTHENTICATED') return '登录已失效，请重新登录后再申请。'
  return '暂时无法读取你的账号资料，请检查网络后重新读取。'
}

/**
 * 申请人（即负责人）的账号资料预览。申请不再手填负责人实名与联系方式：
 * 服务端提交时取账号资料的真实姓名与手机号，这里只读展示同一份数据并提示缺项，
 * 让用户在提交前就知道会写入什么、缺什么。展示不代替服务端校验，缺项时服务端同样拒绝。
 * `request` 序号保证用户补全资料后重新读取时，旧响应不会覆盖新结果。
 */
export function useApplicantProfile(api: Pick<ProfileApi, 'read'> = profileApi) {
  const state = reactive<{ status: ApplicantStatus; legalName: string; phone: string; error: string }>(
    { status: 'idle', legalName: '', phone: '', error: '' })
  let request = 0

  async function load(): Promise<void> {
    const current = ++request
    state.status = 'loading'; state.error = ''
    try {
      const profile = await api.read()
      if (current !== request) return
      state.legalName = profile.legalName?.trim() ?? ''; state.phone = profile.phone?.trim() ?? ''
      state.status = 'ready'
    } catch (cause) {
      if (current !== request) return
      state.status = 'error'; state.error = loadErrorMessage(cause)
    }
  }

  const missing = computed(() => [state.legalName ? '' : '真实姓名', state.phone ? '' : '手机号'].filter(Boolean))
  /** 只有资料确认读到且无缺项才允许提交；读取中或失败时不能当作“资料齐全”。 */
  const complete = computed(() => state.status === 'ready' && missing.value.length === 0)

  return reactive({ state, missing, complete, load })
}

export type ApplicantProfile = ReturnType<typeof useApplicantProfile>
