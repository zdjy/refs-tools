import { computed } from 'vue';
import { websiteConfig } from '@/config/website.config';
import { useDesignSetting } from './useDesignSetting';

/**
 * 按当前主题选择品牌方标。
 * 方形标的浅色/深色两版差异只在描边：深色版多一圈奶白外扩，避免黑描边在深色底上消失。
 */
export function useBrandLogo() {
  const { getDarkTheme } = useDesignSetting();
  return computed(() => (getDarkTheme.value ? websiteConfig.logoDark : websiteConfig.logo));
}
