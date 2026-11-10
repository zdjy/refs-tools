<template>
  <NConfigProvider
    v-if="!isLock"
    :locale="naiveLocale"
    :theme="getDarkTheme"
    :theme-overrides="getThemeOverrides"
    :date-locale="naiveDateLocale"
  >
    <AppProvider>
      <RouterView />
    </AppProvider>
  </NConfigProvider>

  <transition v-if="isLock && $route.name !== 'login'" name="slide-up">
    <LockScreen />
  </transition>
</template>

<script lang="ts" setup>
  import { computed, onMounted, onUnmounted, watchEffect } from 'vue';
  import { darkTheme } from 'naive-ui';
  import { LockScreen } from '@/components/Lockscreen';
  import { AppProvider } from '@/components/Application';
  import { useScreenLockStore } from '@/store/modules/screenLock.js';
  import { useRoute } from 'vue-router';
  import { useDesignSettingStore } from '@/store/modules/designSetting';
  import { useLocaleStore } from '@/store/modules/locale';
  import { naiveLocales } from '@/locales';
  import { DEFAULT_LOCALE } from '@/locales/types';
  import { getColorTheme, getLoginColorTheme } from '@/settings/colorTheme';
  import { getAdminPalette, getLoginPalette, getPaletteCssVariables, getStatusCssVariables } from '@/settings/uiPalette';
  import { getScaleCssVariables } from '@/settings/uiScale';
  import { PageEnum } from '@/enums/pageEnum';

  const route = useRoute();
  const useScreenLock = useScreenLockStore();
  const designStore = useDesignSettingStore();
  const localeStore = useLocaleStore();

  // naive-ui 语言包跟随当前语言切换
  const naiveLocale = computed(() => naiveLocales[localeStore.locale ?? DEFAULT_LOCALE].locale);
  const naiveDateLocale = computed(
    () => naiveLocales[localeStore.locale ?? DEFAULT_LOCALE].dateLocale
  );
  const isLock = computed(() => useScreenLock.isLocked);
  const lockTime = computed(() => useScreenLock.lockTime);

  const palette = computed(() =>
    route.name === PageEnum.BASE_LOGIN_NAME
      ? getLoginPalette(designStore.darkTheme)
      : getAdminPalette(designStore.darkTheme)
  );

  watchEffect(() => {
    const isLogin = route.name === PageEnum.BASE_LOGIN_NAME;
    const cssVariables = {
      ...getPaletteCssVariables(palette.value),
      ...getStatusCssVariables(designStore.darkTheme),
      ...getScaleCssVariables(),
    };
    for (const [name, value] of Object.entries(cssVariables)) {
      document.documentElement.style.setProperty(name, value);
    }
    // 密度变量不内联注入：内联样式会盖过媒体查询里的触屏 44px 放大，
    // 由 uiScale 输出 data-density 的 CSS 取值规则（见 index.less）。
    document.documentElement.dataset.density = designStore.density;
    // 供原生控件（滚动条、输入框）跟随主题
    document.documentElement.style.colorScheme = designStore.darkTheme ? 'dark' : 'light';
    document.documentElement.dataset.theme = designStore.darkTheme ? 'dark' : 'light';
    document.documentElement.dataset.surface = isLogin ? 'login' : 'admin';
  });

  const getThemeOverrides = computed(() =>
    route.name === PageEnum.BASE_LOGIN_NAME
      ? getLoginColorTheme(designStore.darkTheme)
      : getColorTheme(designStore.darkTheme)
  );

  const getDarkTheme = computed(() => (designStore.darkTheme ? darkTheme : undefined));

  let timer: number | undefined;

  const timekeeping = () => {
    if (timer) clearInterval(timer);
    if (route.name == 'login' || isLock.value) return;
    // 设置不锁屏
    useScreenLock.setLock(false);
    // 重置锁屏时间
    useScreenLock.setLockTime();
    timer = window.setInterval(() => {
      // 锁屏倒计时递减
      useScreenLock.setLockTime(lockTime.value - 1);
      if (lockTime.value <= 0) {
        // 设置锁屏
        useScreenLock.setLock(true);
        if (timer) clearInterval(timer);
      }
    }, 1000);
  };

  onMounted(() => {
    document.addEventListener('mousedown', timekeeping);
  });

  onUnmounted(() => {
    document.removeEventListener('mousedown', timekeeping);
  });
</script>
