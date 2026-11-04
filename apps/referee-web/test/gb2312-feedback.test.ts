import { describe, expect, it, vi } from 'vitest'
import { useGb2312 } from '../src/views/gb2312/useGb2312'

describe('区位码复制反馈', () => {
  it('剪贴板确认写入后才成功，重复复制仍提供可观察结果', async () => {
    let done!: () => void
    const writeText = vi.fn(() => new Promise<void>(resolve => { done = resolve }))
    const state = useGb2312({ writeText })
    const first = state.copy('区位码', '5448')
    expect(state.copyNotice.value).toBe('')
    await state.copy('区位码', '5448')
    expect(writeText).toHaveBeenCalledTimes(1)
    done(); await first
    expect(state.copyNotice.value).toBe('区位码已复制。')
    expect(state.copying.value).toBe(false)
  })

  it('无剪贴板或拒绝写入时显示恢复说明，不抛未处理异常或伪报成功', async () => {
    const absent = useGb2312(undefined)
    await absent.copy('区位码', '5448')
    expect(absent.copyError.value).toContain('手动选择')
    const writeText = vi.fn().mockRejectedValueOnce(new Error('denied')).mockResolvedValueOnce(undefined)
    const state = useGb2312({ writeText })
    await state.copy('区位码', '5448')
    expect(state.copyError.value).toContain('权限')
    expect(state.copyNotice.value).toBe('')
    expect(state.copiedLabel.value).toBe('')
    await state.copy('区位码', '5448')
    expect(state.copyError.value).toBe('')
    expect(state.copyNotice.value).toContain('已复制')
    state.clearAll()
    expect(state.copyNotice.value).toBe('')
  })
})
