import { defineStore } from 'pinia';
import { store } from '@/store';
import designSetting from '@/settings/designSetting';

interface DesignSettingState {
  darkTheme: boolean;
}

export const useDesignSettingStore = defineStore({
  id: 'app-design-setting',
  state: (): DesignSettingState => ({ ...designSetting }),
  getters: {
    getDarkTheme(): boolean {
      return this.darkTheme;
    },
  },
  actions: {},
});

export function useDesignSetting() {
  return useDesignSettingStore(store);
}
