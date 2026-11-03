<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import LocalWorkbenchNotice from '../../components/navigation/LocalWorkbenchNotice.vue'
import { editorialNotice } from '../../content/editorial'
import FeaturedStory from './components/FeaturedStory.vue'
import LearningStories from './components/LearningStories.vue'
import CommunityStories from './components/CommunityStories.vue'
import ModuleDirectory from './components/ModuleDirectory.vue'
import ResourceShelf from './components/ResourceShelf.vue'
import PregameChecklist from './components/PregameChecklist.vue'
import { modules } from '../../navigation/modules'
</script>

<template>
  <NavigationShell>
    <header class="mb-6 flex flex-wrap items-end justify-between gap-4 compact:mb-8">
      <div>
        <h1 class="m-0 text-2xl font-bold tracking-tight text-ink compact:text-3xl">裁判手记</h1>
        <p class="mt-2 mb-0 text-sm text-body">在场下读懂比赛，在场上看清细节。</p>
      </div>
      <div>
        <RouterLink :to="modules.workbench.path" class="inline-flex min-h-11 items-center gap-3 rounded-full border border-solid border-line bg-surface px-5 py-2 text-sm font-medium text-ink no-underline transition-all duration-300 ease-[cubic-bezier(.25,.1,.25,1)] hover:border-body hover:bg-soft active:scale-95">进入场边工作台<ArrowUpRight class="size-4" aria-hidden="true" /></RouterLink>
        <p class="mt-2 mb-0 text-xs text-body">无需登录，记录仅存当前设备</p>
      </div>
    </header>
    <FeaturedStory />
    <div class="mt-10 grid grid-cols-[minmax(0,1fr)] items-start gap-7 compact:mt-14 tablet:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] tablet:gap-8">
      <CommunityStories />
      <ResourceShelf />
    </div>
    <LearningStories />
    <PregameChecklist />
    <p class="mt-6 mb-0 text-xs leading-relaxed text-body">{{ editorialNotice }}</p>
    <ModuleDirectory />
    <LocalWorkbenchNotice />
  </NavigationShell>
</template>
