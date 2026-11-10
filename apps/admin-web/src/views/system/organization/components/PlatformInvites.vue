<script setup lang="ts">
  /**
   * 平台组织邀请码工作台：生成、查看一次、撤销。
   * 撤销在表格行内就地确认，不叠第二层弹窗（FS-0010 v2 §5.2）。
   */
  import { computed } from 'vue';
  import { NButton, NForm, NFormItem, NInputNumber } from 'naive-ui';
  import type { PlatformInvite } from '@refs-tools/contracts/platform-invites';
  import { useUiFeedback } from '../../../../components/ui/useUiFeedback';
  import { usePlatformInvites } from '../usePlatformInvites';
  import { inviteCards, inviteColumns } from '../platform-invites.presentation';
  import PlatformInviteReveal from './PlatformInviteReveal.vue';
  import AdminDialogShell from '@/components/admin-shell/AdminDialogShell.vue';
  import AdminDataTable from '@/components/admin-shell/AdminDataTable.vue';
  import AdminPagination from '@/components/admin-shell/AdminPagination.vue';
  import AdminStateBanner from '@/components/admin-shell/AdminStateBanner.vue';
  import { useCompactViewport } from '@/components/admin-shell/useCompactViewport';

  const state = usePlatformInvites();
  const {
    items, total, page, open, loading, busy, ready, error, notice, staleNote, validDays, token, online, copyNotice,
    load, show, close, dismissToken, copyToken, create, requestRevoke, revoke,
  } = state;
  useUiFeedback(notice);

  const compact = useCompactViewport();
  const enabled = computed(() => ready.value && online.value && !busy.value && !loading.value);
  const columns = computed(() => inviteColumns(() => enabled.value, confirmRevoke, compact.value));
  const cardList = computed(() => inviteCards(items.value, () => enabled.value, confirmRevoke));

  /** 行内确认即最终确认：登记目标后立即执行撤销。 */
  function confirmRevoke(invite: PlatformInvite) {
    requestRevoke(invite);
    void revoke();
  }

  defineExpose({ show });
</script>

<template>
  <AdminDialogShell
    :show="open"
    title="平台组织邀请码"
    size="lg"
    :busy="busy"
    @update:show="!$event && close()"
  >
    <div class="invites">
      <p class="hint">
        邀请码一次性、短期有效。持码的已验证用户提交组织申请时可直接创建为正常运营，免平台审核；
        它与组织成员邀请码完全分离，不能互相使用。
      </p>
      <AdminStateBanner v-if="!online" tone="warning" message="当前离线，无法生成或撤销；数据可能已陈旧。" />
      <AdminStateBanner v-if="error" tone="danger" :message="error" action="重新读取" @action="load()" />
      <AdminStateBanner
        v-if="staleNote"
        tone="warning"
        :message="`写入已成功，但${staleNote}。请只重新读取，不要重复操作。`"
        action="重试读取"
        @action="load()"
      />
      <PlatformInviteReveal v-if="token" :token="token" :notice="copyNotice" @copy="copyToken" @dismiss="dismissToken" />

      <NForm label-placement="top" @submit.prevent="create">
        <div class="create-row">
          <NFormItem label="有效期（天，1–7）" class="create-days">
            <NInputNumber
              v-model:value="validDays"
              :min="1"
              :max="7"
              :precision="0"
              :disabled="!enabled"
              aria-label="邀请码有效天数"
            />
          </NFormItem>
          <NButton attr-type="submit" type="primary" :loading="busy" :disabled="!enabled" class="create-submit">
            生成邀请码
          </NButton>
        </div>
      </NForm>

      <AdminDataTable
        :columns="columns"
        :cards="cardList"
        :data="items"
        :loading="loading"
        :row-key="(row: any) => row.id"
        empty-text="还没有生成过邀请码"
        @retry="load()"
      >
        <template #footer>
          <AdminPagination
            :page="page"
            :total="total"
            :count-label="(value: number) => `共 ${value} 个邀请码`"
            :disabled="busy || loading || !online"
            @update:page="load"
          />
        </template>
      </AdminDataTable>
    </div>

    <template #footer>
      <NButton :disabled="busy" @click="close">关闭</NButton>
    </template>
  </AdminDialogShell>
</template>

<style scoped>
  .invites {
    display: flex;
    flex-direction: column;
    gap: var(--admin-space-lg);
    min-width: 0;
  }

  .hint {
    font-size: var(--admin-text-meta-size);
    line-height: var(--admin-text-meta-leading);
    color: var(--admin-muted);
  }

  .create-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--admin-space-lg);
  }

  .create-days {
    flex: 0 0 176px;
  }

  .create-submit {
    margin-bottom: var(--admin-space-lg);
  }

  @media (max-width: 767px) {
    .create-days,
    .create-submit {
      flex: 1 1 100%;
    }
  }
</style>
