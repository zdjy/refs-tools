<script setup lang="ts">
  /**
   * 管理端布局壳（FS-0010 v2 §4）。
   *
   * 结构：56px 粘性顶栏 + 232px 侧栏（可折叠至 56px）+ 内容区。
   * 多标签栏与面包屑已移除；窄屏侧栏改为抽屉式，点遮罩或跳转后关闭。
   */
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
  import { useRoute } from 'vue-router';
  import { useDesignSettingStore } from '@/store/modules/designSetting';
  import { useProjectSettingStore } from '@/store/modules/projectSetting';
  import AdminTopbar from '@/components/admin-shell/AdminTopbar.vue';
  import AdminSider from '@/components/admin-shell/AdminSider.vue';

  const route = useRoute();
  const designStore = useDesignSettingStore();
  const settingStore = useProjectSettingStore();

  /** 折叠状态直接读写 store：顶栏、侧栏底部与界面设置抽屉共享同一状态并持久化。 */
  const collapsed = computed(() => designStore.siderCollapsed);
  const mobileOpen = ref(false);
  const isMobile = ref(false);

  const menuSetting = computed(() => settingStore.menuSetting);

  function syncMobileMode() {
    const width = document.body.clientWidth;
    // 与样式表的 `max-width: 767px` 保持同一阈值，避免 768px 时 JS 与 CSS 判断相反。
    isMobile.value = width < menuSetting.value.mobileWidth;
    if (!isMobile.value) mobileOpen.value = false;
  }

  function onResize() {
    syncMobileMode();
  }

  onMounted(() => {
    syncMobileMode();
    window.addEventListener('resize', onResize);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize);
  });

  // 路由切换后关闭移动端抽屉，避免遮挡新页面。
  watch(
    () => route.fullPath,
    () => {
      mobileOpen.value = false;
    }
  );

  function toggleSider() {
    if (isMobile.value) {
      mobileOpen.value = !mobileOpen.value;
      return;
    }
    designStore.toggleSiderCollapsed();
  }
</script>

<template>
  <div class="admin-shell">
    <AdminTopbar
      :sider-collapsed="collapsed"
      @toggle-sider="toggleSider"
      @open-mobile-nav="mobileOpen = !mobileOpen"
    />

    <div class="admin-shell-body">
      <AdminSider
        :collapsed="collapsed"
        :mobile-open="mobileOpen"
        @navigate="mobileOpen = false"
        @toggle-collapse="toggleSider"
      />

      <button
        v-if="isMobile && mobileOpen"
        type="button"
        class="admin-shell-scrim"
        aria-label="关闭导航菜单"
        @click="mobileOpen = false"
      />

      <main class="admin-shell-content">
        <RouterView v-slot="{ Component }">
          <component :is="Component" :key="route.fullPath" />
        </RouterView>
      </main>
    </div>
  </div>
</template>

<style scoped>
  .admin-shell {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    background: var(--admin-canvas);
  }

  .admin-shell-body {
    position: relative;
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .admin-shell-content {
    flex: 1;
    min-width: 0;
    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
    padding: var(--admin-space-2xl);
  }

  .admin-shell-scrim {
    position: fixed;
    inset: var(--admin-topbar-height) 0 0 0;
    z-index: 35;
    border: 0;
    padding: 0;
    background: rgb(13 13 12 / 32%);
    cursor: pointer;
  }

  @media (pointer: coarse), (max-width: 767px) {
    .admin-shell-content {
      padding: var(--admin-space-xl);
    }
  }
</style>
