import { defineStore } from 'pinia'
import { createWorkbenchState } from '../application/workbench-state'
import { createBrowserWorkbenchPorts, type WorkbenchPorts } from '../infrastructure/workbench-storage'

/** 将 Pinia 生命周期与浏览器端口装配在应用层之外，不让用例状态依赖具体基础设施。 */
export function createWorkbenchStore(ports: WorkbenchPorts = createBrowserWorkbenchPorts()) {
  return defineStore('workbench', () => createWorkbenchState(ports))
}

export const useWorkbenchStore = createWorkbenchStore()
