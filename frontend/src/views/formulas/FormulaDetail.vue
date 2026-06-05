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
              <span class="formula-id-tag">{{ (route.params.id as string).slice(-6) }}</span>
              <span class="version-tag">{{ currentVersion || 'V1.0' }}</span>
              <span class="status-tag" :class="statusTagInfo.cls">{{ statusTagInfo.label }}</span>
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
              <div v-if="data.parseResultId" class="field-item parse-source">
                <label><t-icon name="link" size="12px" /> 解析来源</label>
                <p>
                  <a class="parse-source-link" @click="goToParseResult(data.parseResultId)">
                    查看解析记录
                    <t-icon name="jump" size="12px" />
                  </a>
                </p>
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
                        <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9L3 11L3.5 7.5L1 5L4.5 4.5Z" fill="var(--color-warning-dark)" />
                      </svg>调
                    </span></span>
                  <span class="qtm-sub"><strong>{{ m.unitPrice != null ? `¥${m.subtotal.toFixed(2)}` : '--'
                  }}</strong>
                    <span v-if="m.isAdjusted && m.basePrice != null" class="qtm-base-hint"
                      :title="'原始基价: ¥' + m.basePrice + '/kg · 差额: ¥' + ((m.unitPrice ?? 0) - (m.basePrice ?? 0)).toFixed(2) + '/kg'">({{
                        (((m.unitPrice ?? 0) - (m.basePrice ?? 0)) / (m.basePrice ?? 1) * 100).toFixed(1) }}%)</span>
                  </span>
                </div>
              </div>
              <p v-if="priceQuote.missingPrices?.length" class="qt-warn">
                <t-icon name="error-circle" /> 未录入单价：{{ priceQuote.missingPrices.join('、') }}，成本计算不完整，请补充原料价格
              </p>
              <!-- 汇总区域 -->
              <div class="qt-summary">
                <div class="qts-item qts-item--primary">
                  <div class="qts-label-group">
                    <t-icon name="outbox" size="14px" class="qts-icon" />
                    <span>原料成本</span>
                  </div><strong class="green">¥{{ (priceQuote.materialTotal ?? 0).toFixed(2)
                  }}</strong>
                </div>
                <div class="qts-item">
                  <div class="qts-label-group">
                    <t-icon name="shop" size="14px" class="qts-icon" />
                    <span>包材费用</span>
                  </div><strong>¥{{ (priceQuote.packagingPrice ?? 0).toFixed(2) }}</strong>
                </div>
                <div class="qts-item">
                  <div class="qts-label-group">
                    <t-icon name="edit-1" size="14px" class="qts-icon" />
                    <span>其他费用</span>
                  </div><strong>¥{{ (priceQuote.otherPrice ?? 0).toFixed(2) }}</strong>
                </div>
                <div class="qts-divider"></div>
                <div class="qts-item qts-item--primary" :class="{ 'qts-item--warn': priceQuote.missingPrices?.length }">
                  <div class="qts-label-group">
                    <t-icon name="wallet" size="14px" class="qts-icon" />
                    <span>成本小计</span>
                  </div>
                  <div class="qts-value-group">
                    <strong :class="priceQuote.missingPrices?.length ? 'warn-text' : 'green'">¥{{
                      (priceQuote.costSubtotal ??
                        0).toFixed(2) }}</strong>
                    <span v-if="priceQuote.missingPrices?.length" class="qts-warn-tag">
                      <t-icon name="error-circle" size="11px" /> 不完整
                    </span>
                  </div>
                </div>
                <div class="qts-item">
                  <div class="qts-label-group">
                    <t-icon name="chart-pie" size="14px" class="qts-icon" />
                    <span>利润率</span>
                  </div><strong>{{ priceQuote.profitMargin ?? 20 }}%</strong>
                </div>
                <div class="qts-divider qts-divider--bold"></div>
                <div class="qts-item qts-item--final" :class="{ 'qts-item--warn': priceQuote.missingPrices?.length }">
                  <div class="qts-label-group">
                    <t-icon name="money-filled" size="16px" class="qts-icon" />
                    <span>最终报价</span>
                  </div>
                  <div class="qts-value-group">
                    <strong :class="priceQuote.missingPrices?.length ? 'warn-text' : 'final-price'">¥{{
                      (priceQuote.totalPrice
                        ?? 0).toFixed(2) }}</strong>
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
                  <p class="timeline-time past">{{ formatDate(String(ver.createdAt ?? '')) }}</p>
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
                <span v-else
                  :class="{ 'missing-nutrition': row.hasEmptyNutrition, 'partial-nutrition': !row.hasEmptyNutrition && row.emptyNutritionFields?.length }">
                  {{ row.name }}
                  <t-tooltip v-if="row.hasEmptyNutrition"
                    :content="'缺失营养数据：' + (row.emptyNutritionFields || []).join('、')"
                    :popup-props="{ appendToBody: true }">
                    <t-icon name="error-circle" class="missing-nutrition-icon" />
                  </t-tooltip>
                  <t-tooltip v-else-if="row.emptyNutritionFields?.length"
                    :content="'部分营养数据缺失：' + row.emptyNutritionFields.join('、')" :popup-props="{ appendToBody: true }">
                    <t-icon name="info-circle" class="partial-nutrition-icon" />
                  </t-tooltip>
                </span>
              </template>
            </t-table>
            <div v-else class="calc-empty">
              <t-empty description="请先为原料录入营养数据后再查看营养成分表" role="status" />
            </div>
          </section>

          <!-- 含量比校验信息卡片 -->
          <section v-if="data.calcRows?.length > 0 && data.finishedWeight > 0" class="ratio-validation-section">
            <h3 class="section-title">
              <t-icon name="check-circle" class="section-icon" />
              含量比校验
            </h3>
            <div class="section-content">
              <div class="ratio-summary" :class="'ratio-summary--' + ratioValidation.level">
                <div class="ratio-summary-header">
                  <t-icon :name="ratioValidationIcon" size="20px" />
                  <span class="ratio-summary-title">{{ ratioValidation.message }}</span>
                </div>
                <div class="ratio-summary-bar">
                  <div class="ratio-bar-track">
                    <div class="ratio-bar-fill" :style="{ width: ratioBarWidth }"></div>
                    <div class="ratio-bar-marker" :style="{ left: ratioMarkerLeft }"></div>
                  </div>
                  <div class="ratio-bar-labels">
                    <span>0.92</span><span>0.95</span><span>0.98</span><span
                      class="ratio-bar-center">1.00</span><span>1.02</span><span>1.05</span><span>1.08</span>
                  </div>
                </div>
                <div class="ratio-summary-value">
                  <span class="ratio-value-label">含量比总和：</span>
                  <span class="ratio-value-num">{{ ratioValidation.totalRatio.toFixed(5) }}</span>
                  <span class="ratio-value-deviation" :class="'deviation--' + ratioValidation.level">
                    ({{ ratioDeviationText }})
                  </span>
                </div>
                <p class="ratio-summary-desc">{{ ratioValidation.description }}</p>
                <div v-if="ratioValidation.level === 'high_warning'" class="ratio-review-notice">
                  <t-icon name="user-checked" size="16px" />
                  <span>此配方需要人工审核确认</span>
                </div>
              </div>
              <details class="ratio-breakdown">
                <summary class="ratio-breakdown-toggle">
                  <t-icon name="view-list" size="14px" />
                  <span>查看各原料含量比明细</span>
                  <t-icon name="chevron-down" size="14px" class="toggle-arrow" />
                </summary>
                <table class="ratio-detail-table">
                  <thead>
                    <tr>
                      <th>原料名称</th>
                      <th>类型</th>
                      <th>用量(g)</th>
                      <th>含量比</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in ratioValidation.breakdown" :key="item.materialId">
                      <td>{{ item.materialName }}</td>
                      <td>
                        <t-tag :theme="item.materialType === 'supplement' ? 'primary' : 'success'" variant="light"
                          size="small">
                          {{ item.materialType === 'supplement' ? '辅料' : '药材' }}
                        </t-tag>
                      </td>
                      <td>{{ item.quantity }}g</td>
                      <td class="font-mono">{{ item.ratioFactor.toFixed(5) }}</td>
                    </tr>
                  </tbody>
                </table>
              </details>
            </div>
          </section>

          <!-- 营养成分表 + 技术处理依据（双栏卡片）+ 使用说明 -->
          <div v-if="missingMaterials.length < data.calcRows?.length" class="dual-cards-row">
            <!-- 营养成分表/技术处理依据 -->
            <section class="nutrition-section">
              <h3 class="section-title info-color">营养成分表</h3>
              <t-table :data="data.labelRows" :columns="labelColumns" row-key="item" size="small" bordered
                table-layout="auto" class="nutri-table">
                <template #nrvPercent="{ row }">
                  {{ row.nrvPercent.toFixed(2) }}
                </template>
              </t-table>
            </section>
            <!-- 使用说明 -->
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

    <t-drawer v-model:visible="showExportDrawer" header="导出配方" :footer="true" placement="right" size="400px" :destroyOnClose="false">
      <t-form layout="vertical">
        <t-form-item label="导出配方">
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            <t-tag theme="primary" variant="light">{{ data?.formulaName || '当前配方' }}</t-tag>
          </div>
        </t-form-item>
        <t-form-item label="导出格式">
          <t-radio-group v-model="exportForm.exportType">
            <t-radio-button value="excel">Excel</t-radio-button>
            <t-radio-button value="pdf">PDF</t-radio-button>
          </t-radio-group>
        </t-form-item>
        <t-form-item label="导出模板">
          <t-select v-model="exportForm.templateId" clearable filterable :popup-props="{ appendToBody: true }" placeholder="可选，使用默认模板">
            <t-option v-for="t in formulaTemplates" :key="t.templateId" :value="t.templateId" :label="t.name" />
          </t-select>
        </t-form-item>
        <t-form-item label="包含版本信息">
          <t-switch v-model="exportForm.includeVersionInfo" />
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
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { MessagePlugin } from 'tdesign-vue-next';
import { nutritionApi } from '@/api/nutrition';
import { formulaApi } from '@/api/formula';
import { useExportStore } from '@/stores/export';
import type { ExportTemplate } from '@/api/export';
import type { RatioFactorValidationResult, PriceQuote } from '@/api/formula';

const router = useRouter();
const route = useRoute();
const exportStore = useExportStore();

interface FormulaNutritionData {
  version?: string | number;
  formulaId: string;
  formulaName: string;
  finishedWeight: number;
  ratioFactor?: number;
  supplementRatioFactor?: number;
  per100g: Record<string, number>;
  nrv: Record<string, number>;
  energy: number;
  ingredients: Record<string, unknown>[];
  calcRows: Record<string, unknown>[];
  summaryRow: Record<string, unknown>;
  nrvRow: Record<string, unknown>;
  nrvPercentRow: Record<string, unknown>;
  labelRows: Record<string, unknown>[];
  missingNutritionMaterials?: string[];
  parseResultId?: string;
  salesmanName?: string;
  salesmanDept?: string;
  demandTitle?: string;
  demandCode?: string;
  demandPriority?: string;
  demandDesc?: string;
  remark?: string;
  note?: string;
  preparationMethod?: string;
  updatedAt?: string;
  versionHistory?: Record<string, unknown>[];
}

const loading = ref(false);
const data = ref<FormulaNutritionData | null>(null);
const priceQuote = ref<PriceQuote | null>(null);
const formulaStatus = ref('draft');

const statusTagInfo = computed(() => {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: '草稿', cls: 'status-tag--draft' },
    pending_review: { label: '审核中', cls: 'status-tag--pending' },
    published: { label: '已发布', cls: 'status-tag--published' },
    archived: { label: '已归档', cls: 'status-tag--archived' },
  };
  return map[formulaStatus.value] || map.draft;
});
const missingMaterials = computed<string[]>(() => {
  return data.value?.missingNutritionMaterials || [];
});

// 当前版本号：优先取 URL query，其次取 API 数据的 version 字段
const currentVersion = computed(() => {
  const v = (route.query as Record<string, unknown>).v;
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

const ratioValidation = computed<RatioFactorValidationResult>(() => {
  const d = data.value;
  if (!d || !d.calcRows || d.calcRows.length === 0 || !d.finishedWeight || d.finishedWeight <= 0) {
    return {
      level: 'normal',
      totalRatio: 0,
      breakdown: [],
      thresholds: { normalLow: 0.98, normalHigh: 1.02, warningLow: 0.95, warningHigh: 1.05, highWarningLow: 0.92, highWarningHigh: 1.08 },
      message: '待计算',
      description: '配方数据不完整，无法进行含量比校验',
      allowed: true,
      requiresManualReview: false,
    };
  }

  const finishedWeight = d.finishedWeight;
  const ratioFactor = d.ratioFactor ?? 0.18;
  const supplementRatioFactor = d.supplementRatioFactor ?? 1.0;

  const breakdown = d.calcRows.map((row: Record<string, unknown>) => {
    const materialType = (row.materialType as string) || 'herb';
    const isSupplement = materialType === 'supplement';
    const quantity = (row.quantity as number) || 0;
    const baseRatio = quantity / finishedWeight;
    const ratio = Math.round(baseRatio * (isSupplement ? supplementRatioFactor : ratioFactor) * 100000) / 100000;
    return {
      materialId: (row.materialId as string) || (row.name as string) || '',
      materialName: (row.name as string) || '',
      quantity,
      materialType,
      ratioFactor: ratio,
    };
  });

  const totalRatio = Math.round(breakdown.reduce((sum: number, item: { ratioFactor: number }) => sum + item.ratioFactor, 0) * 100000) / 100000;

  const thresholds = { normalLow: 0.98, normalHigh: 1.02, warningLow: 0.95, warningHigh: 1.05, highWarningLow: 0.92, highWarningHigh: 1.08 };

  let level: RatioFactorValidationResult['level'];
  if (totalRatio >= thresholds.normalLow && totalRatio <= thresholds.normalHigh) {
    level = 'normal';
  } else if (
    (totalRatio >= thresholds.warningLow && totalRatio < thresholds.normalLow) ||
    (totalRatio > thresholds.normalHigh && totalRatio <= thresholds.warningHigh)
  ) {
    level = 'warning';
  } else if (
    (totalRatio >= thresholds.highWarningLow && totalRatio < thresholds.warningLow) ||
    (totalRatio > thresholds.warningHigh && totalRatio <= thresholds.highWarningHigh)
  ) {
    level = 'high_warning';
  } else {
    level = 'error';
  }

  const deviation = ((totalRatio - 1) * 100).toFixed(2);
  const messages: Record<string, { message: string; description: string; allowed: boolean; requiresManualReview: boolean }> = {
    normal: {
      message: '含量比校验通过',
      description: `原料含量比总和为 ${totalRatio.toFixed(5)}（偏差 ${deviation}%），在正常范围内 [${thresholds.normalLow}, ${thresholds.normalHigh}]`,
      allowed: true,
      requiresManualReview: false,
    },
    warning: {
      message: `含量比偏差预警（偏差 ${deviation}%）`,
      description: `原料含量比总和为 ${totalRatio.toFixed(5)}，超出正常范围 [${thresholds.normalLow}, ${thresholds.normalHigh}]，偏差 ${deviation}%。建议检查原料用量是否合理。`,
      allowed: true,
      requiresManualReview: false,
    },
    high_warning: {
      message: `含量比严重偏差（偏差 ${deviation}%）`,
      description: `原料含量比总和为 ${totalRatio.toFixed(5)}，严重偏离标准值 1.0，偏差 ${deviation}%。需要人工审核确认，请仔细核对原料用量数据。`,
      allowed: true,
      requiresManualReview: true,
    },
    error: {
      message: `含量比校验失败（偏差 ${deviation}%）`,
      description: `原料含量比总和为 ${totalRatio.toFixed(5)}，偏差 ${deviation}% 超出允许范围 [${thresholds.highWarningLow}, ${thresholds.highWarningHigh}]。配方数据存在错误，请修正原料用量后重试。`,
      allowed: false,
      requiresManualReview: false,
    },
  };

  const msg = messages[level];
  return { level, totalRatio, breakdown, thresholds, ...msg };
});

const ratioValidationIcon = computed(() => {
  const icons: Record<string, string> = {
    normal: 'check-circle-filled',
    warning: 'error-circle',
    high_warning: 'error-circle',
    error: 'close-circle-filled',
  };
  return icons[ratioValidation.value.level] || 'info-circle';
});

const ratioDeviationText = computed(() => {
  const d = ((ratioValidation.value.totalRatio - 1) * 100).toFixed(2);
  const prefix = Number(d) >= 0 ? '+' : '';
  return `${prefix}${d}%`;
});

const ratioBarWidth = computed(() => {
  const val = ratioValidation.value.totalRatio;
  if (val <= 0) return '0%';
  const { highWarningLow, highWarningHigh } = ratioValidation.value.thresholds;
  const pct = Math.min(Math.max(((val - highWarningLow) / (highWarningHigh - highWarningLow)) * 100, 0), 100);
  return `${pct}%`;
});

const ratioMarkerLeft = computed(() => {
  const val = ratioValidation.value.totalRatio;
  if (val <= 0) return '0%';
  const { highWarningLow, highWarningHigh } = ratioValidation.value.thresholds;
  const pct = Math.min(Math.max(((val - highWarningLow) / (highWarningHigh - highWarningLow)) * 100, 0), 100);
  return `${pct}%`;
});

const handleBack = () => {
  router.push({
    path: '/formulas',
    query: route.query
  });
};

const goToParseResult = (parseResultId: string) => {
  router.push({
    path: '/smart-tools',
    query: { tab: 'smart-history', highlight: parseResultId }
  });
};

// 格式化日期
const formatDate = (date: string | Date) => {
  if (!date) return '--';
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const showExportDrawer = ref(false);
const exporting = ref(false);
const exportForm = reactive({
  exportType: 'pdf' as 'excel' | 'pdf',
  templateId: '',
  includeVersionInfo: false,
});

const formulaTemplates = computed(() => {
  return exportStore.templates.filter((t: ExportTemplate) => t.category === 'formula' && t.type === exportForm.exportType);
});

const handleExport = () => {
  showExportDrawer.value = true;
};

const doExport = async () => {
  const formulaId = route.params.id as string;
  if (!formulaId) return;
  exporting.value = true;
  try {
    const res = await exportStore.createJob({
      dataCategory: 'formula',
      exportType: exportForm.exportType,
      formulaIds: [formulaId],
      templateId: exportForm.templateId || undefined,
      includeVersionInfo: exportForm.includeVersionInfo,
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

const loadData = async () => {
  const formulaId = (route.params.id || '') as string;
  if (!formulaId || formulaId === 'undefined') {
    console.warn('[FormulaDetail] 无效的 formulaId，跳过加载');
    return;
  }

  loading.value = true;
  try {
    const res = await nutritionApi.getFormulaNutritionTables(formulaId);
    data.value = res as unknown as FormulaNutritionData;
    try {
      priceQuote.value = await formulaApi.getPriceQuote(formulaId);
    } catch { /* 报价数据可选 */ }
    try {
      const formula = await formulaApi.getById(formulaId);
      if (formula?.status) {
        formulaStatus.value = formula.status;
      }
    } catch { /* 状态数据可选 */ }
  } catch (error: unknown) {
    console.error('获取营养计算表格失败:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
  exportStore.fetchTemplates({ category: 'formula' });
});

watch(() => route.params.id, (newId) => {
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
    padding: 8px 32px; // px-8 py-4（内部内容仍保持间距）
    background-color: var(--color-bg-container); // bg-white/80
    backdrop-filter: blur(12px); // backdrop-blur-md
    border-bottom: 1px solid var(--color-border-light); // border-slate-100
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
        color: var(--color-text-placeholder); // text-slate-400
        cursor: pointer;
        transition: all $transition-fast; // transition-all
        font-size: 20px; // text-2xl

        &:hover {
          color: var(--color-primary); // hover:text-emerald-500
          background-color: var(--color-emerald-50); // hover:bg-emerald-50
        }
      }

      // 标题组（面包屑 + 标题）
      .header-title-group {
        display: flex;
        flex-direction: column;
        gap: var(--space-1-5); // 增加面包屑与标题间距（原var(--space-0-5) → var(--space-1-5)）

        // 面包屑导航：flex items-center gap-2 text-xs text-slate-400
        .header-breadcrumb {
          display: flex;
          align-items: center;
          gap: var(--space-1-5); // gap-2
          font-size: 12px; // text-xs
          line-height: 1;

          .breadcrumb-link {
            color: var(--color-text-placeholder); // text-slate-400
            cursor: pointer;
            transition: color 0.15s;
            text-decoration: none;

            &:hover {
              color: var(--color-primary); // hover:text-emerald-500
            }
          }

          .breadcrumb-sep {
            font-size: 12px;
            color: var(--color-text-placeholder);
          }

          .breadcrumb-current {
            color: var(--color-text-secondary); // text-slate-600
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
          color: var(--color-text-primary); // slate-800
          line-height: 1.35;

          // 配方ID标签：在标题内部同行显示
          .formula-id-tag {
            display: inline-flex;
            align-items: center;
            padding: 1px 8px;
            background: rgba(255, 255, 255, 0.08);
            color: var(--color-text-secondary, rgba(255, 255, 255, 0.55));
            font-size: 12px;
            border-radius: 4px;
            font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
            flex-shrink: 0;
            line-height: 1.6;
          }

          // 版本标签：在标题内部同行显示
          .version-tag {
            display: inline-block !important; // 确保版本标签始终显示
            padding: var(--space-0-5) 8px; // px-2 py-0.5
            background-color: var(--color-primary-bg); // emerald-100
            color: var(--color-primary-dark); // emerald-600
            font-size: 10px; // text-[10px]
            font-weight: 900; // font-black
            border-radius: 6px; // rounded-md
            line-height: 1.6;
            white-space: nowrap;
            letter-spacing: 0.02em;
            flex-shrink: 0; // 防止被压缩隐藏
          }

          .status-tag {
            display: inline-flex;
            align-items: center;
            padding: 2px 10px;
            font-size: 11px;
            font-weight: 600;
            border-radius: 999px;
            white-space: nowrap;
            flex-shrink: 0;

            &--draft {
              background: var(--color-bg-cool-gray);
              color: var(--color-text-tertiary);
              border: 1px solid var(--color-border-light);
            }

            &--pending {
              background: rgba(234, 179, 8, 0.12);
              color: #a16207;
            }

            &--published {
              background: var(--color-primary-bg);
              color: var(--color-primary);
            }

            &--archived {
              background: rgba(107, 114, 128, 0.1);
              color: var(--color-text-tertiary);
            }
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
        background-color: var(--color-primary); // bg-emerald-500
        color: $text-white;
        border: none;
        border-radius: 12px; // rounded-xl
        font-size: 14px; // text-sm
        font-weight: 700; // font-bold
        box-shadow: $shadow-emerald-lg; // shadow-lg shadow-emerald-100
        cursor: pointer;
        transition: all $transition-fast; // transition-all

        .btn-icon {
          font-size: 18px; // text-lg (图标略大于文字)
        }

        &:hover {
          background-color: var(--color-primary-dark); // hover:bg-emerald-600
          transform: translateY(-1px);
          box-shadow: $shadow-emerald-xl;
        }

        &:active {
          transform: translateY(0);
          background-color: var(--color-primary-deep); // emerald-700
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
      background: var(--color-bg-container);
      padding: $space-6; // p-8 = 32px
      border-radius: $radius-2xl; // rounded-[2rem]
      box-shadow: $shadow-elevation-1; // shadow-sm
      border: 1px solid var(--color-bg-page); // border-slate-50
      animation: fadeInUp 0.35s ease both;

      .card-label {
        font-size: 14px; // text-sm
        font-weight: 700; // font-bold
        color: var(--color-text-placeholder); // text-slate-400
        text-transform: uppercase;
        letter-spacing: 0.1em; // tracking-widest
        margin-bottom: $space-5; // mb-6 = 24px
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

    // ══ 报价卡 — 列表式布局 ══
    .quote-card {
      .quote-card-body {
        display: flex;
        flex-direction: column;
        gap: var(--space-3-5);
      }

      .qt-mat-list {
        background: var(--color-bg-page);
        border-radius: 10px;
        padding: 12px 16px;
        border: 1px solid var(--color-border);
        display: flex;
        flex-direction: column;
        gap: var(--space-0-5);
      }

      .qt-mat-item {
        display: flex !important;
        align-items: center;
        gap: 8px;
        padding: var(--space-1-5) 8px;
        font-size: 13px;
        color: var(--color-text-primary);
        border-radius: 6px;

        &:hover {
          background-color: var(--color-border-light);
        }

        &--warn {
          opacity: 0.55;

          .qtm-sub strong {
            color: var(--color-text-placeholder) !important;
          }
        }

        &--adjusted {
          border-left: 3px solid var(--color-warning);
          background: linear-gradient(90deg, var(--color-amber-100) 0%, transparent 100%);

          .qtm-name {
            color: var(--color-warning, $amber-800);
            font-weight: 600;
          }

          .qtm-sub {
            color: var(--color-text-secondary, $stone-500);

            .qtm-base-hint {
              color: $amber-600;
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
          color: var(--color-text-secondary);
          font-size: 12px;
        }

        .qtm-adjust-badge {
          display: inline-flex;
          align-items: center;
          gap: var(--space-0-5);
          font-size: 10px;
          line-height: 1.4;
          padding: var(--space-0-5) var(--space-1-5);
          border-radius: 6px;
          background: var(--color-amber-100);
          color: $amber-700;
          font-weight: 700;
          margin-left: 4px;
          vertical-align: middle;
          cursor: help;
        }

        .qtm-sub {
          text-align: right;
          font-weight: 700;
          color: var(--color-primary-dark);
          min-width: 60px;

          .qtm-base-hint {
            margin-left: 4px;
            font-size: 11px;
            color: var(--color-warning);
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
        gap: var(--space-1-5);
        font-size: 12px;
        color: var(--color-warning);
        background: var(--color-amber-50);
        padding: var(--space-2-5) var(--space-3-5);
        border-radius: 10px;
        border: 1px solid var(--color-amber-200);
      }

      .qt-summary {
        display: flex;
        flex-direction: column;
        gap: var(--space-0-5);
        background: var(--color-bg-page);
        border-radius: 16px;
        border: 1px solid var(--color-border-light);
        padding: var(--space-2-5) 16px;
      }

      .qts-item {
        display: flex !important;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-2) 8px;
        border-radius: 8px;
        font-size: 13px;

        .qts-label-group {
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
          gap: var(--space-1-5);
          min-width: 96px;

          .qts-icon {
            width: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          >span {
            text-align: left;
            white-space: nowrap;
          }
        }

        &:hover {
          background-color: var(--color-bg-container);
        }

        &--primary {
          background: var(--color-emerald-50);

          span,
          .qts-icon {
            color: var(--color-primary-deep);
          }
        }

        &--warn {
          background: var(--color-amber-50) !important;

          span,
          .qts-icon {
            color: $amber-700 !important;
          }
        }

        &--final {
          margin-top: 4px;
          padding-top: var(--space-2-5);
          padding-bottom: var(--space-2-5);

          span {
            color: var(--color-primary-dark);
            font-weight: 700;
            font-size: 15px;
          }

          .qts-icon {
            color: var(--color-primary-dark);
          }

          strong.final-price {
            font-size: 20px;
            color: var(--color-primary-dark);
            font-weight: 800;
          }

          &.qts-item--warn {
            background: var(--color-amber-100) !important;
            border: 1px solid var(--color-amber-200);
            border-radius: 10px;

            span {
              color: $amber-700 !important;
            }

            .qts-icon {
              color: $amber-700 !important;
            }
          }
        }

        >span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--color-text-secondary);
          font-weight: 500;
        }

        .qts-icon {
          color: var(--color-text-placeholder);
          flex-shrink: 0;
        }

        strong {
          font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
          color: var(--color-text-primary);
          font-weight: 600;
        }

        strong.green {
          color: var(--color-primary-dark);
          font-weight: 700;
        }

        strong.warn-text {
          color: $amber-700;
          font-weight: 700;
        }

        .qts-value-group {
          display: flex;
          align-items: center;
          gap: var(--space-1-5);
        }

        .qts-warn-tag {
          display: inline-flex;
          align-items: center;
          gap: var(--space-0-5);
          font-size: 10px;
          font-weight: 500;
          color: $amber-700;
          background: var(--color-amber-100);
          padding: 1px var(--space-1-5);
          border-radius: 8px;
          border: 1px solid var(--color-amber-200);
          white-space: nowrap;
        }
      }

      .qts-divider {
        height: 1px;
        background: var(--color-border);
        margin: 4px 0;

        &--bold {
          background: var(--color-border);
          margin: var(--space-1-5) 0;
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
        background: var(--color-bg-page); // bg-slate-50
        border-radius: $radius-xl; // rounded-2xl
        border: 1px solid var(--color-border-light); // border-slate-100

        label {
          display: flex;
          align-items: center;
          gap: var(--space-1-5);
          font-size: 10px; // text-[10px]
          font-weight: 700; // font-bold
          color: var(--color-text-placeholder); // text-slate-400
          text-transform: uppercase;
          margin-bottom: 4px;

          .t-icon {
            color: var(--color-primary);
            opacity: 0.55;
            flex-shrink: 0;
          }
        }

        p {
          font-size: 14px; // text-sm
          font-weight: 700; // font-bold
          color: var(--color-text-primary); // text-slate-700
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
          color: var(--color-warning);
        }

        // amber-500
        .status-ok {
          color: var(--color-primary);
        }

        // emerald-500

        .parse-source {
          border-top: 1px dashed var(--color-border);
          margin-top: 8px;
          padding-top: 8px;

          .parse-source-link {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            color: $blue-500;
            font-size: 13px;
            cursor: pointer;
            text-decoration: none;
            transition: color 0.2s;

            &:hover {
              color: $blue-600;
              text-decoration: underline;
            }

            .t-icon {
              font-size: 12px;
            }
          }
        }
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
        background: var(--color-blue-50); // blue-50
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
          background: linear-gradient(135deg, var(--color-emerald-50), var(--color-blue-100));
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-primary);
          font-size: 22px;
        }

        .salesman-name {
          font-weight: 700;
          color: var(--color-text-primary); // slate-800
          font-size: 14px;
          margin: 0;
        }

        .salesman-dept {
          font-size: 12px; // text-xs
          color: var(--color-text-placeholder); // slate-400
          margin: var(--space-0-5) 0 0;
        }
      }

      .demand-box {
        background: var(--color-blue-50); // blue-50/50
        padding: $space-3;
        border-radius: $radius-xl;
        border: 1px solid var(--color-blue-200); // blue-100

        .demand-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;

          .demand-tag {
            font-size: 12px;
            font-weight: 900;
            color: $blue-600; // blue-600
            text-transform: uppercase;
            letter-spacing: -0.02em;
          }

          .priority-badge {
            padding: var(--space-0-5) 8px;
            background: var(--color-blue-100); // blue-100
            color: $blue-600; // blue-700
            font-size: 10px;
            font-weight: 700;
            border-radius: 4px;
          }
        }

        .demand-title {
          font-weight: 700;
          color: var(--color-text-primary);
          font-size: 14px;
          margin: 0 0 4px;
        }

        .demand-desc {
          font-size: 12px; // text-xs
          color: var(--color-text-secondary); // slate-500
          line-height: 1.6;
          margin: 0;
        }
      }
    }

    // ══ 备注信息 ══
    .remark-content {
      font-size: 14px;
      color: var(--color-text-secondary); // slate-600
      line-height: 1.7;
      padding: $space-3;
      background: var(--color-bg-page); // slate-50
      border-radius: $radius-xl;
      border: 1px solid var(--color-border-light); // slate-100
    }

    // ══ 变更记录时间线 ══
    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: $space-5 !important;

      .timeline-link {
        font-size: 13px;
        color: var(--color-text-placeholder);
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: color 0.15s;

        &:hover {
          color: var(--color-primary);
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
        background: var(--color-border-light); // bg-slate-50
      }

      .timeline-dot {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--color-primary); // emerald-500
        border: 4px solid var(--color-primary-bg); // emerald-100
        z-index: 1;
        flex-shrink: 0;

        &.past {
          background: var(--color-border); // slate-200
          border-color: var(--color-border-light); // slate-50
        }
      }

      .timeline-content {
        .timeline-ver {
          font-size: 14px; // text-sm
          font-weight: 700; // font-bold
          color: var(--color-text-primary); // slate-800
          margin: 0 0 var(--space-0-5);

          &.past {
            color: var(--color-text-secondary);
          }

          // slate-600
        }

        .timeline-time {
          font-size: 12px; // text-xs
          color: var(--color-text-placeholder); // slate-400
          margin: 0 0 var(--space-1-5);

          &.past {
            color: var(--color-text-placeholder);
          }
        }

        .timeline-note {
          margin-top: 8px;
          padding: 8px 12px;
          background: var(--color-bg-page); // slate-50
          border-radius: 8px;
          font-size: 12px; // text-xs
          color: var(--color-text-placeholder); // slate-400
          line-height: 1.5;

          &.past {
            color: var(--color-text-placeholder);
          }
        }
      }
    }

    // ══ 右侧：计算器表格区域 ══
    .calc-section {
      background: rgb(35, 46, 52);
      border-radius: $radius-2xl;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      border: 1px solid var(--color-bg-page);
      overflow: hidden;
      animation: fadeInUp 0.4s ease both;

      .calc-header {
        padding: $space-5 $space-6;
        padding-bottom: $space-6;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: rgb(35, 46, 52);
        display: flex;
        justify-content: space-between;
        align-items: center;

        .calc-title {
          font-size: 20px; // text-xl
          font-weight: 700; // font-bold
          color: var(--color-text-primary); // slate-800
          margin: 0 0 4px;
        }

        .calc-subtitle {
          font-size: 12px; // text-xs
          color: var(--color-text-placeholder); // slate-400
          margin: 0;

          b.weight-val {
            color: var(--color-primary-dark); // emerald-600
            font-weight: 700;
          }
        }

        // 成品总重徽章 — 还原 recipe-detail.html 第166-170行右侧内嵌样式
        .weight-badge {
          display: flex;
          align-items: center;
          gap: $space-2;
          background: rgba(255, 255, 255, 0.05);
          padding: 8px 12px; // p-2
          border-radius: $radius-xl; // rounded-2xl
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04); // shadow-sm
          border: 1px solid rgba(255, 255, 255, 0.1); // border-slate-100

          .weight-badge-label {
            font-size: 10px; // text-[10px]
            font-weight: 900; // font-black
            color: var(--color-text-placeholder); // text-slate-400
            text-transform: uppercase;
            letter-spacing: 0.04em;
            white-space: nowrap;
          }

          .weight-badge-value {
            width: 64px; // w-16
            text-align: center;
            font-weight: 700; // font-bold
            font-size: 15px;
            color: var(--color-primary-dark); // emerald-600
            outline: none;
            line-height: 1;
          }
        }
      }

      .calc-table {
        :deep(.t-table) {
          font-size: 13px;

          // 暗色/统一背景色下的表格适配
          th,
          td {
            background: rgb(35, 46, 52) !important;
            border-color: rgba(255, 255, 255, 0.08) !important;
            color: var(--color-text-primary) !important;
          }

          th {
            color: var(--color-text-secondary) !important;
            font-weight: 600;
          }
        }

        padding: 0 $space-6 $space-6;
      }

      .calc-empty {
        padding: $space-8;
      }
    }

    // ══ 含量比校验信息卡片 ══
    .ratio-validation-section {
      background: var(--color-bg-container);
      border-radius: $radius-2xl;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      border: 1px solid var(--color-bg-page);
      padding: $space-6;
      animation: fadeInUp 0.4s ease both;

      .section-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--color-text-placeholder);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: $space-5;
        display: flex;
        align-items: center;
        gap: 8px;

        .section-icon {
          font-size: 16px;
          color: var(--color-primary);
          opacity: 0.7;
        }
      }

      .section-content {
        .ratio-summary {
          padding: 16px;
          border-radius: 12px;
          border: 1px solid;
          transition: all 0.3s ease;

          &--normal {
            background: var(--color-green-50);
            border-color: var(--color-emerald-100);
          }

          &--warning {
            background: var(--color-amber-50);
            border-color: var(--color-amber-200);
          }

          &--high_warning {
            background: var(--color-orange-50);
            border-color: var(--color-amber-200);
          }

          &--error {
            background: var(--color-red-50);
            border-color: var(--color-rose-200);
          }
        }

        .ratio-summary-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;

          .ratio-summary--normal & {
            color: $green-600;
          }

          .ratio-summary--warning & {
            color: $amber-600;
          }

          .ratio-summary--high_warning & {
            color: $orange-600;
          }

          .ratio-summary--error & {
            color: var(--color-danger);
          }
        }

        .ratio-summary-title {
          font-size: 15px;
          font-weight: 700;
        }

        .ratio-summary-bar {
          margin-bottom: 12px;
        }

        .ratio-bar-track {
          position: relative;
          height: 8px;
          background: linear-gradient(to right,
              var(--color-danger) 0%,
              $orange-500 15%,
              $yellow-500 30%,
              $green-500 45%,
              $green-500 55%,
              $yellow-500 70%,
              $orange-500 85%,
              var(--color-danger) 100%);
          border-radius: 4px;
          overflow: visible;
        }

        .ratio-bar-fill {
          display: none;
        }

        .ratio-bar-marker {
          position: absolute;
          top: -4px;
          width: 16px;
          height: 16px;
          background: var(--color-bg-container);
          border: 3px solid var(--color-text-primary);
          border-radius: 50%;
          transform: translateX(-50%);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          transition: left 0.3s ease;
          z-index: 2;
        }

        .ratio-bar-labels {
          display: flex;
          justify-content: space-between;
          margin-top: var(--space-1-5);
          font-size: 10px;
          color: var(--color-text-placeholder);

          .ratio-bar-center {
            font-weight: 700;
            color: var(--color-text-secondary);
          }
        }

        .ratio-summary-value {
          display: flex;
          align-items: baseline;
          gap: var(--space-1-5);
          margin-bottom: 8px;
        }

        .ratio-value-label {
          font-size: 13px;
          color: var(--color-text-secondary);
        }

        .ratio-value-num {
          font-size: 20px;
          font-weight: 800;
          font-family: 'SF Mono', 'Fira Code', monospace;
          color: var(--color-text-primary);
        }

        .ratio-value-deviation {
          font-size: 13px;
          font-weight: 600;

          &.deviation--normal {
            color: $green-600;
          }

          &.deviation--warning {
            color: $amber-600;
          }

          &.deviation--high_warning {
            color: $orange-600;
          }

          &.deviation--error {
            color: var(--color-danger);
          }
        }

        .ratio-summary-desc {
          font-size: 12px;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin: 0;
        }

        .ratio-review-notice {
          display: flex;
          align-items: center;
          gap: var(--space-1-5);
          margin-top: var(--space-2-5);
          padding: 8px 12px;
          background: var(--color-orange-50);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: $orange-600;
        }

        .ratio-breakdown {
          margin-top: 12px;

          &[open] .toggle-arrow {
            transform: rotate(180deg);
          }
        }

        .ratio-breakdown-toggle {
          display: flex;
          align-items: center;
          gap: var(--space-1-5);
          padding: 8px 0;
          font-size: 13px;
          color: var(--color-text-secondary);
          cursor: pointer;
          list-style: none;
          user-select: none;

          &::-webkit-details-marker {
            display: none;
          }

          &:hover {
            color: var(--color-primary);
          }

          .toggle-arrow {
            transition: transform 0.2s ease;
          }
        }

        .ratio-detail-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;

          th {
            padding: 8px 12px;
            text-align: left;
            font-weight: 600;
            color: var(--color-text-secondary);
            background: var(--color-bg-page);
            border-bottom: 1px solid var(--color-border);
          }

          td {
            padding: 8px 12px;
            border-bottom: 1px solid var(--color-border-light);
            color: var(--color-text-primary);
          }

          .font-mono {
            font-family: 'SF Mono', 'Fira Code', monospace;
            font-weight: 600;
          }
        }
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
        background: var(--color-bg-container);
        padding: $space-6;
        border-radius: $radius-2xl;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        border: 1px solid var(--color-bg-page);
      }

      .section-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--color-text-placeholder); // text-slate-400
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin: 0 0 $space-5;

        &.info-color {
          color: $sky-500;
        }

        // info 蓝
        &.warn-color {
          color: var(--color-warning);
        }

        // warning 琥珀
      }

      :deep(.nutri-table .t-table) {
        font-size: 12px;

        th:nth-child(5),
        td:nth-child(5) {
          background-color: var(--color-amber-100) !important;
        }

        th:nth-child(6),
        td:nth-child(6) {
          background-color: var(--color-amber-200) !important;
        }

        th:nth-child(5),
        th:nth-child(6) {
          color: $amber-600;
          font-weight: 600;
        }
      }

      .notes-body {
        .notes-item {
          font-size: 13px;
          color: var(--color-text-secondary);
          line-height: 1.9;
          padding: var(--space-1-5) 0;
          border-bottom: 1px solid var(--color-bg-page);

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
      color: var(--color-warning);
    }

    .missing-nutrition-icon {
      color: $orange-500;
      margin-left: 4px;
    }

    .partial-nutrition {
      color: var(--color-text-placeholder);
    }

    .partial-nutrition-icon {
      color: $purple-400;
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

              .status-tag {
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
            padding: var(--space-1-5) var(--space-3-5);
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
