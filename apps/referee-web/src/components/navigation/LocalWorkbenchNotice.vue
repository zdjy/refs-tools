<template>
  <aside aria-label="本地工具使用边界" class="mt-8 flex items-start gap-3 rounded-2xl border border-solid border-line bg-soft p-5 text-sm leading-relaxed text-body">
    <svg class="mt-0.5 size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm0 5v5m0 3v1" /></svg>
    <div class="min-w-0"><p class="mt-0 mb-1 font-semibold text-ink">使用前请了解</p><p class="m-0">本地工作台记录仅保存在当前设备，不会自动同步到赛事或赛后主记录。已加载的工作台可不依赖网络操作；首次离线打开页面暂不保证可用。</p><slot /></div>
  </aside>
</template>
