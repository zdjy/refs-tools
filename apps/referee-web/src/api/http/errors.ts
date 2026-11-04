/** 传输层失败的最小分类，不携带原始异常、响应体或签名 URL。 */
export type HttpErrorKind = 'network' | 'http' | 'invalid-response'

/**
 * HTTP 基础设施抛出的唯一错误类型。网关（`*.api.ts`）负责把它翻译为所属上下文的错误，
 * 因此 UI 与状态层永远看不到 alova 或 fetch 的原始异常。
 */
export class HttpError extends Error {
  constructor(
    readonly kind: HttpErrorKind,
    /** 服务端 `error.code`；网络失败或响应体不合约定时为 null。 */
    readonly code: string | null,
    readonly status: number,
  ) { super(kind) }
}
