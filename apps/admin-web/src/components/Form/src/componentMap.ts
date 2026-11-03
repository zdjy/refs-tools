import {
  NAutoComplete,
  NCascader,
  NDatePicker,
  NInput,
  NInputGroup,
  NInputNumber,
  NRate,
  NSelect,
  NSlider,
  NSwitch,
  NTimePicker,
  NTreeSelect,
  NUpload,
} from 'naive-ui';
import type { Component } from 'vue';
import type { ComponentType } from './types/index';

/**
 * 表单 schema 中 `component` 字符串到 Naive UI 组件的显式映射。
 *
 * 项目不全局注册 Naive UI，`<component :is="'NInput'">` 这类字符串无法被解析，
 * 会被当作原生标签渲染为空白，因此必须在此显式导入。
 * NCheckbox / NRadioGroup 由 BasicForm 模板单独渲染，不在此表中。
 */
export const formComponentMap: Partial<Record<ComponentType, Component>> = {
  NInput,
  NInputGroup,
  NInputNumber,
  NSelect,
  NTreeSelect,
  NAutoComplete,
  NCascader,
  NDatePicker,
  NTimePicker,
  NSwitch,
  NSlider,
  NRate,
  NUpload,
};

/**
 * 按 schema 的 component 名称取得组件；未登记时开发期给出明确提示，避免静默渲染为空。
 */
export function resolveFormComponent(name?: ComponentType): Component | undefined {
  const component = name ? formComponentMap[name] : undefined;
  if (!component && import.meta.env.DEV) {
    console.warn(`[BasicForm] 未登记的表单组件 "${name}"，请在 componentMap.ts 中补充映射。`);
  }
  return component;
}
