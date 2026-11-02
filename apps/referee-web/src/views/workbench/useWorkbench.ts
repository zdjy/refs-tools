import { ref } from 'vue'
import { defaultRuleInput, rulesFromInput } from '../../domain/workbench-commands'
import type { WorkbenchRuleInput } from '../../domain/workbench-commands'
import type { RuleSet } from '../../domain/workbench'

export interface WorkbenchSessionCommand {
  startSession(rules: RuleSet): boolean
}

/** 页面临时状态，独立于跨页面共享的工作台应用状态。 */
export function createWorkbenchViewState(workbench: WorkbenchSessionCommand) {
  const formError = ref('')
  const createDialogVisible = ref(false)
  const newRules = ref(defaultRuleInput())

  /** 参数校验与错误呈现属于表单交互；应用命令未接受时保留输入和弹窗。 */
  function startSession() {
    try {
      const rules = rulesFromInput(newRules.value, Date.now())
      if (!workbench.startSession(rules)) return
      formError.value = ''
      createDialogVisible.value = false
    } catch (error) {
      formError.value = error instanceof Error ? error.message : '无法创建本地比赛会话，请检查参数后重试。'
    }
  }

  return { formError, createDialogVisible, newRules, startSession }
}

export type WorkbenchRuleForm = WorkbenchRuleInput
