<template>
  <div class="salesman-detail">
    <t-card bordered v-if="salesman">
      <template #header>
        <div class="detail-header">
          <t-button variant="text" @click="handleBack"><template #icon><t-icon name="chevron-left" /></template>返回</t-button>
          <span class="detail-title">业务员详情 - {{ salesman.name }}</span>
          <t-tag :theme="salesman.status === 'active' ? 'success' : 'default'" variant="light">{{ salesman.status === 'active' ? '活跃' : '停用' }}</t-tag>
        </div>
      </template>

      <t-descriptions :column="2" bordered>
        <t-descriptions-item label="姓名">{{ salesman.name }}</t-descriptions-item>
        <t-descriptions-item label="工号">{{ salesman.code }}</t-descriptions-item>
        <t-descriptions-item label="部门">{{ salesman.department || '-' }}</t-descriptions-item>
        <t-descriptions-item label="电话">{{ salesman.phone || '-' }}</t-descriptions-item>
        <t-descriptions-item label="邮箱">{{ salesman.email || '-' }}</t-descriptions-item>
        <t-descriptions-item label="创建时间">{{ salesman.createdAt }}</t-descriptions-item>
      </t-descriptions>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSalesmanStore } from '@/stores/salesman'

const router = useRouter()
const route = useRoute()
const salesmanStore = useSalesmanStore()

const salesman = ref<any>(null)

const handleBack = () => router.push('/salesmen')

const loadData = async () => {
  salesman.value = await salesmanStore.getSalesman(route.params.id as string)
}

onMounted(() => { loadData() })
</script>

<style scoped lang="scss">
.salesman-detail {
  .detail-header {
    display: flex; align-items: center; gap: 12px;
    .detail-title { font-size: 16px; font-weight: 600; color: #5D4E60; }
  }
}
</style>
