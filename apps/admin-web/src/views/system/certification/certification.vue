<script setup lang="ts">
  import { computed, nextTick, ref } from 'vue';
  import { NButton, NSelect } from 'naive-ui';
  import type { CertificationAppealDecision, CertificationDecision, CertificationReviewSummary } from '@refs-tools/contracts/certifications';
  import { useUserStore } from '../../../store/modules/user';
  import { useUiFeedback } from '../../../components/ui/useUiFeedback';
  import UiLoadingHint from '../../../components/ui/UiLoadingHint.vue';
  import CertificationDetail from './components/CertificationDetail.vue';
  import CertificationDecisionDialog from './components/CertificationDecisionDialog.vue';
  import { useCertifications } from './useCertifications';
  import { levelLabels, statusLabels } from './certifications.presentation';
  import AdminPage from '@/components/admin-shell/AdminPage.vue';
  import AdminPagination from '@/components/admin-shell/AdminPagination.vue';
  import AdminStateBanner from '@/components/admin-shell/AdminStateBanner.vue';
  import './certification.css';

  const c = useCertifications();
  const user = useUserStore();
  useUiFeedback(c.notice);

  const tabs = [
    { id: 'review' as const, label: '待审核' },
    { id: 'records' as const, label: '认证记录' },
    { id: 'appeal' as const, label: '申诉复核' },
  ];
  const statusOptions = Object.entries(statusLabels)
    .filter(([value]) => value !== 'draft')
    .map(([value, label]) => ({ value, label }));

  const decision = ref<CertificationDecision['decision'] | CertificationAppealDecision['decision'] | null>(null);
  const reason = ref('');
  const detailArea = ref<HTMLElement | null>(null);
  const queueArea = ref<HTMLElement | null>(null);
  let queueScroll = 0;

  const applicantName = computed(
    () => c.selected.value?.applicant.legalName || c.selected.value?.applicant.nickname || ''
  );
  const busy = computed(() => c.busy.value || c.detailLoading.value || !!c.stale.value || !!c.detailError.value);

  async function open(item: CertificationReviewSummary) {
    queueScroll = window.scrollY;
    await c.open(item);
    await nextTick();
    detailArea.value?.querySelector<HTMLElement>('h2')?.focus();
  }

  function back() {
    c.close();
    void nextTick(() => {
      window.scrollTo(0, queueScroll);
      queueArea.value?.focus({ preventScroll: true });
    });
  }

  function request(value: NonNullable<typeof decision.value>) {
    decision.value = value;
    reason.value = '';
    c.formError.value = '';
  }

  async function confirm() {
    if (decision.value && (await c.decide(decision.value, reason.value))) {
      decision.value = null;
      reason.value = '';
    }
  }
</script>

<template>
  <section class="cert-page" aria-label="平台认证审核">
    <AdminPage title="平台认证审核" description="独立审核平台认证申请，处理申诉与认证后续状态。平台权限不覆盖组织认证。" />

    <div class="cert-tabs" role="tablist" aria-label="认证审核栏目">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        class="cert-tab"
        :class="{ 'is-active': c.tab.value === tab.id }"
        :aria-selected="c.tab.value === tab.id"
        :disabled="c.busy.value || !!decision"
        @click="c.changeTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <AdminStateBanner
      v-if="c.stale.value"
      tone="warning"
      :message="c.stale.value"
      action="重新读取"
      @action="c.load(); c.readSelected()"
    />

    <div class="cert-split" :class="{ 'is-detail': !!c.selected.value, 'is-queue': !c.selected.value }">
      <div class="cert-queue">
        <div ref="queueArea" tabindex="-1" class="cert-pane">
          <div class="cert-filters">
            <NSelect
              v-if="c.tab.value === 'records'"
              v-model:value="c.status.value"
              :options="statusOptions"
              clearable
              placeholder="全部已提交状态"
              aria-label="筛选认证状态"
              :disabled="c.busy.value"
              @update:value="c.load(1)"
            />
            <NButton quaternary :disabled="c.loading.value || c.busy.value" @click="c.load()">刷新队列</NButton>
          </div>
          <UiLoadingHint :loading="c.loading.value" label="读取认证队列" @retry="c.load()" />
          <AdminStateBanner v-if="c.error.value" tone="danger" :message="c.error.value" action="重新读取" @action="c.load()" />

          <ul class="cert-queue-list">
            <li v-for="item in c.items.value" :key="item.id">
              <button
                type="button"
                class="cert-queue-item"
                :class="{ 'is-selected': c.selected.value?.id === item.id }"
                :aria-current="c.selected.value?.id === item.id ? 'true' : undefined"
                :disabled="c.busy.value || !!decision"
                @click="open(item)"
              >
                <span class="cert-queue-name">{{ item.applicant.legalName || '未填写实名' }} · {{ item.applicant.nickname }}</span>
                <span class="cert-queue-meta">{{ levelLabels[item.level] }} · {{ statusLabels[item.status] }}</span>
                <span class="cert-queue-id">账号 {{ item.subjectUserId.slice(0, 8) }}</span>
              </button>
            </li>
          </ul>
          <p v-if="!c.loading.value && !c.error.value && !c.items.value.length" role="status" class="cert-empty">
            当前没有符合条件的认证记录。
          </p>
          <AdminPagination
            :page="c.page.value"
            :total="c.total.value"
            :count-label="(value: number) => `共 ${value} 条认证记录`"
            :disabled="c.loading.value || c.busy.value"
            @update:page="c.load"
          />
        </div>
      </div>

      <div class="cert-detail">
        <div ref="detailArea" class="cert-pane">
          <div v-if="c.selected.value" class="cert-detail-actions">
            <NButton :disabled="c.busy.value || !!decision" @click="back">返回队列</NButton>
            <NButton v-if="c.next.value" :disabled="c.busy.value || !!decision" @click="open(c.next.value)">下一条</NButton>
          </div>
          <AdminStateBanner
            v-if="c.detailError.value"
            tone="danger"
            :message="c.detailError.value"
            action="重新读取详情"
            @action="c.readSelected()"
          />
          <UiLoadingHint :loading="c.detailLoading.value" label="读取申请材料" @retry="c.readSelected()" />
          <CertificationDetail
            v-if="c.record.value && c.selected.value"
            :key="c.record.value.id"
            :record="c.record.value"
            :applicant="c.selected.value.applicant"
            :appeals="c.appeals.value"
            :history="c.history.value"
            :mode="c.tab.value"
            :current-user-id="user.info.id ?? ''"
            :busy="busy"
            @decide="request"
          />
          <p v-else-if="!c.selected.value" class="cert-empty">选择一条申请，核对证书、履历与声明后作出决定。</p>
        </div>
      </div>
    </div>

    <CertificationDecisionDialog
      :decision="decision"
      :applicant="applicantName"
      :reason="reason"
      :busy="c.busy.value"
      :error="c.formError.value"
      @update:reason="reason = $event"
      @update:decision="decision = $event"
      @decide="confirm"
    />
  </section>
</template>
