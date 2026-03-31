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
import { ref, computed, onMounted } from 'vue'
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

const selectedVersionA = computed(() => {
  if (!versionA.value) return null
  return versions.value.find(v => v.versionId === versionA.value) || null
})
const selectedVersionB = computed(() => {
  if (!versionB.value) return null
  return versions.value.find(v => v.versionId === versionB.value) || null
})

const diffColumns = computed(() => {
  const labelA = selectedVersionA.value ? `${selectedVersionA.value.versionNumber} - ${selectedVersionA.value.versionName || ''}` : '旧值'
  const labelB = selectedVersionB.value ? `${selectedVersionB.value.versionNumber} - ${selectedVersionB.value.versionName || ''}` : '新值'
  return [
    { colKey: 'fieldLabel', title: '字段', width: 180 },
    { colKey: 'fieldType', title: '类型', width: 100 },
    { colKey: 'changeType', title: '变更', width: 80 },
    { colKey: 'oldValue', title: labelA, ellipsis: true },
    { colKey: 'newValue', title: labelB, ellipsis: true }
  ]
})

const fieldTypeTheme = (t: string) => {
  if (t === 'material' || t === 'materialQuantity') return 'primary'
  if (t === 'salesman' || t === 'formula') return 'warning'
  if (t === 'param') return 'success'
  if (t === 'description') return 'default'
  return 'default'
}
const fieldTypeLabel = (t: string) => ({ salesman: '业务员', formula: '配方', material: '原料', materialQuantity: '数量', param: '参数', description: '描述', nutrition: '营养' }[t] || t)
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
  .page-header { display: flex; align-items: center; gap: $space-3; .page-title { font-size: $font-size-h3; font-weight: $font-weight-semibold; color: $text-primary; } }
  .compare-controls { margin-bottom: $space-5; }
  .diff-summary { margin-bottom: $space-5;
    .summary-stats { display: flex; gap: $space-6; padding: $space-3 0;
      .stat-item { text-align: center;
        .stat-value { display: block; font-size: $font-size-display; font-weight: $font-weight-bold; color: $text-primary; }
        .stat-label { font-size: $font-size-caption; color: $text-secondary; }
        &.stat-add .stat-value { color: $color-success; }
        &.stat-modify .stat-value { color: $color-warning; }
        &.stat-delete .stat-value { color: $color-danger; }
      }
    }
  }
  .value-added { color: $color-success; font-weight: $font-weight-semibold; }
  .value-deleted { color: $color-danger; text-decoration: line-through; }
  :deep(.t-button) {
    transition: $transition-smooth !important;
    border-radius: $radius-xl !important; font-weight: $font-weight-semibold !important;
    &.t-button--theme-primary {
      background: $gradient-btn !important;
      border: none !important; color: $text-white !important;
    }
  }
}
</style>
