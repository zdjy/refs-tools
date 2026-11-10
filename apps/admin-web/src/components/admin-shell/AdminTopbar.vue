<script setup lang="ts">
  /**
   * 顶栏：56px 粘性，只保留品牌、帮助、主题、界面设置与账号菜单。
   *
   * 锁屏、全屏、刷新与语言切换已按 FS-0010 v2 §4.5 移除；
   * 界面设置入口保留，抽屉内容收敛到主题 / 密度 / 侧栏默认收起 / 关于。
   */
  import { computed, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { websiteConfig } from '@/config/website.config';
  import { useBrandLogo } from '@/hooks/setting/useBrandLogo';
  import { useDesignSettingStore } from '@/store/modules/designSetting';
  import AdminIconButton from './AdminIconButton.vue';
  import AdminSettingsDrawer from './AdminSettingsDrawer.vue';
  import AdminAccountMenu from './AdminAccountMenu.vue';

  const props = defineProps<{ siderCollapsed: boolean }>();
  const emit = defineEmits<{ 'toggle-sider': []; 'open-mobile-nav': [] }>();

  const { t } = useI18n();
  const designStore = useDesignSettingStore();
  const logo = useBrandLogo();

  const settingsOpen = ref(false);
  const isDark = computed(() => designStore.darkTheme);

  const themeLabel = computed(() =>
    isDark.value ? t('layout.setting.light') : t('layout.setting.dark')
  );

  function toggleTheme() {
    designStore.toggleDarkTheme();
  }
</script>

<template>
  <header class="admin-topbar">
    <div class="admin-topbar-left">
      <AdminIconButton
        class="mobile-nav-trigger"
        icon="menuBurger"
        :label="t('layout.header.openMenu')"
        @click="emit('open-mobile-nav')"
      />
      <AdminIconButton
        class="desktop-sider-trigger"
        :icon="props.siderCollapsed ? 'chevronRight' : 'chevronLeft'"
        :label="props.siderCollapsed ? t('layout.header.expandSider') : t('layout.header.collapseSider')"
        @click="emit('toggle-sider')"
      />
      <div class="brand">
        <img class="brand-mark" :src="logo" alt="" />
        <span class="brand-name">{{ websiteConfig.title }}</span>
        <span class="brand-sep" aria-hidden="true">/</span>
        <span class="brand-sub">{{ t('layout.header.brandSub') }}</span>
      </div>
    </div>

    <div class="admin-topbar-right">
      <AdminIconButton icon="help" :label="t('layout.header.help')" />
      <AdminIconButton
        :icon="isDark ? 'sun' : 'moon'"
        :label="isDark ? themeLabel : t('layout.header.toggleTheme')"
        @click="toggleTheme"
      />
      <AdminIconButton
        icon="settings"
        :label="t('layout.header.settings')"
        @click="settingsOpen = true"
      />

      <AdminAccountMenu />
    </div>
  </header>

  <AdminSettingsDrawer v-model:show="settingsOpen" />
</template>

<style scoped>
  .admin-topbar {
    position: sticky;
    top: 0;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--admin-space-xl);
    height: var(--admin-topbar-height);
    padding: 0 var(--admin-space-2xl) 0 var(--admin-space-lg);
    background: var(--admin-canvas);
    border-bottom: 1px solid var(--admin-line);
  }

  .admin-topbar-left,
  .admin-topbar-right {
    display: flex;
    align-items: center;
    gap: var(--admin-space-xs);
    min-width: 0;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: var(--admin-space-md);
    margin-left: var(--admin-space-md);
    min-width: 0;
  }

  .brand-mark {
    width: 20px;
    height: 20px;
    flex: none;
    object-fit: contain;
  }

  .brand-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--admin-ink);
    white-space: nowrap;
  }

  .brand-sep {
    color: var(--admin-line-strong);
  }

  .brand-sub {
    font-size: 12px;
    color: var(--admin-muted);
    white-space: nowrap;
  }

  .mobile-nav-trigger {
    display: none;
  }

  @media (pointer: coarse), (max-width: 767px) {
    .admin-topbar {
      padding: 0 var(--admin-space-xl);
    }

    .mobile-nav-trigger {
      display: grid;
    }

    .desktop-sider-trigger,
    .brand-sep,
    .brand-sub {
      display: none;
    }
  }
</style>
