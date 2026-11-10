<script setup lang="ts">
  /**
   * 就地确认按钮（FS-0010 v2 §5.2）：
   *
   * 破坏性操作不再新开确认弹窗，改用 `NPopconfirm` 在触发点就地确认。
   * 键盘可达性：气泡打开后焦点进入气泡并锁在气泡内（`internal-trap-focus`），
   * 因此「取消 / 确认」都能用 Tab + Enter 到达，不必依赖鼠标。
   * Esc 在捕获阶段拦下：先关气泡并把焦点交回触发按钮，不再继续冒泡去关掉底层弹窗。
   */
  import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
  import { NButton, NPopconfirm } from 'naive-ui';
  import AdminIconButton from './AdminIconButton.vue';
  import type { AdminIconName } from './icons';

  const props = withDefaults(
    defineProps<{
      label: string;
      message: string;
      icon?: AdminIconName;
      confirmLabel?: string;
      cancelLabel?: string;
      tone?: 'danger' | 'primary' | 'default';
      disabled?: boolean;
      loading?: boolean;
      block?: boolean;
    }>(),
    {
      icon: undefined,
      confirmLabel: '确认',
      cancelLabel: '取消',
      tone: 'danger',
      disabled: false,
      loading: false,
      block: false,
    }
  );
  const emit = defineEmits<{ confirm: []; 'update:open': [value: boolean] }>();

  const open = ref(false);
  const triggerRef = ref<InstanceType<typeof NButton> | null>(null);
  const panelRef = ref<HTMLElement | null>(null);

  const buttonType = () => (props.tone === 'default' ? 'default' : props.tone === 'primary' ? 'primary' : 'error');

  function setOpen(value: boolean) {
    open.value = value;
    emit('update:open', value);
  }

  function panel() {
    return panelRef.value?.closest('.n-popover') ?? null;
  }

  /** 走 Popconfirm 自己的「取消」按钮关闭，动画与状态回收都由组件库负责。 */
  function closeViaCancel() {
    panel()?.querySelector<HTMLButtonElement>('button')?.click();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    closeViaCancel();
    triggerRef.value?.$el?.focus();
  }

  watch(open, async (value) => {
    if (value) document.addEventListener('keydown', onKeydown, true);
    else document.removeEventListener('keydown', onKeydown, true);
    if (!value) return;
    await nextTick();
    const buttons = panel()?.querySelectorAll<HTMLButtonElement>('button');
    buttons?.[buttons.length - 1]?.focus();
  });

  onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown, true));

  defineExpose({ focus: () => triggerRef.value?.$el?.focus() });
</script>

<template>
  <span class="admin-confirm">
    <NPopconfirm
      :positive-text="confirmLabel"
      :negative-text="cancelLabel"
      :positive-button-props="{ type: tone === 'danger' ? 'error' : 'primary', size: 'small' }"
      :negative-button-props="{ size: 'small' }"
      :disabled="disabled"
      :internal-trap-focus="true"
      placement="top-start"
      @positive-click="emit('confirm')"
      @update:show="setOpen"
    >
      <template #trigger>
        <AdminIconButton v-if="icon" :icon="icon" :label="label" :disabled="disabled" />
        <NButton
          v-else
          ref="triggerRef"
          :type="buttonType()"
          :text="tone === 'danger'"
          :secondary="tone === 'default'"
          :loading="loading"
          :disabled="disabled"
          :block="block"
        >
          {{ label }}
        </NButton>
      </template>
      <span ref="panelRef" class="confirm-message">{{ message }}</span>
    </NPopconfirm>
  </span>
</template>

<style scoped>
  .admin-confirm {
    display: inline-flex;
    min-width: 0;
  }

  .confirm-message {
    display: block;
    max-width: 280px;
    font-size: var(--admin-text-body-size);
    line-height: var(--admin-text-body-leading);
    color: var(--admin-body);
  }
</style>
