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
            </h2>
          </div>
        </div>
        <div class="header-actions">
          <button class="header-action-btn" @click="router.push(`/materials/${route.params.id}/edit`)">
            <t-icon name="edit" class="btn-icon" />
            编辑原料
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
              <div class="field-grid-2">
                <div class="field-item">
                  <label><t-icon name="time" size="12px" /> 创建时间</label>
                  <p>{{ material.createdAt }}</p>
                </div>
                <div class="field-item">
                  <label><t-icon name="edit-1" size="12px" /> 更新时间</label>
                  <p>{{ material.updatedAt }}</p>
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
                <t-tag variant="light" theme="success" size="small" shape="round">标准参考</t-tag>
                <template v-if="nutritionMeta.dataSource">
                  <t-tag theme="default" variant="light" size="small">
                    <template #icon><t-icon name="books" /></template>
                    {{ nutritionMeta.dataSource }}
                  </t-tag>
                  <t-tag :theme="confidenceTheme" variant="light" size="small">
                    <template #icon><t-icon name="checked" /></template>
                    {{ confidenceLabel }}
                  </t-tag>
                </template>
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
                    <span class="total-value">{{ energyCalcData.total }}<small class="total-unit">kcal</small></span>
                  </div>
                  <div class="total-right">
                    <div v-for="(item, idx) in energyCalcData.breakdown" :key="idx" class="breakdown-bar"
                      :style="{ width: item.percent + '%' }">
                      <span class="breakdown-tooltip">{{ item.name }}: {{ item.cal }}kcal ({{ item.percent }}%)</span>
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
                      <span class="formula-coeff">{{ energyCalcData.protein }}g × 17 kcal/g</span>
                      <span class="formula-result">= {{ energyCalcData.proteinCal }} kcal</span>
                    </div>
                    <div class="formula-item">
                      <span class="formula-label">脂肪</span>
                      <span class="formula-coeff">{{ energyCalcData.fat }}g × 37 kcal/g</span>
                      <span class="formula-result">= {{ energyCalcData.fatCal }} kcal</span>
                    </div>
                    <div class="formula-item">
                      <span class="formula-label">碳水化合物</span>
                      <span class="formula-coeff">{{ energyCalcData.carb }}g × 17 kcal/g</span>
                      <span class="formula-result">= {{ energyCalcData.carbCal }} kcal</span>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMaterialStore } from '@/stores/material';
import { useNutritionStore } from '@/stores/nutrition';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';

const router = useRouter();
const route = useRoute();
const materialStore = useMaterialStore();
const nutritionStore = useNutritionStore();

const material = ref<any>(null);
const nutritionLoading = ref(false);
const nutritionData = ref<any[]>([]);
const nutritionMeta = reactive({
  dataSource: '',
  confidence: 'medium' as 'high' | 'medium' | 'low',
});

const confidenceMap: Record<string, { label: string; theme: 'success' | 'warning' | 'default'; }> = {
  high: { label: '高可信度', theme: 'success' },
  medium: { label: '中可信度', theme: 'warning' },
  low: { label: '低可信度', theme: 'default' },
};

const confidenceLabel = computed(() => confidenceMap[nutritionMeta.confidence]?.label || '中可信度');
const confidenceTheme = computed(() => confidenceMap[nutritionMeta.confidence]?.theme || 'warning');

const nutrientInfoMap: Record<string, [string, string]> = {
  energy: ['能量', 'kcal'], protein: ['蛋白质', 'g'], fat: ['脂肪', 'g'], carbohydrate: ['碳水化合物', 'g'],
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
    { name: '蛋白质', cal: proteinCal, percent: total > 0 ? Math.round((proteinCal / total) * 100) : 0, color: '#3b82f6' },
    { name: '脂肪', cal: fatCal, percent: total > 0 ? Math.round((fatCal / total) * 100) : 0, color: '#f59e0b' },
    { name: '碳水', cal: carbCal, percent: total > 0 ? Math.round((carbCal / total) * 100) : 0, color: '#10b981' },
  ];
  return { protein, fat, carb, proteinCal, fatCal, carbCal, total, breakdown };
});

const nrvData = computed(() => {
  const nrvBase: Record<string, { nrv: number; nrvUnit: string; color: string; }> = {
    '蛋白质': { nrv: 60, nrvUnit: 'g', color: '#3b82f6' },
    '脂肪': { nrv: 60, nrvUnit: 'g', color: '#f59e0b' },
    '碳水化合物': { nrv: 300, nrvUnit: 'g', color: '#10b981' },
    '膳食纤维': { nrv: 25, nrvUnit: 'g', color: '#8b5cf6' },
    '钠': { nrv: 2000, nrvUnit: 'mg', color: '#ef4444' },
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

const handleBack = () => router.push('/materials');

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
      if (res.data.confidence) nutritionMeta.confidence = res.data.confidence;
    }
  } catch {
  } finally {
    nutritionLoading.value = false;
  }
};

onMounted(() => { loadData(); });
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
    padding: 16px 32px;
    background-color: rgba(255, 255, 255, 0.80);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #f1f5f9;
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
        color: #94a3b8;
        cursor: pointer;
        transition: all $transition-fast;
        font-size: 20px;

        &:hover {
          color: #10b981;
          background-color: #ecfdf5;
        }
      }

      .header-title-group {
        display: flex;
        flex-direction: column;
        gap: 6px;

        .header-breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          line-height: 1;

          .breadcrumb-link {
            color: #94a3b8;
            cursor: pointer;
            transition: color 0.15s;
            text-decoration: none;

            &:hover {
              color: #10b981;
            }
          }

          .breadcrumb-sep {
            font-size: 12px;
            color: #94a3b8;
          }

          .breadcrumb-current {
            color: #475569;
          }
        }

        .material-title {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.35;

          .type-tag {
            display: inline-block !important;
            padding: 2px 8px;
            font-size: 10px;
            font-weight: 900;
            border-radius: 6px;
            line-height: 1.6;
            white-space: nowrap;
            letter-spacing: 0.02em;
            flex-shrink: 0;

            &--supplement {
              background-color: #dbeafe;
              color: #2563eb;
            }

            &--herb {
              background-color: #d1fae5;
              color: #059669;
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
        background-color: #10b981;
        color: #ffffff;
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
          background-color: #059669;
          transform: translateY(-1px);
          box-shadow: 0 14px 20px -3px rgba(16, 185, 129, 0.35);
        }

        &:active {
          transform: translateY(0);
          background-color: #047857;
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
      background: #fff;
      padding: 24px;
      border-radius: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      border: 1px solid #f8fafc;
      animation: fadeInUp 0.35s ease both;

      .card-label {
        font-size: 14px;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 24px;
        display: flex;
        align-items: center;
        gap: 8px;

        .label-icon {
          font-size: 16px;
          color: #10b981;
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
        background: #f8fafc;
        border-radius: 16px;
        border: 1px solid #f1f5f9;

        label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          margin-bottom: 4px;

          .t-icon {
            color: #10b981;
            opacity: 0.55;
            flex-shrink: 0;
          }
        }

        p {
          font-size: 14px;
          font-weight: 700;
          color: #334155;
          margin: 0;
          font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
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
          color: #f59e0b;
        }

        .status-ok {
          color: #10b981;
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
        background: #f1f5f9;
      }

      .timeline-dot {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #10b981;
        border: 4px solid #d1fae5;
        z-index: 1;
        flex-shrink: 0;

        &.past {
          background: #cbd5e1;
          border-color: #f1f5f9;
        }
      }

      .timeline-content {
        .timeline-ver {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 2px;

          &.past {
            color: #475569;
          }
        }

        .timeline-time {
          font-size: 12px;
          color: #94a3b8;
          margin: 0 0 6px;

          &.past {
            color: #94a3b8;
          }
        }

        .timeline-note {
          margin-top: 8px;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 8px;
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.5;

          &.past {
            color: #94a3b8;
          }
        }
      }
    }

    .nutrition-section {
      background: #fff;
      border-radius: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      border: 1px solid #f8fafc;
      overflow: hidden;
      animation: fadeInUp 0.4s ease both;

      .nutrition-header {
        padding: 20px 24px;
        border-bottom: 1px solid #f8fafc;
        background: rgba(248, 250, 252, 0.5);
        display: flex;
        justify-content: space-between;
        align-items: center;

        .nutrition-title {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .nutrition-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nutrition-subtitle {
          font-size: 13px;
          color: #94a3b8;
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
        background: #f8fafc;
        border-radius: 16px;
        border: 1px solid #f1f5f9;
        transition: all $transition-fast;

        &:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          transform: translateY(-1px);
        }

        &--highlight {
          background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
          border-color: #d1fae5;

          .nutri-label {
            color: #059669;
          }

          .nutri-value {
            color: #047857;
          }

          .nutri-bar-fill {
            background: linear-gradient(90deg, #10b981, #34d399);
          }
        }

        .nutri-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin-bottom: 6px;
        }

        .nutri-value {
          font-size: 22px;
          font-weight: 800;
          color: #1e293b;
          line-height: 1.2;

          .nutri-unit {
            font-size: 13px;
            font-weight: 500;
            color: #94a3b8;
            margin-left: 2px;
          }
        }

        .nutri-bar-track {
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          margin-top: 10px;
          overflow: hidden;

          .nutri-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #34d399);
            border-radius: 3px;
            transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          }
        }

        .nutri-percent {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          margin-top: 6px;
          text-align: right;
        }
      }

      .nutrition-empty {
        padding: 64px 24px;
        text-align: center;
      }
    }

    .energy-calc-section {
      background: #fff;
      border-radius: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      border: 1px solid #f8fafc;
      overflow: hidden;
      animation: fadeInUp 0.45s ease both;

      .energy-header {
        padding: 20px 24px;
        border-bottom: 1px solid #f8fafc;
        background: rgba(16, 185, 129, 0.08);
        display: flex;
        justify-content: space-between;
        align-items: center;

        .energy-title {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 4px;
        }

        .energy-subtitle {
          font-size: 13px;
          color: #94a3b8;
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
        background: #f8fafc;
        border-radius: 16px;
        border: 1px solid #e2e8f0;
        padding: 20px;

        .formula-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
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
          padding: 10px 14px;
          background: #fff;
          border-radius: 10px;
          border: 1px solid #f1f5f9;

          .formula-label {
            font-size: 13px;
            font-weight: 600;
            color: #475569;
          }

          .formula-coeff {
            font-size: 13px;
            color: #64748b;
            font-family: ui-monospace, SFMono-Regular, monospace;
          }

          .formula-result {
            font-size: 13px;
            font-weight: 700;
            color: #10b981;
            text-align: right;
            font-family: ui-monospace, SFMono-Regular, monospace;
          }
        }
      }

      .total-energy-card {
        background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
        border-radius: 16px;
        border: 1px solid #d1fae5;
        padding: 20px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;

        .total-left {
          display: flex;
          flex-direction: column;
          gap: 6px;

          .total-label {
            font-size: 12px;
            font-weight: 600;
            color: #059669;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .total-value {
            font-size: 36px;
            font-weight: 800;
            color: #047857;
            line-height: 1;

            .total-unit {
              font-size: 16px;
              font-weight: 500;
              color: #10b981;
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
              background: #1e293b;
              color: #fff;
              padding: 4px 8px;
              border-radius: 6px;
            }

            &:hover .breakdown-tooltip {
              opacity: 1;
            }
          }
        }
      }

      .nrv-compare-card {
        background: #fff;
        border-radius: 16px;
        border: 1px solid #f1f5f9;
        overflow: hidden;

        .nrv-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 16px 20px;
          border-bottom: 1px solid #f8fafc;
          background: #f8fafc;
        }

        .nrv-list {
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .nrv-item {
          display: grid;
          grid-template-columns: 90px 1fr auto;
          align-items: center;
          gap: 12px;

          .nrv-name {
            font-size: 12px;
            font-weight: 600;
            color: #475569;
          }

          .nrv-bar-track {
            height: 8px;
            background: #f1f5f9;
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
            color: #94a3b8;
            white-space: nowrap;

            &.nrv-exceed {
              color: #ef4444;
            }
          }
        }
      }

      .energy-empty {
        padding: 64px 24px;
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
