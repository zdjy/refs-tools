<script setup lang="ts">
  /**
   * 表单字段：12px 标签在上，控件在下，间距 6px。
   *
   * 标签使用真实 `<label>`，输入控件通过 `id` 关联，禁止只用占位符当标签。
   */
  import { computed, useId } from 'vue';

  const props = withDefaults(
    defineProps<{ label: string; grow?: boolean; fixed?: string }>(),
    { grow: false, fixed: undefined }
  );

  const fieldId = useId();
  const style = computed(() => (props.fixed ? { flex: `0 0 ${props.fixed}` } : undefined));
</script>

<template>
  <div class="admin-field" :class="{ 'is-grow': grow }" :style="style">
    <label class="admin-field-label" :for="fieldId">{{ label }}</label>
    <slot :id="fieldId" />
  </div>
</template>

<style scoped>
  .admin-field {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-sm);
    min-width: 0;
  }

  .admin-field.is-grow {
    flex: 1 1 260px;
    max-width: 380px;
  }

  .admin-field-label {
    font-size: var(--admin-text-meta-size);
    line-height: var(--admin-text-meta-leading);
    font-weight: 500;
    color: var(--admin-body);
  }

  @media (pointer: coarse), (max-width: 767px) {
    .admin-field.is-grow {
      flex: 1 1 100%;
      max-width: none;
    }

    .admin-field {
      width: 100%;
      flex: 1 1 100%;
    }
  }
</style>
