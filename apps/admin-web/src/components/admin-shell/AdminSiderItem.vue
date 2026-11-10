<script setup lang="ts">
  /**
   * 侧栏菜单项：当前项用 accent 图标 + 左侧 2px 竖条 + 灰底共同表达。
   *
   * 收起到纯图标时，文字从可视区移除但保留 `aria-label` 与右侧 tooltip，
   * 保证收起态仍有可访问名称与鼠标可发现的标签。
   */
  import { NTooltip } from 'naive-ui';
  import AdminIcon from './AdminIcon.vue';
  import type { AdminIconName } from './icons';

  defineProps<{ label: string; icon: AdminIconName; active: boolean; collapsed: boolean }>();
  defineEmits<{ select: [] }>();
</script>

<template>
  <NTooltip placement="right" :disabled="!collapsed" :delay="200">
    <template #trigger>
      <button
        type="button"
        class="nav-item"
        :class="{ 'is-collapsed': collapsed }"
        :aria-current="active ? 'page' : undefined"
        :aria-label="collapsed ? label : undefined"
        @click="$emit('select')"
      >
        <AdminIcon :name="icon" class="nav-icon" />
        <span class="nav-text">{{ label }}</span>
      </button>
    </template>
    {{ label }}
  </NTooltip>
</template>

<style scoped>
  .nav-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--admin-space-md);
    width: 100%;
    height: var(--admin-nav-item);
    padding: 0 var(--admin-space-md);
    border: 0;
    border-radius: var(--admin-radius-md);
    background: transparent;
    color: var(--admin-body);
    font-size: var(--admin-text-body-size);
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    cursor: pointer;
    transition: background-color var(--admin-motion-fast) var(--admin-motion-ease-out),
      color var(--admin-motion-fast) var(--admin-motion-ease-out);
  }

  .nav-item + .nav-item {
    margin-top: 2px;
  }

  .nav-icon {
    flex: none;
    color: var(--admin-muted);
    transition: color var(--admin-motion-fast) var(--admin-motion-ease-out);
  }

  .nav-item:hover {
    background: var(--admin-surface-muted);
    color: var(--admin-ink);
  }

  .nav-item:hover .nav-icon {
    color: var(--admin-body);
  }

  .nav-item[aria-current='page'] {
    background: var(--admin-surface-muted);
    color: var(--admin-ink);
    font-weight: var(--admin-text-body-strong-weight);
  }

  .nav-item[aria-current='page'] .nav-icon {
    color: var(--admin-accent);
  }

  .nav-item[aria-current='page']::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 2px;
    height: 16px;
    border-radius: 2px;
    background: var(--admin-accent);
  }

  .nav-text {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 收起态只留图标：宽度由侧栏决定，图标居中，文字退出布局与 Tab 顺序之外。 */
  .nav-item.is-collapsed {
    justify-content: center;
    padding: 0;
  }

  .nav-item.is-collapsed .nav-text {
    display: none;
  }

  @media (pointer: coarse), (max-width: 767px) {
    .nav-item.is-collapsed {
      justify-content: flex-start;
      padding: 0 var(--admin-space-md);
    }

    .nav-item.is-collapsed .nav-text {
      display: block;
    }
  }
</style>
