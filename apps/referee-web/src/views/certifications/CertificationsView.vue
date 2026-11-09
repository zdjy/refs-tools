<script setup lang="ts">
import NavigationShell from '../../components/navigation/NavigationShell.vue'
import UiPageBanner from '../../components/ui/UiPageBanner.vue'
import CertificationPanel from '../../features/certifications/CertificationPanel.vue'
</script>

<template>
  <NavigationShell>
    <div class="mx-auto grid max-w-[1080px] gap-8">
      <UiPageBanner title="平台认证" title-id="certifications-title" tone="available" status="可使用"
        description="由平台独立审核的裁判资质，可跨组织使用。" />
      <CertificationPanel :scope="{ type: 'platform', organizationId: null }" />
    </div>
  </NavigationShell>
</template>
