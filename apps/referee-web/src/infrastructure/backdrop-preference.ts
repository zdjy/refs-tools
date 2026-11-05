/** 背景动效偏好的存储键；只保存一个布尔值，不含任何账号或业务数据。 */
export const BACKDROP_MOTION_KEY = 'referee:backdrop-motion'

type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>

/**
 * 读取背景动效偏好，默认开启。
 * 存储不可用（隐私模式、被禁用）或值无法识别时一律回到默认，不让偏好读取影响页面渲染。
 */
export function readBackdropMotion(storage: PreferenceStorage | undefined): boolean {
  try {
    return storage?.getItem(BACKDROP_MOTION_KEY) !== 'off'
  } catch {
    return true
  }
}

/** 保存偏好；写入失败时静默放弃，本次会话内的开关状态仍由内存持有。 */
export function writeBackdropMotion(storage: PreferenceStorage | undefined, enabled: boolean): void {
  try {
    storage?.setItem(BACKDROP_MOTION_KEY, enabled ? 'on' : 'off')
  } catch {
    // 配额或权限问题只影响下次打开时的默认值，不值得打断用户。
  }
}
