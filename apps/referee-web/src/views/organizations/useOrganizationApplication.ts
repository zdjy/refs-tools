import { reactive, ref } from 'vue'
import type { OrganizationApplication } from '@refs-tools/contracts/organization-self'
import { organizationsApi, type OrganizationsApi } from '../../api/organizations.api'
import { useAction } from './organization-primitives'

export const applicationLimits = { name: 120, region: 100, purpose: 1000, ownerLegalName: 80, contact: 200 } as const
const labels: Record<keyof OrganizationApplication, string> = {
  name: '组织名称', region: '所在地区', purpose: '组织简介', ownerLegalName: '负责人实名', contact: '联系方式',
}

/**
 * 自助创建组织申请的表单状态。校验只做必填与长度这类格式检查；
 * 审核、数量上限与授权由服务端裁决。失败保留全部输入。
 */
export function useOrganizationApplication(api: OrganizationsApi = organizationsApi) {
  const fields = reactive<OrganizationApplication>({ name: '', region: '', purpose: '', ownerLegalName: '', contact: '' })
  const fieldError = reactive<Partial<Record<keyof OrganizationApplication, string>>>({})
  const submitted = ref<{ id: string; name: string } | null>(null)
  const action = useAction()

  function validate(): boolean {
    let valid = true
    for (const key of Object.keys(labels) as (keyof OrganizationApplication)[]) {
      const value = fields[key].trim()
      fieldError[key] = !value ? `请填写${labels[key]}` : value.length > applicationLimits[key] ? `${labels[key]}不超过 ${applicationLimits[key]} 个字符` : ''
      if (fieldError[key]) valid = false
    }
    return valid
  }

  async function submit(): Promise<boolean> {
    if (!validate()) return false
    return action.run(async () => {
      const created = await api.apply({ name: fields.name, region: fields.region, purpose: fields.purpose,
        ownerLegalName: fields.ownerLegalName, contact: fields.contact })
      submitted.value = { id: created.id, name: created.name }
    }, '组织申请已提交，等待平台审核。')
  }

  return { fields, fieldError, submitted, action, submit }
}
