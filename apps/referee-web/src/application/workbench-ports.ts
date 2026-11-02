import type { WorkbenchSession } from '../domain/workbench'

export interface WorkbenchSnapshot {
  sessions: WorkbenchSession[]
  /** 空字符串表示没有活动会话，不是一个可保存的会话 ID。 */
  activeId: string
}

/** 同步设备 IO 端口；失败由应用状态层决定保留、重试或反馈。 */
/** 应用层定义此端口，基础设施适配器负责提供设备存储与文件下载实现。 */
export interface WorkbenchPorts {
  load(): WorkbenchSnapshot
  save(snapshot: WorkbenchSnapshot): void
  download(session: WorkbenchSession): void
  dispose(): void
}
