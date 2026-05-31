<template>
  <t-config-provider :global-config="tdesignTokens">
    <div id="app-root">
      <router-view />
      <AiAssistantFloat />
    </div>
  </t-config-provider>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { getTDesignTokens } from '@/assets/styles/tokens'

const AiAssistantFloat = defineAsyncComponent(() => import('@/components/AiAssistantFloat/AiAssistantFloat.vue'))

const themeStore = useThemeStore()

const tdesignTokens = computed(() =>
  getTDesignTokens(themeStore.isDark as boolean, themeStore.brandColor)
)
</script>

<style scoped>
</style>
