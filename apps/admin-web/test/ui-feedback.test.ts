import { effectScope, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { observeFeedback } from '../src/components/ui/feedback';

describe('管理端操作反馈', () => {
  it('不重播历史通知，同一轮重复成功文案仍逐次通知，卸载后停止', () => {
    const source = ref('旧通知'), notify = vi.fn(), scope = effectScope();
    scope.run(() => observeFeedback(source, notify));
    expect(notify).not.toHaveBeenCalled();
    source.value = ''; source.value = '用户已创建';
    source.value = ''; source.value = '用户已创建';
    expect(notify.mock.calls).toEqual([['用户已创建'], ['用户已创建']]);
    scope.stop(); source.value = '用户已删除';
    expect(notify).toHaveBeenCalledTimes(2);
  });
});
