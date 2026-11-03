<template>
  <div class="flex min-h-screen bg-[var(--login-bg)] text-[var(--login-text)]" :style="cssVars">
    <aside
      class="hidden flex-[1_1_45%] flex-col justify-between overflow-hidden bg-[var(--login-brand)] px-14 pb-10 pt-16 tablet:flex"
    >
      <div class="max-w-[420px]">
        <div class="flex items-center">
          <img class="mr-2.5 block w-8" :src="websiteConfig.logo" :alt="websiteConfig.title" />
          <h1 class="text-3xl font-semibold tracking-wide">{{ websiteConfig.title }}</h1>
        </div>
        <p class="mb-10 mt-0 text-[15px] leading-relaxed text-[var(--login-text-secondary)]">{{
          t('login.brandDesc')
        }}</p>
        <ul class="m-0 list-none p-0">
          <li
            v-for="feature in features"
            :key="feature"
            class="mb-3.5 flex items-center text-sm text-[var(--login-text-secondary)]"
          >
            <span class="mr-2.5 h-1.5 w-1.5 rounded-full bg-current" />
            <span>{{ feature }}</span>
          </li>
        </ul>
      </div>
      <p class="m-0 text-[13px] text-[var(--login-text-secondary)]"
        >© {{ currentYear }} Naive Ui Admin · Vue 3 + Vite + TypeScript</p
      >
    </aside>

    <main class="flex min-w-0 flex-[1_1_55%] items-center justify-center px-4 py-12 sm:px-6">
      <div
        class="box-border w-full max-w-[472px] rounded-2xl border border-solid border-[var(--login-border)] bg-[var(--login-surface)] px-6 pb-8 pt-10 sm:px-9"
      >
        <h2 class="mb-2 mt-0 text-2xl font-semibold">{{ t('login.title') }}</h2>
        <p class="mb-8 mt-0 text-sm text-[var(--login-text-secondary)]">{{
          t('login.subtitle')
        }}</p>
        <n-form
          ref="formRef"
          :model="formInline"
          :rules="rules"
          size="large"
          @keydown.enter="handleSubmit"
        >
          <n-form-item path="username">
            <n-input
              ref="usernameRef"
              v-model:value="formInline.username"
              :placeholder="t('login.usernamePlaceholder')"
              :aria-label="t('login.usernamePlaceholder')"
              clearable
            >
              <template #prefix>
                <n-icon size="18"><PersonOutline /></n-icon>
              </template>
            </n-input>
          </n-form-item>
          <n-form-item path="password">
            <n-input
              v-model:value="formInline.password"
              type="password"
              show-password-on="click"
              :placeholder="t('login.passwordPlaceholder')"
              :aria-label="t('login.passwordPlaceholder')"
            >
              <template #prefix>
                <n-icon size="18"><LockClosedOutline /></n-icon>
              </template>
            </n-input>
          </n-form-item>
          <div class="mb-5 mt-1 flex items-center justify-between gap-2">
            <n-checkbox v-model:checked="rememberMe">{{ t('login.rememberMe') }}</n-checkbox>
            <a class="login-link" href="javascript:">{{ t('login.forgotPassword') }}</a>
          </div>
          <n-button type="primary" size="large" block :loading="loading" @click="handleSubmit">
            {{ t('login.submit') }}
          </n-button>
          <div
            class="mb-4 mt-7 flex items-center gap-3 text-[13px] text-[var(--login-text-secondary)]"
          >
            <span class="h-px flex-1 bg-[var(--login-border)]" />
            <span>{{ t('login.otherMethods') }}</span>
            <span class="h-px flex-1 bg-[var(--login-border)]" />
          </div>
          <div class="flex justify-center gap-4">
            <a
              v-for="item in socialLogins"
              :key="item.key"
              class="login-social flex h-11 w-11 items-center justify-center rounded-full border border-solid border-[var(--login-border)] text-[var(--login-text-secondary)]"
              href="javascript:"
              :title="item.title"
              :aria-label="item.title"
            >
              <n-icon size="20"><component :is="item.icon" /></n-icon>
            </a>
          </div>
        </n-form>
        <p class="mb-0 mt-6 text-center text-sm text-[var(--login-text-secondary)]">
          {{ t('login.noAccount')
          }}<a class="login-link" href="javascript:">{{ t('login.register') }}</a>
        </p>
      </div>
    </main>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useI18n } from 'vue-i18n';
  import { useMessage, useThemeVars } from 'naive-ui';
  import type { FormInst, FormRules, InputInst } from 'naive-ui';
  import {
    LockClosedOutline,
    LogoFacebook,
    LogoGithub,
    LogoWechat,
    PersonOutline,
  } from '@vicons/ionicons5';
  import { ResultEnum } from '@/enums/httpEnum';
  import { PageEnum } from '@/enums/pageEnum';
  import { websiteConfig } from '@/config/website.config';
  import { useUserStore } from '@/store/modules/user';

  interface FormState {
    username: string;
    password: string;
  }

  const { t } = useI18n();
  const features = computed(() => [
    t('login.featureVue'),
    t('login.featureVite'),
    t('login.featureNaive'),
    t('login.featurePractice'),
  ]);
  const socialLogins = computed(() => [
    { key: 'github', title: 'GitHub', icon: LogoGithub },
    { key: 'wechat', title: t('login.wechat'), icon: LogoWechat },
    { key: 'facebook', title: 'Facebook', icon: LogoFacebook },
  ]);
  const themeVars = useThemeVars();
  const message = useMessage();
  const router = useRouter();
  const route = useRoute();
  const userStore = useUserStore();
  const formRef = ref<FormInst | null>(null);
  const usernameRef = ref<InputInst | null>(null);
  const loading = ref(false);
  const rememberMe = ref(true);
  const currentYear = new Date().getFullYear();
  const formInline = reactive<FormState>({ username: 'admin', password: '123456' });
  const rules = computed<FormRules>(() => ({
    username: { required: true, message: t('login.usernameRequired'), trigger: 'blur' },
    password: { required: true, message: t('login.passwordRequired'), trigger: 'blur' },
  }));
  const cssVars = computed<Record<string, string>>(() => ({
    '--login-bg': themeVars.value.bodyColor,
    '--login-brand': themeVars.value.tableHeaderColor,
    '--login-surface': themeVars.value.cardColor,
    '--login-border': themeVars.value.dividerColor,
    '--login-text': themeVars.value.textColor1,
    '--login-text-secondary': themeVars.value.textColor3,
    '--login-primary': themeVars.value.primaryColor,
  }));

  async function handleSubmit() {
    if (loading.value) return;
    try {
      await formRef.value?.validate();
    } catch {
      return;
    }
    loading.value = true;
    message.loading(t('login.loggingIn'));
    try {
      const { code, message: msg } = await userStore.login({
        username: formInline.username,
        password: formInline.password,
      });
      if (code === ResultEnum.SUCCESS) {
        const toPath = decodeURIComponent((route.query?.redirect as string) || '/');
        message.success(t('login.loginSuccess'));
        router.replace(route.name === PageEnum.BASE_LOGIN_NAME ? '/' : toPath);
      } else {
        message.info(msg || t('login.loginFailed'));
      }
    } catch {
      message.error(t('login.loginFailedRetry'));
    } finally {
      message.destroyAll();
      loading.value = false;
    }
  }
  onMounted(() => {
    usernameRef.value?.focus();
  });
</script>

<style scoped>
  /* 上游 Tailwind 使用全局 important；交互基线在此保证焦点与减少动态效果偏好。 */
  .login-link {
    color: var(--login-primary);
    font-size: 14px;
    text-decoration: none;
  }
  .login-link,
  .login-social {
    transition: opacity 0.3s ease;
  }
  .login-link:hover,
  .login-social:hover {
    opacity: 0.8;
  }
  .login-link:focus-visible,
  .login-social:focus-visible {
    outline: 2px solid var(--login-primary);
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    .login-link,
    .login-social {
      transition: none;
    }
  }
</style>
