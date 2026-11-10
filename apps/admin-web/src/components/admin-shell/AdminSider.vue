<script setup lang="ts">
  /**
   * 侧栏：232px，可折叠至 56px；固定左侧菜单，不提供顶部或混合模式。
   *
   * 当前项由 accent 图标 + 左侧 2px 竖条 + surfaceMuted 底共同表达，
   * 不只依赖颜色（FS-0010 v2 §4.3）。
   */
  import { computed } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useI18n } from 'vue-i18n';
  import { useAsyncRouteStore } from '@/store/modules/asyncRoute';
  import { useLocaleStore } from '@/store/modules/locale';
  import { generatorMenu } from '@/utils';
  import AdminSiderCollapse from './AdminSiderCollapse.vue';
  import AdminSiderItem from './AdminSiderItem.vue';
  import type { AdminIconName } from './icons';

  const props = withDefaults(defineProps<{ collapsed?: boolean; mobileOpen?: boolean }>(), {
    collapsed: false,
    mobileOpen: false,
  });
  const emit = defineEmits<{ navigate: []; 'toggle-collapse': [] }>();

  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();
  const asyncRouteStore = useAsyncRouteStore();
  const localeStore = useLocaleStore();

  interface MenuEntry {
    key: string;
    label: string;
    icon: AdminIconName;
  }

  /** 路由 meta.icon 是渲染函数，侧栏改用本地图标名，避免依赖模板图标组件。 */
  const iconByRoute: Record<string, AdminIconName> = {
    System: 'menu',
    system_user: 'users',
    system_organization: 'building',
    system_certification: 'shield',
    system_file: 'file',
    system_menu: 'menu',
    system_role: 'key',
  };

  function labelOf(title: unknown): string {
    // generatorMenu 已用 tr() 翻译过标题，未命中语言包时回显原文。
    return String(title ?? '');
  }

  const groups = computed(() => {
    // localeStore.locale 作为依赖，语言切换后重新生成标题。
    void localeStore.locale;
    const menus = generatorMenu(asyncRouteStore.getMenus) as unknown as {
      key: string;
      label?: unknown;
      children?: { key: string; label?: unknown }[];
    }[];

    return menus.map((menu) => {
      const children = (menu.children ?? []).map((child) => ({
        key: child.key,
        label: labelOf(child.label),
        icon: iconByRoute[child.key] ?? 'menu',
      }));
      return {
        key: menu.key,
        label: labelOf(menu.label),
        entries: children,
      };
    });
  });

  const activeKey = computed(() => (route.meta?.activeMenu as string) || (route.name as string));

  function isActive(key: string): boolean {
    return activeKey.value === key;
  }

  function go(key: string) {
    if (key === activeKey.value) {
      emit('navigate');
      return;
    }
    void router.push({ name: key });
    emit('navigate');
  }

  const isCollapsed = computed(() => props.collapsed && !props.mobileOpen);
  const collapseLabel = computed(() =>
    isCollapsed.value ? t('layout.header.expandSider') : t('layout.header.collapseSider')
  );
</script>

<template>
  <nav
    class="admin-sider"
    :class="{ 'is-collapsed': isCollapsed, 'is-mobile-open': mobileOpen }"
    :aria-label="t('layout.header.openMenu')"
  >
    <div v-for="group in groups" :key="group.key" class="nav-group">
      <div class="nav-group-label">{{ group.label }}</div>
      <AdminSiderItem
        v-for="entry in group.entries"
        :key="entry.key"
        :label="entry.label"
        :icon="entry.icon"
        :active="isActive(entry.key)"
        :collapsed="isCollapsed"
        @select="go(entry.key)"
      />
    </div>

    <AdminSiderCollapse
      :collapsed="isCollapsed"
      :label="collapseLabel"
      :open-label="isCollapsed ? t('layout.header.expandSider') : t('layout.header.collapseSider')"
      @toggle="emit('toggle-collapse')"
    />
  </nav>
</template>

<style scoped>
  .admin-sider {
    position: sticky;
    top: var(--admin-topbar-height);
    display: flex;
    flex-direction: column;
    width: var(--admin-sider-width);
    height: calc(100dvh - var(--admin-topbar-height));
    flex: none;
    align-self: flex-start;
    padding: var(--admin-space-md) var(--admin-space-md) var(--admin-space-xl);
    background: var(--admin-surface-sunken);
    border-right: 1px solid var(--admin-line);
    overflow-x: hidden;
    overflow-y: auto;
    transition: width var(--admin-motion-base) var(--admin-motion-ease-out);
  }

  .admin-sider.is-collapsed {
    width: var(--admin-sider-collapsed-width);
    padding-left: var(--admin-space-sm);
    padding-right: var(--admin-space-sm);
  }

  .nav-group {
    min-width: 0;
  }

  .nav-group + .nav-group {
    margin-top: var(--admin-space-xxl);
  }

  .admin-sider.is-collapsed {
    width: var(--admin-sider-collapsed-width);
    padding-left: var(--admin-space-sm);
    padding-right: var(--admin-space-sm);
  }

  .nav-group {
    min-width: 0;
  }

  .nav-group + .nav-group {
    margin-top: var(--admin-space-xxl);
  }

  .nav-group-label {
    padding: 0 var(--admin-space-md) var(--admin-space-xs);
    font-size: var(--admin-text-meta-size);
    font-weight: var(--admin-text-table-head-weight);
    color: var(--admin-muted);
    white-space: nowrap;
    overflow: hidden;
  }

  /* 收起时标签不占宽度：仅留 6px 分隔，避免 nowrap 文字把侧栏撑出横向滚动。 */
  .is-collapsed .nav-group-label {
    width: 0;
    height: 6px;
    padding: 0;
    opacity: 0;
    overflow: hidden;
  }

  @media (pointer: coarse), (max-width: 767px) {
    .admin-sider {
      position: fixed;
      top: var(--admin-topbar-height);
      bottom: 0;
      left: 0;
      height: auto;
      align-self: auto;
      z-index: 40;
      width: var(--admin-sider-width);
      transform: translateX(-100%);
      box-shadow: var(--admin-shadow-pop);
      transition: transform var(--admin-motion-base) var(--admin-motion-ease-out);
    }

    .admin-sider.is-mobile-open {
      transform: none;
    }

    .admin-sider.is-collapsed {
      width: var(--admin-sider-width);
      padding-left: var(--admin-space-md);
      padding-right: var(--admin-space-md);
    }

    .is-collapsed .nav-group-label {
      height: auto;
      padding: 0 var(--admin-space-md) var(--admin-space-xs);
      opacity: 1;
    }
  }
</style>
