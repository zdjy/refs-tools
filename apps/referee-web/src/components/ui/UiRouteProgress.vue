<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import { useLoadingBar } from 'naive-ui'
import { useRouter } from 'vue-router'
import { networkPolicy } from '../../infrastructure/network/network-policy'

/**
 * 路由切换进度条：懒加载路由的 chunk 在弱网下可能数秒才到达。
 * 延迟 routeProgressDelayMs 后才出现，快速切换不闪烁；只负责展示，不参与导航决策。
 */
const bar = useLoadingBar()
const router = useRouter()
let timer: ReturnType<typeof setTimeout> | undefined
let started = false

const stopBefore = router.beforeEach(() => {
  clearTimeout(timer)
  timer = setTimeout(() => { started = true; bar.start() }, networkPolicy.routeProgressDelayMs)
})
const settle = (failed: boolean) => {
  clearTimeout(timer)
  if (started) { started = false; if (failed) bar.error(); else bar.finish() }
}
const stopAfter = router.afterEach((_to, _from, failure) => settle(!!failure))
const stopError = router.onError(() => settle(true))

onBeforeUnmount(() => { stopBefore(); stopAfter(); stopError(); clearTimeout(timer) })
</script>

<template><span hidden></span></template>
