<template>
  <div class="flex min-h-screen bg-[var(--login-bg)] text-[var(--login-text)]" :style="cssVars">
    <aside
      class="hidden flex-[1_1_45%] flex-col justify-between overflow-hidden bg-[var(--login-brand)] px-14 pb-10 pt-16 tablet:flex"
    >
      <div class="max-w-[420px]">
        <div class="flex items-center">
          <img class="mr-2.5 block w-8" :src="logo" :alt="websiteConfig.title" />
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
        >© {{ currentYear }} {{ websiteConfig.title }}</p
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
        <LoginForm @success="handleSuccess" />
        <p class="mb-0 mt-6 text-center text-sm text-[var(--login-text-secondary)]">
          {{ t('login.accessNote') }}
        </p>
      </div>
    </main>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useI18n } from 'vue-i18n';
  import { useThemeVars } from 'naive-ui';
  import { PageEnum } from '@/enums/pageEnum';
  import { websiteConfig } from '@/config/website.config';
  import { useBrandLogo } from '@/hooks/setting/useBrandLogo';
  import LoginForm from './components/LoginForm.vue';

  const { t } = useI18n();
  const features = computed(() => [t('login.featureUsers'), t('login.featureOrgs'), t('login.featureFiles')]);
  const themeVars = useThemeVars();
  // 登录页左侧品牌栏底色随主题变化，方标同样按主题切换。
  const logo = useBrandLogo();
  const router = useRouter();
  const route = useRoute();
  const currentYear = new Date().getFullYear();
  const cssVars = computed<Record<string, string>>(() => ({
    '--login-bg': themeVars.value.bodyColor,
    '--login-brand': themeVars.value.tableHeaderColor,
    '--login-surface': themeVars.value.cardColor,
    '--login-border': themeVars.value.dividerColor,
    '--login-text': themeVars.value.textColor1,
    '--login-text-secondary': themeVars.value.textColor3,
  }));

  function handleSuccess() {
    const toPath = decodeURIComponent((route.query?.redirect as string) || '/');
    router.replace(route.name === PageEnum.BASE_LOGIN_NAME ? '/' : toPath);
  }
</script>
