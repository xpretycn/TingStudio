<template>
  <div class="material-detail" :aria-busy="!material">
    <PageSkeleton v-if="!material" type="detail" />
    <template v-else>

      <!-- 顶部 Header -->
      <header class="detail-header">
        <div class="header-left">
          <button class="header-back-btn" @click="handleBack" title="返回列表">
            <t-icon name="arrow-left" />
          </button>
          <div class="header-title-group">
            <nav class="header-breadcrumb">
              <a class="breadcrumb-link" @click="handleBack">原料管理</a>
              <t-icon name="chevron-right" class="breadcrumb-sep" />
              <span class="breadcrumb-current">原料详情</span>
            </nav>
            <h2 class="material-title">
              {{ material.name }}
              <span v-if="material.materialType === 'supplement'" class="type-tag type-tag--supplement">辅料</span>
              <span v-else class="type-tag type-tag--herb">药材</span>
              <span class="title-version-tag">v{{ material.version }}</span>
              <span v-if="material.status === 'draft'" class="title-status-tag title-status-tag--draft">草稿</span>
              <span v-else-if="material.status === 'pending_review'"
                class="title-status-tag title-status-tag--pending">审批中</span>
              <span v-else-if="material.status === 'published'"
                class="title-status-tag title-status-tag--published">已发布</span>
            </h2>
          </div>
        </div>
        <div class="header-actions">
          <button v-if="canEdit" class="header-action-btn" @click="router.push(`/materials/${route.params.id}/edit`)">
            <t-icon name="edit" class="btn-icon" />
            编辑原料
          </button>
          <button class="header-action-btn" @click="handleExport">
            <t-icon name="send" class="btn-icon" />
            导出原料
          </button>
        </div>
      </header>

      <!-- 主内容区域：左右两栏网格 -->
      <main class="detail-main">

        <!-- ══ 左侧栏 (col-span-12 lg:col-span-3) ══ -->
        <div class="detail-left-col">

          <!-- 原料概况卡片 -->
          <section class="info-card">
            <h3 class="card-label">
              <t-icon name="browse" class="label-icon" />
              原料概况
            </h3>
            <div class="card-fields">
              <div class="field-item">
                <label><t-icon name="barcode" size="12px" /> 原料编码</label>
                <p>{{ material.code || '--' }}</p>
              </div>
              <div class="field-item">
                <label><t-icon name="edit-1" size="12px" /> 原料名称</label>
                <p>{{ material.name }}</p>
              </div>
              <div class="field-grid-2">
                <div class="field-item">
                  <label><t-icon name="root-list" size="12px" /> 原料类型</label>
                  <p>{{ material.materialType === 'supplement' ? '辅料' : '药材' }}</p>
                </div>
                <div class="field-item">
                  <label><t-icon name="ruler" size="12px" /> 单位</label>
                  <p>{{ material.unit || '--' }}</p>
                </div>
              </div>
              <div class="field-grid-2">
                <div class="field-item">
                  <label><t-icon name="shop" size="12px" /> 库存数量</label>
                  <p :class="{ 'status-warn': (material.stock ?? 0) <= 0, 'status-ok': (material.stock ?? 0) > 0 }">
                    {{ material.stock ?? 0 }} {{ material.unit }}
                  </p>
                </div>
                <div class="field-item">
                  <label><t-icon name="heart" size="12px" /> 营养状态</label>
                  <p :class="{ 'status-warn': nutritionData.length === 0, 'status-ok': nutritionData.length > 0 }">
                    {{ nutritionData.length > 0 ? `${nutritionData.length}项` : '未录入' }}
                  </p>
                </div>
              </div>
              <div class="field-item">
                <label><t-icon name="currency-exchange" size="12px" /> 单价</label>
                <p :class="{ 'status-warn': material.unitPrice == null, 'status-ok': material.unitPrice != null }">
                  {{ material.unitPrice != null ? `¥${Number(material.unitPrice).toFixed(2)}/kg` : '暂未录入' }}
                </p>
              </div>
              <div v-if="material.appearance?.length" class="field-item">
                <label><t-icon name="image" size="12px" /> 性状</label>
                <div class="field-tags">
                  <t-tag v-for="item in material.appearance" :key="item" size="small" theme="primary" variant="light">{{
                    item }}</t-tag>
                </div>
              </div>
              <div v-if="material.taste?.length" class="field-item">
                <label><t-icon name="star" size="12px" /> 口感</label>
                <div class="field-tags">
                  <t-tag v-for="item in material.taste" :key="item" size="small" theme="success" variant="light">{{ item
                  }}</t-tag>
                </div>
              </div>
              <div v-if="material.efficacy?.length" class="field-item">
                <label><t-icon name="secured" size="12px" /> 功效</label>
                <div class="field-tags">
                  <t-tag v-for="item in material.efficacy" :key="item" size="small" theme="warning" variant="light">{{
                    item }}</t-tag>
                </div>
              </div>
              <div class="field-grid-2">
                <div class="field-item">
                  <label><t-icon name="time" size="12px" /> 创建时间</label>
                  <p>{{ formatTimestamp(material.createdAt) }}</p>
                </div>
                <div class="field-item">
                  <label><t-icon name="edit-1" size="12px" /> 更新时间</label>
                  <p>{{ formatTimestamp(material.updatedAt) }}</p>
                </div>
              </div>
            </div>
          </section>

          <!-- 变更记录时间线 -->
          <section class="info-card">
            <div class="timeline-header">
              <h3 class="card-label" style="margin-bottom: 0;">
                <t-icon name="history" class="label-icon" />
                变更记录
              </h3>
            </div>
            <div class="timeline-list">
              <div class="timeline-item current">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                  <p class="timeline-ver">{{ material.updatedAt ? '当前版本' : '初始录入' }}</p>
                  <p class="timeline-time">{{ formatDate(material.updatedAt || material.createdAt || new Date()) }}</p>
                  <p v-if="material.remark" class="timeline-note">{{ material.remark }}</p>
                </div>
              </div>
            </div>
          </section>

        </div>

        <!-- ══ 右侧栏 (col-span-12 lg:col-span-9) ══ -->
        <div class="detail-right-col">

          <!-- 营养成分（每100g） -->
          <section class="nutrition-section">
            <div class="nutrition-header">
              <div>
                <h3 class="nutrition-title">{{ material.name }} 营养成分</h3>
                <p class="nutrition-subtitle">每
                  <t-tag variant="light" theme="success" size="small" shape="round">100g</t-tag>含量分析
                </p>
              </div>
              <div class="nutrition-header-right">
                <label>数据源：</label>
                <NutritionSourceTag :source-type="nutritionSourceType" :source-detail="nutritionMeta.sourceDetail || nutritionMeta.dataSource" />
                <template v-if="nutritionMeta.dataSource">
                  <t-tag :theme="confidenceTheme" variant="light" size="small">
                    <template #icon><t-icon name="checked" /></template>
                    {{ confidenceLabel }}
                  </t-tag>
                </template>
                <t-button
                  v-if="nutritionData.length > 0"
                  theme="default"
                  variant="text"
                  size="small"
                  @click="showSourceCompare = !showSourceCompare"
                >
                  {{ showSourceCompare ? '收起来源对比 ▲' : '查看所有来源 ▼' }}
                </t-button>
              </div>
            </div>

            <div v-if="nutritionLoading" class="nutrition-loading">
              <t-loading />
            </div>

            <Transition name="fade" mode="out-in">
              <div v-if="!nutritionLoading && nutritionData.length" class="nutrition-grid">
                <div v-for="(item, idx) in nutritionData" :key="idx" class="nutrition-item"
                  :class="{ 'nutrition-item--highlight': isHighlightNutrient(item.nutrient) }">
                  <label class="nutri-label">{{ item.nutrient }}</label>
                  <span class="nutri-value">{{ item.value }}<small class="nutri-unit">{{ item.unit }}</small></span>
                  <div class="nutri-bar-track">
                    <div class="nutri-bar-fill"
                      :style="{ width: getNutrientPercent(parseFloat(item.value), item.nutrient) + '%' }">
                    </div>
                  </div>
                  <span class="nutri-percent">{{ getNutrientPercent(parseFloat(item.value), item.nutrient) }}%</span>
                </div>
              </div>
              <div v-else-if="!nutritionLoading" class="nutrition-empty">
                <t-empty description="暂无营养数据，请前往编辑页面录入" role="status" />
              </div>
            </Transition>

            <NutritionSourceCompare
              v-if="showSourceCompare && material"
              :material-id="material.id"
              :visible="showSourceCompare"
            />
          </section>

          <!-- 能量计算过程及结果 -->
          <section class="energy-calc-section">
            <div class="energy-header">
              <div>
                <h3 class="energy-title">能量计算</h3>
                <p class="energy-subtitle">基于宏量营养素换算系数计算</p>
              </div>
              <t-tag variant="light" theme="warning" size="small" shape="round">
                <template #icon><t-icon name="calculator" /></template>
                自动计算
              </t-tag>
            </div>

            <Transition name="fade" mode="out-in">
              <div v-if="!nutritionLoading && energyCalcData.total > 0" class="energy-content">
                <!-- 营养素参考值占比 -->
                <div class="nrv-compare-card">
                  <div class="nrv-header">
                    <t-icon name="chart-pie" size="16px" />
                    <span>营养素参考值 (NRV) 占比</span>
                  </div>
                  <div class="nrv-list">
                    <div class="nrv-item" v-for="(item, idx) in nrvData" :key="idx">
                      <span class="nrv-name">{{ item.name }}</span>
                      <div class="nrv-bar-track">
                        <div class="nrv-bar-fill"
                          :style="{ width: Math.min(item.percent, 100) + '%', background: item.color }">
                        </div>
                      </div>
                      <span class="nrv-percent" :class="{ 'nrv-exceed': item.percent > 100 }">{{ item.value }}{{
                        item.unit }}
                        / {{ item.nrv }}{{ item.nrvUnit }} ({{ item.percent }}%)</span>
                    </div>
                  </div>
                </div>
                <!-- 计算结果 -->
                <div class="total-energy-card">
                  <div class="total-left">
                    <span class="total-label">总能量 (每100g)</span>
                    <span class="total-value">{{ energyCalcData.total }}<small class="total-unit">kJ</small></span>
                  </div>
                  <div class="total-right">
                    <div v-for="(item, idx) in energyCalcData.breakdown" :key="idx" class="breakdown-bar"
                      :style="{ width: item.percent + '%' }">
                      <span class="breakdown-tooltip">{{ item.name }}: {{ item.cal }}kJ ({{ item.percent }}%)</span>
                    </div>
                  </div>
                </div>
                <!-- 计算公式 -->
                <div class="calc-formula-card">
                  <div class="formula-title-row">
                    <t-icon name="code" size="16px" />
                    <span>换算公式</span>
                  </div>
                  <div class="formula-items">
                    <div class="formula-item">
                      <span class="formula-label">蛋白质</span>
                      <span class="formula-coeff">{{ energyCalcData.protein }}g × 17 kJ/g</span>
                      <span class="formula-result">= {{ energyCalcData.proteinCal }} kJ</span>
                    </div>
                    <div class="formula-item">
                      <span class="formula-label">脂肪</span>
                      <span class="formula-coeff">{{ energyCalcData.fat }}g × 37 kJ/g</span>
                      <span class="formula-result">= {{ energyCalcData.fatCal }} kJ</span>
                    </div>
                    <div class="formula-item">
                      <span class="formula-label">碳水化合物</span>
                      <span class="formula-coeff">{{ energyCalcData.carb }}g × 17 kJ/g</span>
                      <span class="formula-result">= {{ energyCalcData.carbCal }} kJ</span>
                    </div>
                  </div>
                </div>

              </div>
              <div v-else-if="!nutritionLoading" class="energy-empty">
                <t-empty description="需要录入蛋白质、脂肪、碳水化合物数据后才能计算能量" role="status" />
              </div>
            </Transition>
          </section>

        </div>

      </main>

    </template>

    <t-drawer v-model:visible="showExportDrawer" header="导出原料" :footer="true" placement="right" size="400px"
      :destroyOnClose="false">
      <t-form layout="vertical">
        <t-form-item label="导出原料">
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            <t-tag theme="primary" variant="light">{{ material?.name || '当前原料' }}</t-tag>
          </div>
        </t-form-item>
        <t-form-item label="导出格式">
          <t-radio-group v-model="exportForm.exportType">
            <t-radio-button value="excel">Excel</t-radio-button>
            <t-radio-button value="pdf">PDF</t-radio-button>
          </t-radio-group>
        </t-form-item>
        <t-form-item label="导出模板">
          <t-select v-model="exportForm.templateId" clearable filterable :popup-props="{ appendToBody: true }"
            placeholder="可选，使用默认模板">
            <t-option v-for="t in materialTemplates" :key="t.templateId" :value="t.templateId" :label="t.name" />
          </t-select>
        </t-form-item>
      </t-form>
      <template #footer>
        <t-button theme="default" @click="showExportDrawer = false">取消</t-button>
        <t-button theme="primary" :loading="exporting" @click="doExport">开始导出</t-button>
      </template>
    </t-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMaterialStore } from '@/stores/material';
import { useNutritionStore } from '@/stores/nutrition';
import { useNutritionSourceStore } from '@/stores/nutritionSource';
import { useAuthStore } from '@/stores/auth';
import { useExportStore } from '@/stores/export';
import type { ExportTemplate } from '@/api/export';
import { MessagePlugin } from 'tdesign-vue-next';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';
import { formatTimestamp } from '@/utils/timeFormat';
import type { Material } from '@/api/material';
import NutritionSourceTag from '@/components/nutrition/NutritionSourceTag.vue';
import NutritionSourceCompare from '@/components/nutrition/NutritionSourceCompare.vue';

const router = useRouter();
const route = useRoute();
const materialStore = useMaterialStore();
const nutritionStore = useNutritionStore();
const nutritionSourceStore = useNutritionSourceStore();
const authStore = useAuthStore();
const exportStore = useExportStore();

const material = ref<Material | null>(null);

const canEdit = computed(() => {
  if (!material.value) return false;
  const user = authStore.user;
  if (!user) return false;
  if (user.role === 'admin') return true;
  return material.value.createdBy === user.id;
});
interface NutritionItem {
  nutrient: string;
  value: string;
  unit: string;
}

const nutritionLoading = ref(false);
const nutritionData = ref<NutritionItem[]>([]);
const nutritionMeta = reactive({
  dataSource: '',
  sourceDetail: '',
  confidence: 'medium' as 'high' | 'medium' | 'low',
});

const nutritionFieldSources = ref<Record<string, { sourceId: string; sourceType: string; sourceDetail: string }> | null>(null);
const nutritionSourceType = ref<string>('manual');
const showSourceCompare = ref(false);

const confidenceMap: Record<string, { label: string; theme: 'success' | 'warning' | 'default'; }> = {
  high: { label: '高可信度', theme: 'success' },
  medium: { label: '中可信度', theme: 'warning' },
  low: { label: '低可信度', theme: 'default' },
};

const confidenceLabel = computed(() => confidenceMap[nutritionMeta.confidence]?.label || '中可信度');
const confidenceTheme = computed(() => confidenceMap[nutritionMeta.confidence]?.theme || 'warning');

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

const highlightNutrients = ['蛋白质', '脂肪', '碳水化合物', '膳食纤维', '钠'];

const isHighlightNutrient = (name: string): boolean => {
  return highlightNutrients.includes(name);
};

const getNutrientPercent = (value: number, name: string): number => {
  const maxValues: Record<string, number> = {
    '蛋白质': 50, '脂肪': 40, '碳水化合物': 80, '膳食纤维': 20,
    '钠': 2000, '能量': 2000, '糖类': 60, '钾': 3000,
    '钙': 1200, '铁': 20, '锌': 15, '镁': 400,
    '磷': 1000, '维生素A': 900, '维生素C': 100, '维生素D': 10,
    '维生素E': 15, '维生素K': 80, '维生素B1': 1.5, '维生素B2': 1.5,
    '维生素B3': 16, '维生素B6': 2, '维生素B12': 2.4, '叶酸': 400,
    '胆固醇': 300, '反式脂肪': 2, '饱和脂肪': 20,
  };
  const maxVal = maxValues[name] || 100;
  return Math.min(Math.round((value / maxVal) * 100), 100);
};

const formatDate = (dateStr: string | Date): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const getNutrientValue = (name: string): number => {
  const item = nutritionData.value.find(n => n.nutrient === name);
  return item ? parseFloat(item.value) : 0;
};

const energyCalcData = computed(() => {
  const protein = getNutrientValue('蛋白质');
  const fat = getNutrientValue('脂肪');
  const carb = getNutrientValue('碳水化合物');
  const proteinCal = Math.round(protein * 17);
  const fatCal = Math.round(fat * 37);
  const carbCal = Math.round(carb * 17);
  const total = proteinCal + fatCal + carbCal;
  const breakdown = [
    { name: '蛋白质', cal: proteinCal, percent: total > 0 ? Math.round((proteinCal / total) * 100) : 0, color: 'var(--color-info)' },
    { name: '脂肪', cal: fatCal, percent: total > 0 ? Math.round((fatCal / total) * 100) : 0, color: 'var(--color-warning)' },
    { name: '碳水', cal: carbCal, percent: total > 0 ? Math.round((carbCal / total) * 100) : 0, color: 'var(--color-primary)' },
  ];
  return { protein, fat, carb, proteinCal, fatCal, carbCal, total, breakdown };
});

const nrvData = computed(() => {
  const nrvBase: Record<string, { nrv: number; nrvUnit: string; color: string; }> = {
    '蛋白质': { nrv: 60, nrvUnit: 'g', color: 'var(--color-info)' },
    '脂肪': { nrv: 60, nrvUnit: 'g', color: 'var(--color-warning)' },
    '碳水化合物': { nrv: 300, nrvUnit: 'g', color: 'var(--color-primary)' },
    '膳食纤维': { nrv: 25, nrvUnit: 'g', color: '#8b5cf6' },
    '钠': { nrv: 2000, nrvUnit: 'mg', color: 'var(--color-danger)' },
    '钙': { nrv: 800, nrvUnit: 'mg', color: '#06b6d4' },
    '铁': { nrv: 15, nrvUnit: 'mg', color: '#ec4899' },
    '锌': { nrv: 15, nrvUnit: 'mg', color: '#84cc16' },
  };
  return Object.entries(nrvBase).map(([name, base]) => {
    let value = getNutrientValue(name);
    const unit = nutritionData.value.find(n => n.nutrient === name)?.unit || base.nrvUnit;
    if (name === '钠') value = value / 1000;
    let percent = Math.round((value / base.nrv) * 100);
    if (base.nrvUnit === 'mg' && unit === 'g') {
      percent = Math.round((value * 1000 / base.nrv) * 100);
    }
    return { name, value, unit, ...base, percent };
  }).filter(d => d.value > 0);
});

const handleBack = () => {
  router.push({
    path: '/materials',
    query: route.query
  });
};

const loadData = async () => {
  const id = route.params.id as string;
  material.value = await materialStore.getMaterial(id);

  nutritionLoading.value = true;
  try {
    const res = await nutritionStore.getMaterialNutrition(id);
    if (res?.success && res.data?.per100g) {
      nutritionData.value = Object.entries(res.data.per100g)
        .filter(([, value]) => (value as number) > 0)
        .map(([key, value]) => {
          const [name, unit] = nutrientInfoMap[key] || [key, ''];
          return {
            nutrient: name,
            value: typeof value === 'number' ? value.toFixed(2) : String(value),
            unit,
          };
        });
      if (res.data.dataSource) nutritionMeta.dataSource = res.data.dataSource;
      if (res.data.sourceDetail) nutritionMeta.sourceDetail = res.data.sourceDetail;
      if (res.data.confidence) nutritionMeta.confidence = res.data.confidence;
      if (res.data.fieldSources) nutritionFieldSources.value = res.data.fieldSources;
      if (res.data.sourceType) nutritionSourceType.value = res.data.sourceType;
    }
  } catch {
    // ignore nutrition fetch failure
  } finally {
    nutritionLoading.value = false;
  }
};

const showExportDrawer = ref(false);
const exporting = ref(false);
const exportForm = reactive({
  exportType: 'excel' as 'excel' | 'pdf',
  templateId: '',
});

const materialTemplates = computed(() => {
  return exportStore.templates.filter((t: ExportTemplate) => t.category === 'material' && t.type === exportForm.exportType);
});

const handleExport = () => {
  showExportDrawer.value = true;
};

const doExport = async () => {
  const materialId = route.params.id as string;
  if (!materialId) return;
  exporting.value = true;
  try {
    const res = await exportStore.createJob({
      dataCategory: 'material',
      exportType: exportForm.exportType,
      materialIds: [materialId],
      templateId: exportForm.templateId || undefined,
    });
    if (res.success && res.data) {
      if (res.data.status === 'completed' && res.data.fileName) {
        await exportStore.downloadFile(res.data.jobId, res.data.fileName, exportForm.exportType);
        MessagePlugin.success('导出成功');
      } else if (res.data.status === 'failed') {
        MessagePlugin.error(res.data.errorMessage || '导出失败');
      }
    } else {
      MessagePlugin.error(res.message || '导出失败');
    }
  } catch (error: unknown) {
    MessagePlugin.error(error instanceof Error ? error.message : '导出失败');
  } finally {
    exporting.value = false;
    showExportDrawer.value = false;
  }
};

onMounted(() => {
  loadData();
  exportStore.fetchTemplates({ category: 'material' });
});
</script>

<style scoped lang="scss">
.material-detail {

  .detail-header {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-left: -32px;
    margin-right: -32px;
    padding: 8px 32px;
    background-color: rgba(255, 255, 255, 0.80);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--color-border-light);
    animation: fadeInDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;

      .header-back-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        background: transparent;
        color: var(--color-text-placeholder);
        cursor: pointer;
        transition: all $transition-fast;
        font-size: 20px;

        &:hover {
          color: var(--color-primary);
          background-color: var(--color-emerald-50);
        }
      }

      .header-title-group {
        display: flex;
        flex-direction: column;
        gap: var(--space-1-5);

        .header-breadcrumb {
          display: flex;
          align-items: center;
          gap: var(--space-1-5);
          font-size: 12px;
          line-height: 1;

          .breadcrumb-link {
            color: var(--color-text-placeholder);
            cursor: pointer;
            transition: color 0.15s;
            text-decoration: none;

            &:hover {
              color: var(--color-primary);
            }
          }

          .breadcrumb-sep {
            font-size: 12px;
            color: var(--color-text-placeholder);
          }

          .breadcrumb-current {
            color: var(--color-text-secondary);
          }
        }

        .material-title {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 18px;
          font-weight: 700;
          color: var(--color-text-primary);
          line-height: 1.35;

          .type-tag {
            display: inline-block !important;
            padding: var(--space-0-5) 8px;
            font-size: 10px;
            font-weight: 900;
            border-radius: 6px;
            line-height: 1.6;
            white-space: nowrap;
            letter-spacing: 0.02em;
            flex-shrink: 0;

            &--supplement {
              background-color: var(--color-info-bg);
              color: var(--color-info);
            }

            &--herb {
              background-color: var(--color-primary-bg);
              color: var(--color-primary-dark);
            }
          }

          .title-version-tag {
            display: inline-flex;
            align-items: center;
            padding: 2px 10px;
            background: var(--color-primary-bg);
            color: var(--color-primary);
            font-size: 12px;
            font-weight: 700;
            border-radius: 999px;
            font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
          }

          .title-status-tag {
            display: inline-flex;
            align-items: center;
            padding: 2px 10px;
            font-size: 10px;
            font-weight: 700;
            border-radius: 999px;
            letter-spacing: 0.02em;

            &--draft {
              background: var(--color-bg-page);
              color: var(--color-text-placeholder);
              border: 1px solid var(--color-border-light);
            }

            &--pending {
              background: var(--color-warning-bg);
              color: var(--color-warning);
            }

            &--published {
              background: var(--color-primary-bg);
              color: var(--color-primary-dark);
            }
          }
        }
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;

      .header-action-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background-color: var(--color-primary);
        color: var(--color-text-white);
        border: none;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 700;
        box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.25);
        cursor: pointer;
        transition: all $transition-fast;

        .btn-icon {
          font-size: 18px;
        }

        &:hover {
          background-color: var(--color-primary-dark);
          transform: translateY(-1px);
          box-shadow: 0 14px 20px -3px rgba(16, 185, 129, 0.35);
        }

        &:active {
          transform: translateY(0);
          background-color: var(--color-primary-deep);
        }
      }
    }
  }

  .detail-main {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 24px;
    margin-top: 24px;
    margin-bottom: 24px;
    padding-bottom: 24px;

    .detail-left-col {
      grid-column: span 12;

      @media (min-width: 1024px) {
        grid-column: span 3;
      }

      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .detail-right-col {
      grid-column: span 12;

      @media (min-width: 1024px) {
        grid-column: span 9;
      }

      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .info-card {
      background: var(--color-bg-container);
      padding: 24px;
      border-radius: var(--radius-4xl);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      border: 1px solid var(--color-bg-page);
      animation: fadeInUp 0.35s ease both;

      .card-label {
        font-size: 14px;
        font-weight: 700;
        color: var(--color-text-placeholder);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 24px;
        display: flex;
        align-items: center;
        gap: 8px;

        .label-icon {
          font-size: 16px;
          color: var(--color-primary);
          opacity: 0.7;
        }
      }
    }

    .card-fields {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .field-item {
        padding: 12px;
        background: var(--color-bg-page);
        border-radius: 16px;
        border: 1px solid var(--color-border-light);

        label {
          display: flex;
          align-items: center;
          gap: var(--space-1-5);
          font-size: 10px;
          font-weight: 700;
          color: var(--color-text-placeholder);
          text-transform: uppercase;
          margin-bottom: 4px;

          .t-icon {
            color: var(--color-primary);
            opacity: 0.55;
            flex-shrink: 0;
          }
        }

        p {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
          font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
        }

        .field-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 2px;
        }
      }

      .field-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;

        .field-item p {
          font-family: inherit;
        }

        .status-warn {
          color: var(--color-warning);
        }

        .status-ok {
          color: var(--color-primary);
        }
      }
    }

    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px !important;
    }

    .timeline-list {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .timeline-item {
      display: flex;
      gap: 12px;
      position: relative;

      &:not(:last-child)::after {
        content: '';
        position: absolute;
        left: 11px;
        top: 28px;
        bottom: -24px;
        width: 2px;
        background: var(--color-border-light);
      }

      .timeline-dot {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--color-primary);
        border: 4px solid var(--color-primary-bg);
        z-index: 1;
        flex-shrink: 0;

        &.past {
          background: var(--color-text-placeholder);
          border-color: var(--color-border-light);
        }
      }

      .timeline-content {
        .timeline-ver {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 var(--space-0-5);

          &.past {
            color: var(--color-text-secondary);
          }
        }

        .timeline-time {
          font-size: 12px;
          color: var(--color-text-placeholder);
          margin: 0 0 var(--space-1-5);

          &.past {
            color: var(--color-text-placeholder);
          }
        }

        .timeline-note {
          margin-top: 8px;
          padding: 8px 12px;
          background: var(--color-bg-page);
          border-radius: 8px;
          font-size: 12px;
          color: var(--color-text-placeholder);
          line-height: 1.5;

          &.past {
            color: var(--color-text-placeholder);
          }
        }
      }
    }

    .nutrition-section {
      background: var(--color-bg-container);
      border-radius: var(--radius-4xl);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      border: 1px solid var(--color-bg-page);
      overflow: hidden;
      animation: fadeInUp 0.4s ease both;

      .nutrition-header {
        padding: 20px 24px;
        border-bottom: 1px solid var(--color-bg-page);
        background: rgba(248, 250, 252, 0.5);
        display: flex;
        justify-content: space-between;
        align-items: center;

        .nutrition-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
        }

        .nutrition-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nutrition-subtitle {
          font-size: 13px;
          color: var(--color-text-placeholder);
          margin: 4px 0 0;
        }
      }

      .nutrition-loading {
        text-align: center;
        padding: 48px 24px;
      }

      .nutrition-grid {
        padding: 24px;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }

      .nutrition-item {
        padding: 16px;
        background: var(--color-bg-page);
        border-radius: 16px;
        border: 1px solid var(--color-border-light);
        transition: all $transition-fast;

        &:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          transform: translateY(-1px);
        }

        &--highlight {
          background: linear-gradient(135deg, var(--color-emerald-50) 0%, var(--color-emerald-50) 100%);
          border-color: var(--color-primary-bg);

          .nutri-label {
            color: var(--color-primary-dark);
          }

          .nutri-value {
            color: var(--color-primary-deep);
          }

          .nutri-bar-fill {
            background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
          }
        }

        .nutri-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin-bottom: var(--space-1-5);
        }

        .nutri-value {
          font-size: 22px;
          font-weight: 800;
          color: var(--color-text-primary);
          line-height: 1.2;

          .nutri-unit {
            font-size: 13px;
            font-weight: 500;
            color: var(--color-text-placeholder);
            margin-left: var(--space-0-5);
          }
        }

        .nutri-bar-track {
          height: 6px;
          background: var(--color-border);
          border-radius: var(--radius-xs);
          margin-top: var(--space-2-5);
          overflow: hidden;

          .nutri-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
            border-radius: var(--radius-xs);
            transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          }
        }

        .nutri-percent {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-placeholder);
          margin-top: var(--space-1-5);
          text-align: right;
        }
      }

      .nutrition-empty {
        padding: var(--space-16) 24px;
        text-align: center;
      }
    }

    .energy-calc-section {
      background: var(--color-bg-container);
      border-radius: var(--radius-4xl);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      border: 1px solid var(--color-bg-page);
      overflow: hidden;
      animation: fadeInUp 0.45s ease both;

      .energy-header {
        padding: 20px 24px;
        border-bottom: 1px solid var(--color-bg-page);
        background: rgba(16, 185, 129, 0.08);
        display: flex;
        justify-content: space-between;
        align-items: center;

        .energy-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 4px;
        }

        .energy-subtitle {
          font-size: 13px;
          color: var(--color-text-placeholder);
          margin: 0;
        }
      }

      .energy-content {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .calc-formula-card {
        background: var(--color-bg-page);
        border-radius: 16px;
        border: 1px solid var(--color-border);
        padding: 20px;

        .formula-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 16px;
        }

        .formula-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .formula-item {
          display: grid;
          grid-template-columns: 80px 1fr 120px;
          align-items: center;
          gap: 12px;
          padding: var(--space-2-5) var(--space-3-5);
          background: var(--color-bg-container);
          border-radius: 10px;
          border: 1px solid var(--color-border-light);

          .formula-label {
            font-size: 13px;
            font-weight: 600;
            color: var(--color-text-secondary);
          }

          .formula-coeff {
            font-size: 13px;
            color: var(--color-text-secondary);
            font-family: ui-monospace, SFMono-Regular, monospace;
          }

          .formula-result {
            font-size: 13px;
            font-weight: 700;
            color: var(--color-primary);
            text-align: right;
            font-family: ui-monospace, SFMono-Regular, monospace;
          }
        }
      }

      .total-energy-card {
        background: linear-gradient(135deg, var(--color-emerald-50) 0%, var(--color-emerald-50) 100%);
        border-radius: 16px;
        border: 1px solid var(--color-primary-bg);
        padding: 20px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;

        .total-left {
          display: flex;
          flex-direction: column;
          gap: var(--space-1-5);

          .total-label {
            font-size: 12px;
            font-weight: 600;
            color: var(--color-primary-dark);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .total-value {
            font-size: 36px;
            font-weight: 800;
            color: var(--color-primary-deep);
            line-height: 1;

            .total-unit {
              font-size: 16px;
              font-weight: 500;
              color: var(--color-primary);
              margin-left: 4px;
            }
          }
        }

        .total-right {
          display: flex;
          height: 32px;
          border-radius: 16px;
          overflow: hidden;
          width: 200px;
          position: relative;

          .breakdown-bar {
            height: 100%;
            position: relative;
            transition: width 0.5s ease;

            &:first-child {
              border-radius: 16px 0 0 16px;
            }

            &:last-child {
              border-radius: 0 16px 16px 0;
            }

            .breakdown-tooltip {
              position: absolute;
              top: -32px;
              left: 50%;
              transform: translateX(-50%);
              font-size: 11px;
              font-weight: 600;
              white-space: nowrap;
              opacity: 0;
              transition: opacity 0.2s;
              pointer-events: none;
              background: var(--color-text-primary);
              color: var(--color-text-white);
              padding: 4px 8px;
            }

            &:hover .breakdown-tooltip {
              opacity: 1;
            }
          }
        }
      }

      .nrv-compare-card {
        background: var(--color-bg-container);
        border-radius: 16px;
        border: 1px solid var(--color-border-light);
        overflow: hidden;

        .nrv-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 16px 20px;
          border-bottom: 1px solid var(--color-bg-page);
          background: var(--color-bg-page);
        }

        .nrv-list {
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: var(--space-2-5);
        }

        .nrv-item {
          display: grid;
          grid-template-columns: 90px 1fr auto;
          align-items: center;
          gap: 12px;

          .nrv-name {
            font-size: 12px;
            font-weight: 600;
            color: var(--color-text-secondary);
          }

          .nrv-bar-track {
            height: 8px;
            background: var(--color-bg-hover);
            border-radius: 4px;
            overflow: hidden;

            .nrv-bar-fill {
              height: 100%;
              border-radius: 4px;
              transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            }
          }

          .nrv-percent {
            font-size: 11px;
            font-weight: 600;
            color: var(--color-text-placeholder);
            white-space: nowrap;

            &.nrv-exceed {
              color: var(--color-danger);
            }
          }
        }
      }

      .energy-empty {
        padding: var(--space-16) 24px;
        text-align: center;
      }
    }
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-12px);
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
