<script setup lang="ts">
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import LocalWorkbenchNotice from '../../components/navigation/LocalWorkbenchNotice.vue'
import { editorialNotice } from '../../content/editorial'
import FeaturedStory from './components/FeaturedStory.vue'
import LearningStories from './components/LearningStories.vue'
import CommunityStories from './components/CommunityStories.vue'
import ModuleDirectory from './components/ModuleDirectory.vue'
</script>

<template>
  <NavigationShell>
    <header class="mb-6 flex flex-wrap items-end justify-between gap-3 compact:mb-8">
      <div><h1 class="m-0 text-2xl font-bold tracking-tight text-ink compact:text-3xl">裁判手记</h1><p class="mt-2 mb-0 text-sm text-body">学习、交流与场边实践，在这里接上下一步。</p></div>
      <p class="m-0 hidden text-xs text-body compact:block">以规则为依据，以观察为起点。</p>
    </header>
    <FeaturedStory />
    <LearningStories />
    <CommunityStories />
    <p class="mt-6 mb-0 text-xs leading-relaxed text-body">{{ editorialNotice }}</p>
    <ModuleDirectory />
    <LocalWorkbenchNotice />
  </NavigationShell>
</template>
