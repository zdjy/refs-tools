<script setup lang="ts">
  import { NAlert, NButton, NForm, NFormItem, NInput, NSpace } from 'naive-ui';
  import type { OrganizationDecision, OrganizationDetail, UpdateOrganization } from '@refs-tools/contracts/organizations';
  import { actionDescriptions, actionLabels, actionOptions, actionTypes } from '../organizations.presentation';
  import OrganizationProfileFields from './OrganizationProfileFields.vue';
  import OrganizationReadonlyFields from './OrganizationReadonlyFields.vue';

  type Profile = Pick<UpdateOrganization, 'name' | 'region' | 'purpose' | 'contact'>;
  defineProps<{
    organization: OrganizationDetail; action: OrganizationDecision['action'] | null; reason: string; busy: boolean; saving: boolean;
    online: boolean; profile: Profile; profileEditable: boolean; profileDirty: boolean;
  }>();
  const emit = defineEmits<{
    'update:profile': [value: Profile]; 'update:action': [value: OrganizationDecision['action'] | null];
    'update:reason': [value: string]; 'save-profile': []; 'reset-profile': []; request: []; close: [];
  }>();

  function submitProfile(editable: boolean, dirty: boolean) {
    if (editable && dirty) emit('save-profile');
  }
</script>

<template>
  <NForm size="large" @submit.prevent="submitProfile(profileEditable, profileDirty)">
    <OrganizationProfileFields :profile="profile" :disabled="!profileEditable" :busy="busy"
      @update:profile="emit('update:profile', $event)" />
    <p v-if="!profileEditable" class="mb-4 mt-0 text-sm">
      当前状态的组织资料不可直接修改；如需更正，请通过后续治理流程处理。
    </p>
    <OrganizationReadonlyFields :organization="organization" />
  </NForm>
  <div v-if="actionOptions[organization.status].length" class="mt-6">
    <NFormItem label="治理操作">
      <NSpace>
        <NButton v-for="option in actionOptions[organization.status]" :key="option.value" size="large"
          :type="actionTypes[option.value]" :secondary="action !== option.value"
          :aria-pressed="action === option.value" :disabled="busy"
          @click="emit('update:action', option.value)">{{ option.label }}</NButton>
      </NSpace>
    </NFormItem>
    <template v-if="action">
      <NAlert type="warning" class="mb-4">{{ actionDescriptions[action] }}</NAlert>
      <NFormItem label="操作理由（必填）">
        <NInput :value="reason" type="textarea" :maxlength="500" show-count :disabled="busy" size="large"
          :input-props="{ 'aria-label': '操作理由' }" placeholder="说明本次决定的依据，请勿填写密码、凭据或 URL"
          @update:value="emit('update:reason', $event)" />
      </NFormItem>
    </template>
  </div>
  <NSpace justify="end" class="mt-4">
    <NButton size="large" :disabled="busy" @click="emit('close')">关闭</NButton>
    <NButton v-if="profileEditable && profileDirty" size="large" :disabled="busy" @click="emit('reset-profile')">撤销修改</NButton>
    <NButton v-if="profileEditable" size="large" type="primary" :loading="saving" :disabled="busy || !online || !profileDirty"
      @click="emit('save-profile')">保存资料</NButton>
    <NButton v-if="action" size="large" :type="actionTypes[action]" :disabled="busy || !online" @click="emit('request')">
      {{ actionLabels[action] }}
    </NButton>
  </NSpace>
</template>
