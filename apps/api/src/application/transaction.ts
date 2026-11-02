/** 应用层事务端口；回调仅接收当前事务的 Repository，不暴露驱动或查询能力。 */
export interface TransactionRunner<Repositories> {
  run<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>
}
