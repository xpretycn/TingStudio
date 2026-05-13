<template>
  <t-config-provider :theme="themeStore.isDark ? 'dark' : 'light'" :t="tdesignTokens">
    <router-view v-bind="$attrs" />
    <AiAssistantFloat />
  </t-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { getTDesignTokens } from '@/assets/styles/tokens'
import { AiAssistantFloat } from '@/components/AiAssistantFloat'

const themeStore = useThemeStore()

const tdesignTokens = computed(() =>
  getTDesignTokens(themeStore.isDark as boolean, themeStore.brandColor)
)
</script>

<style scoped>
</style>
