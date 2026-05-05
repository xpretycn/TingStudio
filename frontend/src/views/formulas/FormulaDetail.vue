<template>
  <div class="formula-detail" v-loading="loading">
    <template v-if="!loading && data">
      <!-- 顶部 Header（还原 recipe-detail.html 设计） -->
      <header class="detail-header">
        <!-- 左侧区域 -->
        <div class="header-left">
          <!-- 返回按钮 -->
          <button class="header-back-btn" @click="handleBack" title="返回列表">
            <t-icon name="arrow-left" />
          </button>
          <!-- 标题区（面包屑 + 名称 + 版本标签） -->
          <div class="header-title-group">
            <!-- 面包屑导航 -->
            <nav class="header-breadcrumb">
              <a class="breadcrumb-link" @click="handleBack">配方管理</a>
              <t-icon name="chevron-right" class="breadcrumb-sep" />
              <span class="breadcrumb-current">配方详情</span>
            </nav>
            <!-- 标题行（名称 + 版本标签同行） -->
            <h2 class="formula-title">
              {{ data.formulaName }}
              <span class="version-tag">{{ currentVersion || 'V1.0' }}</span>
            </h2>
          </div>
        </div>
        <!-- 右侧：操作按钮组 -->
        <div class="header-actions">
          <button class="header-action-btn" @click="router.push(`/formulas/${route.params.id}/edit`)">
            <t-icon name="edit" class="btn-icon" />
            编辑配方
          </button>
          <button class="header-action-btn" @click="handleExport">
            <t-icon name="send" class="btn-icon" />
            导出配方
          </button>
        </div>
      </header>

      <!-- 营养数据缺失警告 -->
      <t-alert v-if="missingMaterials.length > 0"
        :theme="missingMaterials.length === data.calcRows?.length ? 'warning' : 'info'" class="nutrition-warning">
        <template #message>
          {{ missingMaterials.length === data.calcRows?.length
            ? '以下原料尚未录入营养数据，营养成分表无法计算：'
            : '以下原料营养数据缺失，计算结果可能不准确：'
          }}
          <t-tag v-for="name in missingMaterials" :key="name" theme="warning" variant="light" size="small"
            style="margin: 2px 4px 2px 0;">
            {{ name }}
          </t-tag>
        </template>
      </t-alert>

      <!-- ═══ 主内容区域：左右两栏网格（还原 recipe-detail.html main） ═══ -->
      <!-- 布局：grid grid-cols-12 gap-8 | 左侧 col-span-3 | 右侧 col-span-9 -->
      <main class="detail-main">
        <!-- ══ 左侧栏 (col-span-12 lg:col-span-3) ══ -->
        <div class="detail-left-col">

          <!-- 配方概况卡片 -->
          <section class="info-card">
            <h3 class="card-label">
              <t-icon name="file-paste" class="label-icon" />
              配方概况
            </h3>
            <div class="card-fields">
              <div class="field-item">
                <label><t-icon name="barcode" size="12px" /> 配方编号</label>
                <p>{{ data.formulaId || '--' }}</p>
              </div>
              <div class="field-grid-2">
                <div class="field-item">
                  <label><t-icon name="measurement" size="12px" /> 成品重量</label>
                  <p>{{ data.finishedWeight || 0 }}g</p>
                </div>
                <div class="field-item">
                  <label><t-icon name="control-platform" size="12px" /> 比例因子</label>
                  <p>{{ (data.ratioFactor || 0) * 100 }}%</p>
                </div>
              </div>
              <div class="field-grid-2">
                <div class="field-item">
                  <label><t-icon name="layers" size="12px" /> 原料数量</label>
                  <p>{{ data.calcRows?.length || 0 }} 种</p>
                </div>
                <div class="field-item">
                  <label><t-icon name="check-circle" size="12px" /> 营养状态</label>
                  <p
                    :class="{ 'status-warn': missingMaterials.length > 0, 'status-ok': missingMaterials.length === 0 }">
                    {{ missingMaterials.length > 0 ? `${missingMaterials.length}项缺数据` : '完整' }}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <!-- 关联业务员与需求 -->
          <section class="info-card salesman-card">
            <div class="salesman-bg-circle"></div>
            <h3 class="card-label">
              <t-icon name="user-circle" class="label-icon" />
              关联业务员与需求
            </h3>
            <div class="salesman-content">
              <div class="salesman-profile">
                <div class="salesman-avatar">
                  <t-icon name="user" />
                </div>
                <div>
                  <p class="salesman-name">{{ data.salesmanName || '--' }}</p>
                  <p class="salesman-dept">{{ data.salesmanDept || '--' }}</p>
                </div>
              </div>
              <div v-if="data.demandTitle" class="demand-box">
                <div class="demand-header">
                  <span class="demand-tag">{{ data.demandCode || '关联需求' }}</span>
                  <span v-if="data.demandPriority" class="priority-badge">{{ data.demandPriority }}</span>
                </div>
                <p class="demand-title">{{ data.demandTitle }}</p>
                <p v-if="data.demandDesc" class="demand-desc">{{ data.demandDesc }}</p>
              </div>
            </div>
          </section>

          <!-- 备注信息 -->
          <section class="info-card" v-if="data.remark || data.note">
            <h3 class="card-label">
              <t-icon name="chat-bubble" class="label-icon" />
              备注信息
            </h3>
            <div class="remark-content">
              {{ data.remark || data.note }}
            </div>
          </section>

          <!-- 制法 -->
          <section class="info-card" v-if="data.preparationMethod">
            <h3 class="card-label">
              <t-icon name="setting" class="label-icon" />
              制法
            </h3>
            <div class="remark-content">
              {{ data.preparationMethod }}
            </div>
          </section>

          <!-- 报价明细卡 -->
          <section v-if="priceQuote" class="info-card quote-card">
            <h3 class="card-label">
              <t-icon name="currency-exchange" class="label-icon" />
              配方报价
            </h3>
            <div class="quote-card-body">
              <!-- 原料明细列表 -->
              <div v-if="priceQuote.materials?.length" class="qt-mat-list">
                <div v-for="(m, i) in priceQuote.materials" :key="i" class="qt-mat-item"
                  :class="{ 'qt-mat--warn': m.unitPrice === null, 'qt-mat--adjusted': m.isAdjusted }">
                  <span class="qtm-name">{{ m.materialName }}</span>
                  <span class="qtm-detail">{{ m.quantity }}g × ¥{{ m.unitPrice ?? '--' }}/kg
                    <span v-if="m.isAdjusted" class="qtm-adjust-badge" :title="'基价: ¥' + (m.basePrice ?? '--') + '/kg'">
                      <svg viewBox="0 0 12 12" width="10" height="10">
                        <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9L3 11L3.5 7.5L1 5L4.5 4.5Z" fill="#b45309" />
                      </svg>调
                    </span></span>
                  <span class="qtm-sub"><strong>{{ m.unitPrice != null ? `¥${m.subtotal.toFixed(2)}` : '--'
                  }}</strong>
                    <span v-if="m.isAdjusted && m.basePrice != null" class="qtm-base-hint"
                      :title="'原始基价: ¥' + m.basePrice + '/kg · 差额: ¥' + ((m.unitPrice - m.basePrice)).toFixed(2) + '/kg'">({{
                        ((m.unitPrice - m.basePrice) / m.basePrice * 100).toFixed(1) }}%)</span>
                  </span>
                </div>
              </div>
              <p v-if="priceQuote.missingPrices?.length" class="qt-warn">
                <t-icon name="error-circle" /> 未录入单价：{{ priceQuote.missingPrices.join('、') }}，成本计算不完整，请补充原料价格
              </p>
              <!-- 汇总区域 -->
              <div class="qt-summary">
                <div class="qts-item qts-item--primary">
                  <t-icon name="outbox" size="14px" class="qts-icon" />
                  <span>原料成本</span><strong class="green">¥{{ (priceQuote.materialTotal ?? 0).toFixed(2)
                  }}</strong>
                </div>
                <div class="qts-item">
                  <t-icon name="shop" size="14px" class="qts-icon" />
                  <span>包材费用</span><strong>¥{{ (priceQuote.packagingPrice ?? 0).toFixed(2) }}</strong>
                </div>
                <div class="qts-item">
                  <t-icon name="edit-1" size="14px" class="qts-icon" />
                  <span>其他费用</span><strong>¥{{ (priceQuote.otherPrice ?? 0).toFixed(2) }}</strong>
                </div>
                <div class="qts-divider"></div>
                <div class="qts-item qts-item--primary" :class="{ 'qts-item--warn': priceQuote.missingPrices?.length }">
                  <t-icon name="wallet" size="14px" class="qts-icon" />
                  <span>成本小计</span>
                  <div class="qts-value-group">
                    <strong :class="priceQuote.missingPrices?.length ? 'warn-text' : 'green'">¥{{ (priceQuote.costSubtotal ?? 0).toFixed(2) }}</strong>
                    <span v-if="priceQuote.missingPrices?.length" class="qts-warn-tag">
                      <t-icon name="error-circle" size="11px" /> 不完整
                    </span>
                  </div>
                </div>
                <div class="qts-item">
                  <t-icon name="chart-pie" size="14px" class="qts-icon" />
                  <span>利润率</span><strong>{{ priceQuote.profitMargin ?? 20 }}%</strong>
                </div>
                <div class="qts-divider qts-divider--bold"></div>
                <div class="qts-item qts-item--final" :class="{ 'qts-item--warn': priceQuote.missingPrices?.length }">
                  <t-icon name="money-filled" size="16px" class="qts-icon" />
                  <span>最终报价</span>
                  <div class="qts-value-group">
                    <strong :class="priceQuote.missingPrices?.length ? 'warn-text' : 'final-price'">¥{{ (priceQuote.totalPrice ?? 0).toFixed(2) }}</strong>
                    <span v-if="priceQuote.missingPrices?.length" class="qts-warn-tag">
                      <t-icon name="error-circle" size="11px" /> 仅供参考
                    </span>
                  </div>
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
              <router-link :to="`/versions/formula/${route.params.id}`" class="timeline-link">
                <t-icon name="history" /> 查看全部
              </router-link>
            </div>
            <div class="timeline-list">
              <div class="timeline-item current">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                  <p class="timeline-ver">{{ currentVersion || 'V1.0' }}</p>
                  <p class="timeline-time">{{ formatDate(data.updatedAt || new Date()) }}</p>
                  <p v-if="data.remark" class="timeline-note">{{ data.remark }}</p>
                </div>
              </div>
              <div v-for="(ver, idx) in (data.versionHistory || []).slice(0, 2)" :key="idx" class="timeline-item">
                <div class="timeline-dot past"></div>
                <div class="timeline-content">
                  <p class="timeline-ver past">{{ ver.version }}</p>
                  <p class="timeline-time past">{{ formatDate(ver.createdAt) }}</p>
                  <p v-if="ver.note" class="timeline-note past">{{ ver.note }}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- ══ 右侧栏 (col-span-12 lg:col-span-9) ══ -->
        <div class="detail-right-col">

          <!-- 营养成分计算表格（对应参考设计的配比实时计算器） -->
          <section class="calc-section">
            <!-- 表头区：左右分布 | 左：配方名+副标题 | 右：成品总重标签 -->
            <div class="calc-header">
              <div>
                <h3 class="calc-title">{{ data.formulaName }}</h3>
                <p class="calc-subtitle">配方营养数据自动计算</p>
              </div>
              <!-- 成品总重：还原 recipe-detail.html 第166-170行 右侧内嵌输入框样式 -->
              <div class="weight-badge">
                <span class="weight-badge-label">成品总重(g)</span>
                <span class="weight-badge-value">{{ data.finishedWeight || 0 }}</span>
              </div>
            </div>
            <!-- 表格 -->
            <t-table v-if="missingMaterials.length < data.calcRows?.length" :data="calcTableData" :columns="calcColumns"
              row-key="name" size="small" bordered table-layout="auto" class="calc-table">
              <template #ratio="{ row }">
                <template v-if="typeof row.ratio === 'number' && !row._isEmpty">{{ (row.ratio * 100).toFixed(2)
                }}%</template>
                <template v-else-if="!row._isEmpty">{{ row.ratio }}</template>
              </template>
              <template #name="{ row }">
                <span v-if="row._isEmpty">&nbsp;</span>
                <span v-else :class="{ 'missing-nutrition': row.hasEmptyNutrition }">
                  {{ row.name }}
                  <t-icon v-if="row.hasEmptyNutrition" name="error-circle" class="missing-nutrition-icon" />
                </span>
              </template>
            </t-table>
            <div v-else class="calc-empty">
              <t-empty description="请先为原料录入营养数据后再查看营养成分表" role="status" />
            </div>
          </section>
          <!-- 营养成分表 + 技术处理依据（双栏卡片） -->
          <div v-if="missingMaterials.length < data.calcRows?.length" class="dual-cards-row">
            <!-- 营养成分表 -->
            <section class="nutrition-section">
              <h3 class="section-title info-color">营养成分表</h3>
              <t-table :data="data.labelRows" :columns="labelColumns" row-key="item" size="small" bordered
                table-layout="auto" class="nutri-table">
                <template #nrvPercent="{ row }">
                  {{ row.nrvPercent.toFixed(2) }}
                </template>
              </t-table>
            </section>
            <!-- 技术处理依据 / 使用说明 -->
            <section class="notes-section">
              <h3 class="section-title warn-color">使用说明</h3>
              <div class="notes-body">
                <div class="notes-item">(1) 含量比指原料在成品中含量比</div>
                <div class="notes-item">(2) 每100g原料中营养素值通过中国食物成分表或原料营养标签或自检测中查找</div>
                <div class="notes-item">(3) 营养素参考值(NRV)在GB 28050附录A查找</div>
                <div class="notes-item">(4) 只需输入配料重量和各配料营养素值就可自动计算出营养成分表</div>
                <div class="notes-item">(5) 通过技术处理就可以得出正式营养成分表</div>
              </div>
            </section>
          </div>

        </div>

      </main>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { nutritionApi } from '@/api/nutrition';
import { formulaApi } from '@/api/formula';

const router = useRouter();
const route = useRoute();

const loading = ref(false);
const data = ref<any>(null);
const priceQuote = ref<any>(null);
const missingMaterials = computed<string[]>(() => {
  return data.value?.missingNutritionMaterials || [];
});

// 当前版本号：优先取 URL query，其次取 API 数据的 version 字段
const currentVersion = computed(() => {
  const v = (route.query as any).v;
  if (v) return String(v);
  // 从 API 数据中获取版本信息
  if (data.value?.version) return String(data.value.version);
  return null;
});

const calcColumns = [
  { colKey: 'name', title: '原料名', width: 140 },
  { colKey: 'quantity', title: '配方(g)', width: 100 },
  { colKey: 'ratio', title: '含量比', width: 90, cell: 'ratio' },  // displayed as xx.xx%
  { colKey: 'energy', title: '能量(kJ/100g)', width: 130 },
  { colKey: 'protein', title: '蛋白质(g/100g)', width: 140 },
  { colKey: 'fat', title: '脂肪(g/100g)', width: 130 },
  { colKey: 'carbohydrate', title: '碳水化合物(g/100g)', width: 170 },
  { colKey: 'sodium', title: '钠(mg/100g)', width: 140 },
];

const labelColumns = [
  { colKey: 'item', title: '项目', width: 110 },
  { colKey: 'value', title: '每100克(g)', width: 110 },
  { colKey: 'unit', title: '', width: 120 },
  { colKey: 'nrvPercent', title: '营养素参考值%', width: 120 },
  { colKey: 'zeroThreshold', title: '0界限值', width: 130 },
  { colKey: 'tolerance', title: '允许误差范围', width: 140 },
];

const calcTableData = computed(() => {
  if (!data.value) return [];
  return [
    ...data.value.calcRows,
    { name: '', quantity: '', ratio: '', energy: '', protein: '', fat: '', carbohydrate: '', sodium: '', _isEmpty: true },
    data.value.summaryRow,
    data.value.nrvRow,
    data.value.nrvPercentRow,
  ];
});

const handleBack = () => {
  router.push({
    path: '/formulas',
    query: route.query
  });
};

// 格式化日期
const formatDate = (date: string | Date) => {
  if (!date) return '--';
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const handleExport = () => {
  router.push({ path: '/exports', query: { formulaId: route.params.id, formulaName: data.value?.formulaName } });
};

const loadData = async () => {
  const formulaId = (route.params.id || '') as string;
  console.log('[FormulaDetail] loadData called, route.params.id:', JSON.stringify(route.params.id), 'formulaId:', JSON.stringify(formulaId));
  if (!formulaId || formulaId === 'undefined') {
    console.warn('[FormulaDetail] 无效的 formulaId，跳过加载');
    return;
  }

  loading.value = true;
  try {
    const res = await nutritionApi.getFormulaNutritionTables(formulaId);
    data.value = res;
    try {
      priceQuote.value = await formulaApi.getPriceQuote(formulaId);
    } catch { /* 报价数据可选 */ }
  } catch (error: any) {
    console.error('获取营养计算表格失败:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => { loadData(); });

watch(() => route.params.id, (newId) => {
  console.log('[FormulaDetail] route.params.id changed:', JSON.stringify(newId));
  if (newId && newId !== 'undefined') {
    loadData();
  }
});
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.formula-detail {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Header 区域 — 精确复刻 recipe-detail.html (第32-64行)
  // 布局：sticky 顶栏 | 左侧：返回+面包屑+标题(含版本tag) | 右侧：emerald按钮
  // 注意：父容器 .right-content 已通过 no-top-padding class 消除了 padding-top
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  .detail-header {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    justify-content: space-between;
    align-items: center;
    // 突破父容器 .right-content 的左右 padding，实现全宽
    margin-left: -32px;
    margin-right: -32px;
    padding: 16px 32px; // px-8 py-4（内部内容仍保持间距）
    background-color: rgba(255, 255, 255, 0.80); // bg-white/80
    backdrop-filter: blur(12px); // backdrop-blur-md
    border-bottom: 1px solid #f1f5f9; // border-slate-100
    animation: fadeInDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;

    // ── 左侧：返回按钮 + 标题组 ──
    .header-left {
      display: flex;
      align-items: center;
      gap: 16px; // gap-4

      // 返回按钮：p-2 小尺寸，rounded-xl，slate-400 默认色，emerald 悬停
      .header-back-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px; // p-2 ≈ 8px padding + 内容 = ~36px
        height: 36px;
        border: none;
        border-radius: 12px; // rounded-xl
        background: transparent;
        color: #94a3b8; // text-slate-400
        cursor: pointer;
        transition: all $transition-fast; // transition-all
        font-size: 20px; // text-2xl

        &:hover {
          color: #10b981; // hover:text-emerald-500
          background-color: #ecfdf5; // hover:bg-emerald-50
        }
      }

      // 标题组（面包屑 + 标题）
      .header-title-group {
        display: flex;
        flex-direction: column;
        gap: 6px; // 增加面包屑与标题间距（原2px → 6px）

        // 面包屑导航：flex items-center gap-2 text-xs text-slate-400
        .header-breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px; // gap-2
          font-size: 12px; // text-xs
          line-height: 1;

          .breadcrumb-link {
            color: #94a3b8; // text-slate-400
            cursor: pointer;
            transition: color 0.15s;
            text-decoration: none;

            &:hover {
              color: #10b981; // hover:text-emerald-500
            }
          }

          .breadcrumb-sep {
            font-size: 12px;
            color: #94a3b8;
          }

          .breadcrumb-current {
            color: #475569; // text-slate-600
          }
        }

        // 标题行：text-lg font-bold text-slate-800 flex items-center gap-3
        .formula-title {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 12px; // gap-3
          font-size: 18px; // text-lg
          font-weight: 700; // font-bold
          color: #1e293b; // slate-800
          line-height: 1.35;

          // 版本标签：在标题内部同行显示
          .version-tag {
            display: inline-block !important; // 确保版本标签始终显示
            padding: 2px 8px; // px-2 py-0.5
            background-color: #d1fae5; // emerald-100
            color: #059669; // emerald-600
            font-size: 10px; // text-[10px]
            font-weight: 900; // font-black
            border-radius: 6px; // rounded-md
            line-height: 1.6;
            white-space: nowrap;
            letter-spacing: 0.02em;
            flex-shrink: 0; // 防止被压缩隐藏
          }
        }
      }
    }

    // ── 右侧：操作按钮组（emerald 绿色系）──
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px; // gap-3

      .header-action-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px; // gap-2
        padding: 8px 16px; // px-4 py-2
        background-color: #10b981; // bg-emerald-500
        color: #ffffff;
        border: none;
        border-radius: 12px; // rounded-xl
        font-size: 14px; // text-sm
        font-weight: 700; // font-bold
        box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.25); // shadow-lg shadow-emerald-100
        cursor: pointer;
        transition: all $transition-fast; // transition-all

        .btn-icon {
          font-size: 18px; // text-lg (图标略大于文字)
        }

        &:hover {
          background-color: #059669; // hover:bg-emerald-600
          transform: translateY(-1px);
          box-shadow: 0 14px 20px -3px rgba(16, 185, 129, 0.35);
        }

        &:active {
          transform: translateY(0);
          background-color: #047857; // emerald-700
        }
      }
    }
  }

  // ═══════════════════════════════════════
  // 主内容区域 — 还原 recipe-detail.html main (第65-391行)
  // 布局：grid grid-cols-12 gap-8 | 左4 右8 | slate/emerald 设计语言
  // ═══════════════════════════════════════

  .detail-main {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: $space-6; // gap-8 = 32px
    margin-top: $space-6; // mt-8 = 32px
    margin-bottom: $space-6; // mb-8 = 32px
    padding-bottom: $space-6;

    // ── 左侧栏 (col-span-12 lg:col-span-3) ──
    .detail-left-col {
      grid-column: span 12;

      @media (min-width: 1024px) {
        grid-column: span 3;
      }

      display: flex;
      flex-direction: column;
      gap: $space-6;
    }

    // ── 右侧栏 (col-span-12 lg:col-span-9) ──
    .detail-right-col {
      grid-column: span 12;

      @media (min-width: 1024px) {
        grid-column: span 9;
      }

      display: flex;
      flex-direction: column;
      gap: $space-6;
    }

    // ══ 通用卡片样式（匹配参考设计 bg-white rounded-[2rem] shadow-sm border-slate-50） ══
    .info-card {
      background: #fff;
      padding: $space-6; // p-8 = 32px
      border-radius: $radius-2xl; // rounded-[2rem]
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04); // shadow-sm
      border: 1px solid #f8fafc; // border-slate-50
      animation: fadeInUp 0.35s ease both;

      .card-label {
        font-size: 14px; // text-sm
        font-weight: 700; // font-bold
        color: #94a3b8; // text-slate-400
        text-transform: uppercase;
        letter-spacing: 0.1em; // tracking-widest
        margin-bottom: $space-5; // mb-6 = 24px
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

    // ══ 报价卡 — 列表式布局 ══
    .quote-card {
      .quote-card-body {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .qt-mat-list {
        background: #f8fafc;
        border-radius: 10px;
        padding: 12px 16px;
        border: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .qt-mat-item {
        display: flex !important;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        font-size: 13px;
        color: #334155;
        border-radius: 6px;

        &:hover {
          background-color: #f1f5f9;
        }

        &--warn {
          opacity: 0.55;

          .qtm-sub strong {
            color: #94a3b8 !important;
          }
        }

        &--adjusted {
          border-left: 3px solid #f59e0b;
          background: linear-gradient(90deg, rgba(254, 243, 199, 0.4) 0%, transparent 100%);

          .qtm-name {
            color: #92400e;
            font-weight: 600;
          }

          .qtm-sub {
            color: #78716c;

            .qtm-base-hint {
              color: #d97706;
            }
          }
        }

        .qtm-name {
          display: inline-block;
          min-width: 70px;
          font-weight: 600;
          white-space: nowrap;
        }

        .qtm-detail {
          flex: 1;
          color: #64748b;
          font-size: 12px;
        }

        .qtm-adjust-badge {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 10px;
          line-height: 1.4;
          padding: 2px 6px;
          border-radius: 6px;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          color: #b45309;
          font-weight: 700;
          margin-left: 4px;
          vertical-align: middle;
          cursor: help;
        }

        .qtm-sub {
          text-align: right;
          font-weight: 700;
          color: #059669;
          min-width: 60px;

          .qtm-base-hint {
            margin-left: 4px;
            font-size: 11px;
            color: #f59e0b;
            font-weight: 600;
            cursor: help;

            &:hover {
              text-decoration: underline;
            }
          }
        }
      }

      .qt-warn {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #f59e0b;
        background: #fffbeb;
        padding: 10px 14px;
        border-radius: 10px;
        border: 1px solid #fde68a;
      }

      .qt-summary {
        display: flex;
        flex-direction: column;
        gap: 2px;
        background: #f8fafc;
        border-radius: 16px;
        border: 1px solid #f1f5f9;
        padding: 10px 16px;
      }

      .qts-item {
        display: flex !important;
        align-items: center;
        justify-content: space-between;
        padding: 7px 8px;
        border-radius: 8px;
        font-size: 13px;

        &:hover {
          background-color: #fff;
        }

        &--primary {
          background: #ecfdf5;

          span,
          .qts-icon {
            color: #047857;
          }
        }

        &--warn {
          background: #fffbeb !important;

          span,
          .qts-icon {
            color: #b45309 !important;
          }
        }

        &--final {
          margin-top: 4px;
          padding-top: 10px;
          padding-bottom: 10px;

          span {
            color: #059669;
            font-weight: 700;
            font-size: 15px;
          }

          .qts-icon {
            color: #059669;
          }

          strong.final-price {
            font-size: 20px;
            color: #059669;
            font-weight: 800;
          }

          &.qts-item--warn {
            background: #fef3c7 !important;
            border: 1px solid #fde68a;
            border-radius: 10px;

            span {
              color: #b45309 !important;
            }

            .qts-icon {
              color: #b45309 !important;
            }
          }
        }

        >span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          font-weight: 500;
        }

        .qts-icon {
          color: #94a3b8;
          flex-shrink: 0;
        }

        strong {
          font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
          color: #334155;
          font-weight: 600;
        }

        strong.green {
          color: #059669;
          font-weight: 700;
        }

        strong.warn-text {
          color: #b45309;
          font-weight: 700;
        }

        .qts-value-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .qts-warn-tag {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 10px;
          font-weight: 500;
          color: #b45309;
          background: #fef3c7;
          padding: 1px 6px;
          border-radius: 8px;
          border: 1px solid #fde68a;
          white-space: nowrap;
        }
      }

      .qts-divider {
        height: 1px;
        background: #e2e8f0;
        margin: 4px 0;

        &--bold {
          background: #cbd5e1;
          margin: 6px 0;
        }
      }
    }

    // ══ 配方概况 — 字段网格 ══
    .card-fields {
      display: flex;
      flex-direction: column;
      gap: $space-3;

      .field-item {
        padding: $space-3; // p-4 = 16px
        background: #f8fafc; // bg-slate-50
        border-radius: $radius-xl; // rounded-2xl
        border: 1px solid #f1f5f9; // border-slate-100

        label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px; // text-[10px]
          font-weight: 700; // font-bold
          color: #94a3b8; // text-slate-400
          text-transform: uppercase;
          margin-bottom: 4px;

          .t-icon {
            color: #10b981;
            opacity: 0.55;
            flex-shrink: 0;
          }
        }

        p {
          font-size: 14px; // text-sm
          font-weight: 700; // font-bold
          color: #334155; // text-slate-700
          margin: 0;
          font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace; // font-mono
        }
      }

      .field-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: $space-3;

        .field-item {
          p {
            font-family: inherit; // 非编号字段不用等宽字体
          }
        }

        .status-warn {
          color: #f59e0b;
        }

        // amber-500
        .status-ok {
          color: #10b981;
        }

        // emerald-500
      }
    }

    // ══ 关联业务员与需求 ══
    .salesman-card {
      position: relative;
      overflow: hidden;

      .salesman-bg-circle {
        position: absolute;
        top: 0;
        right: 0;
        width: 128px;
        height: 128px;
        background: #eff6ff; // blue-50
        border-radius: 50%;
        transform: translate(50%, -50%);
        opacity: 0.5;
      }

      .salesman-content {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        gap: $space-5;
      }

      .salesman-profile {
        display: flex;
        align-items: center;
        gap: $space-3;

        .salesman-avatar {
          width: 48px;
          height: 48px;
          border-radius: $radius-xl; // rounded-2xl
          background: linear-gradient(135deg, #ecfdf5, #dbeafe);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #10b981;
          font-size: 22px;
        }

        .salesman-name {
          font-weight: 700;
          color: #1e293b; // slate-800
          font-size: 14px;
          margin: 0;
        }

        .salesman-dept {
          font-size: 12px; // text-xs
          color: #94a3b8; // slate-400
          margin: 2px 0 0;
        }
      }

      .demand-box {
        background: rgba(59, 130, 246, 0.05); // blue-50/50
        padding: $space-3;
        border-radius: $radius-xl;
        border: 1px solid #bfdbfe; // blue-100

        .demand-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;

          .demand-tag {
            font-size: 12px;
            font-weight: 900;
            color: #2563eb; // blue-600
            text-transform: uppercase;
            letter-spacing: -0.02em;
          }

          .priority-badge {
            padding: 2px 8px;
            background: #dbeafe; // blue-100
            color: #1d4ed8; // blue-700
            font-size: 10px;
            font-weight: 700;
            border-radius: 4px;
          }
        }

        .demand-title {
          font-weight: 700;
          color: #334155;
          font-size: 14px;
          margin: 0 0 4px;
        }

        .demand-desc {
          font-size: 12px; // text-xs
          color: #64748b; // slate-500
          line-height: 1.6;
          margin: 0;
        }
      }
    }

    // ══ 备注信息 ══
    .remark-content {
      font-size: 14px;
      color: #475569; // slate-600
      line-height: 1.7;
      padding: $space-3;
      background: #f8fafc; // slate-50
      border-radius: $radius-xl;
      border: 1px solid #f1f5f9; // slate-100
    }

    // ══ 变更记录时间线 ══
    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: $space-5 !important;

      .timeline-link {
        font-size: 13px;
        color: #94a3b8;
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: color 0.15s;

        &:hover {
          color: #10b981;
        }

        // emerald-500
      }
    }

    .timeline-list {
      display: flex;
      flex-direction: column;
      gap: $space-5;
    }

    .timeline-item {
      display: flex;
      gap: $space-3;
      position: relative;

      // 时间线连接线（非最后一项）
      &:not(:last-child)::after {
        content: '';
        position: absolute;
        left: 11px;
        top: 28px;
        bottom: -$space-5;
        width: 2px;
        background: #f1f5f9; // bg-slate-50
      }

      .timeline-dot {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #10b981; // emerald-500
        border: 4px solid #d1fae5; // emerald-100
        z-index: 1;
        flex-shrink: 0;

        &.past {
          background: #cbd5e1; // slate-200
          border-color: #f1f5f9; // slate-50
        }
      }

      .timeline-content {
        .timeline-ver {
          font-size: 14px; // text-sm
          font-weight: 700; // font-bold
          color: #1e293b; // slate-800
          margin: 0 0 2px;

          &.past {
            color: #475569;
          }

          // slate-600
        }

        .timeline-time {
          font-size: 12px; // text-xs
          color: #94a3b8; // slate-400
          margin: 0 0 6px;

          &.past {
            color: #94a3b8;
          }
        }

        .timeline-note {
          margin-top: 8px;
          padding: 8px 12px;
          background: #f8fafc; // slate-50
          border-radius: 8px;
          font-size: 12px; // text-xs
          color: #94a3b8; // slate-400
          line-height: 1.5;

          &.past {
            color: #94a3b8;
          }
        }
      }
    }

    // ══ 右侧：计算器表格区域 ══
    .calc-section {
      background: #fff;
      border-radius: $radius-2xl;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      border: 1px solid #f8fafc;
      overflow: hidden;
      animation: fadeInUp 0.4s ease both;

      .calc-header {
        padding: $space-5 $space-6;
        padding-bottom: $space-6;
        border-bottom: 1px solid #f8fafc;
        background: rgba(248, 250, 252, 0.5);
        display: flex;
        justify-content: space-between;
        align-items: center;

        .calc-title {
          font-size: 20px; // text-xl
          font-weight: 700; // font-bold
          color: #1e293b; // slate-800
          margin: 0 0 4px;
        }

        .calc-subtitle {
          font-size: 12px; // text-xs
          color: #94a3b8; // slate-400
          margin: 0;

          b.weight-val {
            color: #059669; // emerald-600
            font-weight: 700;
          }
        }

        // 成品总重徽章 — 还原 recipe-detail.html 第166-170行右侧内嵌样式
        .weight-badge {
          display: flex;
          align-items: center;
          gap: $space-2;
          background: #fff;
          padding: 8px 12px; // p-2
          border-radius: $radius-xl; // rounded-2xl
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04); // shadow-sm
          border: 1px solid #f1f5f9; // border-slate-100

          .weight-badge-label {
            font-size: 10px; // text-[10px]
            font-weight: 900; // font-black
            color: #94a3b8; // text-slate-400
            text-transform: uppercase;
            letter-spacing: 0.04em;
            white-space: nowrap;
          }

          .weight-badge-value {
            width: 64px; // w-16
            text-align: center;
            font-weight: 700; // font-bold
            font-size: 15px;
            color: #059669; // emerald-600
            outline: none;
            line-height: 1;
          }
        }
      }

      .calc-table {
        :deep(.t-table) {
          font-size: 13px;
        }

        padding: 0 $space-6 $space-6;
      }

      .calc-empty {
        padding: $space-8;
      }
    }

    // ══ 双栏卡片行（营养成分表 + 使用说明 / 技术处理依据） ══
    .dual-cards-row {
      display: grid;
      grid-template-columns: 6fr 4fr;
      gap: $space-6;
      animation: fadeInUp 0.45s ease both;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }

      .nutrition-section,
      .notes-section {
        background: #fff;
        padding: $space-6;
        border-radius: $radius-2xl;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        border: 1px solid #f8fafc;
      }

      .section-title {
        font-size: 14px;
        font-weight: 700;
        color: #94a3b8; // text-slate-400
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin: 0 0 $space-5;

        &.info-color {
          color: #0ea5e9;
        }

        // info 蓝
        &.warn-color {
          color: #f59e0b;
        }

        // warning 琥珀
      }

      :deep(.nutri-table .t-table) {
        font-size: 12px;

        th:nth-child(5),
        td:nth-child(5) {
          background-color: #fef3c7 !important;
        }

        th:nth-child(6),
        td:nth-child(6) {
          background-color: #fde68a !important;
        }

        th:nth-child(5),
        th:nth-child(6) {
          color: #d97706;
          font-weight: 600;
        }
      }

      .notes-body {
        .notes-item {
          font-size: 13px;
          color: #64748b;
          line-height: 1.9;
          padding: 6px 0;
          border-bottom: 1px solid #f8fafc;

          &:last-child {
            border-bottom: none;
          }
        }
      }

      // ══ 营养警告 ══
      .nutrition-warning {
        grid-column: 1 / -1;
        margin-bottom: 0;
        border-radius: $radius-lg;
        animation: fadeInUp 0.3s ease both;
      }
    }

    // ═══ 通用样式（保留） ═══
    .missing-nutrition {
      color: #f59e0b;
    }

    .missing-nutrition-icon {
      color: #f97316;
      margin-left: 4px;
    }

    // ═══ 动画关键帧 ═══
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

    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.96);
      }

      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    // ═══ 响应式适配 ═══
    @media (max-width: 640px) {
      .detail-header {
        padding: 12px 16px;
        flex-direction: column;
        gap: 12px;

        .header-left {
          width: 100%;
          justify-content: flex-start;

          .header-title-group {
            .formula-title {
              font-size: 16px;

              .version-tag {
                display: none;
              }
            }

            .header-breadcrumb {
              font-size: 11px;
            }
          }
        }

        .header-actions {
          width: 100%;
          justify-content: flex-end;

          .header-action-btn {
            padding: 6px 14px;
            font-size: 13px;

            .btn-icon {
              font-size: 16px;
            }
          }
        }
      }

      .detail-main {
        grid-template-columns: 1fr;
      }
    }
  }
}
</style>
