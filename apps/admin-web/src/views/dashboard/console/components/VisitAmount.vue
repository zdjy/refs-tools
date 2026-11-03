<template>
  <div ref="chartRef" :style="{ height, width }"></div>
</template>
<script lang="ts" setup>
  import { computed, onMounted, ref, Ref, watch } from 'vue';
  import { useDesignSettingStore } from '@/store/modules/designSetting';
  import { getAdminPalette } from '@/settings/uiPalette';
  import { useECharts } from '@/hooks/web/useECharts';
  import { basicProps } from './props';

  defineProps({
    ...basicProps,
  });

  const chartRef = ref<HTMLDivElement | null>(null);
  const { setOptions } = useECharts(chartRef as Ref<HTMLDivElement>);
  const designStore = useDesignSettingStore();
  const palette = computed(() => getAdminPalette(designStore.darkTheme));

  const updateChart = () => {
    setOptions({
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          lineStyle: {
            width: 1,
            color: palette.value.success,
          },
        },
      },
      grid: { left: '1%', right: '1%', top: '2%', bottom: 0, containLabel: true },
      xAxis: {
        type: 'category',
        axisLabel: { color: palette.value.body },
        axisLine: { lineStyle: { color: palette.value.line } },
        data: [
          '1月',
          '2月',
          '3月',
          '4月',
          '5月',
          '6月',
          '7月',
          '8月',
          '9月',
          '10月',
          '11月',
          '12月',
        ],
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: palette.value.muted },
        axisLine: { lineStyle: { color: palette.value.line } },
        splitLine: { lineStyle: { color: palette.value.line } },
        max: 8000,
        splitNumber: 4,
      },
      series: [
        {
          itemStyle: { color: palette.value.primary },
          data: [3000, 2000, 3333, 5000, 3200, 4200, 3200, 2100, 3000, 5100, 6000, 3200, 4800],
          type: 'bar',
          barMaxWidth: 80,
        },
      ],
    });
  };

  onMounted(updateChart);
  watch(palette, updateChart);
</script>
