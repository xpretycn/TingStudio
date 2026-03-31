<template>
  <div class="salesman-detail">
    <t-card bordered v-if="salesman">
      <template #header>
        <div class="detail-header">
          <div class="header-left">
            <t-button variant="text" @click="handleBack"><template #icon><t-icon name="chevron-left" /></template>返回</t-button>
            <span class="detail-title">业务员详情 - {{ salesman.name }}</span>
            <t-tag :theme="salesman.status === 'active' ? 'success' : 'default'" variant="light">{{ salesman.status === 'active' ? '活跃' : '停用' }}</t-tag>
          </div>
          <t-button variant="text" size="medium" @click="router.push(`/salesmen/${route.params.id}/edit`)">
            <template #icon><t-icon name="edit" /></template>
            编辑
          </t-button>
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
    display: flex; align-items: center; justify-content: space-between; width: 100%;
    .header-left { display: flex; align-items: center; gap: $space-3; }
    .detail-title { font-size: $font-size-h3; font-weight: $font-weight-semibold; color: $text-primary; }
  }
  :deep(.t-button) {
    transition: $transition-smooth !important;
    border-radius: $radius-xl !important; font-weight: $font-weight-semibold !important;
    &.t-button--theme-primary {
      background: $gradient-btn !important;
      border: none !important; color: $text-white !important;
      box-shadow: $shadow-brand !important;
      &:hover { transform: translateY(-2px); box-shadow: $shadow-lg !important; }
    }
  }
}
</style>
