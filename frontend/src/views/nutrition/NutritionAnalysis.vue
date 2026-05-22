<template>
  <div class="nutrition-analysis" :aria-busy="!initialized">

    <!-- 数据中心 -->
    <section class="dashboard-grid">
      <div v-for="(card, idx) in dashboardCards" :key="card.label" class="stat-card"
        :style="{ animationDelay: `${(idx + 1) * 0.1}s` }">
        <div class="stat-card-top">
          <div class="stat-icon" :style="{ background: card.iconBg, color: card.iconColor }">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" v-html="card.iconPath"></svg>
          </div>
          <span class="stat-badge" :style="{ color: card.badgeColor, background: card.badgeBg }">{{ card.badge }}</span>
        </div>
        <p class="stat-label">{{ card.label }}</p>
        <p class="stat-value">{{ card.value }} <small class="stat-unit">{{ card.unit }}</small></p>
      </div>
    </section>
    <!-- 营养分析 -->
    <Transition name="content-fade" mode="out-in">
      <PageSkeleton v-if="!initialized" type="cards" :rows="3" />
      <div v-else class="main-content-wrapper">
        <t-card class="content-card content-card--selector" bordered>
          <div class="data-center-toolbar">
            <div class="toolbar-left-section">
              <div class="toolbar-title-section">
                <h3 class="toolbar-title">配方营养分析</h3>
                <p class="toolbar-subtitle">选择配方与营养标准，计算营养成分并进行合规检查</p>
              </div>
            </div>
            <div class="toolbar-right-section">
              <t-select v-model="analysisForm.formulaId" placeholder="选择配方" filterable clearable style="width: 260px"
                :popup-props="{ appendToBody: true }">
                <t-option v-for="f in formulaStore.formulas" :key="f.id" :value="f.id"
                  :label="`${f.name} (${f.salesmanName})`" />
              </t-select>
              <t-select v-model="analysisForm.profileId" placeholder="营养标准（可选）" clearable style="width: 200px"
                :popup-props="{ appendToBody: true }">
                <t-option v-for="p in nutritionStore.profiles" :key="p.profileId" :value="p.profileId"
                  :label="`${p.name} (${categoryLabel(p.category)})`" />
              </t-select>
              <button class="add-formula-btn" @click.prevent="handleAnalyze"
                :disabled="analyzing || !analysisForm.formulaId">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                {{ analyzing ? '计算中...' : '开始分析' }}
              </button>
            </div>
          </div>
        </t-card>

        <t-card v-if="nutritionStore.formulaNutrition && analysisForm.formulaId"
          class="content-card content-card--result" bordered>
          <template #header>
            <div class="result-header">
              <h4 class="result-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                营养成分计算结果
              </h4>
              <t-tag theme="success" variant="light" size="medium">计算完成</t-tag>
            </div>
          </template>

          <t-descriptions :column="2" bordered size="medium" title="配方信息">
            <t-descriptions-item label="配方名称">{{ nutritionStore.formulaNutrition.formulaName }}</t-descriptions-item>
            <t-descriptions-item label="总重量">{{ nutritionStore.formulaNutrition.totalWeight ?? '-' }}
              g</t-descriptions-item>
          </t-descriptions>

          <div class="core-nutrition-section">
            <h4 class="section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              核心营养素（每100g）
            </h4>
            <div class="nutrition-cards">
              <div v-for="card in coreNutritionCards" :key="card.key" class="nutrition-card" :class="card.statusClass">
                <div class="card-header">
                  <div class="card-icon" :style="{ background: card.iconBg }">
                    <t-icon :name="card.icon" size="24px" />
                  </div>
                  <div class="card-title">{{ card.label }}</div>
                </div>
                <div class="card-value">
                  <span class="value-number">{{ card.value }}</span>
                  <span class="value-unit">{{ card.unit }}</span>
                </div>
                <div class="card-progress">
                  <div class="progress-header">
                    <span class="nrv-label">NRV占比</span>
                    <span class="nrv-percent" :style="{ color: card.progressColor }">{{ card.nrvPercent }}%</span>
                  </div>
                  <t-progress :percentage="card.nrvPercent" :color="card.progressColor" :stroke-width="8"
                    :show-label="false" />
                </div>
              </div>
            </div>
          </div>

          <div v-if="materialBreakdown.length" class="contribution-section">
            <h4 class="section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                <path d="M22 12A10 10 0 0 0 12 2v10z" />
              </svg>
              原料营养贡献明细
            </h4>
            <t-table :data="materialBreakdown" :columns="contributionColumns" row-key="materialId" size="small" bordered
              max-height="400">
              <template #materialName="{ row }">
                <div class="material-name-cell">
                  <span>{{ row.materialName }}</span>
                  <t-tag v-if="row.noNutritionData" theme="danger" variant="light" size="small">缺营养数据</t-tag>
                </div>
              </template>
              <template #percentage="{ row }">
                <div class="percentage-cell">
                  <span class="percentage-value">{{ row.percentage }}%</span>
                  <t-progress :percentage="row.percentage" color="var(--color-primary)" :stroke-width="6" :show-label="false"
                    style="width: 60px; margin-left: 8px;" />
                </div>
              </template>
              <template #nutritionContribution="{ row }">
                <t-popup placement="left" :disabled="!row.hasNutritionData">
                  <template #content>
                    <div class="nutrition-popup">
                      <div v-for="item in row.nutritionDetails" :key="item.key" class="nutrition-item">
                        <span class="item-label">{{ item.label }}:</span>
                        <span class="item-value">{{ item.value }} {{ item.unit }}</span>
                      </div>
                    </div>
                  </template>
                  <button class="table-action-btn table-action-btn--primary" :disabled="!row.hasNutritionData">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <line x1="4" y1="21" x2="4" y2="14" />
                      <line x1="4" y1="10" x2="4" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12" y2="3" />
                      <line x1="20" y1="21" x2="20" y2="16" />
                      <line x1="20" y1="12" x2="20" y2="3" />
                      <line x1="1" y1="14" x2="7" y2="14" />
                      <line x1="9" y1="8" x2="15" y2="8" />
                      <line x1="17" y1="16" x2="23" y2="16" />
                    </svg>详情
                  </button>
                </t-popup>
              </template>
            </t-table>
          </div>

          <div class="nutrition-table-section">
            <h4 class="section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              完整营养成分
            </h4>
            <t-table :data="nutritionDataList" :columns="nutritionColumns" row-key="nutrient" size="small" bordered>
              <template #value="{ row }">
                <span :class="{ 'over-limit': row.overLimit }">{{ row.value }}</span>
              </template>
            </t-table>
          </div>
        </t-card>

        <t-card v-if="nutritionStore.complianceResult" class="content-card content-card--compliance" bordered>
          <template #header>
            <div class="result-header">
              <h4 class="result-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  :stroke="nutritionStore.complianceResult.summary?.failed === 0 ? 'var(--color-primary)' : 'var(--color-warning)'"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                合规检查结果
              </h4>
              <t-tag :theme="nutritionStore.complianceResult.summary?.failed === 0 ? 'success' : 'warning'"
                variant="light" size="medium">检查完成</t-tag>
            </div>
          </template>
          <div class="compliance-summary">
            <div class="summary-item pass">
              <div class="summary-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div class="summary-content">
                <span class="summary-count">{{ nutritionStore.complianceResult.summary?.passed || 0 }}</span>
                <span class="summary-label">达标</span>
              </div>
            </div>
            <div class="summary-item warning">
              <div class="summary-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div class="summary-content">
                <span class="summary-count">{{ nutritionStore.complianceResult.summary?.warnings || 0 }}</span>
                <span class="summary-label">警告</span>
              </div>
            </div>
            <div class="summary-item fail">
              <div class="summary-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <div class="summary-content">
                <span class="summary-count">{{ nutritionStore.complianceResult.summary?.failed || 0 }}</span>
                <span class="summary-label">超标</span>
              </div>
            </div>
          </div>
          <t-alert :theme="nutritionStore.complianceResult.summary?.failed === 0 ? 'success' : 'warning'"
            :message="nutritionStore.complianceResult.summary?.failed === 0 ? '配方符合所选营养标准要求' : `配方有 ${nutritionStore.complianceResult.summary?.failed} 项指标不达标`"
            style="margin-bottom: 12px;" />
          <t-table v-if="nutritionStore.complianceResult?.complianceCheck?.length" :data="complianceDataList"
            :columns="complianceColumns" row-key="field" size="small" bordered>
            <template #status="{ row }">
              <t-tag :theme="row.status === 'pass' ? 'success' : row.status === 'warning' ? 'warning' : 'danger'"
                variant="light">
                {{ row.status === 'pass' ? '达标' : row.status === 'warning' ? '警告' : '超标' }}
              </t-tag>
            </template>
          </t-table>
        </t-card>

        <t-card v-else-if="!nutritionStore.formulaNutrition && !analysisForm.formulaId && initialized"
          class="content-card content-card--empty" bordered>
          <t-empty description="请选择一个配方进行营养分析" role="status">
            <template #action>
              <button class="add-formula-btn" @click="$router.push('/formulas')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                前往配方管理
              </button>
            </template>
          </t-empty>
        </t-card>
      </div>
    </Transition>
    <!-- 分析历史记录 -->
    <section class="activity-section">
      <div class="activity-card activity-card--timeline">
        <div class="activity-header">
          <h4 class="activity-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            分析历史记录
          </h4>
          <div class="activity-nav">
            <button class="activity-nav-btn" :disabled="activityPage <= 1" @click="activityPrev" title="上一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span class="activity-nav-page">{{ activityPage }} / {{ activityTotalPages }}</span>
            <button class="activity-nav-btn" :disabled="activityPage >= activityTotalPages" @click="activityNext"
              title="下一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
        <div class="timeline-list">
          <div v-for="(item, index) in pagedActivityItems" :key="index" class="timeline-item"
            :class="{ 'timeline-item--last': index === pagedActivityItems.length - 1 }">
            <div class="timeline-dot" :class="'timeline-dot--' + item.type">
              <span class="timeline-dot-inner"></span>
            </div>
            <div class="timeline-content">
              <p class="timeline-title">{{ item.title }}</p>
              <p class="timeline-desc" v-html="item.desc"></p>
              <span class="timeline-time">{{ item.time }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="activity-card activity-card--assistant">
        <div class="assistant-content">
          <h4 class="assistant-title">营养分析助手</h4>
          <p class="assistant-desc">{{ assistantMessage }}</p>
          <button class="assistant-btn" @click="scrollToTop" :disabled="!analysisForm.formulaId">
            {{ nutritionStore.formulaNutrition ? '查看分析结果' : '选择配方开始' }}
          </button>
          <div class="assistant-footer">
            <div class="assistant-avatar-group">
              <span class="assistant-avatar">营</span>
              <span class="assistant-avatar">养</span>
              <span class="assistant-avatar">析</span>
            </div>
            <span class="assistant-hint">{{ nutritionStore.profiles?.length || 0 }} 个标准可用</span>
          </div>
        </div>
        <svg class="assistant-bg-icon" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useFormulaStore } from '@/stores/formula';
import { useNutritionStore } from '@/stores/nutrition';
import { MessagePlugin } from 'tdesign-vue-next';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';
import {
  chartProgressGood,
  chartProgressWarn,
  chartProgressBad,
  gradientEnergy,
  gradientProtein,
  gradientFat,
  gradientCarb,
  gradientSodium,
} from '@/assets/styles/tokens';

const formulaStore = useFormulaStore();
const nutritionStore = useNutritionStore();

const initialized = ref(false);

const analysisForm = reactive({ formulaId: '', profileId: '' });
const analyzing = ref(false);
const checking = ref(false);

const categoryMap: Record<string, string> = {
  infant: '婴幼儿', child: '儿童', adult: '成人', elderly: '老年', pregnant: '孕妇', special: '特殊'
};
const categoryLabel = (c: string) => categoryMap[c] || c;

const nutrientInfoMap: Record<string, [string, string]> = {
  energy: ['能量', 'kJ'], protein: ['蛋白质', 'g'], fat: ['脂肪', 'g'], carbohydrate: ['碳水化合物', 'g'],
  fiber: ['膳食纤维', 'g'], sugars: ['糖类', 'g'], sodium: ['钠', 'mg'], potassium: ['钾', 'mg'],
  calcium: ['钙', 'mg'], iron: ['铁', 'mg'], zinc: ['锌', 'mg'], magnesium: ['镁', 'mg'],
  phosphorus: ['磷', 'mg'], vitaminA: ['维生素A', 'μg'], vitaminC: ['维生素C', 'mg'],
  vitaminD: ['维生素D', 'μg'], vitaminE: ['维生素E', 'mg'], vitaminK: ['维生素K', 'μg'],
  vitaminB1: ['维生素B1', 'mg'], vitaminB2: ['维生素B2', 'mg'], vitaminB3: ['维生素B3', 'mg'],
  vitaminB6: ['维生素B6', 'mg'], vitaminB12: ['维生素B12', 'μg'], folate: ['叶酸', 'μg'],
  cholesterol: ['胆固醇', 'mg'], transFat: ['反式脂肪', 'g'], saturatedFat: ['饱和脂肪', 'g'],
};

const NRV: Record<string, number> = {
  energy: 8400, protein: 60, fat: 60, carbohydrate: 300, sodium: 2000,
};

const CORE_NUTRIENTS = [
  { key: 'energy', label: '能量', unit: 'kJ', icon: 'flashlight', iconBg: gradientEnergy },
  { key: 'protein', label: '蛋白质', unit: 'g', icon: 'heart', iconBg: gradientProtein },
  { key: 'fat', label: '脂肪', unit: 'g', icon: 'drop', iconBg: gradientFat },
  { key: 'carbohydrate', label: '碳水化合物', unit: 'g', icon: 'chart-bar', iconBg: gradientCarb },
  { key: 'sodium', label: '钠', unit: 'mg', icon: 'tips', iconBg: gradientSodium },
] as const;

interface NutritionCard {
  key: string; label: string; unit: string; value: string;
  icon: string; iconBg: string; nrvPercent: number; progressColor: string; statusClass: string;
}

const coreNutritionCards = computed<NutritionCard[]>(() => {
  const per100g = nutritionStore.formulaNutrition?.per100gNutrition;
  if (!per100g) return [];
  return CORE_NUTRIENTS.map(nutrient => {
    const rawValue = per100g[nutrient.key] || 0;
    const value = typeof rawValue === 'number' ? rawValue.toFixed(2) : String(rawValue);
    const nrv = NRV[nutrient.key] || 1;
    const nrvPercent = Math.min(Math.round((rawValue / nrv) * 10000) / 100, 150);
    let progressColor = chartProgressGood;
    let statusClass = '';
    if (nutrient.key === 'energy' || nutrient.key === 'fat' || nutrient.key === 'sodium') {
      if (nrvPercent < 80) { progressColor = chartProgressGood; statusClass = 'status-good'; }
      else if (nrvPercent <= 120) { progressColor = chartProgressWarn; statusClass = 'status-warning'; }
      else { progressColor = chartProgressBad; statusClass = 'status-danger'; }
    } else {
      if (nrvPercent >= 80) { progressColor = chartProgressGood; statusClass = 'status-good'; }
      else if (nrvPercent >= 50) { progressColor = chartProgressWarn; statusClass = 'status-warning'; }
      else { progressColor = chartProgressBad; statusClass = 'status-danger'; }
    }
    return {
      key: nutrient.key, label: nutrient.label, unit: nutrient.unit, value, icon: nutrient.icon,
      iconBg: nutrient.iconBg, nrvPercent, progressColor, statusClass
    };
  });
});

const contributionColumns = [
  { colKey: 'materialName', title: '原料名称', width: 200, ellipsis: true },
  { colKey: 'quantity', title: '用量(g)', width: 100 },
  { colKey: 'percentage', title: '重量占比', width: 180 },
  { colKey: 'nutritionContribution', title: '营养贡献', width: 120 },
];

interface MaterialBreakdownRow {
  materialId: string; materialName: string; quantity: number; percentage: number;
  hasNutritionData: boolean; noNutritionData: boolean;
  nutritionDetails: Array<{ key: string; label: string; value: string; unit: string; }>;
}

const materialBreakdown = computed<MaterialBreakdownRow[]>(() => {
  const breakdown = nutritionStore.formulaNutrition?.materialBreakdown;
  if (!breakdown || !Array.isArray(breakdown)) return [];
  return breakdown.map((item: any) => {
    const hasNutritionData = item.nutritionContribution && Object.keys(item.nutritionContribution).length > 0;
    const noNutritionData = !hasNutritionData || (item.nutritionContribution && Object.values(item.nutritionContribution).every((v: any) => v === 0));
    const nutritionDetails: Array<{ key: string; label: string; value: string; unit: string; }> = [];
    if (item.nutritionContribution) {
      for (const [key, val] of Object.entries(item.nutritionContribution)) {
        const info = nutrientInfoMap[key];
        if (info && val && Number(val) > 0) nutritionDetails.push({ key, label: info[0], value: Number(val).toFixed(2), unit: info[1] });
      }
    }
    return {
      materialId: item.materialId || item.materialName, materialName: item.materialName,
      quantity: item.quantity || 0, percentage: Math.round(item.percentage * 100) / 100,
      hasNutritionData: nutritionDetails.length > 0, noNutritionData, nutritionDetails
    };
  });
});

const nutritionDataList = computed(() => {
  if (!nutritionStore.formulaNutrition?.per100gNutrition) return [];
  return Object.entries(nutritionStore.formulaNutrition.per100gNutrition)
    .map(([key, value]) => {
      const [name, unit] = nutrientInfoMap[key] || [key, ''];
      return { nutrient: name, value: typeof value === 'number' ? value.toFixed(2) : String(value), unit, overLimit: false };
    });
});

const nutritionColumns = [
  { colKey: 'nutrient', title: '营养成分', width: 200 },
  { colKey: 'value', title: '含量', width: 150 },
  { colKey: 'unit', title: '单位', width: 100 },
];

const complianceColumns = [
  { colKey: 'label', title: '营养成分', width: 150 },
  { colKey: 'actualValue', title: '实际值', width: 120 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'message', title: '说明', width: 300 }
];

const complianceDataList = computed(() => {
  if (!nutritionStore.complianceResult?.complianceCheck) return [];
  return nutritionStore.complianceResult.complianceCheck.map((item: any) => ({
    ...item,
    actualValue: typeof item.actualValue === 'number' ? item.actualValue.toFixed(2) : String(item.actualValue),
  }));
});

const dashboardCards = computed(() => {
  const hasResult = !!nutritionStore.formulaNutrition;
  const compliance = nutritionStore.complianceResult;
  return [
    {
      label: '分析状态',
      value: hasResult ? '已完成' : '待分析',
      unit: '',
      badge: analyzing.value ? '计算中...' : hasResult ? '就绪' : '等待',
      badgeColor: analyzing.value ? 'var(--color-warning)' : hasResult ? 'var(--color-primary)' : 'var(--color-text-placeholder)',
      badgeBg: analyzing.value ? '#FFFBEB' : hasResult ? '#ECFDF5' : '#F1F5F9',
      iconBg: hasResult ? '#ECFDF5' : '#EFF6FF',
      iconColor: hasResult ? 'var(--color-primary)' : '#3B82F6',
      iconPath: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    },
    {
      label: '核心指标',
      value: hasResult ? CORE_NUTRIENTS.length.toString() : '—',
      unit: '项',
      badge: hasResult ? `${CORE_NUTRIENTS.length} 项核心` : '未计算',
      badgeColor: '#3B82F6',
      badgeBg: '#EFF6FF',
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      iconPath: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    },
    {
      label: '原料明细',
      value: materialBreakdown.value.length.toString(),
      unit: '种',
      badge: materialBreakdown.value.length > 0 ? `共${materialBreakdown.value.length}种` : '无数据',
      badgeColor: '#A855F7',
      badgeBg: '#FAF5FF',
      iconBg: '#FAF5FF',
      iconColor: '#A855F7',
      iconPath: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    },
    {
      label: '合规检查',
      value: compliance ? (compliance.summary?.failed === 0 ? '通过' : '异常') : '—',
      unit: '',
      badge: compliance ? (compliance.summary?.failed === 0 ? '全部达标' : `${compliance.summary?.failed}项超标`) : '未执行',
      badgeColor: compliance ? (compliance.summary?.failed === 0 ? 'var(--color-primary)' : 'var(--color-danger)') : 'var(--color-text-placeholder)',
      badgeBg: compliance ? (compliance.summary?.failed === 0 ? '#ECFDF5' : '#FEF2F2') : '#F1F5F9',
      iconBg: compliance ? (compliance.summary?.failed === 0 ? '#ECFDF5' : '#FEF2F2') : '#F1F5F9',
      iconColor: compliance ? (compliance.summary?.failed === 0 ? 'var(--color-primary)' : 'var(--color-danger)') : 'var(--color-text-placeholder)',
      iconPath: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    },
  ];
});

interface ActivityItem { type: 'success' | 'info' | 'warning'; title: string; desc: string; time: string; }
const ACTIVITY_PAGE_SIZE = 4;
const activityPage = ref(1);

const allActivityItems = computed<ActivityItem[]>(() => {
  const items: ActivityItem[] = [];
  if (nutritionStore.formulaNutrition && analysisForm.formulaId) {
    items.push({
      type: 'success',
      title: '营养分析完成',
      desc: `配方 <strong>${nutritionStore.formulaNutrition.formulaName || '未知'}</strong> 的营养成分已计算完成`,
      time: new Date().toLocaleString('zh-CN'),
    });
  }
  if (nutritionStore.complianceResult) {
    items.push({
      type: nutritionStore.complianceResult.summary?.failed === 0 ? 'success' : 'warning',
      title: '合规检查完成',
      desc: nutritionStore.complianceResult.summary?.failed === 0
        ? '所有指标均符合所选营养标准要求'
        : `存在 <strong>${nutritionStore.complianceResult.summary?.failed}</strong> 项指标不达标，需要关注`,
      time: new Date().toLocaleString('zh-CN'),
    });
  }
  if (items.length === 0) items.push({ type: 'info', title: '等待分析', desc: '选择配方并点击"开始分析"按钮查看营养数据', time: '' });
  return items;
});

const activityTotalPages = computed(() => Math.max(1, Math.ceil(allActivityItems.value.length / ACTIVITY_PAGE_SIZE)));
const pagedActivityItems = computed(() => {
  const start = (activityPage.value - 1) * ACTIVITY_PAGE_SIZE;
  return allActivityItems.value.slice(start, start + ACTIVITY_PAGE_SIZE);
});
const activityPrev = () => { if (activityPage.value > 1) activityPage.value--; };
const activityNext = () => { if (activityPage.value < activityTotalPages.value) activityPage.value++; };

const assistantMessage = computed(() => {
  if (!analysisForm.formulaId) return '在上方选择一个配方，系统将自动计算其营养成分含量和NRV占比。';
  if (!nutritionStore.formulaNutrition) return '已选择配方，点击"开始分析"按钮即可查看详细的营养数据。';
  if (nutritionStore.complianceResult?.summary?.failed === 0) return '分析完成！该配方的各项营养指标均符合所选标准，表现优秀。';
  if (nutritionStore.complianceResult) return `分析完成！发现 ${nutritionStore.complianceResult.summary?.failed} 项超标指标，建议调整配方比例。`;
  return '营养分析已完成，您可以查看详细数据和合规性报告。';
});

const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

const handleAnalyze = async () => {
  if (!analysisForm.formulaId) { MessagePlugin.warning('请选择配方'); return; }
  analyzing.value = true;
  nutritionStore.formulaNutrition = null;
  nutritionStore.complianceResult = null;
  const result = await nutritionStore.calculateFormulaNutrition(analysisForm.formulaId);
  analyzing.value = false;
  if (!result.success) MessagePlugin.error(result.message || '计算失败');
};

// handleCheckCompliance is used programmatically
// @ts-ignore
async function handleCheckCompliance() {
  if (!analysisForm.formulaId) return;
  checking.value = true;
  nutritionStore.complianceResult = null;
  const result = await nutritionStore.checkCompliance(analysisForm.formulaId, analysisForm.profileId || undefined);
  checking.value = false;
  if (!result.success) MessagePlugin.error(result.message || '合规检查失败');
}

watch(
  () => analysisForm.formulaId,
  (newFormulaId, oldFormulaId) => {
    if (!newFormulaId || newFormulaId !== oldFormulaId) {
      nutritionStore.formulaNutrition = null;
      nutritionStore.complianceResult = null;
    }
  }
);

onMounted(async () => {
  nutritionStore.formulaNutrition = null;
  nutritionStore.complianceResult = null;
  analysisForm.formulaId = '';
  analysisForm.profileId = '';
  initialized.value = false;
  await Promise.all([formulaStore.fetchFormulas(), nutritionStore.fetchProfiles()]);
  initialized.value = true;
});
</script>

<style scoped lang="scss">
.nutrition-analysis {
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    margin-bottom: 30px;

    .stat-card {
      background: #fff;
      padding: 24px;
      border-radius: var(--radius-4xl);
      border: 1px solid #fff;
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
      transition: all $transition-slow;
      animation: dashboard-fade-in 0.5s ease forwards;
      opacity: 0;

      &:hover {
        border-color: #DBEAFE;
        transform: translateY(-2px);
        box-shadow: 0 14px 36px -6px rgba(0, 0, 0, 0.08);
      }

      .stat-card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
      }

      .stat-icon {
        width: 48px;
        height: 48px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .stat-badge {
        font-size: 12px;
        font-weight: 700;
        padding: var(--space-0-5) 8px;
        border-radius: 8px;
        white-space: nowrap;
      }

      .stat-label {
        font-size: 14px;
        color: var(--color-text-placeholder);
        margin-bottom: 4px;
      }

      .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: #0F172A;
        line-height: 1.2;

        .stat-unit {
          font-size: 14px;
          font-weight: 400;
          color: var(--color-text-placeholder);
        }
      }
    }
  }

  .main-content-wrapper {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .content-card {
    border-radius: var(--radius-4xl) !important;
    overflow: hidden;
    border: none;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);

    &--selector {
      .data-center-toolbar {
        padding: 32px;
        border-bottom: none;
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        min-height: 88px;

        .toolbar-left-section {
          flex: 1;
          min-width: 240px;

          .toolbar-title-section {
            .toolbar-title {
              font-size: 20px;
              font-weight: 700;
              color: var(--color-text-primary);
              margin: 0 0 4px 0;
            }

            .toolbar-subtitle {
              font-size: 14px;
              color: var(--color-text-placeholder);
              margin: 0;
            }
          }
        }

        .toolbar-right-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }
      }
    }

    &--result,
    &--compliance,
    &--empty {
      :deep(.t-card__header) {
        padding: 24px var(--space-7) 16px;
        border-bottom: 1px solid #f1f5f9;
      }

      :deep(.t-card__body) {
        padding: 24px var(--space-7) var(--space-7);
      }
    }

    &--empty {
      min-height: 300px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .result-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .result-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .add-formula-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1-5);
    padding: var(--space-2-5) 20px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition: all $transition-normal;
    white-space: nowrap;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .table-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: var(--space-1-25) var(--space-2-5);
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all $transition-fast;
    background: transparent;

    &--primary {
      color: #3b82f6;

      &:hover {
        background: #eff6ff;
      }
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .section-title {
    margin: 0 0 20px 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f1f5f9;
  }

  .core-nutrition-section {
    margin-top: var(--space-7);
    padding: 24px;
    background: linear-gradient(135deg, var(--color-bg-page), #f1f5f9);
    border-radius: 20px;
    border: 1px solid #f1f5f9;

    .nutrition-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
  }

  .nutrition-card {
    padding: 20px;
    background: #fff;
    border-radius: 16px;
    border: 1px solid #f1f5f9;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    transition: all $transition-slow;
    animation: fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) both;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    }

    &.status-good {
      border-color: rgba(16, 185, 129, 0.3);
    }

    &.status-warning {
      border-color: rgba(245, 158, 11, 0.3);
    }

    &.status-danger {
      border-color: rgba(239, 68, 68, 0.3);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: var(--space-2-5);
      margin-bottom: 12px;

      .card-icon {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
      }

      .card-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-primary);
      }
    }

    .card-value {
      margin-bottom: 12px;

      .value-number {
        font-size: 26px;
        font-weight: 700;
        color: #0f172a;
        margin-right: 4px;
      }

      .value-unit {
        font-size: 13px;
        color: var(--color-text-placeholder);
      }
    }

    .card-progress {
      .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-1-5);

        .nrv-label {
          font-size: 12px;
          color: var(--color-text-placeholder);
        }

        .nrv-percent {
          font-size: 13px;
          font-weight: 600;
        }
      }

      :deep(.t-progress__bar) {
        transform-origin: left;
        animation: progressBarFill 0.8s cubic-bezier(0.4, 0, 0.2, 1) both;
      }
    }
  }

  .contribution-section {
    margin-top: var(--space-7);
    padding: 24px;
    background: #fafbfc;
    border-radius: 20px;
    border: 1px solid #f1f5f9;
  }

  .material-name-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .percentage-cell {
    display: flex;
    align-items: center;

    .percentage-value {
      font-weight: 600;
      color: var(--color-text-primary);
      min-width: 50px;
    }
  }

  .nutrition-popup {
    padding: 8px 4px;
    max-height: 300px;
    overflow-y: auto;

    .nutrition-item {
      padding: 4px 0;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      font-size: 13px;

      .item-label {
        color: var(--color-text-secondary);
      }

      .item-value {
        color: var(--color-text-primary);
        font-weight: 500;
      }
    }
  }

  .nutrition-table-section {
    margin-top: var(--space-7);
    padding: 24px;
    background: #fafbfc;
    border-radius: 20px;
    border: 1px solid #f1f5f9;
  }

  .compliance-summary {
    display: flex;
    gap: 40px;
    margin-bottom: 20px;
    padding: 20px;
    background: linear-gradient(135deg, var(--color-bg-page), #f1f5f9);
    border-radius: 16px;

    .summary-item {
      display: flex;
      align-items: center;
      gap: 12px;

      .summary-icon {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
      }

      .summary-content {
        display: flex;
        flex-direction: column;

        .summary-count {
          font-size: 24px;
          font-weight: 700;
          line-height: 1.2;
        }

        .summary-label {
          font-size: 13px;
          color: var(--color-text-placeholder);
        }
      }

      &.pass .summary-count {
        color: var(--color-primary);
      }

      &.warning .summary-count {
        color: var(--color-warning);
      }

      &.fail .summary-count {
        color: var(--color-danger);
      }
    }
  }

  .over-limit {
    color: var(--color-danger);
    font-weight: 600;
  }

  .activity-section {
    margin-top: 30px;
    padding-bottom: 32px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 32px;

    @media (min-width: 1024px) {
      grid-template-columns: 2fr 1fr;
    }
  }

  .activity-card {
    background-color: #fff;
    border-radius: var(--radius-4xl);
    padding: 32px;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
    border: 1px solid var(--color-bg-page);

    &--assistant {
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
      border: none;
      color: #fff;
      position: relative;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(16, 185, 129, 0.15), 0 10px 10px -5px rgba(16, 185, 129, 0.04);
    }
  }

  .activity-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .activity-title {
    font-size: 17px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .activity-nav {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .activity-nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: none;
    background: #f1f5f9;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all $transition-fast;

    &:hover:not(:disabled) {
      background: var(--color-border);
      color: var(--color-text-primary);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .activity-nav-page {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-placeholder);
    min-width: 40px;
    text-align: center;
  }

  .timeline-list {
    position: relative;

    &::before {
      content: '';
      position: absolute;
      left: 11px;
      top: 8px;
      bottom: 8px;
      width: 2px;
      background: var(--color-border);
      border-radius: 1px;
    }
  }

  .timeline-item {
    display: flex;
    gap: 16px;
    position: relative;
    padding-bottom: 20px;

    &:last-child {
      padding-bottom: 0;
    }
  }

  .timeline-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    z-index: 1;
    background: #fff;
    border: 2px solid var(--color-border);

    &--success {
      border-color: var(--color-primary);

      .timeline-dot-inner {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--color-primary);
      }
    }

    &--info {
      border-color: #3b82f6;

      .timeline-dot-inner {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #3b82f6;
      }
    }

    &--warning {
      border-color: var(--color-warning);

      .timeline-dot-inner {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--color-warning);
      }
    }
  }

  .timeline-content {
    flex: 1;
    min-width: 0;
  }

  .timeline-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0 0 4px 0;
  }

  .timeline-desc {
    font-size: 13px;
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin: 0 0 4px 0;

    strong {
      color: var(--color-text-primary);
      font-weight: 600;
    }
  }

  .timeline-time {
    font-size: 12px;
    color: var(--color-text-placeholder);
  }

  .assistant-content {
    position: relative;
    z-index: 1;
  }

  .assistant-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 8px 0;
  }

  .assistant-desc {
    font-size: 14px;
    opacity: 0.9;
    line-height: 1.6;
    margin: 0 0 20px 0;
    min-height: 42px;
  }

  .assistant-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2-5) 24px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all $transition-normal;

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .assistant-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
  }

  .assistant-avatar-group {
    display: flex;
    gap: var(--space-1-5);
  }

  .assistant-avatar {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    backdrop-filter: blur(4px);
  }

  .assistant-hint {
    font-size: 12px;
    opacity: 0.75;
  }

  .assistant-bg-icon {
    position: absolute;
    right: -10px;
    bottom: -10px;
    opacity: 0.08;
    transform: rotate(-15deg);
  }

  @keyframes dashboard-fade-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(16px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes rowFadeIn {
    from {
      opacity: 0;
      transform: translateX(-8px);
    }

    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes progressBarFill {
    from {
      width: 0;
    }

    to {
      width: var(--td-progress-percent);
    }
  }
}
</style>
