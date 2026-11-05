<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { NAlert, NButton } from 'naive-ui';
  import { maskInviteToken } from '../platform-invites.presentation';

  /**
   * 邀请码明文只展示一次：默认遮蔽，点「显示」才展开，避免被旁人看到屏幕；
   * 关闭后无法再次查看。复制被浏览器拒绝时由 notice 说明手动复制的替代路径。
   */
  const props = defineProps<{ token: string; notice: string }>();
  defineEmits<{ copy: []; dismiss: [] }>();
  const shown = ref(false);
  const display = computed(() => (shown.value ? props.token : maskInviteToken(props.token)));
</script>

<template>
  <NAlert type="warning" title="新邀请码（仅显示一次）" aria-live="polite">
    <p class="mt-0">请现在复制并交给申请人。关闭后无法再次查看，丢失只能撤销后重新生成。邀请码一次性有效，使用后立即失效。</p>
    <p class="break-all font-mono" :class="shown ? 'select-all' : 'select-none'" data-testid="platform-invite-token">{{ display }}</p>
    <div class="flex flex-wrap items-center gap-3">
      <NButton size="large" :aria-pressed="shown" @click="shown = !shown">{{ shown ? '隐藏明文' : '显示明文' }}</NButton>
      <NButton size="large" type="primary" @click="$emit('copy')">复制邀请码</NButton>
      <NButton size="large" @click="$emit('dismiss')">我已保存，关闭</NButton>
    </div>
    <p v-if="notice" role="status" class="mb-0">{{ notice }}</p>
  </NAlert>
</template>
