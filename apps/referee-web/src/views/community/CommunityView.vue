<script setup lang="ts">
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import CommunityHero from './components/CommunityHero.vue'
import ThreadFeed from './components/ThreadFeed.vue'
import CommunitySidebar from './components/CommunitySidebar.vue'
</script>

<template>
  <NavigationShell>
    <CommunityHero />
    <div class="grid min-w-0 items-start gap-6 tablet:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px]">
      <ThreadFeed />
      <CommunitySidebar />
    </div>
  </NavigationShell>
</template>
