<template>
  <div class="version-compare">
    <t-card bordered>
      <template #header>
        <div class="page-header">
          <t-button variant="text" @click="handleBack"><template #icon><t-icon name="chevron-left" /></template>返回版本</t-button>
          <span class="page-title">版本对比</span>
        </div>
      </template>

      <div class="compare-controls">
        <t-form layout="inline" @submit="doCompare">
          <t-form-item label="版本A">
            <t-select v-model="versionA" placeholder="选择版本A" clearable style="width: 220px">
              <t-option v-for="v in versions" :key="v.versionId" :value="v.versionId" :label="`${v.versionNumber} - ${v.versionName || ''}`" />
            </t-select>
          </t-form-item>
          <t-form-item label="版本B">
            <t-select v-model="versionB" placeholder="选择版本B" clearable style="width: 220px">
              <t-option v-for="v in versions" :key="v.versionId" :value="v.versionId" :label="`${v.versionNumber} - ${v.versionName || ''}`" />
            </t-select>
          </t-form-item>
          <t-form-item>
            <t-button theme="primary" type="submit" :disabled="!versionA || !versionB">开始对比</t-button>
          </t-form-item>
        </t-form>
      </div>

      <div v-if="compareResult" class="compare-result">
        <!-- 对比摘要 -->
        <div class="diff-summary">
          <t-card size="small" bordered>
            <div class="summary-stats">
              <div class="stat-item"><span class="stat-value">{{ compareResult.summary.totalChanges }}</span><span class="stat-label">总变更</span></div>
              <div class="stat-item stat-add"><span class="stat-value">{{ compareResult.summary.addedCount }}</span><span class="stat-label">新增</span></div>
              <div class="stat-item stat-modify"><span class="stat-value">{{ compareResult.summary.modifiedCount }}</span><span class="stat-label">修改</span></div>
              <div class="stat-item stat-delete"><span class="stat-value">{{ compareResult.summary.deletedCount }}</span><span class="stat-label">删除</span></div>
            </div>
          </t-card>
        </div>

        <!-- 差异详情 -->
        <t-table :data="compareResult.differences" :columns="diffColumns" row-key="fieldId" hover stripe size="small">
          <template #fieldType="{ row }">
            <t-tag size="small" :theme="fieldTypeTheme(row.fieldType)">{{ fieldTypeLabel(row.fieldType) }}</t-tag>
          </template>
          <template #changeType="{ row }">
            <t-tag size="small" :theme="changeTypeTheme(row.changes.changeType)">{{ changeTypeLabel(row.changes.changeType) }}</t-tag>
          </template>
          <template #oldValue="{ row }">
            <span :class="{ 'value-deleted': row.changes.changeType === 'delete' }">{{ row.changes.oldValue ?? '-' }}</span>
          </template>
          <template #newValue="{ row }">
            <span :class="{ 'value-added': row.changes.changeType === 'add' }">{{ row.changes.newValue ?? '-' }}</span>
          </template>
          <template #empty><t-empty description="两个版本没有差异" /></template>
        </t-table>
      </div>
      <t-empty v-else-if="hasCompared" description="两个版本没有差异" />
      <t-empty v-else description="请选择两个版本进行对比" />
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useVersionStore } from '@/stores/version'
import { MessagePlugin } from 'tdesign-vue-next'

const router = useRouter()
const route = useRoute()
const versionStore = useVersionStore()

const formulaId = route.params.formulaId as string
const versions = ref<any[]>([])
const versionA = ref('')
const versionB = ref('')
const compareResult = ref<any>(null)
const hasCompared = ref(false)

const diffColumns = [
  { colKey: 'fieldLabel', title: '字段', width: 180 },
  { colKey: 'fieldType', title: '类型', width: 100 },
  { colKey: 'changeType', title: '变更', width: 80 },
  { colKey: 'oldValue', title: '旧值', ellipsis: true },
  { colKey: 'newValue', title: '新值', ellipsis: true }
]

const fieldTypeTheme = (t: string) => t === 'material' ? 'primary' : t === 'customer' ? 'warning' : 'default'
const fieldTypeLabel = (t: string) => ({ customer: '客户', material: '原料', materialQuantity: '数量', description: '描述', nutrition: '营养' }[t] || t)
const changeTypeTheme = (t: string) => t === 'add' ? 'success' : t === 'delete' ? 'danger' : 'warning'
const changeTypeLabel = (t: string) => t === 'add' ? '新增' : t === 'delete' ? '删除' : '修改'

const handleBack = () => router.push(`/versions/formula/${formulaId}`)

const doCompare = async () => {
  if (!versionA.value || !versionB.value) return
  const result = await versionStore.compareVersions(formulaId, versionA.value, versionB.value)
  hasCompared.value = true
  if (result.success) {
    compareResult.value = result.data
  } else {
    MessagePlugin.error(result.message || '对比失败')
  }
}

onMounted(async () => {
  await versionStore.fetchVersions(formulaId)
  versions.value = versionStore.versions
  // 默认选最后两个版本
  if (versions.value.length >= 2) {
    versionB.value = versions.value[0].versionId
    versionA.value = versions.value[1].versionId
  }
})
</script>

<style scoped lang="scss">
.version-compare {
  .page-header { display: flex; align-items: center; gap: 12px; .page-title { font-size: 16px; font-weight: 600; color: #5D4E60; } }
  .compare-controls { margin-bottom: 20px; }
  .diff-summary { margin-bottom: 20px;
    .summary-stats { display: flex; gap: 24px; padding: 12px 0;
      .stat-item { text-align: center;
        .stat-value { display: block; font-size: 28px; font-weight: 700; color: #5D4E60; }
        .stat-label { font-size: 12px; color: #9B8FA0; }
        &.stat-add .stat-value { color: #2BA471; }
        &.stat-modify .stat-value { color: #E37318; }
        &.stat-delete .stat-value { color: #E34D59; }
      }
    }
  }
  .value-added { color: #2BA471; font-weight: 600; }
  .value-deleted { color: #E34D59; text-decoration: line-through; }
  :deep(.t-button) {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
    border-radius: 12px !important; font-weight: 600 !important;
    &.t-button--theme-primary {
      background: linear-gradient(135deg, #FF8FAB, #FF6B8A) !important;
      border: none !important; color: #fff !important;
    }
  }
}
</style>
