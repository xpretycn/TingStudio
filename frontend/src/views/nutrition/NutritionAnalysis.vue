<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { formulaApi } from '@/api/formula'
import type { Formula } from '@/api/formula'
import { useNutritionStore } from '@/stores/nutrition'
import { useAuthStore } from '@/stores/auth'
import NutritionLabelTable from '@/components/nutrition/NutritionLabelTable.vue'
import MaterialContribution from '@/components/nutrition/MaterialContribution.vue'
import DataCoverageCard from '@/components/nutrition/DataCoverageCard.vue'
import NutritionClaimsCard from '@/components/nutrition/NutritionClaimsCard.vue'
import FortificationCheckCard from '@/components/nutrition/FortificationCheckCard.vue'
import AnalysisSummaryCard from '@/components/nutrition/AnalysisSummaryCard.vue'

const nutritionStore = useNutritionStore()
const authStore = useAuthStore()

const selectedFormulaId = ref('')
const analyzing = ref(false)
const allFormulas = ref<Formula[]>([])
const formulasLoading = ref(false)
let disposed = false

const availableFormulas = computed(() => {
  const user = authStore.user
  if (!user || user.role === 'admin') return allFormulas.value
  return allFormulas.value.filter(f => f.createdBy === user.id)
})

async function handleAnalyze() {
  if (!selectedFormulaId.value) {
    MessagePlugin.warning('请先选择配方')
    return
  }
  analyzing.value = true
  try {
    const result = await nutritionStore.analyzeFormula(selectedFormulaId.value)
    if (!result.success) {
      MessagePlugin.error(result.message || '分析失败')
    }
  } finally {
    analyzing.value = false
  }
}

onMounted(async () => {
  formulasLoading.value = true
  try {
    const res = await formulaApi.getList({ page: 1, pageSize: 999 })
    if (!disposed) {
      allFormulas.value = res.list
    }
  } catch {
    if (!disposed) {
      MessagePlugin.error('获取配方列表失败')
    }
  } finally {
    formulasLoading.value = false
  }
})

onBeforeUnmount(() => {
  disposed = true
})
</script>

<template>
  <div class="nutrition-analysis-page">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">配方营养分析</h2>
        <p class="page-subtitle">基于 GB 28050 / GB 14880 国标，计算营养成分并判定含量声称与强化剂合规性</p>
      </div>
      <div class="header-right">
        <t-select
          v-model="selectedFormulaId"
          placeholder="选择配方"
          filterable
          clearable
          style="width: 280px"
          :popup-props="{ appendToBody: true }"
        >
          <t-option
            v-for="f in availableFormulas"
            :key="f.id"
            :value="f.id"
            :label="`${f.name} (${f.salesmanName})`"
          />
        </t-select>
        <t-button
          theme="primary"
          :loading="analyzing"
          :disabled="!selectedFormulaId"
          @click="handleAnalyze"
        >
          {{ analyzing ? '分析中...' : '开始分析' }}
        </t-button>
      </div>
    </div>

    <div v-if="nutritionStore.analysisResult" class="analysis-results">
      <div class="summary-section">
        <AnalysisSummaryCard :summary="nutritionStore.analysisResult.summary" />
      </div>

      <div class="coverage-section">
        <DataCoverageCard :coverage="nutritionStore.analysisResult.coverage" />
      </div>

      <div class="label-section">
        <t-card title="营养成分表" subtitle="GB 28050 格式" bordered>
          <NutritionLabelTable :items="nutritionStore.analysisResult.nutritionLabel?.items" />
        </t-card>
      </div>

      <div class="claims-section">
        <NutritionClaimsCard :claims="nutritionStore.analysisResult.claims" />
      </div>

      <div class="contribution-section">
        <t-card title="原料贡献分析" bordered>
          <MaterialContribution :materials="nutritionStore.analysisResult.materialContributions" />
        </t-card>
      </div>

      <div v-if="nutritionStore.analysisResult.fortificationChecks?.length" class="fortification-section">
        <FortificationCheckCard :checks="nutritionStore.analysisResult.fortificationChecks" />
      </div>
    </div>

    <div v-else-if="!analyzing" class="empty-state">
      <t-empty description="选择配方并点击「开始分析」查看营养分析结果" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.nutrition-analysis-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;

  .header-left {
    .page-title {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 4px 0;
    }
    .page-subtitle {
      font-size: 14px;
      color: var(--td-text-color-secondary);
      margin: 0;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
}

.analysis-results {
  display: flex;
  flex-direction: column;
}

.summary-section,
.coverage-section,
.label-section,
.claims-section,
.contribution-section,
.fortification-section {
  margin-bottom: 20px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}
</style>
