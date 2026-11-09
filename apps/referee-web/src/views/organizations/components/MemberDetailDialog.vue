<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NAlert, NButton, NModal } from 'naive-ui'
import type { MemberContact, Membership } from '@refs-tools/contracts/organization-members'
import { refereeModalStyle } from '../../../ui-theme'
import UiLoadingRegion from '../../../components/ui/UiLoadingRegion.vue'
import { formatDate, maskPhone, memberStatusLabels } from '../organizations.presentation'

/**
 * 成员联系方式的只读详情。手机号默认遮蔽，用户主动展开后才显示整串；
 * 联系方式读取失败时保留重试入口，不把错误当成“未填写”，关闭后由页面状态层清空私有数据。
 */
const props = defineProps<{
  show: boolean; member: Membership | null; contact: MemberContact | null
  avatarUrl: string; loading: boolean; error: string
}>()
const emit = defineEmits<{ 'update:show': [value: boolean]; retry: [] }>()
const phoneVisible = ref(false)
watch(() => [props.show, props.member?.id], () => { phoneVisible.value = false })

const name = computed(() => props.contact?.nickname ?? props.member?.displayName ?? '')
const initial = computed(() => [...name.value.trim()][0] ?? '?')
const phone = computed(() => props.contact?.phone ?? '')
const maskedPhone = computed(() => maskPhone(phone.value))
const filled = (value: string | null | undefined) => value?.trim() ? value : '未填写'
</script>

<template>
  <n-modal :show="show" preset="card" title="成员资料" :aria-label="`${name}的个人信息`" :style="refereeModalStyle"
    class="max-h-[calc(100dvh-32px)] max-w-[460px] overflow-y-auto" @update:show="emit('update:show', $event)">
    <div class="grid gap-5">
      <div class="flex items-center gap-3">
        <span class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border border-solid border-line bg-soft text-xl font-semibold text-ink" aria-hidden="true">
          <img v-if="avatarUrl" :src="avatarUrl" alt="" class="size-full object-cover" />
          <template v-else>{{ initial }}</template>
        </span>
        <div class="grid min-w-0 gap-0.5">
          <p class="m-0 text-lg font-semibold text-ink wrap-anywhere">{{ name }}</p>
          <p v-if="member" class="m-0 text-[13px] text-body">{{ memberStatusLabels[member.status] }} · 加入 / 申请于 {{ formatDate(member.createdAt) }}</p>
        </div>
      </div>
      <UiLoadingRegion v-if="loading" :loading="true" label="读取成员联系方式" :lines="3" @retry="emit('retry')" />
      <div v-else-if="error" class="grid gap-3">
        <n-alert type="error" :show-icon="false" role="alert">{{ error }}</n-alert>
        <div><n-button type="primary" @click="emit('retry')">重新读取</n-button></div>
      </div>
      <template v-else-if="contact">
        <dl class="m-0 grid list-none gap-0 overflow-hidden rounded-xl border border-solid border-line p-0">
          <div class="grid gap-1 border-0 border-b border-solid border-line p-3 last:border-b-0">
            <dt class="text-[12px] text-body">真实姓名</dt>
            <dd class="m-0 text-[15px] text-ink wrap-anywhere">{{ filled(contact.legalName) }}</dd>
          </div>
          <div class="grid gap-1 border-0 border-b border-solid border-line p-3 last:border-b-0">
            <dt class="text-[12px] text-body">手机号</dt>
            <dd class="m-0 flex flex-wrap items-center gap-2">
              <span v-if="phone" class="font-mono text-[15px] tabular-nums text-ink">{{ phoneVisible ? phone : maskedPhone }}</span>
              <span v-else class="text-[15px] text-ink">未填写</span>
              <n-button v-if="phone" text type="primary" size="small" :aria-pressed="phoneVisible"
                :aria-label="phoneVisible ? '隐藏完整手机号' : '显示完整手机号'" @click="phoneVisible = !phoneVisible">{{ phoneVisible ? '隐藏' : '显示' }}</n-button>
            </dd>
          </div>
          <div class="grid gap-1 border-0 border-b border-solid border-line p-3 last:border-b-0">
            <dt class="text-[12px] text-body">地区</dt>
            <dd class="m-0 text-[15px] text-ink wrap-anywhere">{{ filled(contact.regionLabel) }}</dd>
          </div>
        </dl>
        <p class="m-0 text-[12px] leading-relaxed text-body">联系方式仅用于组织成员管理与联络，请勿对外传播。查看行为会记录在审计中。</p>
      </template>
      <div class="flex justify-end">
        <n-button secondary @click="emit('update:show', false)">关闭</n-button>
      </div>
    </div>
  </n-modal>
</template>
