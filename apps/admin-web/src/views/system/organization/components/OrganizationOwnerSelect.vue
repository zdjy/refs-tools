<script setup lang="ts">
  /** 负责人选择：远程搜索，只允许账号有效且邮箱已验证的用户。 */
  import { computed } from 'vue';
  import { NSelect } from 'naive-ui';
  import { useOrganizationOwners } from '../useOrganizationOwners';
  import AdminPagination from '@/components/admin-shell/AdminPagination.vue';
  import AdminStateBanner from '@/components/admin-shell/AdminStateBanner.vue';

  defineProps<{ value: string; disabled: boolean; online: boolean }>();
  const emit = defineEmits<{ 'update:value': [value: string] }>();
  const { users, selected, page, total, loading, error, load, search, select } = useOrganizationOwners();

  const options = computed(() => {
    const candidates =
      selected.value && !users.value.some((user) => user.id === selected.value?.id)
        ? [selected.value, ...users.value]
        : users.value;
    return candidates.map((user) => ({
      value: user.id,
      label: `${user.displayName}（${user.email}）${!user.emailVerified ? ' · 邮箱未验证' : ''}`,
      disabled: user.status !== 'active' || !user.emailVerified,
    }));
  });

  function update(value: string | null) {
    emit('update:value', select(value));
  }
</script>

<template>
  <div class="owner">
    <NSelect
      :value="value || null"
      :options="options"
      :loading="loading"
      :disabled="disabled || !online"
      filterable
      remote
      clearable
      placeholder="按昵称或邮箱搜索并选择用户"
      :input-props="{ 'aria-label': '负责人', maxlength: 100 }"
      aria-describedby="organization-owner-help"
      @search="search"
      @update:value="update"
    >
      <template #empty>
        {{ loading ? '正在查询用户…' : error ? '用户查询失败，请重试' : '未找到用户，请尝试其他昵称或邮箱' }}
      </template>
    </NSelect>
    <p id="organization-owner-help" class="hint">仅可选择账号有效且邮箱已验证的用户，无需填写用户 ID 或实名。</p>
    <p v-if="loading" class="hint" role="status">正在查询用户…</p>
    <AdminStateBanner v-if="error" tone="danger" :message="error" action="重试" @action="load()" />
    <AdminPagination
      v-if="total > 20"
      :page="page"
      :total="total"
      :count-label="(value: number) => `共 ${value} 个账号`"
      :disabled="disabled || !online || loading"
      @update:page="load"
    />
  </div>
</template>

<style scoped>
  .owner {
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
