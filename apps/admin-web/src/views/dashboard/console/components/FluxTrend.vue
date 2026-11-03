<template>
  <div ref="chartRef" :style="{ height, width }"></div>
</template>
<script lang="ts" setup>
  import { computed, onMounted, ref, Ref, watch } from 'vue';
  import { getAdminPalette } from '@/settings/uiPalette';
  import { useDesignSettingStore } from '@/store/modules/designSetting';

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
      xAxis: {
        type: 'category',
        axisLabel: { color: palette.value.body },
        axisLine: { lineStyle: { color: palette.value.line } },
        boundaryGap: false,
        data: [
          '6:00',
          '7:00',
          '8:00',
          '9:00',
          '10:00',
          '11:00',
          '12:00',
          '13:00',
          '14:00',
          '15:00',
          '16:00',
          '17:00',
          '18:00',
          '19:00',
          '20:00',
          '21:00',
          '22:00',
          '23:00',
        ],
        splitLine: {
          show: true,
          lineStyle: {
            width: 1,
            type: 'solid',
            color: palette.value.line,
          },
        },
        axisTick: {
          show: false,
        },
      },
      yAxis: [
        {
          type: 'value',
          axisLabel: { color: palette.value.muted },
          axisLine: { lineStyle: { color: palette.value.line } },
          max: 80000,
          splitNumber: 4,
          axisTick: {
            show: false,
          },
          splitArea: {
            show: true,
            areaStyle: {
              color: [palette.value.surface, palette.value.surfaceMuted],
            },
          },
        },
      ],
      grid: { left: '1%', right: '1%', top: '2  %', bottom: 0, containLabel: true },
      series: [
        {
          smooth: true,
          data: [
            111, 222, 4000, 18000, 33333, 55555, 66666, 33333, 14000, 36000, 66666, 44444, 22222,
            11111, 4000, 2000, 500, 333, 222, 111,
          ],
          type: 'line',
          areaStyle: {},
          itemStyle: {
            color: palette.value.primary,
          },
        },
        {
          smooth: true,
          data: [
            33, 66, 88, 333, 3333, 5000, 18000, 3000, 1200, 13000, 22000, 11000, 2221, 1201, 390,
            198, 60, 30, 22, 11,
          ],
          type: 'line',
          areaStyle: {},
          itemStyle: {
            color: palette.value.success,
          },
        },
      ],
    });
  };

  onMounted(updateChart);
  watch(palette, updateChart);
</script>
