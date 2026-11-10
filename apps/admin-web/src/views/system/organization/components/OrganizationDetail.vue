<script setup lang="ts">
  /**
   * 组织详情主体：资料字段、只读字段与治理操作选择。
   *
   * 只负责呈现与输入；提交按钮由页面放进弹窗页脚，
   * 破坏性治理动作在页脚就地确认（FS-0010 v2 §5.2）。
   */
  import { NButton, NForm, NFormItem, NInput } from 'naive-ui';
  import type { OrganizationDecision, OrganizationDetail, UpdateOrganization } from '@refs-tools/contracts/organizations';
  import { actionDescriptions, actionOptions, actionTypes } from '../organizations.presentation';
  import OrganizationProfileFields from './OrganizationProfileFields.vue';
  import OrganizationReadonlyFields from './OrganizationReadonlyFields.vue';

  type Profile = Pick<UpdateOrganization, 'name' | 'region' | 'purpose' | 'contact'>;
  const props = defineProps<{
    organization: OrganizationDetail;
    action: OrganizationDecision['action'] | null;
    reason: string;
    busy: boolean;
    profile: Profile;
    profileEditable: boolean;
  }>();
  const emit = defineEmits<{
    'update:profile': [value: Profile];
    'update:action': [value: OrganizationDecision['action'] | null];
    'update:reason': [value: string];
  }>();

  const options = () => actionOptions[props.organization.status];
</script>

<template>
  <div class="detail">
    <section class="detail-section" aria-labelledby="organization-profile-title">
      <h3 id="organization-profile-title" class="detail-heading">组织资料</h3>
      <NForm
        :disabled="!profileEditable || busy"
        label-placement="top"
        @submit.prevent="profileEditable && $emit('update:profile', profile)"
      >
        <OrganizationProfileFields
          :profile="profile"
          :disabled="!profileEditable"
          :busy="busy"
          @update:profile="emit('update:profile', $event)"
        />
      </NForm>
      <p v-if="!profileEditable" class="detail-hint">
        当前状态的组织资料不可直接修改；如需更正，请通过后续治理流程处理。
      </p>
    </section>

    <section v-if="options().length" class="detail-section" aria-labelledby="organization-governance-title">
      <h3 id="organization-governance-title" class="detail-heading">治理操作</h3>
      <div class="detail-actions" role="group" aria-label="治理操作">
        <NButton
          v-for="option in options()"
          :key="option.value"
          :type="action === option.value ? actionTypes[option.value] : 'default'"
          :aria-pressed="action === option.value"
          :disabled="busy"
          @click="emit('update:action', action === option.value ? null : option.value)"
        >
          {{ option.label }}
        </NButton>
      </div>
      <template v-if="action">
        <p class="detail-hint is-warning">{{ actionDescriptions[action] }}</p>
        <NFormItem label="操作理由（必填）">
          <NInput
            :value="reason"
            type="textarea"
            :maxlength="500"
            show-count
            :autosize="{ minRows: 3, maxRows: 5 }"
            :disabled="busy"
            :input-props="{ 'aria-label': '操作理由' }"
            placeholder="说明本次决定的依据，请勿填写密码、凭据或 URL"
            @update:value="emit('update:reason', $event)"
          />
        </NFormItem>
      </template>
    </section>

    <section class="detail-section" aria-labelledby="organization-meta-title">
      <h3 id="organization-meta-title" class="detail-heading">只读字段</h3>
      <OrganizationReadonlyFields :organization="organization" />
    </section>
  </div>
</template>

<style scoped>
  .detail {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-xxl);
    min-width: 0;
  }

  .detail-section {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-md);
    min-width: 0;
  }

  .detail-heading {
    font-size: var(--admin-text-section-title-size);
    line-height: var(--admin-text-section-title-leading);
    font-weight: var(--admin-text-section-title-weight);
    color: var(--admin-ink);
  }

  .detail-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--admin-space-md);
  }

  .detail-hint {
    font-size: var(--admin-text-meta-size);
    line-height: var(--admin-text-meta-leading);
    color: var(--admin-muted);
  }

  .detail-hint.is-warning {
    color: var(--admin-warning);
  }
</style>
