/** 可公开的业务失败；HTTP 边界负责补充本次 requestId。 */
export class DomainError extends Error {
  constructor(readonly code: string, message: string, readonly statusCode: number) {
    super(message)
    this.name = 'DomainError'
  }
}
