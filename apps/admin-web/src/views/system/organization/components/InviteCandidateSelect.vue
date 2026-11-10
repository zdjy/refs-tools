<script setup lang="ts">
  /** 受邀用户选择：按昵称、实名或完整邮箱检索，只把 userId 交给邀请提交，不要求手填 UUID。 */
  import { computed, ref, watch } from 'vue';
  import { NSelect } from 'naive-ui';
  import type { Candidate } from '@refs-tools/contracts/organization-access';
  import { useInviteCandidates } from '../useInviteCandidates';
  import AdminPagination from '@/components/admin-shell/AdminPagination.vue';
  import AdminStateBanner from '@/components/admin-shell/AdminStateBanner.vue';

  const props = defineProps<{ value: string; organizationId: string; disabled: boolean }>();
  const emit = defineEmits<{ 'update:value': [value: string] }>();
  const { candidates, page, total, loading, error, load, search, clear } = useInviteCandidates(
    () => props.organizationId
  );
  const chosen = ref<Candidate | null>(null);

  const relationLabels: Record<Candidate['relation'], string> = {
    none: '',
    active: ' · 已是成员',
    pending: ' · 待审核',
    invited: ' · 已有待回应邀请',
  };
  const list = computed(() =>
    chosen.value && !candidates.value.some((item) => item.userId === chosen.value?.userId)
      ? [chosen.value, ...candidates.value]
      : candidates.value
  );
  const options = computed(() =>
    list.value.map((item) => ({
      value: item.userId,
      label: `${item.displayName}（尾号 ${item.tag}）${relationLabels[item.relation]}`,
      disabled: item.relation !== 'none',
    }))
  );

  function update(value: string | null) {
    if (!value) {
      chosen.value = null;
      emit('update:value', '');
      return;
    }
    const picked = candidates.value.find((item) => item.userId === value) ?? null;
    if (!picked || picked.relation !== 'none') return;
    chosen.value = picked;
    emit('update:value', picked.userId);
  }

  // 邀请成功后父级清空 userId，同步清掉检索词与候选，避免旧账号被再次提交。
  watch(
    () => props.value,
    (value) => {
      if (!value) {
        chosen.value = null;
        clear();
      }
    }
  );
</script>

<template>
  <div class="candidate">
    <NSelect
      :value="value || null"
      :options="options"
      :loading="loading"
      :disabled="disabled"
      filterable
      remote
      clearable
      placeholder="按昵称、实名或完整邮箱搜索"
      :input-props="{ 'aria-label': '受邀用户', maxlength: 100, autocomplete: 'off' }"
      @search="search"
      @update:value="update"
    >
      <template #empty>
        {{ loading ? '正在检索用户…' : error ? '用户检索失败，请重试' : '未找到可邀请的用户' }}
      </template>
    </NSelect>
    <p class="hint">至少输入 2 个字符；只显示昵称与 ID 尾号，已有成员关系或待回应邀请的账号不可选。</p>
    <p v-if="loading" class="hint" role="status">正在检索用户…</p>
    <AdminStateBanner v-if="error" tone="danger" :message="error" action="重试" @action="load()" />
    <AdminPagination
      v-if="total > 10"
      :page="page"
      :total="total"
      :count-label="(value: number) => `共 ${value} 个账号`"
      :disabled="disabled || loading"
      @update:page="load"
    />
  </div>
</template>

<style scoped>
  .candidate {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-sm);
    width: 100%;
    min-width: 0;
  }

  .hint {
    font-size: var(--admin-text-meta-size);
    line-height: var(--admin-text-meta-leading);
    color: var(--admin-muted);
  }
</style>
