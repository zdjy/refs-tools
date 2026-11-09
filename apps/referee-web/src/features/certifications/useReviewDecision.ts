import { computed, ref } from 'vue'
import type { CertificationAppeal, CertificationDecision } from '@refs-tools/contracts/certifications'
import { reasonProblem } from '../../domain/audit-reason'
import { appealDecisionOptions, decisionLabels, reviewDecisionOptions } from './certifications.presentation'
import type { useReviewQueues } from './useReviewQueues'

type Pending = { kind: 'decision'; decision: CertificationDecision['decision'] }
  | { kind: 'appeal'; appeal: CertificationAppeal; decision: NonNullable<CertificationAppeal['decision']> }

/** 理由确认始终绑定打开时的处理对象；弹窗与刷新期间禁止切换，错误保留输入。 */
export function useReviewDecision(review: ReturnType<typeof useReviewQueues>) {
  const pending = ref<Pending | null>(null), reason = ref(''), problem = ref(''), showDialog = ref(false)
  const dialogCopy = computed(() => {
    const current = pending.value
    if (!current) return { title: '', description: '', label: '', danger: false }
    if (current.kind === 'decision') {
      const option = reviewDecisionOptions(review.record.value?.status ?? 'draft').find(item => item.value === current.decision)
      return { title: decisionLabels[current.decision], description: option?.hint ?? '', label: decisionLabels[current.decision], danger: current.decision === 'revoke' }
    }
    const option = appealDecisionOptions().find(item => item.value === current.decision)
    return { title: `申诉复核：${option?.label ?? ''}`, description: option?.hint ?? '', label: option?.label ?? '提交复核', danger: false }
  })
  function open(value: Pending) {
    if (review.locked.value) return
    review.action.reset(); pending.value = value; reason.value = ''; problem.value = ''; showDialog.value = true
  }
  function openDecision(decision: CertificationDecision['decision']) { open({ kind: 'decision', decision }) }
  function openAppealDecision(appeal: CertificationAppeal, decision: NonNullable<CertificationAppeal['decision']>) { open({ kind: 'appeal', appeal, decision }) }
  function closeDialog(visible: boolean) {
    if (!visible && !review.locked.value) { showDialog.value = false; pending.value = null }
  }
  async function confirmDialog() {
    const current = pending.value, record = review.record.value
    if (!current || !record || review.locked.value) return
    problem.value = reasonProblem(reason.value)
    if (problem.value) return
    const ok = current.kind === 'decision'
      ? await review.decide(record, current.decision, reason.value.trim())
      : await review.decideAppeal(record, current.appeal, current.decision, reason.value.trim())
    if (ok) { showDialog.value = false; pending.value = null; reason.value = '' }
  }
  return { reason, problem, showDialog, dialogCopy, openDecision, openAppealDecision, closeDialog, confirmDialog }
}
