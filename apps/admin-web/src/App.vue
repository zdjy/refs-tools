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
  import { getAdminPalette, getLoginPalette, getPaletteCssVariables } from '@/settings/uiPalette';
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
    for (const [name, value] of Object.entries(getPaletteCssVariables(palette.value))) {
      document.documentElement.style.setProperty(name, value);
    }
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
