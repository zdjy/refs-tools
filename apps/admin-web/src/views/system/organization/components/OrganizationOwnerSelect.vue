<script setup lang="ts">
  import { computed } from 'vue';
  import { NAlert, NButton, NPagination, NSelect } from 'naive-ui';
  import { useOrganizationOwners } from '../useOrganizationOwners';

  defineProps<{ value: string; disabled: boolean; online: boolean }>();
  const emit = defineEmits<{ 'update:value': [value: string] }>();
  const { users, selected, page, total, loading, error, load, search, select } = useOrganizationOwners();
  const options = computed(() => {
    const candidates = selected.value && !users.value.some(user => user.id === selected.value?.id)
      ? [selected.value, ...users.value] : users.value;
    return candidates.map(user => ({ value: user.id,
      label: `${user.displayName}（${user.email}）${!user.emailVerified ? ' · 邮箱未验证' : ''}`,
      disabled: user.status !== 'active' || !user.emailVerified }));
  });
  function update(value: string | null) { emit('update:value', select(value)); }
</script>

<template>
  <div class="w-full min-w-0 space-y-2">
    <NSelect :value="value || null" :options="options" :loading="loading" :disabled="disabled || !online"
      filterable remote clearable size="large" menu-size="large" placeholder="按昵称或邮箱搜索并选择用户"
      :input-props="{ 'aria-label': '负责人', maxlength: 100 }" aria-describedby="organization-owner-help"
      @search="search" @update:value="update">
      <template #empty>{{ loading ? '正在查询用户…' : error ? '用户查询失败，请重试' : '未找到用户，请尝试其他昵称或邮箱' }}</template>
    </NSelect>
    <p id="organization-owner-help" class="m-0 text-sm">仅可选择账号有效且邮箱已验证的用户，无需填写用户 ID 或实名。</p>
    <p v-if="loading" class="m-0 text-sm" role="status">正在查询用户…</p>
    <NAlert v-if="error" type="error" role="alert">
      {{ error }} <NButton size="large" :disabled="disabled || !online || loading" @click="load()">重试</NButton>
    </NAlert>
    <div v-if="total > 20" class="flex flex-wrap items-center gap-2">
      <span class="text-sm">共 {{ total }} 个账号</span>
      <NPagination :page="page" :item-count="total" :page-size="20" :page-slot="3" size="large"
        :disabled="disabled || !online || loading" @update:page="load" />
    </div>
  </div>
</template>
