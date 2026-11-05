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
  /**
   * 原样导出存储中的原始字符串，不解析、不校验，使读取失败（数据损坏或版本不兼容）时用户仍能备份。
   * @returns 存储中没有数据时返回 false，且不触发下载。
   * @throws 存储不可访问或下载失败时传播错误。
   */
  downloadRaw(): boolean
  dispose(): void
}
