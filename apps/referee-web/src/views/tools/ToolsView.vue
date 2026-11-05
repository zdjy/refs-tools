<script setup lang="ts">
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import ModuleList from '../../components/navigation/ModuleList.vue'
import LocalWorkbenchNotice from '../../components/navigation/LocalWorkbenchNotice.vue'
import UiGroupHeading from '../../components/ui/UiGroupHeading.vue'
import UiPageBanner from '../../components/ui/UiPageBanner.vue'
import { modules, toolEntries } from '../../navigation/modules'
import { moduleStatus, splitByAvailability } from '../../navigation/navigation.presentation'

// 可用的工具排在前面，建设中的放到下面，场边用户不必在不可用项之间翻找。
const { usable, planned } = splitByAvailability(toolEntries, modules)
</script>

<template>
  <NavigationShell>
    <UiPageBanner title="裁判工具" title-id="tools-title" description="场边记录与实用查询。可用工具无需登录，建设中的工具只展示后续范围。" :status="moduleStatus(modules.tools)" tone="available" />
    <section class="mt-8" aria-labelledby="tools-usable">
      <UiGroupHeading title="可使用" title-id="tools-usable" :count="usable.length" />
      <ModuleList :ids="usable" />
    </section>
    <section v-if="planned.length" class="mt-8" aria-labelledby="tools-planned">
      <UiGroupHeading title="建设中" title-id="tools-planned" :count="planned.length" />
      <ModuleList :ids="planned" />
    </section>
    <LocalWorkbenchNotice><p class="mt-3 mb-0">工具提示不替代裁判最终判断；规则参数由使用者明确配置，不代表完整复现某一竞赛规则体系。</p></LocalWorkbenchNotice>
  </NavigationShell>
</template>
