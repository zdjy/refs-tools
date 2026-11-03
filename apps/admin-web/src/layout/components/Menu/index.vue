<template>
  <nav aria-label="管理端主导航">
    <NMenu
      :options="menus"
      :inverted="false"
      mode="vertical"
      :collapsed="collapsed"
      :collapsed-width="64"
      :collapsed-icon-size="20"
      :indent="16"
      :expanded-keys="openKeys"
      :value="getSelectedKeys"
      @update:value="clickMenuItem"
      @update:expanded-keys="menuExpanded"
    />
    <a v-if="!collapsed" href="/" class="mx-4 mt-4 flex min-h-[44px] items-center text-sm text-body hover:text-red">返回裁判端</a>
  </nav>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { NMenu } from 'naive-ui'
import { useRoute, useRouter } from 'vue-router'
import { createMenuOptions } from './menu.presentation'

defineProps<{ collapsed?: boolean }>()
const emit = defineEmits<{ clickMenuItem: [key: string] }>()
const currentRoute = useRoute()
const router = useRouter()
const selectedKeys = ref(currentRoute.path)
const openKeys = ref<string[]>([])
const menus = createMenuOptions(key => emit('clickMenuItem', key))
const getSelectedKeys = computed(() => selectedKeys.value)
watch(() => currentRoute.fullPath, () => { selectedKeys.value = currentRoute.path })
function clickMenuItem(key: string) {
  void router.push(key)
  emit('clickMenuItem', key)
}
function menuExpanded(keys: string[]) { openKeys.value = keys }
</script>
