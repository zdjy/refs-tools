import type { ButtonProps } from 'naive-ui'

/**
 * 二次确认气泡（`NPopconfirm`）的按钮投影：危险操作确认与取消都必须达到
 * 44×44 CSS px 的触控目标，因此统一提升到 large 并显式声明最小高度。
 * 这里只适配组件库尺寸，不承载任何业务语义或文案。
 */
const touchTarget = { size: 'large', style: { minHeight: '44px' } } as const

export const confirmButtonProps: ButtonProps = { ...touchTarget }
export const cancelButtonProps: ButtonProps = { ...touchTarget }
