<script setup lang="ts">
import { ref, onMounted } from "vue"
import { getDbInfo, getTableList } from "@/api/db"
import type { DbInfo, TableInfo } from "@/api/db"
import DbInfoCards from "./DbInfoCards.vue"
import DbTableList from "./DbTableList.vue"

const dbInfo = ref<DbInfo | null>(null)
const tables = ref<TableInfo[]>([])
const loading = ref(false)

async function fetchData() {
  loading.value = true
  try {
    const [info, tableList] = await Promise.all([getDbInfo(), getTableList()])
    dbInfo.value = info
    tables.value = tableList
  } catch {
    // interceptor handles error
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

defineExpose({ refresh: fetchData })
</script>

<template>
  <div class="db-overview">
    <t-loading :loading="loading">
      <DbInfoCards v-if="dbInfo" :info="dbInfo" />
      <DbTableList :tables="tables" />
    </t-loading>
  </div>
</template>

<style lang="scss" scoped>
.db-overview {
  padding: 20px 0;
}
</style>
