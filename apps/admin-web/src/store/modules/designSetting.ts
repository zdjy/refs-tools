import { defineStore } from 'pinia';
import { store } from '@/store';
import designSetting from '@/settings/designSetting';
import { storage } from '@/utils/Storage';
import { isAdminDensity, type AdminDensity } from '@/settings/uiScale';

const THEME_KEY = 'UI-THEME';
const DENSITY_KEY = 'UI-DENSITY';
const SIDER_COLLAPSED_KEY = 'UI-SIDER-COLLAPSED';

interface DesignSettingState {
  darkTheme: boolean;
  density: AdminDensity;
  /** 侧栏是否收起；用户切换后立即生效并持久化，与界面设置抽屉里的开关同源。 */
  siderCollapsed: boolean;
}

function readTheme(fallback: boolean): boolean {
  const stored = storage.get(THEME_KEY);
  return typeof stored === 'boolean' ? stored : fallback;
}

function readDensity(fallback: AdminDensity): AdminDensity {
  const stored = storage.get(DENSITY_KEY);
  return isAdminDensity(stored) ? stored : fallback;
}

function readSiderCollapsed(fallback: boolean): boolean {
  const stored = storage.get(SIDER_COLLAPSED_KEY);
  return typeof stored === 'boolean' ? stored : fallback;
}

export const useDesignSettingStore = defineStore({
  id: 'app-design-setting',
  state: (): DesignSettingState => ({
    darkTheme: readTheme(designSetting.darkTheme),
    density: readDensity(designSetting.density),
    siderCollapsed: readSiderCollapsed(designSetting.siderCollapsedByDefault),
  }),
  getters: {
    getDarkTheme(): boolean {
      return this.darkTheme;
    },
    getDensity(): AdminDensity {
      return this.density;
    },
    getSiderCollapsed(): boolean {
      return this.siderCollapsed;
    },
  },
  actions: {
    setDarkTheme(value: boolean): void {
      this.darkTheme = value;
      storage.set(THEME_KEY, value);
    },
    toggleDarkTheme(): void {
      this.setDarkTheme(!this.darkTheme);
    },
    setDensity(value: AdminDensity): void {
      this.density = value;
      storage.set(DENSITY_KEY, value);
    },
    setSiderCollapsed(value: boolean): void {
      this.siderCollapsed = value;
      storage.set(SIDER_COLLAPSED_KEY, value);
    },
    toggleSiderCollapsed(): void {
      this.setSiderCollapsed(!this.siderCollapsed);
    },
  },
});

export function useDesignSetting() {
  return useDesignSettingStore(store);
}
