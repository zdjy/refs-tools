<script setup lang="ts">
  /**
   * 账号菜单：头像、用户名、主题无关的登出流程。
   *
   * 登出确认沿用顶栏弹窗（`dialog.info`），属于会话级确认，不是页面内破坏性操作。
   */
  import { computed, ref } from 'vue';
  import { NDropdown, useDialog, useMessage } from 'naive-ui';
  import { useRoute, useRouter } from 'vue-router';
  import { useI18n } from 'vue-i18n';
  import { useAvatarStore } from '@/store/modules/avatar';
  import { useUserStore } from '@/store/modules/user';
  import { TABS_ROUTES } from '@/store/mutation-types';
  import { storage } from '@/utils/Storage';

  const { t } = useI18n();
  const route = useRoute();
  const router = useRouter();
  const userStore = useUserStore();
  const avatarStore = useAvatarStore();
  const dialog = useDialog();
  const message = useMessage();

  const open = ref(false);
  const username = computed(() => userStore.username || userStore.info?.username || '');
  const initial = computed(() => username.value.trim().charAt(0).toUpperCase());
  const avatarUrl = computed(() => avatarStore.url);
  const options = computed(() => [
    { key: 'identity', label: username.value, disabled: true },
    { key: 'divider', type: 'divider' as const },
    { key: 'logout', label: t('layout.header.logout') },
  ]);

  function select(key: string) {
    open.value = false;
    if (key === 'logout') logout();
  }

  function logout() {
    dialog.info({
      title: t('common.tip'),
      content: t('layout.header.logoutTip'),
      positiveText: t('common.confirm'),
      negativeText: t('common.cancel'),
      onPositiveClick: () => {
        void userStore.logout().then(() => {
          avatarStore.reset();
          message.success(t('layout.header.logoutSuccess'));
          storage.remove(TABS_ROUTES);
          void router
            .replace({ name: 'Login', query: { redirect: route.fullPath } })
            .finally(() => location.reload());
        });
      },
    });
  }
</script>

<template>
  <NDropdown
    :show="open"
    :options="options"
    placement="bottom-end"
    trigger="click"
    @select="select"
    @clickoutside="open = false"
  >
    <button
      type="button"
      class="account-button"
      :aria-label="`${t('layout.header.account')}：${username}`"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="avatar">
        <img v-if="avatarUrl" :src="avatarUrl" alt="" />
        <template v-else>{{ initial }}</template>
      </span>
      <span class="account-name">{{ username }}</span>
    </button>
  </NDropdown>
</template>

<style scoped>
  .account-button {
    display: flex;
    align-items: center;
    gap: var(--admin-space-sm);
    height: var(--admin-control-height);
    margin-left: var(--admin-space-xs);
    padding: 0 var(--admin-space-md) 0 var(--admin-space-xs);
    border: 0;
    border-radius: var(--admin-radius-md);
    background: transparent;
    color: var(--admin-ink);
    font-size: var(--admin-text-body-size);
    font-weight: var(--admin-text-body-strong-weight);
    cursor: pointer;
    transition: background-color var(--admin-motion-fast) var(--admin-motion-ease-out);
  }

  .account-button:hover {
    background: var(--admin-surface-muted);
  }

  .avatar {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    flex: none;
    overflow: hidden;
    border-radius: var(--admin-radius-full);
    background: var(--admin-solid);
    color: var(--admin-on-solid);
    font-size: 11px;
    font-weight: 600;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .account-name {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (pointer: coarse), (max-width: 767px) {
    .account-name {
      display: none;
    }

    .account-button {
      height: 44px;
      padding: 0 var(--admin-space-sm);
    }
  }
</style>
