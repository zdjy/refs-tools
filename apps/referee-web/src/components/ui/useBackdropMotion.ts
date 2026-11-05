import { ref } from 'vue'
import { readBackdropMotion, writeBackdropMotion } from '../../infrastructure/backdrop-preference'

/**
 * 背景动效开关。状态放在模块级：导航外壳在每个页面各自挂载，路由切换不应让开关被重置或闪一下。
 * 偏好经基础设施适配器保存到 localStorage；系统开启「减弱动态效果」时由样式直接隐藏运动元素，
 * 这里不去覆盖用户的显式选择。
 */
const storage = typeof localStorage === 'undefined' ? undefined : localStorage
const enabled = ref(readBackdropMotion(storage))

export function useBackdropMotion() {
  function toggle(): void {
    enabled.value = !enabled.value
    writeBackdropMotion(storage, enabled.value)
  }
  return { enabled, toggle }
}
