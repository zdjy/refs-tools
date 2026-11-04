/** 真实私有 API 使用同源 Cookie；不经过框架演示 token、Mock 和 GET 缓存。 */
export async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...init, credentials: 'same-origin', cache: 'no-store',
    headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...init.headers },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || '请求失败，请稍后重试');
  return payload.data as T;
}
