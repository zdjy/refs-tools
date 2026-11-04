import { effectScope, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { observeFeedback } from '../src/components/ui/feedback'

describe('操作反馈适配', () => {
  it('不重播旧结果，忽略清空，连续相同操作每次通知且随作用域销毁', () => {
    const source = ref('旧提示'), notify = vi.fn(), scope = effectScope()
    scope.run(() => observeFeedback(source, notify))
    expect(notify).not.toHaveBeenCalled()
    source.value = ''; source.value = '已保存'
    source.value = ''; source.value = '已保存'
    expect(notify.mock.calls).toEqual([['已保存'], ['已保存']])
    scope.stop()
    source.value = '已删除'
    expect(notify).toHaveBeenCalledTimes(2)
  })
})
