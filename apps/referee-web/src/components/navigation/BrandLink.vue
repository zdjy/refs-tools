<script setup lang="ts">
import { RouterLink } from 'vue-router'
import brandLockup from '../../assets/brand/lockup-compact.png'

/** 各页顶栏共用的品牌入口；文字由图片 alt 提供，避免登录页、404 与工作台各自拼一个「R」圆标。 */
withDefaults(defineProps<{ label?: string }>(), { label: '裁判工具箱' })
</script>

<template>
  <RouterLink to="/" class="inline-flex min-h-11 shrink-0 items-center no-underline"><img :src="brandLockup" :alt="label" class="h-8 w-auto tablet:h-10" /></RouterLink>
</template>
