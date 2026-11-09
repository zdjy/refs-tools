<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { NAlert, NButton, NCard, NInput, NModal, NPagination, NSelect } from 'naive-ui';
import type { CertificationAppealDecision, CertificationDecision, CertificationReviewSummary } from '@refs-tools/contracts/certifications';
import { useUserStore } from '../../../store/modules/user';
import { useUiFeedback } from '../../../components/ui/useUiFeedback';
import UiLoadingHint from '../../../components/ui/UiLoadingHint.vue';
import UiSubmitHint from '../../../components/ui/UiSubmitHint.vue';
import CertificationDetail from './components/CertificationDetail.vue';
import { useCertifications } from './useCertifications';
import { decisionLabels, levelLabels, statusLabels } from './certifications.presentation';
const c = useCertifications(), user = useUserStore();
useUiFeedback(c.notice);
const tabs = [{ id: 'review' as const, label: '待审核' }, { id: 'records' as const, label: '认证记录' }, { id: 'appeal' as const, label: '申诉复核' }];
const statusOptions = Object.entries(statusLabels).filter(([value]) => value !== 'draft').map(([value, label]) => ({ value, label }));
const decision = ref<CertificationDecision['decision'] | CertificationAppealDecision['decision'] | null>(null), reason = ref('');
const title = computed(() => decision.value ? decisionLabels[decision.value] : '审核决定');
const detailArea = ref<HTMLElement | null>(null), queueArea = ref<HTMLElement | null>(null);
let queueScroll = 0;
async function open(item: CertificationReviewSummary) {
  queueScroll = window.scrollY;
  await c.open(item); await nextTick(); detailArea.value?.querySelector<HTMLElement>('h2')?.focus();
}
function back() { c.close(); void nextTick(() => { window.scrollTo(0, queueScroll); queueArea.value?.focus({ preventScroll: true }); }); }
function request(value: NonNullable<typeof decision.value>) { decision.value = value; reason.value = ''; c.formError.value = ''; }
async function confirm() { if (decision.value && await c.decide(decision.value, reason.value)) { decision.value = null; reason.value = ''; } }
</script>
<template>
  <section class="min-w-0 space-y-4" aria-label="平台认证审核">
    <NCard :bordered="false" title="平台认证审核">
      <p class="m-0 text-admin-body">独立审核平台认证申请，处理申诉与认证后续状态。平台权限不覆盖组织认证。</p>
    </NCard>
    <div class="flex flex-wrap gap-2" aria-label="认证审核栏目">
      <NButton v-for="tab in tabs" :key="tab.id" size="large" :type="c.tab.value === tab.id ? 'primary' : 'default'" :disabled="c.busy.value || !!decision" :aria-current="c.tab.value === tab.id ? 'page' : undefined" @click="c.changeTab(tab.id)">{{ tab.label }}</NButton>
    </div>
    <NAlert v-if="c.stale.value" type="warning" role="status">{{ c.stale.value }}<NButton size="large" :disabled="c.busy.value" @click="c.load(); c.readSelected()">重新读取</NButton></NAlert>
    <div class="grid min-w-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <NCard :bordered="false" class="min-w-0 self-start" :class="c.selected.value ? 'hidden lg:block' : ''">
        <div ref="queueArea" tabindex="-1" class="space-y-4">
          <NSelect v-if="c.tab.value === 'records'" v-model:value="c.status.value" :options="statusOptions" clearable size="large" placeholder="全部已提交状态" aria-label="筛选认证状态" :disabled="c.busy.value" @update:value="c.load(1)" />
          <NButton size="large" :disabled="c.loading.value || c.busy.value" @click="c.load()">刷新队列</NButton>
          <UiLoadingHint :loading="c.loading.value" label="读取认证队列" @retry="c.load()" />
          <NAlert v-if="c.error.value" type="error" role="alert">{{ c.error.value }}<NButton size="large" @click="c.load()">重新读取</NButton></NAlert>
          <ul class="m-0 list-none p-0">
            <li v-for="item in c.items.value" :key="item.id" class="border-b border-admin-line">
              <button type="button" class="w-full min-w-0 space-y-1 rounded border-0 px-2 py-4 text-left text-admin-ink transition-colors hover:bg-admin-sand focus-visible:outline focus-visible:outline-2 focus-visible:outline-admin-primary" :class="c.selected.value?.id === item.id ? 'bg-admin-sand' : 'bg-admin-surface'" :disabled="c.busy.value || !!decision" @click="open(item)">
                <span class="block break-words text-base font-semibold">{{ item.applicant.legalName || '未填写实名' }} · {{ item.applicant.nickname }}</span>
                <span class="block text-sm text-admin-body">{{ levelLabels[item.level] }} · {{ statusLabels[item.status] }}</span>
                <span class="block break-all font-mono text-xs text-admin-body">账号 {{ item.subjectUserId.slice(0, 8) }}</span>
              </button>
            </li>
          </ul>
          <p v-if="!c.loading.value && !c.error.value && !c.items.value.length" role="status">当前没有符合条件的认证记录。</p>
          <NPagination :page="c.page.value" :item-count="c.total.value" :page-size="20" :page-slot="3" size="large" :disabled="c.loading.value || c.busy.value" @update:page="c.load" />
        </div>
      </NCard>
      <NCard :bordered="false" class="min-w-0 self-start">
        <div ref="detailArea" class="space-y-4">
          <div v-if="c.selected.value" class="flex flex-wrap gap-2">
            <NButton size="large" :disabled="c.busy.value || !!decision" @click="back">返回队列</NButton>
            <NButton v-if="c.next.value" size="large" :disabled="c.busy.value || !!decision" @click="open(c.next.value)">下一条</NButton>
          </div>
          <p v-if="c.notice.value" role="status" class="m-0 text-base font-semibold text-admin-success">{{ c.notice.value }}</p>
          <UiLoadingHint :loading="c.detailLoading.value" label="读取申请材料" @retry="c.readSelected()" />
          <NAlert v-if="c.detailError.value" type="error" role="alert">{{ c.detailError.value }}<NButton size="large" :disabled="c.busy.value" @click="c.readSelected()">重新读取详情</NButton></NAlert>
          <CertificationDetail v-if="c.record.value && c.selected.value" :key="c.record.value.id" :record="c.record.value" :applicant="c.selected.value.applicant" :appeals="c.appeals.value" :history="c.history.value" :mode="c.tab.value" :current-user-id="user.info.id ?? ''" :busy="c.busy.value || c.detailLoading.value || !!c.stale.value || !!c.detailError.value" @decide="request" />
          <p v-else-if="!c.selected.value" class="text-admin-body">选择一条申请，核对证书、履历与声明后作出决定。</p>
        </div>
      </NCard>
    </div>
    <NModal :show="!!decision" preset="card" :title="title" :style="{ width: 'min(560px, calc(100vw - 32px))' }" :mask-closable="!c.busy.value" :close-on-esc="!c.busy.value" :closable="!c.busy.value" @update:show="!c.busy.value && !$event && (decision = null)">
      <div class="space-y-4">
        <p>确认对 {{ c.selected.value?.applicant.legalName || c.selected.value?.applicant.nickname }} 作出“{{ title }}”决定？此操作会生成历史版本。</p>
        <label for="certification-reason" class="block font-semibold">决定理由</label>
        <NInput id="certification-reason" v-model:value="reason" type="textarea" :maxlength="500" show-count :disabled="c.busy.value" :autosize="{ minRows: 4 }" placeholder="说明核验依据；补件请写清缺少的材料与修改要求" />
        <NAlert v-if="c.formError.value" type="error" role="alert">{{ c.formError.value }}</NAlert>
        <UiSubmitHint :busy="c.busy.value" />
        <div class="flex flex-wrap justify-end gap-2">
          <NButton size="large" :disabled="c.busy.value" @click="decision = null">取消</NButton>
          <NButton size="large" :type="decision === 'revoke' ? 'error' : 'primary'" :loading="c.busy.value" :disabled="c.busy.value || !reason.trim()" @click="confirm">确认{{ title }}</NButton>
        </div>
      </div>
    </NModal>
  </section>
</template>

<style scoped>
/* 为组件公开根按钮补齐键盘轮廓，不依赖 Naive UI 内部节点。 */
button:focus-visible { outline: 2px solid var(--admin-primary); outline-offset: 2px; }
</style>
