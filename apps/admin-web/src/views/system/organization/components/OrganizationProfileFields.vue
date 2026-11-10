<script setup lang="ts">
  import { NFormItem, NInput } from 'naive-ui';
  import type { UpdateOrganization } from '@refs-tools/contracts/organizations';

  type Profile = Pick<UpdateOrganization, 'name' | 'region' | 'purpose' | 'contact'>;
  const props = defineProps<{ profile: Profile; disabled: boolean; busy: boolean }>();
  const emit = defineEmits<{ 'update:profile': [value: Profile] }>();

  function update<K extends keyof Profile>(key: K, value: string) {
    emit('update:profile', { ...props.profile, [key]: value });
  }
</script>

<template>
  <div class="profile-grid">
    <NFormItem label="组织名称" path="name">
      <NInput :value="profile.name" :maxlength="120" :disabled="disabled || busy" :input-props="{ 'aria-label': '组织名称' }"
        @update:value="update('name', $event)" />
    </NFormItem>
    <NFormItem label="地区" path="region">
      <NInput :value="profile.region" :maxlength="100" :disabled="disabled || busy" :input-props="{ 'aria-label': '地区' }"
        @update:value="update('region', $event)" />
    </NFormItem>
    <NFormItem label="联系方式" path="contact" class="span-2">
      <NInput :value="profile.contact" :maxlength="200" :disabled="disabled || busy" :input-props="{ 'aria-label': '联系方式' }"
        @update:value="update('contact', $event)" />
    </NFormItem>
    <NFormItem label="组织用途" path="purpose" class="span-2">
      <NInput :value="profile.purpose" type="textarea" :maxlength="1000" show-count :autosize="{ minRows: 2, maxRows: 5 }"
        :disabled="disabled || busy" :input-props="{ 'aria-label': '组织用途' }" @update:value="update('purpose', $event)" />
    </NFormItem>
  </div>
</template>

<style scoped>
  .profile-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    column-gap: var(--admin-space-lg);
  }

  @media (min-width: 768px) {
    .profile-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .span-2 {
      grid-column: span 2;
    }
  }
</style>
