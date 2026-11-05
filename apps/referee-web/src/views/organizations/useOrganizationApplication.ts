import { reactive, ref } from 'vue'
import { organizationsApi, OrganizationsApiError, type OrganizationsApi } from '../../api/organizations.api'
import { useAction } from './organization-primitives'
import { useApplicantProfile, type ApplicantProfile } from './useApplicantProfile'

export const applicationLimits = { name: 120, purpose: 1000 } as const
/** `regionCode` 只用于回显三级选择器，提交的只有展示文本 `region`；选到区/县时两者同时有值。 */
export type ApplicationFields = { name: string; region: string; regionCode: string | null; purpose: string }
export type ApplicationFieldKey = 'name' | 'region' | 'purpose'
const textLabels = { name: '组织名称', purpose: '组织简介' } as const

/**
 * 自助创建组织申请的表单状态。校验只做必填、长度与地区选到区/县这类格式检查；
 * 负责人实名与联系方式取自账号资料（见 useApplicantProfile），审核、数量上限与授权由服务端裁决。
 * 失败保留全部输入。
 */
export function useOrganizationApplication(api: OrganizationsApi = organizationsApi, applicant: ApplicantProfile = useApplicantProfile()) {
  const fields = reactive<ApplicationFields>({ name: '', region: '', regionCode: null, purpose: '' })
  const fieldError = reactive<Partial<Record<ApplicationFieldKey, string>>>({})
  const submitted = ref<{ id: string; name: string } | null>(null)
  const action = useAction()

  function validate(): boolean {
    for (const key of ['name', 'purpose'] as const) {
      const value = fields[key].trim()
      fieldError[key] = !value ? `请填写${textLabels[key]}` : value.length > applicationLimits[key] ? `${textLabels[key]}不超过 ${applicationLimits[key]} 个字符` : ''
    }
    fieldError.region = fields.regionCode && fields.region ? '' : '请选择到区/县的所在地区'
    return !fieldError.name && !fieldError.region && !fieldError.purpose
  }

  async function submit(): Promise<boolean> {
    if (!validate()) return false
    // 资料未确认齐全时不发请求：缺项由表单内的提示说明，服务端也会独立拒绝。
    if (!applicant.complete) return false
    return action.run(async () => {
      try {
        const created = await api.apply({ name: fields.name, region: fields.region, purpose: fields.purpose })
        submitted.value = { id: created.id, name: created.name }
      } catch (cause) {
        // 本页读到的资料已陈旧（例如在别处清空了手机号）：重新读取，让缺项提示与服务端一致。
        if (cause instanceof OrganizationsApiError && cause.code === 'PROFILE_INCOMPLETE') void applicant.load()
        throw cause
      }
    }, '组织申请已提交，等待平台审核。')
  }

  return { fields, fieldError, submitted, action, applicant, submit }
}
