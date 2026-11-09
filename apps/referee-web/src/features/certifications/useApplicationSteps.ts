import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import type { CertificationDraft } from './useCertificationDraft'

/** 分步表单的焦点、上传互斥与离开保护；所有未保存输入仅在当前页面内存中。 */
export function useApplicationSteps(fields: CertificationDraft, busy: Ref<boolean>, editing: boolean) {
  const step = ref(editing ? 1 : 0)
  const root = ref<HTMLElement | null>(null)
  const evidenceBusy = ref(false), historyBusy = ref(false)
  const locked = computed(() => busy.value || evidenceBusy.value || historyBusy.value)
  const baseline = JSON.stringify(fields)
  const dirty = computed(() => JSON.stringify(fields) !== baseline)
  const scopeChange = ref<{ type: 'organization' | 'platform'; organizationId: string | null } | null>(null)
  const cancelRequested = ref(false)
  function focusStep() {
    void nextTick(() => {
      const target = root.value?.querySelector<HTMLElement>('[role="alert"], h2')
      if (target) { target.tabIndex = -1; target.focus() }
    })
  }
  watch(step, focusStep)
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (dirty.value || locked.value) { event.preventDefault(); event.returnValue = '' }
  }
  onMounted(() => window.addEventListener('beforeunload', beforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
  return { step, root, evidenceBusy, historyBusy, locked, dirty, scopeChange, cancelRequested, focusStep }
}
