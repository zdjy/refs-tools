<script setup lang="ts">
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import CommunityHero from './components/CommunityHero.vue'
import CommunityQuickTools from './components/CommunityQuickTools.vue'
import ThreadFeed from './components/ThreadFeed.vue'
import CommunitySidebar from './components/CommunitySidebar.vue'
</script>

<template>
  <NavigationShell>
    <CommunityHero />
    <CommunityQuickTools />
    <div class="grid min-w-0 items-start gap-8 tablet:grid-cols-[minmax(0,1fr)_280px] tablet:gap-10">
      <ThreadFeed />
      <CommunitySidebar />
    </div>
  </NavigationShell>
</template>
