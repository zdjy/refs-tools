<script setup lang="ts">
import { computed } from 'vue'
import { NSelect } from 'naive-ui'
import type { MyOrganization } from '@refs-tools/contracts/organization-self'
import type { CertificationDraft } from '../useCertificationDraft'

/**
 * 认证范围选择：组织认证归属当前 active 组织，平台认证以有效组织认证为前置条件。
 * 同一范围已有记录时直接指向原记录，用户不能另建一条绕过历史。
 */
const props = defineProps<{
  organizations: MyOrganization[]; takenOrganizationIds: string[]; platformTaken: boolean; platformEligible: boolean
  fixed?: boolean; editing: boolean; disabled: boolean; scopeProblem?: string | undefined; organizationProblem?: string | undefined; organizationId: string | null
}>()
const fields = defineModel<CertificationDraft>('fields', { required: true })
const emit = defineEmits<{ changeScope: [type: 'organization' | 'platform', organizationId: string | null] }>()
const selectedOrganization = computed(() => props.organizations.find((item) => item.id === props.organizationId) ?? null)
const organizationOptions = computed(() => props.organizations.map((item) => ({
  value: item.id,
  label: props.takenOrganizationIds.includes(item.id) ? `${item.name}（已有认证记录）` : item.name,
  disabled: props.takenOrganizationIds.includes(item.id),
})))
const platformProblem = computed(() => {
  if (props.platformTaken) return '你已有一条平台认证。请在原记录上补件或提交申诉，不能另建一条。'
  if (!props.platformEligible) return '申请平台认证前，需先持有当前有效的组织认证，并保持该组织的正式成员身份。'
  return ''
})
const firstAvailable = computed(() => props.organizations.find((item) => !props.takenOrganizationIds.includes(item.id)))
function choose(type: 'organization' | 'platform') {
  if (props.disabled || props.editing) return
  emit('changeScope', type, type === 'organization' ? firstAvailable.value?.id ?? null : null)
}
</script>

<template>
  <fieldset class="m-0 grid min-w-0 gap-3 border-0 p-0" :disabled="disabled">
    <legend class="mb-2 text-sm font-medium text-ink">认证范围</legend>
    <div v-if="editing || fixed" class="grid gap-1 rounded-xl border border-solid border-line bg-soft p-4">
      <p class="m-0 text-sm font-semibold text-ink">{{ fields.scopeType === 'platform' ? '平台认证' : selectedOrganization?.name ?? '组织认证' }}</p>
      <p class="m-0 text-[13px] leading-relaxed text-body">{{ fields.scopeType === 'platform' ? '由平台审核员独立审核，通过后可跨组织使用。' : '仅在本组织内使用，由本组织认证员审核。' }} 认证范围已确定，不能在表单中更换。</p>
    </div>
    <template v-else>
      <div class="grid grid-cols-2 gap-2" role="group" aria-label="选择认证范围">
        <button type="button" :aria-pressed="fields.scopeType === 'organization'" :disabled="disabled || !firstAvailable"
          class="inline-flex min-h-11 items-center justify-center rounded-full border border-solid px-4 text-sm font-medium transition-[background-color,color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[.98]"
          :class="fields.scopeType === 'organization' ? 'border-ink bg-ink text-surface' : 'border-line bg-soft text-ink hover:bg-sand'"
          @click="choose('organization')">组织认证</button>
        <button type="button" :aria-pressed="fields.scopeType === 'platform'" :disabled="disabled || platformTaken || !platformEligible"
          class="inline-flex min-h-11 items-center justify-center rounded-full border border-solid px-4 text-sm font-medium transition-[background-color,color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[.98]"
          :class="fields.scopeType === 'platform' ? 'border-ink bg-ink text-surface' : 'border-line bg-soft text-ink hover:bg-sand'"
          @click="choose('platform')">平台认证</button>
      </div>
      <div v-if="fields.scopeType === 'organization'" class="grid gap-2">
        <label id="cert-organization-label" class="text-[13px] text-body">认证所属组织</label>
        <n-select id="cert-organization" aria-labelledby="cert-organization-label" :value="fields.organizationId" :options="organizationOptions" :disabled="disabled"
          placeholder="选择已加入并处于运行状态的组织" :status="organizationProblem ? 'error' : 'success'"
          @update:value="emit('changeScope', 'organization', $event)" />
        <p v-if="organizationProblem" role="alert" class="m-0 text-[13px] text-danger">{{ organizationProblem }}</p>
        <p v-else-if="!organizations.length" class="m-0 text-[13px] leading-relaxed text-body">你还没有可申请认证的组织。请先加入或创建一个运行中的组织。</p>
        <p v-else class="m-0 text-[13px] leading-relaxed text-body">提交后由该组织的认证员审核；负责人本人不能仅凭负责人身份批准认证。</p>
      </div>
      <div v-else class="grid gap-2 rounded-xl border border-solid border-line bg-soft p-4">
        <p class="m-0 text-sm font-semibold text-ink">平台认证</p>
        <p class="m-0 text-[13px] leading-relaxed" :class="platformProblem ? 'text-danger' : 'text-body'">{{ platformProblem || '由平台审核员独立审核。平台认证不因组织认证撤销而自动撤销。' }}</p>
      </div>
    </template>
    <p v-if="scopeProblem" role="alert" class="m-0 text-[13px] text-danger">{{ scopeProblem }}</p>
  </fieldset>
</template>
