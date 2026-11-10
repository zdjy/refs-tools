<script setup lang="ts">
  /**
   * 成员管理工作台：成员与邀请两张表 + 邀请表单 + 治理动作。
   *
   * 治理动作在表格行内就地确认，不在弹窗上再叠确认弹窗（FS-0010 v2 §5.2）。
   */
  import { computed, ref } from 'vue';
  import { NButton, NForm, NFormItem, NInput, NInputNumber, NTabs, NTabPane } from 'naive-ui';
  import { useUiFeedback } from '../../../../components/ui/useUiFeedback';
  import { useUserStore } from '../../../../store/modules/user';
  import { useOrganizationMembers } from '../useOrganizationMembers';
  import { invitationCards, invitationColumns, memberActionLabels, memberCards, memberColumns } from '../members.presentation';
  import InviteCandidateSelect from './InviteCandidateSelect.vue';
  import AdminDialogShell from '@/components/admin-shell/AdminDialogShell.vue';
  import AdminDataTable from '@/components/admin-shell/AdminDataTable.vue';
  import AdminPagination from '@/components/admin-shell/AdminPagination.vue';
  import AdminStateBanner from '@/components/admin-shell/AdminStateBanner.vue';
  import AdminConfirmButton from '@/components/admin-shell/AdminConfirmButton.vue';
  import { useCompactViewport } from '@/components/admin-shell/useCompactViewport';

  const state = useOrganizationMembers();
  const {
    organization, members, invitations, memberPage, invitePage, memberTotal, inviteTotal, loading, busy, ready, canManage,
    error, notice, userId, validDays, action, reason, online, load, open, close, invite, select, requestConfirm, commit,
  } = state;
  useUiFeedback(notice);
  const user = useUserStore();
  const tab = ref<'members' | 'invitations'>('members');
  const reasonRef = ref<InstanceType<typeof NInput> | null>(null);

  const compact = useCompactViewport();
  const enabled = computed(() => ready.value && canManage.value && online.value && !busy.value && !loading.value);
  const ownerId = () => organization.value?.ownerUserId ?? '', actorId = () => user.info.id ?? '';
  const memberTable = computed(() => memberColumns(() => enabled.value, select, ownerId, actorId, compact.value));
  const invitationTable = computed(() => invitationColumns(() => enabled.value, select, compact.value));
  const memberCardList = computed(() => memberCards(members.value, () => enabled.value, select, ownerId, actorId));
  const invitationCardList = computed(() => invitationCards(invitations.value, () => enabled.value, select));

  function reload() {
    action.value = null;
    void load();
  }

  defineExpose({ open });

  const confirmLabel = computed(() => (action.value ? `${memberActionLabels[action.value.kind]}：${action.value.name}` : ''));
</script>

<template>
  <AdminDialogShell
    :show="!!organization"
    :title="`${organization?.name ?? ''} · 成员管理`"
    size="lg"
    :busy="busy"
    @update:show="!$event && close()"
  >
    <div class="panels">
      <AdminStateBanner v-if="!online" tone="warning" message="当前离线，数据可能已陈旧；恢复连接后请重新读取。" />
      <AdminStateBanner
        v-if="error"
        tone="danger"
        :message="`操作未完成，数据可能已陈旧：${error}`"
        action="重新读取"
        @action="reload"
      />
      <AdminStateBanner v-if="notice" tone="success" :message="notice" />
      <AdminStateBanner
        v-if="ready && !canManage"
        tone="info"
        message="当前为平台治理只读视图。邀请、入会审核和移除操作需要该组织的所有者或组织者权限。"
      />

      <NForm v-if="canManage && organization" label-placement="top" @submit.prevent="invite">
        <div class="invite-row">
          <NFormItem label="受邀用户" class="invite-field">
            <InviteCandidateSelect
              :value="userId"
              :organization-id="organization.id"
              :disabled="!enabled"
              @update:value="userId = $event"
            />
          </NFormItem>
          <NFormItem label="有效期（天）" class="invite-days">
            <NInputNumber
              v-model:value="validDays"
              :min="1"
              :max="30"
              :precision="0"
              :disabled="!enabled"
              aria-label="邀请有效天数"
            />
          </NFormItem>
          <NButton attr-type="submit" type="primary" :loading="busy" :disabled="!enabled" class="invite-submit">
            邀请成员
          </NButton>
        </div>
        <p class="hint">邀请将在对方接受后生效，不授予任何组织角色。</p>
      </NForm>

      <NTabs v-model:value="tab" type="line" animated>
        <NTabPane name="members" :tab="`成员与入会申请（${memberTotal}）`">
          <AdminDataTable
            :columns="memberTable"
            :cards="memberCardList"
            :data="members"
            :loading="loading"
            :row-key="(row: any) => row.id"
            empty-text="没有成员或入会申请"
            @retry="load()"
          >
            <template #footer>
              <AdminPagination
                :page="memberPage"
                :total="memberTotal"
                :count-label="(value: number) => `共 ${value} 位成员`"
                :disabled="busy || loading || !online"
                @update:page="load"
              />
            </template>
          </AdminDataTable>
        </NTabPane>
        <NTabPane name="invitations" :tab="`定向邀请（${inviteTotal}）`">
          <AdminDataTable
            :columns="invitationTable"
            :cards="invitationCardList"
            :data="invitations"
            :loading="loading"
            :row-key="(row: any) => row.id"
            empty-text="没有定向邀请记录"
            @retry="load()"
          >
            <template #footer>
              <AdminPagination
                :page="invitePage"
                :total="inviteTotal"
                :count-label="(value: number) => `共 ${value} 条邀请`"
                :disabled="busy || loading || !online"
                @update:page="load"
              />
            </template>
          </AdminDataTable>
        </NTabPane>
      </NTabs>

      <NForm v-if="action" label-placement="top" @submit.prevent="requestConfirm">
        <h3 class="action-title">{{ confirmLabel }}</h3>
        <p v-if="action.kind === 'remove'" class="hint">
          成员关系将结束，当前组织及下属赛事、比赛角色将撤销；历史业务记录保留。
        </p>
        <NFormItem label="操作理由（不得含凭据或 URL）">
          <NInput
            ref="reasonRef"
            v-model:value="reason"
            type="textarea"
            :maxlength="500"
            :autosize="{ minRows: 3, maxRows: 5 }"
            :disabled="busy"
            :input-props="{ 'aria-label': '成员操作理由' }"
          />
        </NFormItem>
        <p class="hint">填写理由后，用页脚按钮确认；确认后就地完成，不再弹第二层窗口。</p>
      </NForm>
    </div>

    <template #footer>
      <NButton :disabled="busy || loading || !online" @click="reload">刷新成员数据</NButton>
      <NButton :disabled="busy" @click="close">关闭</NButton>
      <AdminConfirmButton
        v-if="action"
        tone="danger"
        :label="memberActionLabels[action.kind]"
        :message="`${action.name}：${reason.trim() || '（未填写理由）'}`"
        :confirm-label="`确认${memberActionLabels[action.kind]}`"
        :loading="busy"
        :disabled="!enabled || !reason.trim()"
        @update:open="(value: boolean) => value && requestConfirm()"
        @confirm="commit"
      />
    </template>
  </AdminDialogShell>
</template>

<style scoped>
  .panels {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-lg);
    min-width: 0;
  }

  .invite-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--admin-space-lg);
  }

  .invite-field {
    flex: 1 1 260px;
    min-width: 0;
  }

  .invite-days {
    flex: 0 0 132px;
  }

  .invite-submit {
    margin-bottom: var(--admin-space-lg);
  }

  .hint {
    font-size: var(--admin-text-meta-size);
    line-height: var(--admin-text-meta-leading);
    color: var(--admin-muted);
  }

  .action-title {
    font-size: var(--admin-text-section-title-size);
    line-height: var(--admin-text-section-title-leading);
    font-weight: var(--admin-text-section-title-weight);
    color: var(--admin-ink);
  }

  @media (max-width: 767px) {
    .invite-days,
    .invite-submit {
      flex: 1 1 100%;
    }
  }
</style>
