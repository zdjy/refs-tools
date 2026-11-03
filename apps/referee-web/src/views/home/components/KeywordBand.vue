<script setup lang="ts">
import UiMarquee from '../../../components/ui/motion/UiMarquee.vue'
import { keywordBand } from '../home.presentation'
</script>

<template>
  <section class="mt-6 border-0 border-y border-solid border-line py-5 compact:mt-8 compact:py-7" aria-label="本期主题关键词">
    <UiMarquee :items="keywordBand" label="本期主题关键词" />
  </section>
</template>
