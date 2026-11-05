<script setup lang="ts">
  import { nextTick, ref } from 'vue';
  import { NButton, NForm, NFormItem, NInput, NSpace, type FormInst, type FormRules } from 'naive-ui';
  import type { CreateOrganization } from '@refs-tools/contracts/organizations';
  import OrganizationOwnerSelect from './OrganizationOwnerSelect.vue';
  import UiSubmitHint from '../../../../components/ui/UiSubmitHint.vue';

  const props = defineProps<{ form: CreateOrganization; busy: boolean; online: boolean }>();
  const emit = defineEmits<{ 'update:form': [value: CreateOrganization]; save: []; close: [] }>();
  const formRef = ref<FormInst | null>(null), contentRef = ref<HTMLElement | null>(null);
  const fields = [
    { key: 'name', label: '组织名称', max: 120 }, { key: 'region', label: '地区', max: 100 },
    { key: 'purpose', label: '组织用途', max: 1000 }, { key: 'ownerUserId', label: '负责人', max: 36 },
    { key: 'contact', label: '联系方式', max: 200 },
  ] as const;
  const rules: FormRules = Object.fromEntries(fields.map(field => [field.key, {
    required: true, trigger: ['blur', 'change'], message: field.key === 'ownerUserId' ? '请选择负责人' : `请填写${field.label}`,
    validator: (_: unknown, value: string) => field.key === 'ownerUserId'
      ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) : !!value?.trim(),
  }]));
  function update(key: keyof CreateOrganization, value: string) { emit('update:form', { ...props.form, [key]: value }); }
  async function submit() {
    try { await formRef.value?.validate(); emit('save'); }
    catch {
      await nextTick();
      const invalid = fields.find(field => field.key === 'ownerUserId' ? !/^[0-9a-f-]{36}$/i.test(props.form[field.key]) : !props.form[field.key].trim());
      if (invalid) contentRef.value?.querySelector<HTMLInputElement>(`[aria-label="${invalid.label}"]`)?.focus();
    }
  }
</script>

<template>
  <div ref="contentRef">
    <p class="mt-0">为已有且邮箱已验证的用户代录申请。录入后等待审核，通过前不能开展组织业务。</p>
    <NForm ref="formRef" :model="form" :rules="rules" :disabled="busy" size="large" @submit.prevent="submit">
      <NFormItem v-for="field in fields" :key="field.key" :label="field.label" :path="field.key">
        <OrganizationOwnerSelect v-if="field.key === 'ownerUserId'" :value="form.ownerUserId" :disabled="busy" :online="online"
          @update:value="update('ownerUserId', $event)" />
        <NInput v-else :value="form[field.key]" :maxlength="field.max" :type="field.key === 'purpose' ? 'textarea' : 'text'"
          :input-props="{ 'aria-label': field.label }" @update:value="update(field.key, $event)" />
      </NFormItem>
    </NForm>
    <UiSubmitHint :busy="busy" class="mb-3 text-right" />
    <NSpace justify="end">
      <NButton size="large" :disabled="busy" @click="emit('close')">取消</NButton>
      <NButton type="primary" size="large" :loading="busy" :disabled="busy || !online" @click="submit">录入申请</NButton>
    </NSpace>
  </div>
</template>
