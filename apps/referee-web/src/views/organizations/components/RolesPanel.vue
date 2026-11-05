<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NAlert, NButton, NPopconfirm, NSelect } from 'naive-ui'
import type { OrganizationRole } from '@refs-tools/contracts/organization-access'
import UiLoadingRegion from '../../../components/ui/UiLoadingRegion.vue'
import UiSubmitHint from '../../../components/ui/UiSubmitHint.vue'
import { useUiFeedback } from '../../../components/ui/useUiFeedback'
import { roleLabels } from '../organizations.presentation'
import { cancelButtonProps, confirmButtonProps } from '../../../components/ui/confirm-buttons'
import { useMemberManagement } from '../useMemberManagement'
import { useOrganizationRoles } from '../useOrganizationRoles'

/**
 * 组织角色。能否授予由服务端 canGrant 决定（仅负责人）；组织者只能查看。
 * 授予对象只能从本组织正式成员中选择：仅负责人（canGrant）才会读取成员名单，
 * 组织者只读视图不需要，也就不多发一次请求。
 */
const props = defineProps<{ organizationId: string }>()
const id = ref(props.organizationId)
const roles = useOrganizationRoles(id)
const roster = useMemberManagement(id)
const target = ref<string | null>(null)
const role = ref<'organizer' | 'certifier'>('organizer')
useUiFeedback(roles.grant.done)
useUiFeedback(roles.revoke.done)
onMounted(async () => { if (await roles.load() && roles.canGrant.value) void roster.load() })

/** 只有正式成员可被授予角色；已持有该角色的成员由服务端拒绝重复授予。 */
const members = computed(() => roster.items.value.filter(item => item.status === 'active').map(item => ({ userId: item.userId, displayName: item.displayName })))

const memberOptions = computed(() => members.value.map(item => ({ label: item.displayName, value: item.userId })))
const roleOptions = [{ label: roleLabels.organizer!, value: 'organizer' }, { label: roleLabels.certifier!, value: 'certifier' }]
const removable = (item: OrganizationRole) => roles.canGrant.value && item.role !== 'owner'

async function submit() {
  const user = members.value.find(item => item.userId === target.value)
  if (user && await roles.grantRole({ userId: user.userId, role: role.value }, user.displayName)) target.value = null
}
</script>

<template>
  <section aria-labelledby="roles-title" class="grid gap-5">
    <h2 id="roles-title" class="m-0 text-lg text-ink">组织角色</h2>
    <p class="m-0 max-w-[64ch] text-sm leading-relaxed text-body">组织者可管理成员与邀请；认证员可审核本组织的认证申请。成员离开组织时其角色会立即撤销。</p>
    <p v-if="roles.stale.value" role="status" class="m-0 border-0 border-l border-solid border-ink py-0.5 pl-3 text-[13px] leading-relaxed">
      {{ roles.stale.value }}<n-button text type="primary" class="ml-2" @click="roles.load()">重新读取</n-button>
    </p>
    <UiLoadingRegion v-if="roles.list.loading.value && !roles.list.data.value" :loading="true" label="读取角色" :lines="3" @retry="roles.load()" />
    <div v-else-if="roles.list.error.value" class="grid gap-3">
      <n-alert type="error" :show-icon="false" role="alert">{{ roles.list.error.value }}</n-alert>
      <div><n-button type="primary" @click="roles.load()">重新读取</n-button></div>
    </div>
    <template v-else-if="roles.list.data.value">
      <ul class="m-0 grid list-none gap-0 overflow-hidden rounded-xl border border-solid border-line p-0">
        <li v-for="item in roles.items.value" :key="item.id" class="flex flex-wrap items-center justify-between gap-3 border-0 border-b border-solid border-line p-4 last:border-b-0">
          <span class="grid min-w-0 gap-0.5"><span class="text-base font-semibold text-ink wrap-anywhere">{{ item.displayName }}</span><span class="text-[13px] text-body">{{ roleLabels[item.role] }}</span></span>
          <n-popconfirm v-if="removable(item)" :positive-button-props="confirmButtonProps" :negative-button-props="cancelButtonProps" positive-text="确认撤销" negative-text="取消" @positive-click="roles.revokeRole(item)">
            <template #trigger><n-button secondary :disabled="roles.revoke.busy.value" :aria-label="`撤销${item.displayName}的${roleLabels[item.role]}角色`">撤销角色</n-button></template>
            撤销后「{{ item.displayName }}」立即失去{{ roleLabels[item.role] }}权限，需要重新授予。
          </n-popconfirm>
        </li>
      </ul>
      <form v-if="roles.canGrant.value" class="grid gap-3 border-0 border-l border-solid border-line pl-4 compact:grid-cols-[minmax(0,1fr)_160px_auto] compact:items-end" @submit.prevent="submit">
        <div class="grid gap-2"><label for="role-member" class="text-sm font-medium text-ink">选择成员</label>
          <n-select id="role-member" v-model:value="target" :options="memberOptions" filterable placeholder="从正式成员中选择" :disabled="roles.grant.busy.value" /></div>
        <div class="grid gap-2"><label for="role-kind" class="text-sm font-medium text-ink">角色</label>
          <n-select id="role-kind" v-model:value="role" :options="roleOptions" :disabled="roles.grant.busy.value" /></div>
        <n-button type="primary" attr-type="submit" :loading="roles.grant.busy.value" :disabled="!target || roles.grant.busy.value">授予角色</n-button>
      </form>
      <p v-else class="m-0 text-sm leading-relaxed text-body">只有组织负责人可以授予或撤销角色；你当前只能查看。</p>
      <n-alert v-if="roles.grant.error.value" type="error" :show-icon="false" role="alert">{{ roles.grant.error.value }}</n-alert>
      <n-alert v-if="roles.revoke.error.value" type="error" :show-icon="false" role="alert">{{ roles.revoke.error.value }}</n-alert>
      <UiSubmitHint :busy="roles.grant.busy.value || roles.revoke.busy.value" />
    </template>
  </section>
</template>
