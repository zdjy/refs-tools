import { describe, expect, it } from 'vitest'
import { adminTheme } from '../src/ui-theme'
import { applyUiTokens, uiTokens } from '../src/ui-tokens'

describe('管理端共享视觉基线', () => {
  it('CSS 变量与 Naive UI 来自同一 token，所有按钮尺寸至少 44px', () => {
    const variables = new Map<string, string>()
    applyUiTokens({ style: { setProperty: (name, value) => { variables.set(name, value ?? '') } } })
    expect(variables.get('--red')).toBe(uiTokens.red)
    expect(variables.get('--red-hover')).toBe(uiTokens.redHover)
    expect(adminTheme.common?.primaryColor).toBe(uiTokens.ink)
    expect(adminTheme.common?.bodyColor).toBe(uiTokens.canvas)
    for (const size of ['Tiny', 'Small', 'Medium', 'Large'] as const) {
      expect(Number.parseInt(String(adminTheme.Button?.[`height${size}`] ?? '0'))).toBeGreaterThanOrEqual(44)
      expect(adminTheme.Button?.[`borderRadius${size}`]).toBe('999px')
    }
  })
})
