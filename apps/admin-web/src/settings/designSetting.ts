import type { AdminDensity } from '@/settings/uiScale';

const setting = {
  // 默认主题；实际值由界面设置抽屉持久化，首次进入使用此值。
  darkTheme: false,
  // 默认表格密度；紧凑 = 36px 行高。
  density: 'compact' as AdminDensity,
  // 侧栏默认收起；只影响下次进入的初始态。
  siderCollapsedByDefault: false,
};

export default setting;
