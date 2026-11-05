/* 应用外壳 Service Worker 模板，构建时由 pwa-plugin 注入版本与预缓存清单（ADR 0031）。
 * 只缓存同源静态外壳；/api、/admin 与任何非 GET 请求一律不拦截，因此不会缓存私有响应或签名 URL。 */
const VERSION = '__PRECACHE_VERSION__'
const PRECACHE = __PRECACHE_URLS__
const CACHE = `referee-shell-${VERSION}`
// 弱网下网络优先的导航请求最多等待这么久，超时用缓存外壳兜底。
const NAVIGATION_TIMEOUT_MS = 4000

self.addEventListener('install', (event) => {
  // 不调用 skipWaiting：新版本等用户确认刷新，避免比赛进行中内存状态（撤销历史）被意外重载。
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('referee-shell-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

const isPrivatePath = (url) => url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')

async function navigationResponse(request) {
  const cache = await caches.open(CACHE)
  const shell = () => cache.match('/')
  try {
    const network = fetch(request)
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NAVIGATION_TIMEOUT_MS))
    const response = await Promise.race([network, timeout])
    if (response && response.ok) return response
    return (await shell()) || response || network
  } catch {
    return (await shell()) || Response.error()
  }
}

async function assetResponse(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  // 只在运行期补缓存带内容哈希的资源；其余按需回源。
  if (response.ok && new URL(request.url).pathname.startsWith('/assets/')) cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || isPrivatePath(url)) return
  if (request.mode === 'navigate') event.respondWith(navigationResponse(request))
  else event.respondWith(assetResponse(request))
})
