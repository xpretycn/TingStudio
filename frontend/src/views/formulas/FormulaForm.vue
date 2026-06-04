<template>
  <div class="formula-form" data-testid="formula-form">
    <!-- 顶部 Header（还原 FormulaDetail.vue 设计） -->
    <header class="detail-header">
      <!-- 左侧区域 -->
      <div class="header-left">
        <!-- 返回按钮 -->
        <button class="header-back-btn" @click="handleBack" title="返回列表" aria-label="返回配方列表">
          <t-icon name="arrow-left" />
        </button>
        <!-- 标题区（面包屑 + 名称 + 版本标签） -->
        <div class="header-title-group">
          <!-- 面包屑导航 -->
          <nav class="header-breadcrumb">
            <a class="breadcrumb-link" @click="handleBack">配方管理</a>
            <t-icon name="chevron-right" class="breadcrumb-sep" />
            <span class="breadcrumb-current">{{ isEdit ? '编辑配方' : '新增配方' }}</span>
          </nav>
          <!-- 标题行（名称 + 版本标签同行） -->
          <h2 class="formula-title">
            {{ isEdit ? (formData.name || '编辑配方') : '新增配方' }}
            <span v-if="isEdit" class="title-version-tag">{{ currentVersionNumber || 'V1.0' }}</span>
            <span v-if="isEdit" class="title-status-tag" :class="statusTagInfo.cls">{{ statusTagInfo.label }}</span>
          </h2>
        </div>
      </div>
      <!-- 右侧：操作按钮组 -->
      <div class="header-actions">
        <button class="header-action-btn secondary" @click="handleBack" aria-label="取消编辑，返回列表"
          data-testid="formula-cancel-btn">
          <t-icon name="close" class="btn-icon" />
          取消
        </button>
        <button class="header-action-btn" @click="handleSubmit({ validateResult: true })" aria-label="保存配方"
          data-testid="formula-save-btn" :disabled="submitBlockReasons.some(r => r.type === 'error')">
          <t-icon name="save" class="btn-icon" />
          {{submitBlockReasons.some(r => r.type === 'error') ? '校验未通过' : (isEdit ? '保存' : '创建')}}
        </button>
      </div>
    </header>

    <!-- 主内容区域 垂直二区域布置-->
    <main class="form-main">
      <t-alert v-if="isEdit && hasMaterialUpdates" theme="warning" class="snapshot-refresh-alert">
        <template #message>
          <div class="alert-content">
            <div class="alert-title">部分原料已有新版本</div>
            <div class="alert-details">
              <span v-for="mu in materialUpdatesInfo.filter(m => !m.isLatest)" :key="mu.materialId"
                class="alert-detail-item">
                {{ mu.materialName }}: v{{ mu.currentVersion }} → v{{ mu.latestVersion }}
                <span v-if="mu.priceChanged" class="alert-price-change">(单价已变更)</span>
              </span>
            </div>
            <div class="alert-warning">刷新快照将更新配方中的营养数据，可能影响营养分析结果</div>
            <div class="alert-actions">
              <button class="alert-btn alert-btn--dismiss" @click="hasMaterialUpdates = false">暂不刷新</button>
              <button class="alert-btn alert-btn--refresh" :disabled="refreshingSnapshot"
                @click="handleRefreshSnapshot">
                {{ refreshingSnapshot ? '刷新中...' : '立即刷新快照' }}
              </button>
            </div>
          </div>
        </template>
      </t-alert>
      <t-form ref="formRef" :data="formData" :rules="rules" scroll-to-first-error @submit="handleSubmit">
        <div class="form-vertical-layout">

          <!-- ═══ 区域一：配方基本信息区 ═══ -->
          <section class="form-section zone-basic-info">
            <div v-if="basicInfoCollapsed" class="info-collapsed-bar" @click="toggleBasicInfoCollapsed">
              <div class="info-collapsed-left">
                <div class="info-collapsed-icon">
                  <t-icon name="info-circle" />
                </div>
                <span class="info-collapsed-text">基础信息</span>
                <span class="info-collapsed-hint">点击展开</span>
              </div>
              <t-icon name="chevron-down" class="info-collapsed-arrow" />
            </div>
            <template v-else>
              <div class="info-expanded-header" @click="toggleBasicInfoCollapsed">
                <div class="info-expanded-title">
                  <t-icon name="info-circle" />
                  <span>基础信息</span>
                </div>
                <t-icon name="chevron-up" class="info-expanded-arrow" />
              </div>
              <div class="zone-content">
                <div class="basic-info-two-col">
                  <div class="info-col-left info-card">
                    <div class="form-field field-compact field-inline">
                      <label class="field-label" id="lbl-formula-name">配方名称<span class="required">*</span></label>
                      <div class="field-input">
                        <t-input v-model="formData.name" placeholder="例如：佛手玫苓膏" clearable
                          data-testid="formula-name-input" data-field="name" />
                      </div>
                    </div>
                    <div class="form-field field-compact field-inline">
                      <label class="field-label" id="lbl-salesman">所属业务员<span class="required">*</span></label>
                      <div class="field-input">
                        <t-select v-model="formData.salesmanId" placeholder="请选择业务员" clearable filterable
                          data-field="salesman_name" :popup-props="{ appendToBody: true }" class="salesman-select">
                          <t-option v-for="salesman in salesmanStore.allSalesmen" :key="salesman.id"
                            :value="salesman.id" :label="salesman.name" />
                        </t-select>
                        <t-alert v-if="salesmanNotMatched && !formData.salesmanId" theme="warning" class="mt-2">
                          业务员「{{ parsedSalesmanName }}」不在系统中
                        </t-alert>
                      </div>
                    </div>
                    <div class="form-field field-compact field-inline">
                      <label class="field-label" id="lbl-weight">成品重量(g)<span class="required">*</span></label>
                      <div class="field-input">
                        <t-input-number v-model="formData.finishedWeight" :min="0" :decimal-places="2"
                          placeholder="1000" theme="normal" data-field="finished_weight" />
                      </div>
                      <p class="field-help-below">规格</p>
                    </div>
                    <div class="form-field field-compact field-inline">
                      <label class="field-label" id="lbl-ratio-factor">主料系数<span class="required">*</span></label>
                      <div class="field-input">
                        <t-input-number v-model="formData.ratioFactor" :min="0.15" :max="0.25" :decimal-places="2"
                          placeholder="0.18" theme="normal" data-field="ratio_factor" />
                      </div>
                      <p class="field-help-below">用于营养成分含量比计算，主料系数范围0.15-0.25</p>
                    </div>
                    <div class="form-field field-compact field-inline">
                      <label class="field-label" id="lbl-supplement-factor">辅料系数<span class="required">*</span></label>
                      <div class="field-input">
                        <t-input-number v-model="formData.supplementRatioFactor" :min="0.5" :max="1.5"
                          :decimal-places="2" placeholder="1.0" theme="normal" data-field="supplement_ratio_factor" />
                      </div>
                      <p class="field-help-below">用于营养成分含量比计算，辅料系数范围0.5-1.5</p>
                    </div>
                  </div>
                  <div class="info-col-right info-card">
                    <div class="form-field field-compact">
                      <div class="field-label-row">
                        <label class="field-label" id="lbl-description">配方描述</label>
                        <button type="button" class="btn-ai-generate" :disabled="aiLoadingDescription"
                          @click="handleGenerateDescription">
                          <t-icon :name="aiLoadingDescription ? 'loading' : 'logo-github'" size="12px" />
                          {{ aiLoadingDescription ? '生成中...' : '智能生成' }}
                        </button>
                      </div>
                      <t-textarea v-model="formData.description" placeholder="简述该配方的研发目标和主要特点..."
                        :autosize="{ minRows: 3, maxRows: 6 }" data-field="description" />
                    </div>
                    <div class="form-field field-compact">
                      <div class="field-label-row">
                        <label class="field-label" id="lbl-preparation">制法</label>
                        <button type="button" class="btn-ai-generate" :disabled="aiLoadingPreparation"
                          @click="handleGeneratePreparation">
                          <t-icon :name="aiLoadingPreparation ? 'loading' : 'logo-github'" size="12px" />
                          {{ aiLoadingPreparation ? '生成中...' : '智能生成' }}
                        </button>
                      </div>
                      <t-textarea v-model="formData.preparationMethod" placeholder="记录配方的制取方法、工艺流程或特殊操作要求（可选）"
                        :autosize="{ minRows: 3, maxRows: 6 }" data-field="preparation_method" />
                    </div>
                    <div v-if="isEdit" class="form-field field-compact" :class="{ 'field-error': versionReasonError }">
                      <div class="field-label-row">
                        <label class="field-label" id="lbl-version-reason">升版原因<span class="required">*</span></label>
                        <button type="button" class="btn-ai-generate" :disabled="aiLoadingVersionReason"
                          @click="handleGenerateVersionReason">
                          <t-icon :name="aiLoadingVersionReason ? 'loading' : 'logo-github'" size="12px" />
                          {{ aiLoadingVersionReason ? '生成中...' : '智能生成' }}
                        </button>
                      </div>
                      <t-textarea ref="versionReasonRef" v-model="formData.versionReason" placeholder="请输入升版原因（必填）"
                        :autosize="{ minRows: 3, maxRows: 6 }" :class="{ 'input-error': versionReasonError }"
                        data-field="version_reason" @input="clearVersionReasonError" />
                      <transition name="error-fade">
                        <p v-if="versionReasonError" class="field-error-msg">
                          <t-icon name="error-circle" size="14px" /> 请填写升版原因
                        </p>
                      </transition>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </section>

          <!-- ═══ 区域二：原料配比表 ═══ -->
          <section class="form-section zone-materials-table">
            <!-- 原料配比表表头 -->
            <div class="zone-header">
              <h3 class="zone-title">
                <t-icon name="view-list" />
                原料配比表
              </h3>
            </div>
            <!-- 原料配比表内容 -->
            <div class="zone-content">
              <!-- 原料配比表导入按钮 -->
              <div class="excel-panel-wrapper">
                <div v-if="!excelExpanded" class="excel-collapsed-bar" @click="excelExpanded = true">
                  <div class="excel-collapsed-left">
                    <div class="excel-collapsed-icon">
                      <t-icon name="file-excel" />
                    </div>
                    <span class="excel-collapsed-text">Excel导入原料</span>
                    <span class="excel-collapsed-hint">点击展开</span>
                  </div>
                  <t-icon name="chevron-down" class="excel-collapsed-arrow" />
                </div>
                <div v-else class="excel-expanded-area">
                  <div class="excel-expanded-header" @click="excelExpanded = false">
                    <div class="excel-expanded-title">
                      <t-icon name="file-excel" />
                      <span>Excel导入原料</span>
                    </div>
                    <t-icon name="chevron-up" class="excel-expanded-arrow" />
                  </div>
                  <ExcelImportPanel @import="handleExcelImport" class="excel-panel" />
                </div>
              </div>
              <!-- 原料配比表表格 -->
              <div class="materials-table-wrapper">
                <MaterialTableCore :materials="materialTableRows" mode="edit"
                  :finished-weight="formData.finishedWeight || 0" :ratio-factor="formData.ratioFactor ?? 0.18"
                  :supplement-ratio-factor="formData.supplementRatioFactor ?? 1.0"
                  :supplement-price-map="supplementPriceMap" :material-versions="materialVersionsMap"
                  @update:materials="handleMaterialsUpdate"
                  @update:ratio-factor="(val: number) => formData.ratioFactor = val"
                  @update:supplement-ratio-factor="(val: number) => formData.supplementRatioFactor = val"
                  @update:finished-weight="(val: number) => formData.finishedWeight = val"
                  @material-change="handleMaterialChangeFromTable" />
              </div>
              <!-- 配方摘要栏 -->
              <div class="formula-summary-bar" v-if="formData.materials.length > 0">
                <div class="summary-card summary-card--ratio">
                  <div class="summary-card-header">
                    <t-icon name="check-circle" size="14px" />
                    <span>含量比校验</span>
                    <span class="ratio-status-badge" :class="'badge--' + ratioValidation.level">
                      {{ ratioValidation.level === 'normal' ? '通过' : ratioValidation.level === 'warning' ? '预警' :
                        ratioValidation.level === 'high_warning' ? '严重' : '异常' }}
                    </span>
                  </div>
                  <div class="summary-card-body">
                    <div class="ratio-bar-track">
                      <div class="ratio-bar-fill" :style="{ width: ratioBarWidth }"></div>
                      <div class="ratio-bar-marker" :style="{ left: ratioMarkerLeft }"></div>
                    </div>
                    <div class="ratio-labels">
                      <span>{{ ratioValidation.thresholds.highWarningLow }}</span><span>{{
                        ratioValidation.thresholds.warningLow
                      }}</span><span class="center">1.00</span><span>{{ ratioValidation.thresholds.warningHigh
                        }}</span><span>{{
                          ratioValidation.thresholds.highWarningHigh }}</span>
                    </div>
                    <div class="ratio-value">
                      总和：<strong>{{ ratioValidation.totalRatio.toFixed(5) }}</strong>
                      <span class="deviation" :class="'deviation--' + ratioValidation.level">{{ ratioDeviationText
                      }}</span>
                    </div>
                    <div class="ratio-threshold-config">
                      <div class="rtc-item rtc-item--normal">
                        <span class="rtc-dot"></span>
                        <span class="rtc-label">正常</span>
                        <span class="rtc-range">[{{ ratioValidation.thresholds.normalLow }}, {{
                          ratioValidation.thresholds.normalHigh }}]</span>
                        <span class="rtc-submit-tag rtc-submit-tag--allow">可提交</span>
                      </div>
                      <div class="rtc-item rtc-item--warning">
                        <span class="rtc-dot"></span>
                        <span class="rtc-label">预警</span>
                        <span class="rtc-range">[{{ ratioValidation.thresholds.warningLow }}, {{
                          ratioValidation.thresholds.normalLow }}) / ({{ ratioValidation.thresholds.normalHigh }}, {{
                            ratioValidation.thresholds.warningHigh }}]</span>
                        <span class="rtc-submit-tag rtc-submit-tag--allow">可提交</span>
                      </div>
                      <div class="rtc-item rtc-item--high_warning">
                        <span class="rtc-dot"></span>
                        <span class="rtc-label">严重</span>
                        <span class="rtc-range">[{{ ratioValidation.thresholds.highWarningLow }}, {{
                          ratioValidation.thresholds.warningLow }}) / ({{ ratioValidation.thresholds.warningHigh }}, {{
                            ratioValidation.thresholds.highWarningHigh }}]</span>
                        <span class="rtc-submit-tag rtc-submit-tag--review">需审核</span>
                      </div>
                      <div class="rtc-item rtc-item--error">
                        <span class="rtc-dot"></span>
                        <span class="rtc-label">异常</span>
                        <span class="rtc-range">&lt; {{ ratioValidation.thresholds.highWarningLow }} 或 &gt; {{
                          ratioValidation.thresholds.highWarningHigh }}</span>
                        <span class="rtc-submit-tag rtc-submit-tag--block">不可提交</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="summary-card summary-card--quote">
                  <div class="summary-card-header">
                    <t-icon name="currency-exchange" size="14px" />
                    <span>配方报价</span>
                  </div>
                  <div class="summary-card-body">
                    <div v-if="priceQuote.adjustedCount > 0" class="quote-toolbar">
                      <span class="qt-badge-info">
                        <svg viewBox="0 0 14 14" width="13" height="13">
                          <path d="M7 1L8.75 5.25L13 6L9.75 9L10.5 13.25L7 11L3.5 13.25L4.25 9L1 6L5.25 5.25Z"
                            fill="var(--color-warning)" />
                        </svg>
                        {{ priceQuote.adjustedCount }} 项单价已调整
                      </span>
                    </div>
                    <p v-if="priceQuote.missingPrices.length > 0" class="quote-warn-text">
                      <t-icon name="error-circle" /> 以下原料未录入单价：{{ priceQuote.missingPrices.join('、') }}
                    </p>
                    <div class="quote-summary">
                      <div class="qs-row qs-total">
                        <label><t-icon name="outbox" size="14px" class="qs-label-icon" /> 原料成本</label>
                        <span>¥{{ priceQuote.materialTotal.toFixed(2) }}</span>
                      </div>
                      <div class="qs-row">
                        <label><t-icon name="shop" size="14px" class="qs-label-icon" /> 包材费用</label>
                        <div class="qs-input-wrap"><t-input-number v-model="formData.packagingPrice" :min="0"
                            :precision="2" size="small" theme="normal" style="width:90px" /><span
                            class="qs-unit">元</span></div>
                      </div>
                      <div class="qs-row">
                        <label><t-icon name="edit-1" size="14px" class="qs-label-icon" /> 其他费用</label>
                        <div class="qs-input-wrap"><t-input-number v-model="formData.otherPrice" :min="0" :precision="2"
                            size="small" theme="normal" style="width:90px" /><span class="qs-unit">元</span></div>
                      </div>
                      <div class="qs-divider"></div>
                      <div class="qs-row qs-subtotal">
                        <label><t-icon name="wallet" size="14px" class="qs-label-icon" /> 成本小计</label>
                        <span>¥{{ priceQuote.costSubtotal.toFixed(2) }}</span>
                      </div>
                      <div class="qs-row">
                        <label><t-icon name="chart-pie" size="14px" class="qs-label-icon" /> 利润率</label>
                        <div class="qs-input-wrap"><t-input-number v-model="formData.profitMargin" :min="0" :max="999"
                            :precision="1" size="small" theme="normal" style="width:90px" /><span
                            class="qs-unit">%</span>
                        </div>
                      </div>
                      <div class="qs-divider qs-divider--bold"></div>
                      <div class="qs-row qs-final">
                        <label><t-icon name="money-filled" size="16px" class="qs-label-icon qs-label-icon--final" />
                          最终报价</label>
                        <span>¥{{ priceQuote.totalPrice.toFixed(2) }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="summary-card summary-card--submit">
                  <div class="summary-card-header">
                    <t-icon name="check-circle" size="14px" />
                    <span>提交校验</span>
                  </div>
                  <div class="summary-card-body">
                    <div v-if="submitBlockReasons.length" class="submit-block-reasons">
                      <div v-for="(reason, idx) in submitBlockReasons" :key="idx" class="sbr-item"
                        :class="'sbr-item--' + reason.type">
                        <span class="sbr-dot"></span>
                        <span class="sbr-text">{{ reason.message }}</span>
                      </div>
                    </div>
                    <div v-else class="submit-all-clear">
                      <t-icon name="check-circle" size="16px" />
                      <span>所有校验项通过</span>
                    </div>
                    <t-button theme="success" block @click="handleSubmit({ validateResult: true })" :loading="loading"
                      :disabled="loading || submitBlockReasons.some(r => r.type === 'error')">
                      <template #icon>
                        <t-icon name="check-circle" />
                      </template>
                      {{submitBlockReasons.some(r => r.type === 'error') ? `存在 ${submitBlockReasons.filter(r =>
                        r.type === 'error').length} 项错误，无法提交` : (isEdit ? '保存配方' : '创建配方')}}
                    </t-button>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </t-form>
    </main>

    <QuickCreateSalesmanDialog :visible="showQuickCreateSalesman" @update:visible="showQuickCreateSalesman = $event"
      :default-name="parsedSalesmanName" @created="onQuickSalesmanCreated" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useFormulaStore } from '@/stores/formula';
import { useSalesmanStore } from '@/stores/salesman';
import { useMaterialStore } from '@/stores/material';
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next';
import type { FormRule } from 'tdesign-vue-next';
import type { MaterialItem, RatioFactorValidationResult, FormulaForm as FormulaFormType, PriceQuoteMaterial } from '@/api/formula';
import { formulaApi } from '@/api/formula';
import type { Material } from '@/api/material';
import type { Salesman } from '@/api/salesman';
import { agentApi } from '@/api/agent';
import ExcelImportPanel from '@/components/ExcelImportPanel.vue';
import type { ParsedMaterial } from '@/api/excelImport';
import QuickCreateSalesmanDialog from '@/components/QuickCreateSalesmanDialog.vue';
import MaterialTableCore from '@/components/formula/MaterialTableCore.vue';
import type { MaterialTableRow } from '@/components/formula/MaterialTableCore.vue';
import { versionApi } from '@/api/version';
import type { MaterialUpdateInfo } from '@/api/version';

const router = useRouter();
const route = useRoute();
const formulaStore = useFormulaStore();
const salesmanStore = useSalesmanStore();
const materialStore = useMaterialStore();

const formRef = ref<Record<string, unknown> | null>(null);
const versionReasonRef = ref<Record<string, unknown> | null>(null);
const loading = ref(false);
const supplementPriceMap = ref<Record<string, number>>({});
const versionReasonError = ref(false);
const aiLoadingDescription = ref(false);
const aiLoadingPreparation = ref(false);
const aiLoadingVersionReason = ref(false);
const materialVersionsMap = ref<Record<string, { currentVersion: number; latestVersion: number; isLatest: boolean; }>>({});
const materialUpdatesInfo = ref<MaterialUpdateInfo[]>([]);
const hasMaterialUpdates = ref(false);
const refreshingSnapshot = ref(false);


// ratioFactor 含量比实时校验（前端本地计算，无需请求后端）
const ratioValidation = computed<RatioFactorValidationResult>(() => {
  const materials = formData.materials || [];
  const finishedWeight = formData.finishedWeight || 0;
  const ratioFactor = formData.ratioFactor ?? 0.18;
  const supplementRatioFactor = formData.supplementRatioFactor ?? 1.0;

  if (materials.length === 0 || finishedWeight <= 0) {
    return {
      level: 'normal',
      totalRatio: 0,
      breakdown: [],
      thresholds: { normalLow: 0.98, normalHigh: 1.02, warningLow: 0.95, warningHigh: 1.05, highWarningLow: 0.92, highWarningHigh: 1.08 },
      message: '待输入数据',
      description: '请填写原料用量和成品重量后进行含量比校验',
      allowed: true,
      requiresManualReview: false,
    };
  }

  const allMats = materialStore.allMaterials || [];
  const breakdown = materials.map((m: FormMaterialItem) => {
    const mat = allMats.find((x: Material) => x.id === m.materialId);
    const materialType = mat?.materialType || 'herb';
    const isSupplement = materialType === 'supplement';
    const baseRatio = (m.quantity || 0) / finishedWeight;
    const ratio = Math.round(baseRatio * (isSupplement ? supplementRatioFactor : ratioFactor) * 100000) / 100000;
    return {
      materialId: m.materialId || '',
      materialName: m.materialName || mat?.name || '',
      quantity: m.quantity || 0,
      materialType,
      ratioFactor: ratio,
    };
  });

  const totalRatio = Math.round(breakdown.reduce((sum: number, item: { ratioFactor: number; }) => sum + item.ratioFactor, 0) * 100000) / 100000;

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
  const totalRatioPercent = (totalRatio * 100).toFixed(2);
  const messages: Record<string, { message: string; description: string; allowed: boolean; requiresManualReview: boolean; }> = {
    normal: {
      message: '含量比校验通过',
      description: `原料含量比总和为 ${totalRatioPercent}%（偏差 ${deviation}%），在正常范围内 [98%, 102%]`,
      allowed: true,
      requiresManualReview: false,
    },
    warning: {
      message: `含量比偏差预警（偏差 ${deviation}%）`,
      description: `原料含量比总和为 ${totalRatioPercent}%，超出正常范围 [98%, 102%]，偏差 ${deviation}%。建议检查原料用量是否合理，仍可继续创建。`,
      allowed: true,
      requiresManualReview: false,
    },
    high_warning: {
      message: `含量比严重偏差（偏差 ${deviation}%）`,
      description: `原料含量比总和为 ${totalRatioPercent}%，严重偏离标准值 100%，偏差 ${deviation}%。需要人工审核确认后方可创建，请仔细核对原料用量数据。`,
      allowed: true,
      requiresManualReview: true,
    },
    error: {
      message: `含量比校验失败（偏差 ${deviation}%）`,
      description: `原料含量比总和为 ${totalRatioPercent}%，偏差 ${deviation}% 超出允许范围 [92%, 108%]。配方数据存在错误，无法创建，请修正原料用量后重试。`,
      allowed: false,
      requiresManualReview: false,
    },
  };

  const msg = messages[level];
  return { level, totalRatio, breakdown, thresholds, ...msg };
});

const ratioDeviationText = computed(() => {
  const d = ((ratioValidation.value.totalRatio - 1) * 100).toFixed(2);
  const prefix = Number(d) >= 0 ? '+' : '';
  return `${prefix}${d}%`;
});

const ratioBarWidth = computed(() => {
  const val = ratioValidation.value.totalRatio;
  if (val <= 0) return '0%';
  const pct = Math.min(Math.max((val / 1.16) * 100, 0), 100);
  return `${pct}%`;
});

const ratioMarkerLeft = computed(() => {
  const val = ratioValidation.value.totalRatio;
  if (val <= 0) return '0%';
  const pct = Math.min(Math.max((val / 1.16) * 100, 0), 100);
  return `${pct}%`;
});

const priceQuote = computed(() => {
  const allMats = materialStore.allMaterials ?? [];
  const priceMap = supplementPriceMap.value;
  const matDetails = formData.materials.map((item: FormMaterialItem) => {
    const mat = allMats.find((m: Material) => m.id === item.materialId);
    const basePrice = mat?.unitPrice ?? priceMap[item.materialId] ?? null;
    const adjustedPrice = item.adjustedPrice;
    const effectivePrice = adjustedPrice != null ? adjustedPrice : (item.unitPrice ?? basePrice);
    const isAdjusted = adjustedPrice != null && adjustedPrice !== basePrice;
    const subtotal = effectivePrice != null ? Number((item.quantity / 1000 * effectivePrice).toFixed(4)) : 0;
    return { ...item, unitPrice: effectivePrice, basePrice, isAdjusted, subtotal, name: item.materialName || '' };
  });
  const materialTotal = matDetails.reduce((s: number, m: FormMaterialItem & Record<string, unknown>) => s + (m.subtotal as number || 0), 0);
  const costSubtotal = Number((materialTotal + (formData.packagingPrice || 0) + (formData.otherPrice || 0)).toFixed(4));
  const margin = formData.profitMargin ?? 20;
  const totalPrice = Number((costSubtotal * (1 + margin / 100)).toFixed(4));
  const missingPrices = matDetails.filter((m: FormMaterialItem & Record<string, unknown>) => m.unitPrice === null).map((m: FormMaterialItem & Record<string, unknown>) => m.name);
  const adjustedCount = matDetails.filter((m: FormMaterialItem & Record<string, unknown>) => m.isAdjusted).length;
  return { materials: matDetails, materialTotal, packagingPrice: formData.packagingPrice || 0, otherPrice: formData.otherPrice || 0, costSubtotal, profitMargin: margin, totalPrice, missingPrices, adjustedCount };
});

const isEdit = computed(() => !!route.params.id);
const currentVersionNumber = ref('');
const formulaStatus = ref('draft');

const statusTagInfo = computed(() => {
  const map: Record<string, { label: string; cls: string; }> = {
    draft: { label: '草稿', cls: 'status-tag--draft' },
    pending_review: { label: '审核中', cls: 'status-tag--pending' },
    published: { label: '已发布', cls: 'status-tag--published' },
    archived: { label: '已归档', cls: 'status-tag--archived' },
  };
  return map[formulaStatus.value] || map.draft;
});

const submitBlockReasons = computed(() => {
  const reasons: { type: 'error' | 'warning'; message: string; }[] = [];

  if (!formData.name?.trim()) {
    reasons.push({ type: 'error', message: '配方名称不能为空' });
  }
  if (!formData.salesmanId) {
    reasons.push({ type: 'error', message: '请选择所属业务员' });
  }
  if (!formData.finishedWeight || formData.finishedWeight <= 0) {
    reasons.push({ type: 'error', message: '成品重量必须大于 0' });
  }
  if (formData.materials.length === 0) {
    reasons.push({ type: 'error', message: '请至少添加一种原料' });
  } else {
    const incomplete = formData.materials.filter(
      (m: FormMaterialItem) => !m.materialId || !m.quantity || m.quantity <= 0
    );
    if (incomplete.length > 0) {
      reasons.push({ type: 'error', message: `${incomplete.length} 种原料信息不完整（缺少名称或用量）` });
    }
  }
  if (priceQuote.value.missingPrices.length > 0) {
    reasons.push({ type: 'warning', message: `${priceQuote.value.missingPrices.length} 种原料未录入单价：${priceQuote.value.missingPrices.join('、')}` });
  }
  if (ratioValidation.value.level === 'error') {
    reasons.push({ type: 'error', message: `含量比校验失败：${ratioValidation.value.message}` });
  }
  if (ratioValidation.value.level === 'high_warning') {
    reasons.push({ type: 'warning', message: `含量比严重偏差：${ratioValidation.value.message}` });
  }
  if (ratioValidation.value.level === 'warning') {
    reasons.push({ type: 'warning', message: `含量比偏差预警：${ratioValidation.value.message}` });
  }
  if (isEdit.value && !formData.versionReason?.trim()) {
    reasons.push({ type: 'error', message: '编辑模式下请填写升版原因' });
  }

  return reasons;
});

const showQuickCreateSalesman = ref(false);
const parsedSalesmanName = ref('');
const highlightRowIdx = ref(-1);
const excelExpanded = ref(false);

const basicInfoCollapsed = ref(localStorage.getItem('formula-basic-info-collapsed') === 'true');
function toggleBasicInfoCollapsed() {
  basicInfoCollapsed.value = !basicInfoCollapsed.value;
  localStorage.setItem('formula-basic-info-collapsed', String(basicInfoCollapsed.value));
}

const salesmanNotMatched = computed(() => {
  const name = parsedSalesmanName.value;
  if (!name) return false;
  return !salesmanStore.allSalesmen.find(
    (s: Salesman) => s.name === name || s.name.includes(name) || name.includes(s.name)
  );
});

const materialTableRows = computed<MaterialTableRow[]>(() => {
  const allMats = materialStore.allMaterials ?? [];
  return formData.materials.map((item: FormMaterialItem) => {
    const mat = allMats.find((m: Material) => m.id === item.materialId);
    const basePrice = mat?.unitPrice ?? supplementPriceMap.value[item.materialId] ?? null;
    const isPriceAdj = item.adjustedPrice != null && item.adjustedPrice !== basePrice;
    const isQtyAdj = item.isQtyAdjusted === true && item.originalQuantity != null;
    return {
      materialId: item.materialId || undefined,
      materialName: item.materialName || mat?.name || '',
      quantity: item.quantity || 0,
      originalQuantity: isQtyAdj ? item.originalQuantity : undefined,
      unit: mat?.unit || 'g',
      basePrice,
      adjustedPrice: isPriceAdj ? item.adjustedPrice : undefined,
      isPriceAdjusted: isPriceAdj,
      isQtyAdjusted: isQtyAdj,
      materialType: mat?.materialType === 'supplement' ? 'supplement' as const : 'herb' as const,
    };
  });
});

const handleMaterialsUpdate = (rows: MaterialTableRow[]) => {
  formData.materials = rows.map((row: MaterialTableRow) => {
    const item: FormMaterialItem = {
      materialId: row.materialId || '',
      materialName: row.materialName,
      quantity: row.quantity,
      materialType: row.materialType || 'herb',
    };
    if (row.adjustedPrice != null) item.adjustedPrice = row.adjustedPrice;
    if (row.isPriceAdjusted) item.isPriceAdjusted = row.isPriceAdjusted;
    if (row.originalQuantity != null) item.originalQuantity = row.originalQuantity;
    if (row.isQtyAdjusted) item.isQtyAdjusted = row.isQtyAdjusted;
    return item;
  });
};

const handleMaterialChangeFromTable = (idx: number, _materialId: string) => {
  const item = formData.materials[idx];
  if (item?.materialId) {
    highlightRowIdx.value = idx;
    setTimeout(() => { highlightRowIdx.value = -1; }, 1500);
  }
};

const handleExcelImport = (materials: ParsedMaterial[]) => {
  const rows: MaterialTableRow[] = materials.map(m => ({
    materialId: m.materialId || '',
    materialName: m.materialName,
    quantity: m.quantity,
    unit: 'g',
    materialType: (m.materialType as MaterialTableRow['materialType']) || 'herb',
  }));
  handleMaterialsUpdate(rows);
  MessagePlugin.success(`已导入 ${materials.length} 条原料`);
  excelExpanded.value = false;
};

const onQuickSalesmanCreated = async (salesman: Salesman) => {
  await salesmanStore.fetchAllForSelect();
  const matched = salesmanStore.allSalesmen.find((s: Salesman) => s.id === salesman.id || s.name === salesman.name);
  if (matched) {
    formData.salesmanId = matched.id;
    MessagePlugin.success(`业务员「${matched.name}」已创建并自动选中`);
  }
};

interface FormMaterialItem {
  materialId: string;
  materialName?: string;
  quantity: number;
  adjustedPrice?: number | null;
  basePrice?: number | null;
  isPriceAdjusted?: boolean;
  isQtyAdjusted?: boolean;
  originalQuantity?: number;
  materialType?: string;
  unitPrice?: number | null;
  supplement?: boolean;
  name?: string;
}

interface FormData extends Omit<FormulaFormType, 'materials'> {
  materials: FormMaterialItem[];
  preparationMethod: string;
}

const formData = reactive<FormData>({
  name: '',
  salesmanId: '',
  materials: [],
  finishedWeight: 0,
  ratioFactor: 0.18,
  supplementRatioFactor: 1.0,
  packagingPrice: 0,
  otherPrice: 0,
  profitMargin: 20,
  description: '',
  preparationMethod: '',
  versionReason: ''
});

const validateMaterials = (value: MaterialItem[]) => {
  return value.length > 0;
};

const validateRatioFactor = (val: number) => val >= 0.15 && val <= 0.25;

const validateSupplementRatio = (val: number) => val >= 0.5 && val <= 1.5;

const rules: Record<string, FormRule[]> = {
  name: [
    { required: true, message: '请输入配方名称', trigger: 'blur' },
    { min: 2, message: '配方名称至少2个字符', trigger: 'change' },
  ],
  salesmanId: [{ required: true, message: '请选择所属业务员', trigger: 'change' }],
  finishedWeight: [
    { required: true, message: '请输入成品重量', trigger: 'blur' },
  ],
  ratioFactor: [
    { required: true, message: '请输入主料含量比系数', trigger: 'blur' },
    { validator: validateRatioFactor, message: '主料含量比系数范围为0.15-0.25', trigger: 'blur' },
  ],
  supplementRatioFactor: [
    { required: true, message: '请输入辅料含量比系数', trigger: 'blur' },
    { validator: validateSupplementRatio, message: '辅料含量比系数范围为0.5-1.5', trigger: 'blur' },
  ],
  materials: [
    { validator: validateMaterials, message: '请至少添加一种原料', trigger: 'change' },
    {
      validator: (value: MaterialItem[]) => value.every(item => item.materialId && item.quantity > 0),
      message: '请完整填写所有原料信息', trigger: 'change',
    },
  ],
};

async function handleGenerateDescription() {
  if (aiLoadingDescription.value) return;
  if (!formData.name) {
    MessagePlugin.warning('请先填写配方名称');
    return;
  }
  const materials = formData.materials.map((m: FormMaterialItem) => ({
    name: m.materialName || m.name,
    quantity: m.quantity,
    type: m.supplement ? 'supplement' : 'herb',
  }));
  if (isEdit.value && formData.description) {
    const reason = formData.versionReason || '';
    if (!reason) {
      MessagePlugin.warning('编辑模式下请先填写升版原因');
      return;
    }
    aiLoadingDescription.value = true;
    try {
      const res = await agentApi.generateDescription({
        formulaName: formData.name,
        materials,
        finishedWeight: formData.finishedWeight || undefined,
        revisionReason: reason,
        existingDescription: formData.description,
        type: 'description',
      });
      if (res?.content) {
        formData.description = res.content;
        MessagePlugin.success('配方描述已智能生成');
      }
    } catch {
      MessagePlugin.error('生成失败');
    } finally {
      aiLoadingDescription.value = false;
    }
    return;
  }
  aiLoadingDescription.value = true;
  try {
    const res = await agentApi.generateDescription({
      formulaName: formData.name,
      materials,
      finishedWeight: formData.finishedWeight || undefined,
      type: 'description',
    });
    if (res?.content) {
      formData.description = res.content;
      MessagePlugin.success('配方描述已智能生成');
    }
  } catch {
    MessagePlugin.error('生成失败');
  } finally {
    aiLoadingDescription.value = false;
  }
}

async function handleGeneratePreparation() {
  if (aiLoadingPreparation.value) return;
  if (!formData.name) {
    MessagePlugin.warning('请先填写配方名称');
    return;
  }
  const materials = formData.materials.map((m: FormMaterialItem) => ({
    name: m.materialName || m.name,
    quantity: m.quantity,
    type: m.supplement ? 'supplement' : 'herb',
  }));
  aiLoadingPreparation.value = true;
  try {
    const res = await agentApi.generateDescription({
      formulaName: formData.name,
      materials,
      finishedWeight: formData.finishedWeight || undefined,
      type: 'preparation',
    });
    if (res?.content) {
      formData.preparationMethod = res.content;
      MessagePlugin.success('制法已智能生成');
    }
  } catch {
    MessagePlugin.error('生成失败');
  } finally {
    aiLoadingPreparation.value = false;
  }
}

async function handleGenerateVersionReason() {
  if (aiLoadingVersionReason.value) return;
  if (!formData.name) {
    MessagePlugin.warning('请先填写配方名称');
    return;
  }
  const materials = formData.materials.map((m: FormMaterialItem) => ({
    name: m.materialName || m.name,
    quantity: m.quantity,
    type: m.supplement ? 'supplement' : 'herb',
  }));
  aiLoadingVersionReason.value = true;
  try {
    const res = await agentApi.generateDescription({
      formulaName: formData.name,
      materials,
      finishedWeight: formData.finishedWeight || undefined,
      type: 'version_reason',
    });
    if (res?.content) {
      formData.versionReason = res.content;
      MessagePlugin.success('升版原因已智能生成');
    }
  } catch {
    MessagePlugin.error('生成失败');
  } finally {
    aiLoadingVersionReason.value = false;
  }
}

const clearVersionReasonError = () => {
  if (versionReasonError.value && formData.versionReason?.trim()) {
    versionReasonError.value = false;
  }
};

const handleSubmit = async ({ validateResult }: Record<string, unknown>) => {
  if (validateResult === true) {
    if (isEdit.value && !formData.versionReason?.trim()) {
      versionReasonError.value = true;
      await nextTick();
      const el = versionReasonRef.value?.$el as HTMLElement | undefined;
      const textareaEl = el?.querySelector('textarea') || el;
      if (textareaEl) {
        textareaEl.focus?.();
        textareaEl.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // ratioFactor 含量比校验拦截
    if (formData.materials.length > 0 && formData.finishedWeight > 0) {
      const validation = ratioValidation.value;
      if (!validation.allowed) {
        MessagePlugin.error(validation.message);
        const validationEl = document.querySelector('.ratio-validation-section');
        if (validationEl) {
          validationEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      if (validation.level === 'high_warning') {
        const confirmed = await new Promise<boolean>((resolve) => {
          const dialog = DialogPlugin.confirm({
            header: '含量比严重偏差',
            body: validation.description,
            confirmBtn: '确认提交（需人工审核）',
            cancelBtn: '返回修改',
            theme: 'warning',
            onConfirm: () => { dialog.destroy(); resolve(true); },
            onCancel: () => { dialog.destroy(); resolve(false); },
            onClose: () => { dialog.destroy(); resolve(false); },
          });
        });
        if (!confirmed) return;
      }
      if (validation.level === 'warning') {
        const confirmed = await new Promise<boolean>((resolve) => {
          const dialog = DialogPlugin.confirm({
            header: '含量比偏差提醒',
            body: validation.description,
            confirmBtn: '继续创建',
            cancelBtn: '返回修改',
            theme: 'info',
            onConfirm: () => { dialog.destroy(); resolve(true); },
            onCancel: () => { dialog.destroy(); resolve(false); },
            onClose: () => { dialog.destroy(); resolve(false); },
          });
        });
        if (!confirmed) return;
      }
    }

    if (loading.value) return;
    loading.value = true;
    try {
      const id = route.params.id as string;
      let result;

      if (isEdit.value && id) {
        result = await formulaStore.updateFormula(id, formData);
      } else {
        result = await formulaStore.createFormula(formData);
      }

      if (result.success) {
        MessagePlugin.success(isEdit.value ? '保存成功' : '创建成功');
        router.push({
          path: '/formulas',
          query: route.query
        });
      } else {
        MessagePlugin.error(result.message || '操作失败');
      }
    } finally {
      loading.value = false;
    }
  }
};

const handleBack = () => {
  router.push({
    path: '/formulas',
    query: route.query
  });
};

async function handleRefreshSnapshot() {
  const id = route.params.id as string;
  if (!id) return;

  refreshingSnapshot.value = true;
  try {
    const outdatedIds = materialUpdatesInfo.value
      .filter((m) => !m.isLatest)
      .map((m) => m.materialId);

    await versionApi.refreshSnapshot(id, { materialIds: outdatedIds });
    MessagePlugin.success("原料快照已刷新至最新版本");
    hasMaterialUpdates.value = false;

    const formula = await formulaStore.getFormula(id);
    if (formula) {
      const allMats = materialStore.allMaterials ?? [];
      const materials = (formula.materials || []).map((m: MaterialItem) => {
        let materialId = m.materialId;
        if (!allMats.find(mat => mat.id === materialId) && m.materialName) {
          const matched = allMats.find(mat => mat.name === m.materialName);
          if (matched) materialId = matched.id;
        }
        const matFromStore = allMats.find((x: Material) => x.id === materialId);
        const materialType = matFromStore?.materialType || 'herb';
        const item: FormMaterialItem = { materialId, materialName: m.materialName, quantity: m.quantity, materialType };
        return item;
      });
      formData.materials = materials;
    }

    try {
      const updatesResult = await versionApi.getMaterialUpdates(id);
      if (updatesResult) {
        materialUpdatesInfo.value = updatesResult.materials || [];
        hasMaterialUpdates.value = updatesResult.hasUpdates || false;
        const map: Record<string, { currentVersion: number; latestVersion: number; isLatest: boolean; }> = {};
        for (const mu of updatesResult.materials || []) {
          map[mu.materialId] = {
            currentVersion: mu.currentVersion || 1,
            latestVersion: mu.latestVersion || mu.currentVersion || 1,
            isLatest: mu.isLatest,
          };
        }
        materialVersionsMap.value = map;
      }
    } catch {
      // ignore
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "刷新快照失败";
    MessagePlugin.error(message);
  } finally {
    refreshingSnapshot.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    salesmanStore.fetchAllForSelect(),
    materialStore.fetchAllForSelect(),
  ]);

  const id = route.params.id as string;
  if (isEdit.value && id) {
    const formula = await formulaStore.getFormula(id);
    if (formula) {
      if (formula.currentVersionNumber) {
        currentVersionNumber.value = formula.currentVersionNumber;
      }
      if (formula.status) {
        formulaStatus.value = formula.status;
      }
      const allMats = materialStore.allMaterials ?? [];
      const materials = (formula.materials || []).map((m: MaterialItem) => {
        let materialId = m.materialId;
        if (!allMats.find(mat => mat.id === materialId) && m.materialName) {
          const matched = allMats.find(mat => mat.name === m.materialName);
          if (matched) materialId = matched.id;
        }
        const matFromStore = allMats.find((x: Material) => x.id === materialId);
        const materialType = matFromStore?.materialType || 'herb';
        const item: FormMaterialItem = { materialId, materialName: m.materialName, quantity: m.quantity, materialType };
        return item;
      });
      Object.assign(formData, {
        name: formula.name,
        salesmanId: formula.salesmanId,
        materials,
        finishedWeight: formula.finishedWeight || 0,
        ratioFactor: formula.ratioFactor ?? 0.18,
        supplementRatioFactor: formula.supplementRatioFactor ?? 1.0,
        packagingPrice: formula.packagingPrice ?? 0,
        otherPrice: formula.otherPrice ?? 0,
        profitMargin: formula.profitMargin ?? 20,
        description: formula.description || '',
        preparationMethod: (formula as unknown as Record<string, unknown>).preparationMethod || ''
      });

      try {
        const quoteData = await formulaApi.getPriceQuote(id);
        if (quoteData?.materials) {
          const map: Record<string, number> = {};
          quoteData.materials.forEach((m: PriceQuoteMaterial) => {
            if (m.unitPrice != null && m.materialId) {
              map[m.materialId] = m.unitPrice;
            }
          });
          supplementPriceMap.value = map;
        }
      } catch (e) {
        console.warn('获取报价补充数据失败:', e);
      }

      try {
        const updatesResult = await versionApi.getMaterialUpdates(id);
        if (updatesResult) {
          materialUpdatesInfo.value = updatesResult.materials || [];
          hasMaterialUpdates.value = updatesResult.hasUpdates || false;
          const map: Record<string, { currentVersion: number; latestVersion: number; isLatest: boolean; }> = {};
          for (const mu of updatesResult.materials || []) {
            map[mu.materialId] = {
              currentVersion: mu.currentVersion || 1,
              latestVersion: mu.latestVersion || mu.currentVersion || 1,
              isLatest: mu.isLatest,
            };
          }
          materialVersionsMap.value = map;
        }
      } catch (e) {
        console.warn('获取原料版本更新信息失败:', e);
      }
    }
  }
});
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.formula-form {
  padding-bottom: 24px;

  .snapshot-refresh-alert {
    margin-bottom: 16px;
    border-radius: $radius-xl;

    .alert-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .alert-title {
      font-weight: $font-weight-bold;
      font-size: $font-size-body;
    }

    .alert-details {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .alert-detail-item {
      font-size: $font-size-body-sm;
      color: $color-warning;
      background: $color-warning-bg;
      padding: 2px 8px;
      border-radius: $radius-md;
    }

    .alert-price-change {
      font-size: $font-size-caption;
      opacity: 0.8;
    }

    .alert-warning {
      font-size: $font-size-caption;
      color: var(--color-text-tertiary);
    }

    .alert-actions {
      display: flex;
      gap: 8px;
      margin-top: 4px;
    }

    .alert-btn {
      padding: 4px 12px;
      border-radius: $radius-md;
      font-size: $font-size-body-sm;
      font-weight: $font-weight-semibold;
      cursor: pointer;
      border: none;
      transition: all $transition-fast;

      &--dismiss {
        background: transparent;
        color: var(--color-text-secondary);
        border: 1px solid var(--color-border);

        &:hover {
          border-color: var(--color-border-light);
        }
      }

      &--refresh {
        background: var(--color-primary);
        color: $text-white;

        &:hover {
          opacity: 0.9;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Header 区域 — 精确复刻 FormulaDetail.vue
  // 布局：sticky 顶栏 | 左侧：返回+面包屑+标题 | 右侧：emerald按钮
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
          color: $emerald-500; // hover:text-emerald-500
          background-color: $emerald-50; // hover:bg-emerald-50
        }
      }

      // 标题组（面包屑 + 标题）
      .header-title-group {
        display: flex;
        flex-direction: column;
        gap: var(--space-1-5); // 增加面包屑与标题间距

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
              color: $emerald-500; // hover:text-emerald-500
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
          gap: 8px;
          font-size: 18px;
          font-weight: 700;
          color: var(--color-text-primary);
          line-height: 1.35;

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
            font-size: 11px;
            font-weight: 600;
            border-radius: 999px;
            white-space: nowrap;

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
        background-color: $emerald-500; // bg-emerald-500
        color: $text-white;
        border: none;
        border-radius: 12px; // rounded-xl
        font-size: 14px; // text-sm
        font-weight: 700; // font-bold
        box-shadow: 0 10px 15px -3px $overlay-emerald-25; // shadow-lg shadow-emerald-100
        cursor: pointer;
        transition: all $transition-fast; // transition-all

        .btn-icon {
          font-size: 18px; // text-lg (图标略大于文字)
        }

        &:hover {
          background-color: $emerald-600; // hover:bg-emerald-600
          transform: translateY(-1px);
          box-shadow: 0 14px 20px -3px $overlay-emerald-35;
        }

        &:active {
          transform: translateY(0);
          background-color: var(--color-primary-deep);
        }

        &:disabled {
          background-color: var(--color-text-placeholder);
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        // 次要按钮样式
        &.secondary {
          background-color: var(--color-border-light); // slate-100
          color: var(--color-text-secondary); // slate-500
          box-shadow: 0 1px 3px $overlay-black-05;

          &:hover {
            background-color: var(--color-border); // slate-200
            color: var(--color-text-secondary); // slate-600
            box-shadow: 0 4px 6px $overlay-black-05;
          }

          &:active {
            background-color: var(--color-border); // slate-300
          }
        }
      }
    }
  }

  // 主内容区域
  .form-main {
    margin-top: 24px;
    animation: fadeInUp 0.5s ease-out forwards;

    // ═══ 垂直四区域布局 ═══
    .form-vertical-layout {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    // 区域样式
    .zone-basic-info,
    .zone-materials-table {
      background: var(--color-bg-container);
      padding: 32px;
      border-radius: 2.5rem;
      box-shadow: 0 1px 3px $overlay-black-05;
      border: 1px solid var(--color-bg-page);
      overflow: hidden;
    }

    .info-collapsed-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: $gradient-collapsed-bar;
      border: 1.5px dashed $green-300;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.25s ease;
      user-select: none;

      &:hover {
        background: $gradient-collapsed-bar-hover;
        border-color: $green-400;
        box-shadow: 0 2px 8px $overlay-green-12;
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
      }
    }

    .info-collapsed-left {
      display: flex;
      align-items: center;
      gap: var(--space-2-5);
    }

    .info-collapsed-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: $gradient-green-icon;
      color: $text-white;
      flex-shrink: 0;
      box-shadow: 0 2px 6px $overlay-green-30;
    }

    .info-collapsed-text {
      font-size: 14px;
      font-weight: 700;
      color: $green-700;
    }

    .info-collapsed-hint {
      font-size: 11px;
      color: $green-300;
      background: $overlay-green-12;
      padding: var(--space-0-5) 8px;
      border-radius: 6px;
      font-weight: 500;
    }

    .info-collapsed-arrow {
      color: $green-300;
      transition: transform 0.2s;
    }

    .info-expanded-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0;
      cursor: pointer;
      transition: opacity 0.2s;
      margin-bottom: 24px;

      &:hover {
        opacity: 0.7;
      }
    }

    .info-expanded-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 700;
      // color: var(--color-text-placeholder);
      text-transform: uppercase;
      letter-spacing: 0.12em;

      .t-icon {
        color: $emerald-500;
        font-size: 16px;
      }
    }

    .info-expanded-arrow {
      color: var(--color-text-placeholder);
      transition: transform 0.2s;
    }

    .zone-content {}

    .zone-basic-info {
      .basic-info-two-col {
        display: grid;
        grid-template-columns: 40% 60%;
        gap: 32px;

        @media (max-width: 900px) {
          grid-template-columns: 1fr;
        }

        .info-col-left,
        .info-col-right {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .info-col-left {
          .field-inline .field-input {
            max-width: calc(100% - 100px);
          }
        }

        .info-col-right {
          padding-right: 20px;
        }

        .info-card {
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 20px;
        }

        .field-inline {
          display: flex;
          align-items: center;
          gap: 12px;

          .field-label {
            margin-bottom: 0;
            white-space: nowrap;
            flex-shrink: 0;
            min-width: 100px;
            justify-content: flex-end;
          }

          .field-input {
            flex: 1;
            min-width: 0;

            :deep(.t-input),
            :deep(.t-input-number),
            :deep(.t-select) {
              width: 100%;
            }

            .salesman-select {
              :deep(.t-input__inner) {
                font-size: 12px;
                font-weight: 400;
                color: var(--color-text-primary);
              }
            }
          }

          .field-help-below {
            margin-top: 4px;
            margin-left: calc(100px + 12px);
            font-size: 11px;
            color: var(--color-text-placeholder);
            line-height: 1.4;
          }
        }

        .field-inline {
          position: relative;
          flex-wrap: wrap;

          .field-help-below {
            width: 100%;
            order: 3;
            margin-left: calc(100px + 12px);
          }
        }

        .field-compact {
          .field-label {
            .required {
              color: $rose-500;
            }
          }

          .field-label-row {
            display: flex;
            align-items: center;
            gap: var(--space-1-5);
            margin-bottom: var(--space-1-5);

            .field-label {
              font-size: 12px;
              font-weight: 700;
              color: var(--color-text-secondary);

              .required {
                color: $rose-500;
              }

              .field-help-inline {
                margin-left: 4px;
                font-size: 11px;
                font-weight: 400;
                color: var(--color-text-placeholder);
              }
            }

            .btn-ai-generate {
              margin-left: auto;
              display: inline-flex;
              align-items: center;
              gap: 4px;
              padding: var(--space-0-5) var(--space-2-5);
              border: 1px solid $overlay-emerald-25;
              border-radius: 12px;
              background: $overlay-emerald-06;
              color: $emerald-500;
              font-size: 11px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.15s ease;
              white-space: nowrap;

              &:hover:not(:disabled) {
                background: $overlay-emerald-12;
                border-color: $overlay-emerald-40;
              }

              &:disabled {
                opacity: 0.4;
                cursor: not-allowed;
              }

              .t-icon {
                &.t-icon-loading {
                  animation: ai-spin 1s linear infinite;
                }
              }
            }
          }

          .field-help {
            margin-top: 4px;
            font-size: 11px;
            color: var(--color-text-placeholder);
            line-height: 1.4;
          }

          .field-error-msg {
            display: flex;
            align-items: center;
            gap: 4px;
            margin-top: 4px;
            font-size: 12px;
            color: $rose-500;
          }

          :deep(.t-input),
          :deep(.t-input-number),
          :deep(.t-textarea),
          :deep(.t-select) {
            border-radius: 12px !important;
            min-height: 36px !important;
          }

          :deep(.t-input) {
            background-color: var(--color-bg-page) !important;
            border: 1px solid var(--color-border-light) !important;
            padding: 8px var(--space-3-5) !important;
            font-size: 13px !important;
            color: var(--color-text-primary) !important;
            transition: all $transition-fast;

            &:hover:not(.t-is-disabled) {
              border-color: var(--color-border) !important;
            }

            &.t-is-focused {
              background-color: var(--color-bg-container) !important;
              border-color: transparent !important;
              box-shadow: 0 0 0 2px $emerald-500 !important;
              outline: none !important;
            }

            &::placeholder {
              color: var(--color-text-placeholder) !important;
            }
          }

          :deep(.t-input__wrap) {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }

          :deep(.t-select) {
            width: 100%;

            .t-select__wrap {
              background-color: var(--color-bg-page) !important;
              border: 1px solid var(--color-border-light) !important;
              border-radius: 12px !important;
              padding: var(--space-1-5) var(--space-2-5) !important;
              min-height: 36px;
              transition: all $transition-fast;

              &:hover:not(.t-is-disabled) {
                border-color: var(--color-border) !important;
              }
            }

            &.t-is-focused .t-select__wrap {
              background-color: var(--color-bg-container) !important;
              border-color: transparent !important;
              box-shadow: 0 0 0 2px $emerald-500 !important;
              outline: none !important;
            }

            .t-select__placeholder,
            .t-select__single-value {
              font-size: 13px !important;
              color: var(--color-text-primary) !important;
            }

            .t-select__placeholder {
              color: var(--color-text-placeholder) !important;
            }

            .t-icon {
              color: var(--color-text-placeholder) !important;
            }
          }

          :deep(.t-input-number) {
            width: 100%;
            background-color: var(--color-bg-page) !important;
            border: 1px solid var(--color-border-light) !important;
            border-radius: 12px !important;
            min-height: 36px;
            transition: all $transition-fast;

            &:hover:not(.t-is-disabled) {
              border-color: var(--color-border) !important;
            }

            &.t-is-focused {
              background-color: var(--color-bg-container) !important;
              border-color: transparent !important;
              box-shadow: 0 0 0 2px $emerald-500 !important;
              outline: none !important;
            }

            .t-input__wrap {
              border: none !important;
              box-shadow: none !important;
              background: transparent !important;
            }

            .t-input-number__decrease,
            .t-input-number__increase {
              border: none !important;
              background: transparent !important;
              color: $emerald-500 !important;
              border-radius: 50% !important;
              width: 24px !important;
              height: 24px !important;
              top: 50% !important;
              transform: translateY(-50%) !important;
              transition: all 0.15s ease;

              &:hover {
                background-color: $overlay-emerald-08 !important;
                color: $emerald-600 !important;
              }
            }

            .t-input__inner {
              background: transparent !important;
              font-size: 13px !important;
              color: var(--color-text-primary) !important;
              padding: 8px 12px !important;
              min-height: 34px;

              &::placeholder {
                color: var(--color-text-placeholder) !important;
              }
            }
          }

          :deep(.t-textarea) {
            .t-textarea__inner {
              background-color: var(--color-bg-page) !important;
              border: 1px solid var(--color-border-light) !important;
              border-radius: 12px !important;
              padding: var(--space-2-5) var(--space-3-5) !important;
              font-size: 13px !important;
              color: var(--color-text-primary) !important;
              transition: all $transition-fast;

              &:hover:not(:focus) {
                border-color: var(--color-border) !important;
              }

              &:focus {
                background-color: var(--color-bg-container) !important;
                border-color: transparent !important;
                box-shadow: 0 0 0 2px $emerald-500 !important;
                outline: none !important;
              }

              &::placeholder {
                color: var(--color-text-placeholder) !important;
              }
            }
          }
        }

        @media (max-width: 900px) {
          .info-col-right {
            padding-right: 0;
          }

          .field-inline {
            flex-direction: column;
            align-items: stretch;

            .field-label {
              justify-content: flex-start;
              min-width: 0;
              margin-bottom: 8px;
            }

            .field-help-below {
              position: static;
              left: auto;
              margin-left: 0;
              width: auto;
            }
          }
        }
      }
    }

    .zone-materials-table {
      .mode-switcher {
        display: flex;
        gap: 8px;
      }

      .zone-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .zone-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0;

        .t-icon {
          color: $emerald-500;
          font-size: 16px;
        }
      }
    }

    .formula-summary-bar {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-top: 20px;

      @media (max-width: 900px) {
        grid-template-columns: 1fr;
      }
    }

    .summary-card {
      background: var(--color-bg-page);
      border-radius: 16px;
      border: 1px solid var(--color-border);
      padding: 20px 24px;
    }

    .summary-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 700;
      color: var(--color-text-placeholder);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 16px;

      .t-icon {
        color: $emerald-500;
        font-size: 14px;
      }
    }

    .ratio-status-badge {
      margin-left: auto;
      padding: var(--space-0-5) 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 500;

      &.badge--normal {
        background: $green-100;
        color: $green-800;
      }

      &.badge--warning {
        background: $amber-100;
        color: var(--color-warning, $amber-800);
      }

      &.badge--high_warning {
        background: $orange-50;
        color: $orange-600;
      }

      &.badge--error {
        background: $red-100;
        color: $red-800;
      }
    }

    .summary-card--ratio {
      .ratio-bar-track {
        height: 8px;
        background: var(--color-border);
        border-radius: 4px;
        position: relative;
        overflow: hidden;

        .ratio-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
          border-radius: 4px;
          transition: width 0.3s;
        }

        .ratio-bar-marker {
          position: absolute;
          top: -4px;
          width: 2px;
          height: 16px;
          background: var(--color-text-primary);
          transform: translateX(-50%);
        }
      }

      .ratio-labels {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: var(--color-text-placeholder);
        margin-top: 4px;

        .center {
          color: var(--color-primary);
          font-weight: 500;
        }
      }

      .ratio-value {
        margin-top: var(--space-2-5);
        font-size: 13px;
        color: var(--color-text-secondary);

        strong {
          color: var(--color-text-primary);
          font-size: 15px;
        }

        .deviation {
          margin-left: 8px;

          &.deviation--normal {
            color: var(--color-primary);
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
      }

      .ratio-threshold-config {
        margin-top: var(--space-3-5);
        padding-top: 12px;
        border-top: 1px dashed var(--color-border);

        .rtc-item {
          display: flex;
          align-items: center;
          gap: var(--space-1-5);
          padding: 4px 0;
          font-size: 11px;

          .rtc-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            flex-shrink: 0;
          }

          .rtc-label {
            font-weight: 600;
            min-width: 28px;
          }

          .rtc-range {
            color: var(--color-text-secondary);
            font-variant-numeric: tabular-nums;
          }

          &.rtc-item--normal {
            .rtc-dot {
              background: var(--color-primary);
            }

            .rtc-label {
              color: $green-800;
            }
          }

          &.rtc-item--warning {
            .rtc-dot {
              background: var(--color-warning);
            }

            .rtc-label {
              color: var(--color-warning, $amber-800);
            }
          }

          &.rtc-item--high_warning {
            .rtc-dot {
              background: $orange-600;
            }

            .rtc-label {
              color: $orange-600;
            }
          }

          &.rtc-item--error {
            .rtc-dot {
              background: var(--color-danger);
            }

            .rtc-label {
              color: $red-800;
            }
          }
        }
      }

      .rtc-submit-tag {
        margin-left: auto;
        font-size: 10px;
        font-weight: 700;
        padding: 1px var(--space-1-5);
        border-radius: 4px;
        white-space: nowrap;
        flex-shrink: 0;

        &.rtc-submit-tag--allow {
          background: $green-100;
          color: $green-800;
        }

        &.rtc-submit-tag--review {
          background: $orange-50;
          color: $orange-600;
        }

        &.rtc-submit-tag--block {
          background: $red-100;
          color: $red-800;
        }
      }
    }

    .summary-card--quote {
      .quote-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-2-5);

        .qt-badge-info {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--color-warning, $amber-800);
        }
      }

      .quote-warn-text {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: var(--color-danger);
        margin-bottom: var(--space-2-5);
      }

      .quote-summary {
        .qs-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          font-size: 13px;

          label {
            display: flex;
            align-items: center;
            gap: var(--space-1-5);
            color: var(--color-text-secondary);
            font-weight: 500;
          }

          >span {
            font-weight: 600;
            color: var(--color-text-primary);
          }

          .qs-label-icon {
            color: var(--color-text-placeholder);
          }

          .qs-input-wrap {
            display: flex;
            align-items: center;
            gap: var(--space-1-5);

            :deep(.t-input-number .t-input__inner) {
              text-align: right;
            }

            .qs-unit {
              font-size: 12px;
              color: var(--color-text-placeholder);
            }
          }

          &.qs-total {
            label {
              color: var(--color-text-primary);
              font-weight: 600;
            }

            >span {
              color: var(--color-text-primary);
              font-size: 14px;
            }
          }

          &.qs-subtotal {
            label {
              color: var(--color-text-primary);
              font-weight: 600;
            }

            >span {
              color: var(--color-text-primary);
              font-size: 15px;
              font-weight: 700;
            }
          }

          &.qs-final {
            padding: 12px 0 4px;

            label {
              color: var(--color-text-primary);
              font-weight: 700;
              font-size: 14px;
            }

            >span {
              color: $emerald-500;
              font-size: 20px;
              font-weight: 700;
            }

            .qs-label-icon--final {
              color: $emerald-500;
            }
          }
        }

        .qs-divider {
          height: 1px;
          background: var(--color-border);
          margin: var(--space-1-5) 0;

          &.qs-divider--bold {
            height: 2px;
            background: $emerald-500;
            margin: 8px 0;
          }
        }
      }
    }

    .summary-card--submit {
      .submit-block-reasons {
        margin-bottom: 16px;
      }

      .sbr-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: var(--space-1-5) 0;
        font-size: 12px;

        .sbr-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin-top: var(--space-1-25);
          flex-shrink: 0;
        }

        &.sbr-item--error {
          .sbr-dot {
            background: var(--color-danger);
          }

          .sbr-text {
            color: var(--color-danger);
          }
        }

        &.sbr-item--warning {
          .sbr-dot {
            background: var(--color-warning);
          }

          .sbr-text {
            color: $amber-600;
          }
        }
      }

      .submit-all-clear {
        display: flex;
        align-items: center;
        gap: var(--space-1-5);
        padding: 8px 0;
        font-size: 13px;
        color: $green-600;
        font-weight: 500;
        margin-bottom: 16px;
      }
    }

    // 表单 Section 样式
    .form-section {
      background: var(--color-bg-container);
      padding: 32px;
      border-radius: 2.5rem;
      box-shadow: 0 1px 3px $overlay-black-05;
      border: 1px solid var(--color-bg-page);
      animation: fadeInUp 0.35s ease both;

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 700;
        color: var(--color-text-placeholder);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        margin: 0 0 24px;

        .section-icon {
          color: $emerald-500;
          font-size: 16px;
        }
      }

      .row-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .add-row-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        font-weight: 700;
        color: $emerald-600;
        padding: var(--space-1-5) 12px;
        background-color: $overlay-emerald-08;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all $transition-fast;

        .t-icon {
          font-size: 14px;
        }

        &:hover {
          color: var(--color-primary-deep);
          background-color: $overlay-emerald-15;
        }
      }

      .clear-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        font-weight: 700;
        color: $emerald-600;
        padding: var(--space-1-5) 12px;
        background-color: $overlay-emerald-08;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all $transition-fast;

        .t-icon {
          font-size: 14px;
        }

        &:hover:not(:disabled) {
          color: var(--color-primary-deep);
          background-color: $overlay-emerald-15;
        }

        &:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
      }

      .section-content {
        .form-field {
          .field-label {
            .required {
              color: $rose-500;
            }
          }

          .field-label-row {
            display: flex;
            align-items: center;
            gap: var(--space-1-5);
            margin-bottom: 8px;

            .field-label {
              font-size: 14px;
              font-weight: 700;
              color: var(--color-text-primary);

              .label-icon {
                color: var(--color-primary);
                flex-shrink: 0;
              }

              .required {
                color: $rose-500;
              }

              .field-help-inline {
                font-size: 12px;
                font-weight: 400;
                color: var(--color-text-placeholder);
                margin-left: 4px;
              }
            }

            .btn-ai-generate {
              margin-left: auto;
              display: inline-flex;
              align-items: center;
              gap: 4px;
              padding: var(--space-0-5) var(--space-2-5);
              border: 1px solid var(--color-primary);
              border-radius: 6px;
              background: $overlay-emerald-08;
              color: var(--color-primary);
              font-size: 12px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
              line-height: 22px;

              &:hover:not(:disabled) {
                background: $overlay-emerald-15;
                box-shadow: 0 1px 4px $overlay-emerald-20;
              }

              &:disabled {
                opacity: 0.45;
                cursor: not-allowed;
                border-color: var(--color-border);
                color: var(--color-text-placeholder);
                background: transparent;
              }

              .t-icon {
                &.t-icon-loading {
                  animation: ai-spin 1s linear infinite;
                }
              }
            }
          }

          .field-input {
            width: 100%;
          }

          .field-help {
            margin-top: 4px;
            font-size: 12px;
            color: var(--color-text-secondary);
            text-align: left;
          }

          &.field-error {
            .field-label {
              color: var(--color-danger);
            }

            :deep(.t-textarea .t-textarea__inner) {
              border-color: $red-300 !important;
              background-color: $red-50 !important;
              box-shadow: 0 0 0 3px $overlay-red-10 !important;

              &:focus {
                border-color: var(--color-danger) !important;
                box-shadow: 0 0 0 3px $overlay-red-15 !important;
              }
            }
          }

          .field-error-msg {
            display: flex;
            align-items: center;
            gap: 4px;
            margin: var(--space-1-5) 0 0;
            font-size: 12px;
            font-weight: 600;
            color: var(--color-danger);
          }

          .error-fade-enter-active {
            animation: errorFadeIn 0.3s ease;
          }

          .error-fade-leave-active {
            animation: errorFadeIn 0.2s ease reverse;
          }

          @keyframes errorFadeIn {
            from {
              opacity: 0;
              transform: translateY(-4px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          // ═══ 输入框 — 参照 new-recipe.html 样式 ═══
          // w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700
          // focus:ring-2 focus:ring-emerald-500 focus:bg-white

          :deep(.t-input) {
            background-color: var(--color-bg-page) !important;
            border: 1px solid var(--color-border-light) !important;
            border-radius: 16px !important;
            padding: var(--space-3-5) 20px !important;
            min-height: 48px;
            font-size: 14px !important;
            color: var(--color-text-primary) !important;
            transition: all $transition-fast;

            &:hover:not(.t-is-disabled) {
              border-color: var(--color-border) !important;
            }

            &.t-is-focused {
              background-color: var(--color-bg-container) !important;
              border-color: transparent !important;
              box-shadow: 0 0 0 2px $emerald-500 !important;
              outline: none !important;
            }

            &::placeholder {
              color: var(--color-text-placeholder) !important;
            }
          }

          :deep(.t-input__wrap) {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }

          :deep(.t-select) {
            width: 100%;

            .t-select__wrap {
              background-color: var(--color-bg-page) !important;
              border: 1px solid var(--color-border-light) !important;
              border-radius: 16px !important;
              padding: var(--space-2-5) 12px !important;
              min-height: 48px;
              transition: all $transition-fast;

              &:hover:not(.t-is-disabled) {
                border-color: var(--color-border) !important;
              }
            }

            &.t-is-focused .t-select__wrap {
              background-color: var(--color-bg-container) !important;
              border-color: transparent !important;
              box-shadow: 0 0 0 2px $emerald-500 !important;
              outline: none !important;
            }

            .t-select__placeholder,
            .t-select__single-value {
              font-size: 14px !important;
              color: var(--color-text-primary) !important;
              line-height: 22px;
            }

            .t-select__placeholder {
              color: var(--color-text-placeholder) !important;
            }

            .t-icon {
              color: var(--color-text-placeholder) !important;
            }
          }

          :deep(.t-input-number) {
            width: 100%;
            background-color: var(--color-bg-page) !important;
            border: 1px solid var(--color-border-light) !important;
            border-radius: 16px !important;
            min-height: 48px;
            transition: all $transition-fast;

            &:hover:not(.t-is-disabled) {
              border-color: var(--color-border) !important;
            }

            &.t-is-focused {
              background-color: var(--color-bg-container) !important;
              border-color: transparent !important;
              box-shadow: 0 0 0 2px $emerald-500 !important;
              outline: none !important;
            }

            .t-input__wrap {
              border: none !important;
              box-shadow: none !important;
              background: transparent !important;
            }

            .t-input-number__decrease,
            .t-input-number__increase {
              border: none !important;
              background: transparent !important;
              color: $emerald-500 !important;
              border-radius: 50% !important;
              width: 28px !important;
              height: 28px !important;
              top: 50% !important;
              transform: translateY(-50%) !important;
              transition: all 0.15s ease;

              &:hover {
                background-color: $overlay-emerald-08 !important;
                color: $emerald-600 !important;
              }
            }

            .t-input__inner {
              background: transparent !important;
              font-size: 14px !important;
              color: var(--color-text-primary) !important;
              padding: var(--space-3-5) 12px !important;
              min-height: 46px;

              &::placeholder {
                color: var(--color-text-placeholder) !important;
              }
            }
          }

          :deep(.t-textarea) {
            .t-textarea__inner {
              background-color: var(--color-bg-page) !important;
              border: 1px solid var(--color-border-light) !important;
              border-radius: 16px !important;
              padding: var(--space-3-5) 20px !important;
              font-size: 14px !important;
              color: var(--color-text-primary) !important;
              transition: all $transition-fast;

              &:hover:not(:focus) {
                border-color: var(--color-border) !important;
              }

              &:focus {
                background-color: var(--color-bg-container) !important;
                border-color: transparent !important;
                box-shadow: 0 0 0 2px $emerald-500 !important;
                outline: none !important;
              }

              &::placeholder {
                color: var(--color-text-placeholder) !important;
              }
            }
          }
        }
      }
    }

    // 原料表格样式
    .materials-table-wrapper {
      margin-top: 16px;

      .materials-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0 8px;

        thead {
          tr {
            th {
              padding: 8px 12px;
              font-size: 10px;
              font-weight: 900;
              color: var(--color-text-placeholder);
              text-transform: uppercase;
              letter-spacing: 0.05em;
              text-align: left;

              &.w-16 {
                width: 64px;
                text-align: center;
              }

              &.qty-header {
                width: 130px;
                text-align: center;
              }

              &.ratio-header {
                width: 100px;
                text-align: center;
              }

              &.price-header {
                width: 140px;
                text-align: center;
              }

              &.subtotal-header {
                width: 100px;
                text-align: right;
              }

              &.adjust-header {
                width: 80px;
                text-align: center;
              }
            }
          }
        }

        tbody {
          .material-row {
            background: var(--color-bg-page);
            border-radius: 12px;

            td {
              padding: 12px;
              vertical-align: middle;

              &:first-child {
                border-radius: 12px 0 0 12px;
              }

              &:last-child {
                border-radius: 0 12px 12px 0;
              }

              .material-select {
                width: 100%;
              }

              .quantity-input {
                width: 120px;
              }

              .ratio-cell {
                font-size: 12px;
                color: var(--color-text-secondary);

                &--supplement {
                  color: $indigo-500;
                }
              }

              .price-edit-cell {
                display: flex;
                align-items: center;
                gap: 4px;

                .price-unit {
                  font-size: 11px;
                  color: var(--color-text-placeholder);
                  white-space: nowrap;
                }
              }

              .price-missing {
                font-size: 11px;
                color: var(--color-warning);
                font-weight: 500;
              }

              .subtotal-cell {
                font-size: 13px;
                font-weight: 600;
                color: var(--color-text-primary);

                &--missing {
                  color: var(--color-text-placeholder);
                }
              }

              .adjust-cell {
                .col-adjust-badge {
                  display: inline-flex;
                  align-items: center;
                  gap: var(--space-0-5);
                  font-size: 10px;
                  line-height: 1.4;
                  padding: var(--space-0-5) var(--space-1-5);
                  border-radius: 6px;
                  background: $gradient-amber-badge;
                  color: $amber-700;
                  font-weight: 700;
                  cursor: help;
                  transition: all 0.2s;
                  white-space: nowrap;

                  &:hover {
                    background: $gradient-amber-badge-hover;
                    transform: scale(1.05);
                  }
                }

                .col-restore-btn {
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  width: 22px;
                  height: 22px;
                  border: 1px solid var(--color-border);
                  border-radius: 6px;
                  background: var(--color-bg-container);
                  color: var(--color-text-secondary);
                  cursor: pointer;
                  margin-left: 4px;
                  transition: all 0.15s ease;

                  &:hover {
                    border-color: var(--color-primary);
                    color: var(--color-primary);
                    background: $overlay-emerald-06;
                  }
                }
              }
            }

            &--highlight {
              background: linear-gradient(90deg, $overlay-emerald-12 0%, $overlay-emerald-04 100%);
              border-left: 3px solid var(--color-primary);
              transition: background 0.3s ease, border-color 0.3s ease;
            }

            &--adjusted {
              background: $overlay-amber-04;
            }
          }
        }

        tfoot {
          .total-row {
            background: $overlay-emerald-05;
            border-radius: 12px;

            td {
              padding: 16px 12px;
              color: $emerald-600;

              &:first-child {
                border-radius: 12px 0 0 12px;
              }

              &:last-child {
                border-radius: 0 12px 12px 0;
              }
            }
          }

          .cost-row {
            background: $overlay-slate-50-60;
            margin-top: 4px;

            td {
              padding: 12px 12px;
              color: var(--color-text-secondary);
              font-size: 13px;

              &:first-child {
                border-radius: 12px 0 0 12px;
              }

              &:last-child {
                border-radius: 0 12px 12px 0;
              }
            }

            .cost-incomplete {
              color: var(--color-warning);
            }
          }
        }
      }

      .add-row {
        td {
          padding: 4px 0;
          border: none;
        }
      }

      .add-first-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        padding: var(--space-2-5) 0;
        font-size: 13px;
        font-weight: 700;
        color: var(--color-text-placeholder);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        background-color: transparent;
        border: 2px dashed var(--color-border);
        border-radius: 12px;
        cursor: pointer;
        transition: all $transition-fast;

        .t-icon {
          font-size: 20px;
          color: var(--color-text-placeholder);
        }

        &:hover {
          color: $emerald-500;
          border-color: $overlay-emerald-40;
          background-color: var(--color-bg-container);

          .t-icon {
            color: $emerald-500;
          }
        }
      }
    }

    .material-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .excel-panel-wrapper {
      margin-top: 20px;
      margin-bottom: 16px;
    }

    .excel-collapsed-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: $gradient-collapsed-bar;
      border: 1.5px dashed $green-300;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.25s ease;
      user-select: none;

      &:hover {
        background: $gradient-collapsed-bar-hover;
        border-color: $green-400;
        box-shadow: 0 2px 8px $overlay-green-12;
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
      }
    }

    .excel-collapsed-left {
      display: flex;
      align-items: center;
      gap: var(--space-2-5);
    }

    .excel-collapsed-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: $gradient-green-icon;
      color: $text-white;
      flex-shrink: 0;
      box-shadow: 0 2px 6px $overlay-green-30;
    }

    .excel-collapsed-text {
      font-size: 14px;
      font-weight: 600;
      color: $green-700;
    }

    .excel-collapsed-hint {
      font-size: 11px;
      color: $green-300;
      background: $overlay-green-12;
      padding: var(--space-0-5) 8px;
      border-radius: 6px;
      font-weight: 500;
    }

    .excel-collapsed-arrow {
      color: $green-300;
      transition: transform 0.2s;
    }

    .excel-expanded-area {
      border: 1.5px solid var(--color-border);
      border-radius: 12px;
      overflow: hidden;
      animation: excel-expand 0.25s ease;
    }

    @keyframes excel-expand {
      from {
        opacity: 0;
        max-height: 0;
      }

      to {
        opacity: 1;
        max-height: 800px;
      }
    }

    .excel-expanded-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: var(--color-bg-page);
      border-bottom: 1px solid var(--color-border);
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: var(--color-border-light);
      }
    }

    .excel-expanded-title {
      display: flex;
      align-items: center;
      gap: var(--space-1-5);
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-secondary);
    }

    .excel-expanded-arrow {
      color: var(--color-text-placeholder);
      transition: transform 0.2s;
    }

    .excel-panel {
      margin-bottom: 0;
    }

    // 报价预览
    .quote-sec {
      margin-top: -12px;

      .section-header {
        margin-bottom: 0px;
      }

      .quote-body {
        display: flex;
        flex-direction: column;
        gap: $space-4;
      }

      .quote-mat-list {
        background: var(--color-bg-page);
        border-radius: $radius-lg;
        padding: 12px 16px;
        border: 1px solid var(--color-border);
      }

      .quote-mat-header {
        display: grid;
        grid-template-columns: 1fr 70px 165px 85px;
        gap: 8px;
        font-size: 11px;
        font-weight: 700;
        color: var(--color-text-placeholder);
        text-transform: uppercase;
        letter-spacing: 0.03em;
        padding-bottom: var(--space-1-5);
        border-bottom: 1px solid var(--color-border);
        margin-bottom: 4px;

        .qm-price {
          text-align: center;
        }
      }

      .quote-mat-row {
        display: grid;
        grid-template-columns: 1fr 70px 165px 85px;
        gap: 8px;
        align-items: center;
        padding: var(--space-1-25) 0;
        font-size: 13px;
        color: var(--color-text-primary);

        &--warn {
          color: var(--color-text-placeholder);

          .qm-price {
            color: var(--color-warning);
          }

          .qm-sub {
            color: var(--color-text-placeholder);

            .qm-base-hint {
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

        &--adjusted {
          border-left: 3px solid var(--color-warning);
          background: linear-gradient(90deg, $overlay-amber-100-50 0%, transparent 100%);

          .qm-name {
            color: var(--color-warning, $amber-800);
            font-weight: 600;
          }

          .qm-sub {
            color: var(--color-text-secondary, $stone-500);

            .qm-base-hint {
              color: $amber-600;
            }
          }
        }
      }

      .qm-name--link {
        cursor: pointer;
        transition: color 0.2s;

        &:hover {
          color: var(--color-primary);
          text-decoration: underline;
        }
      }

      .qm-price-edit {
        display: flex;
        align-items: center;
        gap: var(--space-0-5);

        .t-input-number {
          width: 80px;
        }

        :deep(.t-input-number .t-input__inner) {
          text-align: right;
          font-size: 13px;
        }
      }

      .qm-price-unit {
        font-size: 12px;
        color: var(--color-text-placeholder);
        flex-shrink: 0;
      }

      .qm-adjust-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--space-0-5);
        font-size: 10px;
        line-height: 1.4;
        padding: var(--space-0-5) var(--space-1-5);
        border-radius: 6px;
        background: $gradient-amber-badge;
        color: $amber-700;
        font-weight: 700;
        flex-shrink: 0;
        cursor: help;
        transition: all 0.2s;

        &:hover {
          background: $gradient-amber-badge-hover;
          transform: scale(1.05);
        }
      }

      .qm-restore-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border);
        background: var(--color-bg-container);
        color: var(--color-text-secondary);
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
        padding: 0;

        &:hover {
          background: var(--color-border-light);
          border-color: var(--color-border);
          color: var(--color-primary-dark);
          transform: scale(1.1);
        }

        &:active {
          transform: scale(0.95);
        }

        &--flash {
          animation: qm-restore-flash 0.5s ease;
        }
      }

      @keyframes qm-restore-flash {
        0% {
          background: var(--color-primary-bg);
          border-color: var(--color-primary-lighter);
          color: var(--color-primary-dark);
        }

        100% {
          background: var(--color-bg-container);
          border-color: var(--color-border);
          color: var(--color-text-secondary);
        }
      }

      .quote-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 12px;
        padding: var(--space-2-5) var(--space-3-5);
        border-radius: 12px;
        background: $gradient-amber-toolbar;
        border: 1px solid $amber-300;

        .qt-badge-info {
          display: inline-flex;
          align-items: center;
          gap: var(--space-1-5);
          font-size: 12px;
          color: var(--color-warning, $amber-800);
          font-weight: 600;
        }

        .qt-reset-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: var(--space-1-25) var(--space-3-5);
          border: 1px solid $overlay-amber-25;
          border-radius: 8px;
          background: var(--color-bg-container);
          color: $amber-600;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            background: $orange-50;
            border-color: $overlay-amber-45;
            box-shadow: 0 2px 8px $overlay-amber-15;
          }

          &:active {
            transform: scale(0.97);
          }
        }
      }

      .quote-warn-text {
        display: flex;
        align-items: center;
        gap: var(--space-1-5);
        font-size: 12px;
        color: var(--color-warning);
        background: $amber-50;
        padding: 8px var(--space-3-5);
        border-radius: $radius-lg;
        border: 1px solid $amber-200;
      }

      .quote-summary {
        display: flex;
        flex-direction: column;
        gap: var(--space-2-5);
      }

      .qs-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 14px;

        label {
          color: var(--color-text-secondary);
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: var(--space-1-5);
        }

        span {
          font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
          font-weight: 600;
          color: var(--color-text-primary);
        }
      }

      .qs-label-icon {
        color: var(--color-text-placeholder);
        flex-shrink: 0;
      }

      .qs-label-icon--final {
        color: var(--color-primary-dark);
      }

      .qs-total span,
      .qs-subtotal span {
        color: var(--color-primary-dark);
      }

      .qs-final {
        label {
          color: var(--color-primary-dark);
          font-weight: 700;
          font-size: 15px;
        }

        span {
          font-size: 18px;
          color: var(--color-primary-dark);
          font-weight: 800;
        }
      }

      .qs-input-wrap {
        display: flex;
        align-items: center;
        gap: var(--space-1-5);

        :deep(.t-input-number),
        :deep(.t-input-number .t-input__inner) {
          text-align: right;
        }
      }

      .qs-unit {
        font-size: 12px;
        color: var(--color-text-placeholder);
      }

      .qs-divider {
        height: 1px;
        background: var(--color-border);

        &--bold {
          background: var(--color-border);
        }
      }
    }

    // 提示面板
    .tips-panel {
      background: var(--color-bg-container);
      padding: 32px;
      border-radius: 2.5rem;
      box-shadow: 0 1px 3px $overlay-black-05;
      border: 1px solid var(--color-bg-page);
      animation: fadeInUp 0.5s ease both;
      animation-delay: 0.2s;

      .tips-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--color-text-placeholder);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin: 0 0 16px;
      }

      .tips-list {
        list-style: none;
        padding: 0;
        margin: 0;

        .tip-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px 0;
          font-size: 12px;
          color: var(--color-text-secondary);

          .tip-icon {
            color: $amber-400;
            font-size: 14px;
            margin-top: var(--space-0-5);
            flex-shrink: 0;
          }

          .tip-link {
            color: $emerald-500;
            font-weight: 700;
            cursor: pointer;
            text-decoration: none;
            border-bottom: 1px dashed $emerald-100;
            transition: all $transition-fast;

            &:hover {
              color: $emerald-600;
              border-bottom-color: $emerald-500;
            }
          }
        }
      }
    }

    // 表单卡片入场动画
    :deep(.t-card) {
      animation: fadeInUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
    }

    .form-header-legacy {
      display: flex;
      align-items: center;
      gap: $space-3;

      .form-title {
        font-size: $font-size-h3;
        font-weight: $font-weight-semibold;
        color: var(--color-text-primary);
      }
    }

    .materials-section {
      width: 100%;

      .manual-add {
        margin-bottom: $space-3;
      }

      .materials-list {
        margin-top: $space-3;

        .material-item {
          display: flex;
          align-items: center;
          padding: $space-3 $space-3;
          margin-bottom: $space-2;
          background-color: var(--color-bg-page);
          border-radius: $radius-lg;
          border: 1px solid var(--color-border-light);
        }
      }
    }

    .help-text {
      margin-left: $space-3;
      font-size: $font-size-caption;
      color: var(--color-text-secondary);
      line-height: 32px;
    }

    .select-empty-tip {
      padding: $space-2 0;
      text-align: center;
      color: var(--color-text-placeholder);
    }

    // ═══ 动画关键帧 ═══
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fade-in {
      animation: fadeIn 0.5s ease-out forwards;
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

    @keyframes progressSlide {
      0% {
        transform: translateX(-100%);
      }

      100% {
        transform: translateX(350%);
      }
    }

    @keyframes progressIndeterminate {
      0% {
        transform: translateX(-100%);
      }

      100% {
        transform: translateX(350%);
      }
    }

    @keyframes statusPulse {

      0%,
      100% {
        opacity: 1;
        transform: scale(1);
      }

      50% {
        opacity: 0.5;
        transform: scale(0.8);
      }
    }

    @keyframes dot-pulse {

      0%,
      100% {
        opacity: 1;
        transform: scale(1);
      }

      50% {
        opacity: 0.4;
        transform: scale(0.7);
      }
    }

    @keyframes dot-blink {

      0%,
      100% {
        opacity: 1;
      }

      50% {
        opacity: 0.3;
      }
    }
  }

  .quick-create-salesman-option {
    display: flex;
    align-items: center;
    gap: var(--space-1-5);
    padding: 8px 12px;
    font-size: 13px;
    color: var(--color-primary);
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: $emerald-50;
    }
  }

  // ratioFactor 含量比校验区域
  .ratio-validation-section {
    animation: fadeInUp 0.4s ease-out;

    .ratio-summary {
      padding: 16px;
      border-radius: 12px;
      border: 1px solid;
      transition: all 0.3s ease;

      &--normal {
        background: $green-50;
        border-color: $green-200;
      }

      &--warning {
        background: $amber-50;
        border-color: $amber-200;
      }

      &--high_warning {
        background: $orange-50;
        border-color: $orange-200;
      }

      &--error {
        background: $red-50;
        border-color: $red-200;
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
      box-shadow: 0 1px 3px $overlay-black-05;
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
      background: $overlay-orange-08;
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

@keyframes ai-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>

<style lang="scss">
@use '@/assets/styles/variables.scss' as *;

.formula-form .materials-table-wrapper {

  // ── 选择框（原料名称）──
  .t-select {

    .t-input,
    .t-select__wrap {
      border-color: $overlay-emerald-25 !important;
      transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
    }

    &:hover:not(.t-is-disabled) .t-input,
    &:hover:not(.t-is-disabled) .t-select__wrap {
      border-color: $overlay-emerald-40 !important;
    }
  }

  .t-select .t-input,
  .t-select .t-input.t-is-focused,
  .t-select .t-input:focus-within {
    border-color: $emerald-500 !important;
    box-shadow: 0 0 0 3px $overlay-emerald-12 !important;
  }

  .t-select.t-is-focused .t-input,
  .t-select.t-is-focused .t-select__wrap,
  .t-select.t-is-focused .t-input.t-is-focused {
    border-color: $emerald-500 !important;
    box-shadow: 0 0 0 3px $overlay-emerald-12 !important;
  }

  // ── 数量输入框 ──
  .t-input-number {
    border-color: $overlay-emerald-25 !important;
    transition: border-color 0.2s ease, box-shadow 0.2s ease !important;

    &:hover:not(.t-is-disabled) {
      border-color: $overlay-emerald-40 !important;
    }
  }

  .t-input-number .t-input,
  .t-input-number .t-input.t-is-focused,
  .t-input-number .t-input:focus-within {
    border-color: $emerald-500 !important;
    box-shadow: none !important;
  }

  .t-input-number.t-is-focused,
  .t-input-number.t-is-focused .t-input,
  .t-input-number.t-is-focused .t-input.t-is-focused {
    border-color: $emerald-500 !important;
    box-shadow: 0 0 0 3px $overlay-emerald-12 !important;
  }

  .t-input-number__decrease,
  .t-input-number__increase {
    color: $emerald-500 !important;
    border-color: $overlay-emerald-30 !important;

    &:hover {
      background: $overlay-emerald-10 !important;
      color: $emerald-600 !important;
      border-color: $overlay-emerald-50 !important;
    }
  }

  .t-input-number__increase {
    border-left-color: $overlay-emerald-30 !important;
  }

  .t-input-number__decrease {
    border-right-color: $overlay-emerald-30 !important;
  }

  // ── 删除按钮（去掉红色/粉色）──
  .delete-btn,
  .t-button--variant-text {
    color: $overlay-emerald-60 !important;
    border: none !important;

    .t-button__text,
    .t-button__icon,
    .t-icon {
      color: inherit !important;
    }

    &:hover {
      color: $emerald-500 !important;
      background: $overlay-emerald-08 !important;
      border: none !important;

      .t-button__text,
      .t-button__icon,
      .t-icon {
        color: $emerald-500 !important;
      }
    }
  }
}
</style>
