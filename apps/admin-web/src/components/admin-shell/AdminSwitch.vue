<script setup lang="ts">
  /** 开关：`role="switch"` + `aria-checked`，触屏放大到 44×24 命中区。 */
  defineProps<{ checked: boolean; label: string }>();
  defineEmits<{ 'update:checked': [value: boolean] }>();
</script>

<template>
  <button
    type="button"
    class="switch"
    role="switch"
    :aria-checked="checked"
    :aria-label="label"
    @click="$emit('update:checked', !checked)"
  />
</template>

<style scoped>
  .switch {
    position: relative;
    width: 36px;
    height: 20px;
    flex: none;
    padding: 0;
    border: 0;
    border-radius: var(--admin-radius-full);
    background: var(--admin-line-strong);
    cursor: pointer;
    transition: background-color var(--admin-motion-fast) var(--admin-motion-ease-out);
  }

  .switch::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: var(--admin-radius-full);
    background: var(--admin-surface);
    box-shadow: var(--admin-shadow);
    transition: transform var(--admin-motion-base) var(--admin-motion-ease-out);
  }

  .switch[aria-checked='true'] {
    background: var(--admin-solid);
  }

  .switch[aria-checked='true']::after {
    transform: translateX(16px);
  }

  @media (pointer: coarse), (max-width: 767px) {
    .switch {
      width: 44px;
      height: 24px;
    }

    .switch::after {
      width: 20px;
      height: 20px;
    }

    .switch[aria-checked='true']::after {
      transform: translateX(20px);
    }
  }
</style>
