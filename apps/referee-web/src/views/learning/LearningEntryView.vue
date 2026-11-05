<script setup lang="ts">
import { RouterLink } from 'vue-router'
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import ModuleList from '../../components/navigation/ModuleList.vue'
import UiGroupHeading from '../../components/ui/UiGroupHeading.vue'
import UiPageBanner from '../../components/ui/UiPageBanner.vue'
import { learningEntries } from '../../navigation/modules'
</script>

<template>
  <NavigationShell>
    <UiPageBanner title="学习中心" title-id="learning-title" description="学习资料模块尚未开放，当前无法浏览资料、收藏或记录学习进度。后续将提供规则资料、图文与音视频、收藏及最近访问。" status="建设中" />
    <section class="mt-8" aria-labelledby="learning-entries">
      <UiGroupHeading title="学习与备考入口" title-id="learning-entries" :count="learningEntries.length" />
      <p class="mt-0 mb-3 px-4 text-sm leading-[1.7] text-body">以下模块均在建设中，可进入查看功能范围；目前不提供作答、考试报名或成绩查询。序号表示建议的学习顺序。</p>
      <ModuleList :ids="learningEntries" numbered />
    </section>
    <RouterLink to="/" class="mt-8 inline-flex min-h-11 min-w-11 items-center rounded-full bg-soft px-5 text-sm font-medium text-ink no-underline transition-colors duration-200 hover:bg-sand active:scale-95">返回社区</RouterLink>
  </NavigationShell>
</template>
