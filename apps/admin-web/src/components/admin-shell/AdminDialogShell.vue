<script setup lang="ts">
  /**
   * 统一弹窗外壳（FS-0010 v2 §5.2）。
   *
   * - 三档宽度：sm 420 / md 560 / lg 720，页面不再各自写 `:style="{ width }"`。
   * - 头部 56px、主体独立滚动、底部 56px 操作栏。
   * - 打开时焦点落在标题，关闭后由调用方恢复焦点到触发行。
   * - 禁止在弹窗内再开弹窗。删除等破坏性入口放在列表行内（就地确认或独立弹窗），
   *   编辑/查看弹窗只保留保存与关闭（FS-0034 §4）。
   */
  import { computed, nextTick, ref, watch } from 'vue';
  import { NModal } from 'naive-ui';
  import AdminIconButton from './AdminIconButton.vue';

  type Size = 'sm' | 'md' | 'lg';

  const props = withDefaults(
    defineProps<{
      show: boolean;
      title: string;
      size?: Size;
      busy?: boolean;
      closeLabel?: string;
    }>(),
    { size: 'md', busy: false, closeLabel: '关闭' }
  );
  const emit = defineEmits<{ 'update:show': [value: boolean] }>();

  const titleRef = ref<HTMLElement | null>(null);
  /** 记录打开前的焦点元素：关闭后交回触发行/触发按钮（FS-0010 v2 §5.2）。 */
  let restoreTarget: HTMLElement | null = null;
  const widthBySize: Record<Size, string> = { sm: '420px', md: '560px', lg: '720px' };
  const dialogWidth = computed(() => widthBySize[props.size]);

  const visible = computed({
    get: () => props.show,
    set: (value: boolean) => {
      if (props.busy) return;
      emit('update:show', value);
    },
  });

  watch(
    () => props.show,
    async (open) => {
      if (open) {
        restoreTarget = (document.activeElement as HTMLElement | null) ?? null;
        await nextTick();
        titleRef.value?.focus();
        return;
      }
      await nextTick();
      if (restoreTarget?.isConnected) restoreTarget.focus();
      restoreTarget = null;
    }
  );
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :bordered="false"
    :closable="false"
    :mask-closable="!busy"
    :close-on-esc="!busy"
    :style="{ width: `min(${dialogWidth}, calc(100vw - 32px))` }"
    class="admin-dialog"
  >
    <template #header>
      <div class="admin-dialog-head">
        <h2 ref="titleRef" tabindex="-1" class="admin-dialog-title">{{ title }}</h2>
        <AdminIconButton
          icon="close"
          :label="closeLabel"
          :disabled="busy"
          @click="visible = false"
        />
      </div>
    </template>

    <div class="admin-dialog-body">
      <slot />
    </div>

    <template v-if="$slots.footer" #footer>
      <div class="admin-dialog-foot">
        <slot name="footer" />
      </div>
    </template>
  </NModal>
</template>

<style scoped>
  .admin-dialog-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--admin-space-lg);
    min-height: 56px;
    margin: calc(var(--n-padding, 20px) * -1);
    margin-bottom: 0;
    padding: 0 var(--admin-space-lg) 0 var(--admin-space-xxl);
    border-bottom: 1px solid var(--admin-line);
  }

  .admin-dialog-title {
    font-size: var(--admin-text-dialog-title-size);
    line-height: var(--admin-text-dialog-title-leading);
    font-weight: var(--admin-text-dialog-title-weight);
    letter-spacing: var(--admin-text-dialog-title-tracking);
    color: var(--admin-ink);
  }

  .admin-dialog-title:focus-visible {
    box-shadow: none;
  }

  .admin-dialog-body {
    padding: var(--admin-space-xxl) 0 0;
    max-height: calc(100dvh - 240px);
    overflow-y: auto;
  }

  .admin-dialog-foot {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--admin-space-md);
    min-height: 56px;
    margin: 0 calc(var(--n-padding, 20px) * -1) calc(var(--n-padding, 20px) * -1);
    padding: var(--admin-space-md) var(--admin-space-xxl);
    border-top: 1px solid var(--admin-line);
  }

  @media (pointer: coarse), (max-width: 767px) {
    .admin-dialog-foot {
      flex-wrap: wrap;
    }

    .admin-dialog-foot :deep(> *) {
      flex: 1 1 auto;
    }

    .admin-dialog-body {
      max-height: calc(92dvh - 200px);
    }
  }
</style>
