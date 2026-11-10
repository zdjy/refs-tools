<script setup lang="ts">
  /**
   * 邀请码明文只展示一次：默认遮蔽，点「显示明文」才展开，避免被旁人看到屏幕；
   * 关闭后无法再次查看。复制被浏览器拒绝时由 notice 说明手动复制的替代路径。
   */
  import { computed, ref } from 'vue';
  import { NButton } from 'naive-ui';
  import { maskInviteToken } from '../platform-invites.presentation';

  const props = defineProps<{ token: string; notice: string }>();
  defineEmits<{ copy: []; dismiss: [] }>();
  const shown = ref(false);
  const display = computed(() => (shown.value ? props.token : maskInviteToken(props.token)));
</script>

<template>
  <section class="reveal" aria-live="polite" aria-labelledby="invite-reveal-title">
    <h3 id="invite-reveal-title" class="reveal-title">新邀请码（仅显示一次）</h3>
    <p class="hint">请现在复制并交给申请人。关闭后无法再次查看，丢失只能撤销后重新生成。邀请码一次性有效，使用后立即失效。</p>
    <p class="token" :class="shown ? 'is-shown' : 'is-masked'" data-testid="platform-invite-token">{{ display }}</p>
    <div class="reveal-actions">
      <NButton :aria-pressed="shown" @click="shown = !shown">{{ shown ? '隐藏明文' : '显示明文' }}</NButton>
      <NButton type="primary" @click="$emit('copy')">复制邀请码</NButton>
      <NButton @click="$emit('dismiss')">我已保存，关闭</NButton>
    </div>
    <p v-if="notice" class="hint" role="status">{{ notice }}</p>
  </section>
</template>

<style scoped>
  .reveal {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-md);
    padding: var(--admin-space-lg);
    background: var(--admin-status-warning);
    border: 1px solid color-mix(in srgb, var(--admin-warning) 20%, transparent);
    border-radius: var(--admin-radius-md);
  }

  .reveal-title {
    font-size: var(--admin-text-section-title-size);
    line-height: var(--admin-text-section-title-leading);
    font-weight: var(--admin-text-section-title-weight);
    color: var(--admin-warning);
  }

  .token {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: var(--admin-text-body-size);
    line-height: var(--admin-text-body-leading);
    color: var(--admin-ink);
    overflow-wrap: anywhere;
  }

  .token.is-shown {
    user-select: all;
  }

  .token.is-masked {
    user-select: none;
  }

  .reveal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--admin-space-md);
  }

  .hint {
    font-size: var(--admin-text-meta-size);
    line-height: var(--admin-text-meta-leading);
    color: var(--admin-body);
  }

  @media (pointer: coarse), (max-width: 767px) {
    .reveal-actions :deep(> *) {
      flex: 1 1 auto;
    }
  }
</style>
