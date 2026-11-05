<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, CircleCheck } from '@lucide/vue'
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import UiSteps from '../../components/ui/UiSteps.vue'
import { useUiFeedback } from '../../components/ui/useUiFeedback'
import ApplicationForm from './components/ApplicationForm.vue'
import OrganizationsSignIn from './components/OrganizationsSignIn.vue'
import { linkButton } from './organizations.presentation'
import { useAuthGate } from './useAuthGate'
import { useOrganizationApplication } from './useOrganizationApplication'

const app = useOrganizationApplication()
const formArea = ref<HTMLElement | null>(null)
const { status, retry } = useAuthGate(() => app.applicant.load())
useUiFeedback(app.action.done)
/**
 * 校验或提交失败时把焦点移到首个无效字段；没有字段错误（如服务端拒绝）则聚焦表单区，让读屏用户听到结果。
 * 地区选择器是 role=group，无法携带 aria-invalid，因此用其 data-invalid 标记定位组内第一个可聚焦的下拉。
 */
async function submit() {
  if (await app.submit()) return
  await nextTick()
  const target = formArea.value?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"] [tabindex="0"]')
  ;(target ?? formArea.value)?.focus()
}
const steps = [
  { title: '提交资料', hint: '填写组织信息，负责人信息取自你的账号资料' },
  { title: '平台审核', hint: '审核期间没有运营权限' },
  { title: '开始使用', hint: '通过后你成为负责人' },
] as const
</script>

<template>
  <NavigationShell>
    <div class="mx-auto grid max-w-[900px] gap-6">
      <RouterLink to="/organizations" class="inline-flex min-h-11 w-fit items-center gap-2 text-sm text-body no-underline hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        <ArrowLeft class="size-4" :stroke-width="1.75" aria-hidden="true" />我的组织
      </RouterLink>
      <header class="grid gap-2">
        <h1 class="m-0 text-[28px] leading-tight font-bold tracking-tight text-ink compact:text-[36px]">申请创建组织</h1>
        <p class="m-0 max-w-[60ch] text-sm leading-relaxed text-body">提交后由平台审核。审核通过前，组织不能邀请成员、开展赛事或授予角色。</p>
      </header>
      <OrganizationsSignIn v-if="status !== 'authenticated'" :status="status" @retry="retry" />
      <section v-else-if="app.submitted.value" role="status" class="grid gap-4 border-0 border-l border-solid border-ink pl-4">
        <div class="flex items-center gap-3"><CircleCheck class="size-6 text-green" :stroke-width="1.75" aria-hidden="true" /><h2 class="m-0 text-xl text-ink">已提交「{{ app.submitted.value.name }}」</h2></div>
        <UiSteps :items="steps" :current="1" label="申请进度" />
        <p class="m-0 max-w-[60ch] text-sm leading-relaxed text-ink">平台审核结果会显示在「我的组织」里：通过后你成为负责人，被驳回会附上说明并可重新申请。目前不会发送邮件通知，请自行回来查看。</p>
        <div><RouterLink to="/organizations" :class="linkButton.primary">查看我的组织</RouterLink></div>
      </section>
      <div v-else class="grid gap-6 tablet:grid-cols-[minmax(0,1fr)_280px] tablet:items-start">
        <section ref="formArea" tabindex="-1" aria-labelledby="form-title" class="grid gap-5 focus:outline-hidden border-0 border-t border-solid border-ink pt-5 compact:p-6">
          <h2 id="form-title" class="m-0 text-lg text-ink">组织与负责人资料</h2>
          <ApplicationForm v-model:fields="app.fields" :field-error="app.fieldError" :busy="app.action.busy.value" :error="app.action.error.value"
            :applicant="app.applicant" @submit="submit" />
        </section>
        <aside aria-labelledby="flow-title" class="grid gap-3 border-0 border-l border-solid border-ink pl-4">
          <h2 id="flow-title" class="m-0 text-base text-ink">提交之后</h2>
          <ol class="m-0 grid list-none gap-3 p-0 text-sm leading-relaxed text-ink">
            <li v-for="step in steps" :key="step.title"><span class="font-semibold">{{ step.title }}</span><br />{{ step.hint }}</li>
          </ol>
        </aside>
      </div>
    </div>
  </NavigationShell>
</template>
