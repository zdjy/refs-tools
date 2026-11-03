<script setup lang="ts">
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import LocalWorkbenchNotice from '../../components/navigation/LocalWorkbenchNotice.vue'
import { editorialNotice } from '../../content/editorial'
import HomeHero from './components/HomeHero.vue'
import KeywordBand from './components/KeywordBand.vue'
import ArticleIndex from './components/ArticleIndex.vue'
import GuideRail from './components/GuideRail.vue'
import ThreadFeed from './components/ThreadFeed.vue'
import GlossaryGrid from './components/GlossaryGrid.vue'
import PregameChecklist from './components/PregameChecklist.vue'
import ClosingPanel from './components/ClosingPanel.vue'
import ModuleDirectory from './components/ModuleDirectory.vue'
</script>

<template>
  <NavigationShell>
    <HomeHero />
    <KeywordBand />
    <ArticleIndex />
    <GuideRail />
    <ThreadFeed />
    <GlossaryGrid />
    <PregameChecklist />
    <ClosingPanel />
    <p class="mt-8 mb-0 text-xs leading-relaxed text-body">{{ editorialNotice }}</p>
    <ModuleDirectory />
    <LocalWorkbenchNotice />
  </NavigationShell>
</template>
