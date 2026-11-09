import { computed, toRef } from 'vue'
import type { Certification, CreateCertification, UpdateCertification } from '@refs-tools/contracts/certifications'
import type { MyOrganization } from '@refs-tools/contracts/organization-self'
import { useApplicationSteps } from './useApplicationSteps'
import { createBodyFrom, updateBodyFrom, uploadOptionsFor, useCertificationDraft } from './useCertificationDraft'

export type CertificationFormProps = {
  initial: Certification | null; organizations: MyOrganization[]; takenOrganizationIds: string[]; platformTaken: boolean
  platformEligible: boolean; editing: boolean; busy: boolean; error: string; defaultScope?: 'organization' | 'platform' | undefined; defaultOrganizationId?: string | null | undefined
}
export type CertificationFormSave = { body: CreateCertification | UpdateCertification; mode: 'create' | 'update'; submit: boolean }

/** 编排分步填写、范围确认与保存意图；写入由页面用例执行，路由守卫仅保护未保存输入。 */
export function useCertificationForm(props: CertificationFormProps, save: (payload: CertificationFormSave) => void, cancelForm: () => void) {
  const draft = useCertificationDraft(props.initial)
  const availableOrganizations = computed(() => props.organizations.filter(item => !props.takenOrganizationIds.includes(item.id)))
  if (!props.initial) {
    const preferred = availableOrganizations.value.find(item => item.id === props.defaultOrganizationId)?.id
    const first = preferred ?? availableOrganizations.value[0]?.id ?? null
    draft.changeScope(props.defaultScope === 'platform' ? 'platform' : 'organization', props.defaultScope === 'platform' ? null : first)
  }
  const ui = useApplicationSteps(draft.fields, toRef(props, 'busy'), props.editing)
  const organizationName = computed(() => props.organizations.find(item => item.id === draft.fields.organizationId)?.name ?? '组织认证')
  const uploadOptions = computed(() => uploadOptionsFor(draft.fields))
  function next() {
    if (ui.locked.value) return
    if (ui.step.value === 0 && draft.fields.scopeType === 'organization' && !draft.fields.organizationId) {
      draft.problems.organizationId = '请选择要申请认证的组织'; ui.focusStep(); return
    }
    if (ui.step.value === 1 && !draft.validate(!props.editing)) { ui.focusStep(); return }
    ui.step.value++
  }
  function changeScope(type: 'organization' | 'platform', organizationId: string | null) {
    if (ui.locked.value || (draft.fields.scopeType === type && draft.fields.organizationId === organizationId)) return
    if (draft.fields.evidenceMediaIds.length || draft.fields.historyMediaIds.length) ui.scopeChange.value = { type, organizationId }
    else draft.changeScope(type, organizationId)
  }
  function confirmScope() {
    if (!ui.scopeChange.value) return
    draft.changeScope(ui.scopeChange.value.type, ui.scopeChange.value.organizationId)
    ui.scopeChange.value = null
  }
  function cancel() {
    if (ui.locked.value) return
    if (ui.dirty.value) ui.cancelRequested.value = true
    else cancelForm()
  }
  function submit(send = false) {
    if (ui.locked.value || !draft.validate(!props.editing)) return
    if (props.editing && props.initial) save({ body: updateBodyFrom(draft.fields, props.initial.version), mode: 'update', submit: send })
    else save({ body: createBodyFrom(draft.fields), mode: 'create', submit: send })
  }
  return { draft, ui, organizationName, uploadOptions, next, changeScope, confirmScope, cancel, submit }
}
