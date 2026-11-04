<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { NAlert, NButton } from 'naive-ui'
import { useAuthStore } from '../../stores/auth'
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import PasswordSettings from '../../features/account/PasswordSettings.vue'
import ProfileAvatar from './components/ProfileAvatar.vue'
import ProfileFieldsForm from './components/ProfileFieldsForm.vue'
import EmailChangeForm from './components/EmailChangeForm.vue'
import { useProfileSettings } from './useProfileSettings'

const auth = useAuthStore()
const { profile, fields, avatarUrl, avatar, loading, saving, loadError, saveError, saved, fieldError,
  load, save, pickAvatar, retryAvatar, removeAvatar } = useProfileSettings()
const formArea = ref<HTMLElement | null>(null)

onMounted(() => {
  if (auth.status === 'unknown') void auth.restore()
  void load()
})

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
    <div class="mx-auto grid max-w-[760px] gap-6">
      <header class="grid gap-2">
        <p class="m-0 text-xs font-bold tracking-wider text-red-hover uppercase">个人账号</p>
        <h1 class="m-0 text-[26px] leading-[1.35] tracking-[-.03em] sm:text-[32px]">账号设置</h1>
        <p class="m-0 text-[14px] leading-[1.8] text-body">维护你的裁判档案与登录方式。账号资料保存后立即生效；更换邮箱会重新核验旧邮箱、密码与新邮箱。</p>
      </header>

      <p v-if="loading" role="status" class="m-0 text-[13px] text-body">正在读取账号资料…</p>
      <template v-else-if="loadError">
        <n-alert type="error" :show-icon="false">{{ loadError }}</n-alert>
        <div><n-button type="primary" @click="load()">重新读取</n-button></div>
      </template>
      <template v-else-if="profile">
        <n-alert v-if="saveError" type="error" :show-icon="false">{{ saveError }}</n-alert>
        <p v-if="saved" role="status" class="m-0 rounded-xl border border-solid border-line bg-soft px-4 py-3 text-[13px] leading-[1.7]">{{ saved }}</p>

        <section class="grid gap-6 rounded-2xl border border-solid border-line bg-surface p-5 shadow-card sm:p-6" aria-labelledby="profile-identity-heading">
          <h2 id="profile-identity-heading" class="m-0 text-[18px]">个人资料</h2>
          <ProfileAvatar :url="avatarUrl" :name="fields.nickname" :state="avatar" :busy="saving" @select="pickAvatar" @retry="retryAvatar" @remove="removeAvatar" />
          <div ref="formArea" tabindex="-1" class="grid gap-5">
            <ProfileFieldsForm :fields="fields" :field-error="fieldError" :saving="saving" @save="submitProfile" />
          </div>
        </section>

        <section class="grid gap-5 rounded-2xl border border-solid border-line bg-surface p-5 shadow-card sm:p-6">
          <EmailChangeForm />
        </section>

        <section class="grid gap-5 rounded-2xl border border-solid border-line bg-surface p-5 shadow-card sm:p-6">
          <PasswordSettings />
        </section>

        <p class="m-0 text-[13px] leading-[1.8] text-body">
          想查看本次登录有效至何时？前往<RouterLink class="text-ink underline underline-offset-2 hover:text-red-hover" to="/account">账号与会话概览</RouterLink>。
        </p>
      </template>
      <template v-else>
        <n-alert type="info" :show-icon="false">请先登录后再维护账号资料。</n-alert>
        <div><RouterLink class="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-[14px] font-semibold text-surface no-underline" to="/login">前往登录</RouterLink></div>
      </template>
    </div>
  </NavigationShell>
</template>
