<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { NAlert, NButton } from 'naive-ui'
import { useAuthStore } from '../../stores/auth'
import { useAvatarStore } from '../../stores/avatar'
import { useUiFeedback } from '../../components/ui/useUiFeedback'
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import PasswordSettings from '../../features/account/PasswordSettings.vue'
import UiLoadingRegion from '../../components/ui/UiLoadingRegion.vue'
import ProfileAvatar from './components/ProfileAvatar.vue'
import ProfileFieldsForm from './components/ProfileFieldsForm.vue'
import EmailChangeForm from './components/EmailChangeForm.vue'
import { useProfileSettings } from './useProfileSettings'
import { profileTabs, useProfileTabs } from './useProfileTabs'

const auth = useAuthStore()
const avatarStore = useAvatarStore()
const { profile, fields, avatarUrl, avatar, loading, saving, loadError, saveError, saved, fieldError,
  load, save, pickAvatar, retryAvatar, removeAvatar } = useProfileSettings()
useUiFeedback(saved, 'info')
const tablist = ref<HTMLElement | null>(null)
const { active, select, onKeydown } = useProfileTabs(tablist)
const formArea = ref<HTMLElement | null>(null)

const tabClass = (id: string) => id === active.value
  ? 'bg-sand text-ink font-semibold shadow-selected'
  : 'text-body hover:bg-soft hover:text-ink'

onMounted(() => {
  if (auth.status === 'unknown') void auth.restore()
  void load()
})

/** 头像变更后刷新会话投影，顶栏据此换图；旧签名 URL 同时作废。 */
async function refreshAvatarEverywhere() {
  avatarStore.invalidate()
  await auth.restore(true)
  await avatarStore.ensure(auth.user?.avatarMediaId ?? null)
}

async function selectAvatar(file: File) {
  await pickAvatar(file)
  await refreshAvatarEverywhere()
}

async function clearAvatar() {
  await removeAvatar()
  await refreshAvatarEverywhere()
}

async function retryAvatarUpload() {
  await retryAvatar()
  await refreshAvatarEverywhere()
}

/** 保存失败时把焦点移到首个无效输入；没有字段错误则聚焦汇总提示。 */
async function submitProfile() {
  if (await save()) {
    // 昵称可能已变化，重新读取会话投影让顶栏与社区显示同步。
    void auth.restore(true)
    return
  }
  await nextTick()
  const target = formArea.value?.querySelector<HTMLElement>('[aria-invalid="true"]')
  ;(target ?? formArea.value)?.focus()
}
</script>

<template>
  <NavigationShell>
    <div class="mx-auto grid max-w-[980px] gap-6">
      <header class="grid gap-2">
        <h1 class="text-ink m-0 text-[26px] leading-[1.35] tracking-[-.03em] sm:text-[32px]">账号设置</h1>
        <p class="m-0 text-[14px] leading-[1.8] text-body">维护你的裁判档案与登录方式。账号资料保存后立即生效；更换邮箱会重新核验旧邮箱、密码与新邮箱。</p>
      </header>

      <div class="grid gap-4 tablet:grid-cols-[200px_minmax(0,1fr)] tablet:items-start tablet:gap-6">
        <div ref="tablist" role="tablist" aria-label="账号设置分区" @keydown="onKeydown"
          class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 tablet:mx-0 tablet:flex-col tablet:gap-1 tablet:overflow-visible tablet:px-0 tablet:pb-0">
          <button v-for="tab in profileTabs" :key="tab.id" :id="`tab-${tab.id}`" type="button" role="tab"
            :data-tab="tab.id" :aria-selected="active === tab.id" :aria-controls="`panel-${tab.id}`"
            :tabindex="active === tab.id ? 0 : -1"
            class="inline-flex min-h-11 shrink-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-[13px] whitespace-nowrap transition-[background-color,color] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red active:scale-[.98] xs:text-[14px] sm:px-3 tablet:flex-none tablet:justify-start"
            :class="tabClass(tab.id)" @click="select(tab.id)">
            <span v-if="active === tab.id" class="hidden size-1.5 shrink-0 rounded-full bg-red xs:block" aria-hidden="true"></span>
            {{ tab.label }}
          </button>
        </div>

        <section v-if="active === 'profile'" id="panel-profile" role="tabpanel" aria-labelledby="tab-profile" tabindex="0"
          class="grid min-w-0 gap-5 rounded-2xl border border-solid border-line bg-surface p-5 shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red sm:p-6">
          <div class="grid gap-1">
            <h2 class="text-ink m-0 text-[18px]">个人资料</h2>
            <p class="m-0 text-[13px] leading-[1.8] text-body">昵称、头像、实名与联系方式。只有昵称与头像会展示给其他人。</p>
          </div>
          <UiLoadingRegion v-if="loading" :loading="loading" label="读取账号资料" :lines="5" @retry="load()" />
          <template v-else-if="loadError">
            <n-alert type="error" :show-icon="false">{{ loadError }}</n-alert>
            <div><n-button type="primary" @click="load()">重新读取</n-button></div>
          </template>
          <template v-else-if="profile">
            <n-alert v-if="saveError" type="error" :show-icon="false">{{ saveError }}</n-alert>
            <p v-if="saved" role="status" class="m-0 rounded-xl border border-solid border-line bg-soft px-4 py-3 text-[13px] leading-[1.7]">{{ saved }}</p>
            <ProfileAvatar :url="avatarUrl" :name="fields.nickname" :state="avatar" :busy="saving"
              @select="selectAvatar" @retry="retryAvatarUpload" @remove="clearAvatar" />
            <div ref="formArea" tabindex="-1" class="grid gap-5 border-0 border-t border-solid border-line pt-5">
              <ProfileFieldsForm :fields="fields" :field-error="fieldError" :saving="saving" @save="submitProfile" />
            </div>
          </template>
          <n-alert v-else type="info" :show-icon="false">请先登录后再维护账号资料。</n-alert>
        </section>

        <section v-else-if="active === 'email'" id="panel-email" role="tabpanel" aria-labelledby="tab-email" tabindex="0"
          class="grid min-w-0 gap-5 rounded-2xl border border-solid border-line bg-surface p-5 shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red sm:p-6">
          <EmailChangeForm />
        </section>

        <section v-else id="panel-password" role="tabpanel" aria-labelledby="tab-password" tabindex="0"
          class="grid min-w-0 gap-5 rounded-2xl border border-solid border-line bg-surface p-5 shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red sm:p-6">
          <PasswordSettings embedded />
        </section>
      </div>

      <p class="m-0 text-[13px] leading-[1.8] text-body">
        想查看本次登录有效至何时？前往<RouterLink class="text-ink underline underline-offset-2 hover:text-red-hover" to="/account">账号与会话概览</RouterLink>。
      </p>
    </div>
  </NavigationShell>
</template>
