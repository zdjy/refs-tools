import { defineStore } from 'pinia'
import { createWorkbenchState } from '../views/workbench/useWorkbench'
import type { WorkbenchPorts } from '../infrastructure/workbench-storage'

export function createWorkbenchStore(ports?: WorkbenchPorts) {
  return defineStore('workbench', () => createWorkbenchState(ports))
}

export const useWorkbenchStore = createWorkbenchStore()
