import { computed, nextTick, ref, type Ref } from 'vue'
import type { Certification, CertificationScope, CertificationSummary } from '@refs-tools/contracts/certifications'
import type { CertificationFormSave } from './useCertificationForm'
import { uploadOptionsFor } from './useCertificationDraft'
import { useCertifications } from './useCertifications'

/** 同一办理面板用于平台页和组织标签；范围由宿主固定，不随表单切换。 */
export function useCertificationPanel(scope: CertificationScope) {
  const c = useCertifications(undefined, undefined, scope)
  const mode = ref<'detail' | 'create' | 'edit'>('detail')
  const formKey = ref(0)
  const formArea = ref<HTMLElement | null>(null), detailArea = ref<HTMLElement | null>(null)
  const showAppeal = ref(false), appealRecord = ref<Certification | null>(null)
  const formProtection = ref({ dirty: false, locked: false })
  const appealUploadOptions = computed(() => uploadOptionsFor({
    scopeType: scope.type, organizationId: scope.organizationId,
  }))
  function focusIn(target: Ref<HTMLElement | null>) {
    void nextTick(() => target.value?.querySelector<HTMLElement>('h2')?.focus())
  }
  async function openDetail(item: CertificationSummary) {
    if (c.locked.value) return
    mode.value = 'detail'; c.action.reset()
    await c.open(item)
    focusIn(detailArea)
  }
  function openCreate() {
    if (c.locked.value || c.items.value.length) return
    mode.value = 'create'; formKey.value++; c.action.reset(); c.close(); focusIn(formArea)
  }
  function openEdit() {
    if (!c.selectedRecord.value || c.locked.value) return
    mode.value = 'edit'; c.action.reset(); focusIn(formArea)
  }
  function cancelForm() {
    if (c.locked.value) return
    mode.value = 'detail'; focusIn(detailArea)
  }
  async function save(payload: CertificationFormSave) {
    const result = await c.saveApplication(payload.body, payload.mode === 'update' ? c.selectedRecord.value : null, payload.submit)
    if (result.ok || result.stored) { mode.value = 'detail'; focusIn(detailArea) }
  }
  function openAppeal() {
    if (!c.selectedRecord.value) return
    appealRecord.value = c.selectedRecord.value; showAppeal.value = true
  }
  async function confirmAppeal(body: { reason: string; evidenceMediaIds: string[] }) {
    if (appealRecord.value && await c.appeal(appealRecord.value, body)) closeAppeal(false)
  }
  function closeAppeal(visible: boolean) {
    if (!visible && !c.action.busy.value) { showAppeal.value = false; appealRecord.value = null }
  }
  async function reload() {
    await c.load()
    if (c.selectedId.value) await c.open({ id: c.selectedId.value })
  }
  return { c, mode, formKey, formArea, detailArea, showAppeal, appealRecord, formProtection,
    appealUploadOptions, openDetail, openCreate, openEdit, cancelForm, save, openAppeal, confirmAppeal, closeAppeal, reload }
}
