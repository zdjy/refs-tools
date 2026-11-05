<template>
  <n-dialog-provider>
    <n-notification-provider>
      <n-message-provider>
        <slot name="default"></slot>
        <!-- 全局网络状态提示，固定在视口底部，见 FS-0025；挂在根 Provider 内以复用主题。 -->
        <UiNetworkBanner />
      </n-message-provider>
    </n-notification-provider>
  </n-dialog-provider>
</template>

<script lang="ts">
  import { defineComponent } from 'vue';
  import { NDialogProvider, NNotificationProvider, NMessageProvider } from 'naive-ui';
  import UiNetworkBanner from '../ui/UiNetworkBanner.vue';

  export default defineComponent({
    name: 'Application',
    components: {
      NDialogProvider,
      NNotificationProvider,
      NMessageProvider,
      UiNetworkBanner,
    },
    setup() {
      return {};
    },
  });
</script>
