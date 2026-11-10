import { computed } from 'vue';
import { useDesignSettingStore } from '@/store/modules/designSetting';

/** 主题与密度设置；两者都由界面设置抽屉持久化。 */
export function useDesignSetting() {
  const designStore = useDesignSettingStore();
  const getDarkTheme = computed(() => designStore.darkTheme);
  const getDensity = computed(() => designStore.density);
  return {
    getDarkTheme,
    getDensity,
    designStore,
  };
}
