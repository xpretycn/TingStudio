<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { formulaApi } from '@/api/formula';
import type { Formula } from '@/api/formula';
import { useNutritionStore } from '@/stores/nutrition';
import { useAuthStore } from '@/stores/auth';
import NutritionLabelTable from '@/components/nutrition/NutritionLabelTable.vue';
import MaterialContribution from '@/components/nutrition/MaterialContribution.vue';
import DataCoverageCard from '@/components/nutrition/DataCoverageCard.vue';
import NutritionClaimsCard from '@/components/nutrition/NutritionClaimsCard.vue';
import FortificationCheckCard from '@/components/nutrition/FortificationCheckCard.vue';
import AnalysisSummaryCard from '@/components/nutrition/AnalysisSummaryCard.vue';

const nutritionStore = useNutritionStore();
const authStore = useAuthStore();

const selectedFormulaId = ref('');
const analyzing = ref(false);
const allFormulas = ref<Formula[]>([]);
const formulasLoading = ref(false);
let disposed = false;

const availableFormulas = computed(() => {
  const user = authStore.user;
  if (!user || user.role === 'admin') return allFormulas.value;
  return allFormulas.value.filter(f => f.createdBy === user.id);
});

async function handleAnalyze() {
  if (!selectedFormulaId.value) {
    MessagePlugin.warning('请先选择配方');
    return;
  }
  analyzing.value = true;
  try {
    const result = await nutritionStore.analyzeFormula(selectedFormulaId.value);
    if (!result.success) {
      MessagePlugin.error(result.message || '分析失败');
    }
  } finally {
    analyzing.value = false;
  }
}

onMounted(async () => {
  formulasLoading.value = true;
  try {
    const res = await formulaApi.getList({ page: 1, pageSize: 999 });
    if (!disposed) {
      allFormulas.value = res.list;
    }
  } catch {
    if (!disposed) {
      MessagePlugin.error('获取配方列表失败');
    }
  } finally {
    formulasLoading.value = false;
  }
});

onBeforeUnmount(() => {
  disposed = true;
});
</script>

<template>
  <div class="nutrition-analysis-page">
    <div class="header-card">
      <div class="header-left">
        <h2 class="page-title">配方营养分析</h2>
        <p class="page-subtitle">基于 GB 28050 / GB 14880 国标，计算营养成分并判定含量声称与强化剂合规性</p>
      </div>
      <div class="header-right">
        <t-select v-model="selectedFormulaId" placeholder="选择配方" filterable clearable style="width: 280px"
          :popup-props="{ appendToBody: true }">
          <t-option v-for="f in availableFormulas" :key="f.id" :value="f.id" :label="`${f.name} (${f.salesmanName})`" />
        </t-select>
        <t-button theme="primary" :loading="analyzing" :disabled="!selectedFormulaId" @click="handleAnalyze">
          {{ analyzing ? '分析中...' : '开始分析' }}
        </t-button>
      </div>
    </div>

    <div v-if="nutritionStore.analysisResult" class="nutrition-content-card">
      <div class="analysis-grid">
        <!-- 分析摘要 -->
        <div class="grid-cell grid-cell--half">
          <AnalysisSummaryCard :summary="nutritionStore.analysisResult.summary" />
        </div>
        <!-- 数据覆盖 -->
        <div class="grid-cell grid-cell--half">
          <DataCoverageCard :coverage="nutritionStore.analysisResult.coverage" />
        </div>
        <!-- 营养成分表 -->
        <div class="grid-cell grid-cell--full">
          <t-card title="营养成分表" subtitle="GB 28050 格式">
            <NutritionLabelTable :items="nutritionStore.analysisResult.nutritionLabel?.items" />
          </t-card>
        </div>
        <!-- 营养成分表 -->
        <div class="grid-cell grid-cell--half">
          <NutritionClaimsCard :claims="nutritionStore.analysisResult.claims" />
        </div>
        <!-- 原料贡献分析 -->
        <div class="grid-cell grid-cell--half">
          <t-card title="原料贡献分析">
            <MaterialContribution :materials="nutritionStore.analysisResult.materialContributions" />
          </t-card>
        </div>

        <div v-if="nutritionStore.analysisResult.fortificationChecks?.length" class="grid-cell grid-cell--full">
          <FortificationCheckCard :checks="nutritionStore.analysisResult.fortificationChecks" />
        </div>
      </div>
    </div>

    <div v-else-if="!analyzing" class="nutrition-content-card">
      <div class="empty-state">
        <t-empty description="选择配方并点击「开始分析」查看营养分析结果" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/variables.scss' as *;

.nutrition-analysis-page {
  padding: $content-padding;
  animation: page-fade-in 0.4s ease;
}

@keyframes page-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.header-card {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: $space-4;
  padding: $space-6 $space-8;
  margin-bottom: $space-6;
  background: var(--color-bg-container);
  border-radius: var(--radius-4xl);
  border: 1px solid var(--color-bg-page);
  box-shadow: $shadow-elevation-1;
  background-image: linear-gradient(180deg, var(--color-bg-page) 0%, var(--color-bg-container) 100%);

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    padding: $space-5;
    border-radius: var(--radius-3xl);
  }

  .header-left {
    flex: 1;
    min-width: 240px;

    .page-title {
      font-size: $font-size-h1;
      font-weight: $font-weight-bold;
      letter-spacing: $ls-display;
      color: var(--color-text-primary);
      margin: 0 0 $space-1 0;
    }

    .page-subtitle {
      font-size: $font-size-body;
      color: var(--color-text-placeholder);
      margin: 0;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: $space-3;
    flex-shrink: 0;

    @media (max-width: 768px) {
      width: 100%;

      :deep(.t-select) {
        flex: 1;
        min-width: 0;
      }
    }
  }
}

.nutrition-content-card {
  background: var(--color-bg-container);
  border-radius: var(--radius-4xl);
  border: 1px solid var(--color-bg-page);
  box-shadow: $shadow-elevation-1;
  overflow: hidden;
  transition: box-shadow $transition-slow;

  &:hover {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 640px) {
    border-radius: var(--radius-3xl);
  }
}

.analysis-grid {
  padding: $space-6;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-6;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: $space-4;
    gap: $space-4;
  }
}

.grid-cell {
  min-width: 0;

  &--half {
    grid-column: span 1;
  }

  &--full {
    grid-column: 1 / -1;
  }

  > :deep(.t-card) {
    border-radius: var(--radius-xl);
    border: 1px solid var(--color-border-light);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    transition: box-shadow $transition-normal;
    height: 100%;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .t-card__body {
      padding: $space-4 + $space-1-5;
    }
  }
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  padding: $space-6;
}
</style>
