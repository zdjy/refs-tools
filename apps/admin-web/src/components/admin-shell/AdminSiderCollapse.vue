<script setup lang="ts">
  /**
   * 侧栏折叠入口：固定在导航栏底部，PC 端不必回到顶栏即可收起/展开。
   *
   * 收起态只留图标，文字由 `aria-label` 与 tooltip 承担；手机端抽屉不渲染本按钮。
   */
  import { NTooltip } from 'naive-ui';
  import AdminIcon from './AdminIcon.vue';

  defineProps<{ collapsed: boolean; label: string; openLabel: string }>();
  defineEmits<{ toggle: [] }>();
</script>

<template>
  <NTooltip placement="right" :disabled="!collapsed" :delay="200">
    <template #trigger>
      <button
        type="button"
        class="nav-collapse"
        :class="{ 'is-collapsed': collapsed }"
        :aria-label="openLabel"
        :aria-pressed="collapsed"
        @click="$emit('toggle')"
      >
        <AdminIcon :name="collapsed ? 'chevronRight' : 'chevronLeft'" class="nav-collapse-icon" />
        <span class="nav-collapse-text">{{ label }}</span>
      </button>
    </template>
    {{ openLabel }}
  </NTooltip>
</template>

<style scoped>
  .nav-collapse {
    display: flex;
    align-items: center;
    gap: var(--admin-space-md);
    width: 100%;
    height: var(--admin-nav-item);
    margin-top: auto;
    padding: 0 var(--admin-space-md);
    border: 0;
    border-radius: var(--admin-radius-md);
    background: transparent;
    color: var(--admin-muted);
    font-size: var(--admin-text-meta-size);
    white-space: nowrap;
    cursor: pointer;
    transition: background-color var(--admin-motion-fast) var(--admin-motion-ease-out),
      color var(--admin-motion-fast) var(--admin-motion-ease-out);
  }

  .nav-collapse:hover {
    background: var(--admin-surface-muted);
    color: var(--admin-ink);
  }

  .nav-collapse:active {
    transform: scale(0.99);
  }

  .nav-collapse-icon {
    flex: none;
  }

  .nav-collapse.is-collapsed {
    justify-content: center;
    padding: 0;
  }

  .nav-collapse.is-collapsed .nav-collapse-text {
    display: none;
  }

  @media (pointer: coarse), (max-width: 767px) {
    .nav-collapse {
      display: none;
    }
  }
</style>
