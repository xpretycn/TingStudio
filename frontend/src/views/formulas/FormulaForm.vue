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
            {{ isEdit ? '编辑配方' : '新增配方' }}
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
          data-testid="formula-save-btn">
          <t-icon name="save" class="btn-icon" />
          {{ isEdit ? '保存' : '创建' }}
        </button>
      </div>
    </header>

    <!-- 主内容区域：垂直四区域布局 -->
    <main class="form-main">
      <t-form ref="formRef" :data="formData" :rules="rules" scroll-to-first-error @submit="handleSubmit">
        <div class="form-vertical-layout">

          <!-- ═══ 区域一：配方基本信息区 ═══ -->
          <section class="form-section zone-basic-info">
            <div class="zone-header">
              <h3 class="zone-title">
                <t-icon name="edit-1" />
                基础信息
              </h3>
            </div>
            <div class="zone-content">
              <div class="basic-info-two-col">
                <!-- 左栏：输入型字段 (40%) -->
                <div class="info-col-left">
                  <div class="form-field field-compact">
                    <label class="field-label" id="lbl-formula-name"><t-icon name="edit-1" size="12px" class="label-icon" /> 配方名称<span class="required">*</span></label>
                    <t-input v-model="formData.name" placeholder="例如：佛手玫苓膏" clearable
                      data-testid="formula-name-input" data-field="name" />
                  </div>
                  <div class="form-field field-compact">
                    <label class="field-label" id="lbl-salesman"><t-icon name="user-circle" size="12px" class="label-icon" /> 所属业务员<span class="required">*</span></label>
                    <t-select v-model="formData.salesmanId" placeholder="请选择业务员" clearable filterable
                      data-field="salesman_name" :popup-props="{ appendToBody: true }">
                      <t-option v-for="salesman in salesmanStore.allSalesmen" :key="salesman.id" :value="salesman.id"
                        :label="salesman.name" />
                    </t-select>
                    <t-alert v-if="salesmanNotMatched && !formData.salesmanId" theme="warning" class="mt-2">
                      业务员「{{ parsedSalesmanName }}」不在系统中
                    </t-alert>
                  </div>
                  <div class="form-field field-compact">
                    <label class="field-label" id="lbl-weight"><t-icon name="measurement" size="12px" class="label-icon" /> 成品重量(g)<span class="required">*</span><span class="field-help-inline">规格</span></label>
                    <t-input-number v-model="formData.finishedWeight" :min="0" :decimal-places="2" placeholder="1000"
                      data-field="finished_weight" />
                  </div>
                  <div class="form-field field-compact">
                    <label class="field-label" id="lbl-ratio-factor"><t-icon name="control-platform" size="12px" class="label-icon" /> 主料系数<span class="required">*</span></label>
                    <t-input-number v-model="formData.ratioFactor" :min="0.15" :max="0.25" :decimal-places="2"
                      placeholder="0.18" data-field="ratio_factor" />
                    <p class="field-help">用于营养成分含量比计算，主料系数范围0.15-0.25</p>
                  </div>
                  <div class="form-field field-compact">
                    <label class="field-label" id="lbl-supplement-factor"><t-icon name="chart-bar" size="12px" class="label-icon" /> 辅料系数<span class="required">*</span></label>
                    <t-input-number v-model="formData.supplementRatioFactor" :min="0.5" :max="1.5" :decimal-places="2"
                      placeholder="1.0" data-field="supplement_ratio_factor" />
                    <p class="field-help">用于营养成分含量比计算，辅料系数范围0.5-1.5</p>
                  </div>
                </div>
                <!-- 右栏：文本型字段 (60%) -->
                <div class="info-col-right">
                  <div class="form-field field-compact">
                    <label class="field-label" id="lbl-description"><t-icon name="chat-bubble" size="12px" class="label-icon" />
                      配方描述
                      <button type="button" class="btn-ai-generate" :disabled="aiGenerating || !formData.name"
                        @click="handleGenerateDescription">
                        <t-icon name="logo-github" size="12px" />
                        {{ aiGenerating ? '生成中...' : '智能生成' }}
                      </button>
                    </label>
                    <t-textarea v-model="formData.description" placeholder="简述该配方的研发目标和主要特点..."
                      :autosize="{ minRows: 3, maxRows: 6 }" data-field="description" />
                  </div>
                  <div class="form-field field-compact">
                    <label class="field-label" id="lbl-preparation"><t-icon name="setting" size="12px" class="label-icon" />
                      制法
                      <button type="button" class="btn-ai-generate" :disabled="aiGenerating || !formData.name"
                        @click="handleGeneratePreparation">
                        <t-icon name="logo-github" size="12px" />
                        {{ aiGenerating ? '生成中...' : '智能生成' }}
                      </button>
                    </label>
                    <t-textarea v-model="formData.preparationMethod" placeholder="记录配方的制取方法、工艺流程或特殊操作要求（可选）"
                      :autosize="{ minRows: 2, maxRows: 5 }" data-field="preparation_method" />
                  </div>
                  <div v-if="isEdit" class="form-field field-compact" :class="{ 'field-error': versionReasonError }">
                    <label class="field-label" id="lbl-version-reason"><t-icon name="history" size="12px" class="label-icon" /> 升版原因<span class="required">*</span>
                      <button type="button" class="btn-ai-generate" :disabled="aiGenerating || !formData.name"
                        @click="handleGenerateVersionReason">
                        <t-icon name="logo-github" size="12px" />
                        {{ aiGenerating ? '生成中...' : '智能生成' }}
                      </button>
                    </label>
                    <t-textarea ref="versionReasonRef" v-model="formData.versionReason" placeholder="请输入升版原因（必填）"
                      :autosize="{ minRows: 3, maxRows: 6 }"
                      :class="{ 'input-error': versionReasonError }" data-field="version_reason"
                      @input="clearVersionReasonError" />
                    <transition name="error-fade">
                      <p v-if="versionReasonError" class="field-error-msg">
                        <t-icon name="error-circle" size="14px" /> 请填写升版原因
                      </p>
                    </transition>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ═══ 区域二：AI 操作区 ═══ -->
          <section class="form-section zone-ai-operation">
            <div class="zone-header">
              <h3 class="zone-title">
                <t-icon name="cloud" />
                AI 智能解析
              </h3>
            </div>
            <div class="zone-content">
              <div class="ai-toolbar">
                <div class="ai-model-select">
                  <label class="ai-toolbar-label">选择模型</label>
                  <t-radio-group v-model="aiStore.selectedModel" variant="default-filled" size="small">
                    <t-radio-button v-for="model in aiStore.models" :key="model.provider" :value="model.provider">
                      {{ model.name }}
                    </t-radio-button>
                  </t-radio-group>
                </div>
                <div class="ai-upload-area">
                  <template v-if="!aiStore.parseLoading && !aiStore.parseResult">
                    <div class="upload-zone" :class="{ 'drag-over': isDragOver }" @click="triggerFileInput"
                      @dragover.prevent="handleDragOver" @dragleave="handleDragLeave" @drop.prevent="handleDrop">
                      <input ref="fileInputRef" type="file" accept=".xlsx,.xls,.png,.jpg,.jpeg" style="display: none;"
                        @change="handleFileChange" />
                      <t-icon name="upload" size="20px" />
                      <span>{{ selectedFile ? selectedFile.name : '点击或拖拽上传文件' }}</span>
                    </div>
                  </template>
                  <div v-if="selectedFile && !aiStore.parseLoading" class="file-info-bar">
                    <span class="file-name">{{ selectedFile.name }}</span>
                    <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
                    <t-button size="small" variant="outline" @click="handleParse">
                      <t-icon name="play-circle" />开始解析
                    </t-button>
                    <t-button size="small" variant="text" @click="cancelFileSelection">取消</t-button>
                  </div>
                  <div v-if="aiStore.parseLoading" class="parsing-status">
                    <t-icon name="loading" class="t-icon-loading" />
                    <span>{{ parseProgressHint }}</span>
                    <t-button size="small" variant="text" @click="handleAbortParse">终止</t-button>
                  </div>
                  <div v-if="aiStore.parseResult" class="ai-result-preview">
                    <div class="result-header">
                      <span class="result-title">解析结果预览</span>
                      <div class="result-actions">
                        <t-button size="small" theme="success" :disabled="hasUnmatchedMaterials" @click="backfillData">
                          确认并回填数据
                        </t-button>
                        <t-button size="small" variant="outline" @click="resetUpload">重新上传</t-button>
                        <t-button size="small" variant="text" @click="clearResult">清空</t-button>
                      </div>
                    </div>
                    <div class="result-summary">
                      <span>配方名称：{{ aiStore.parseResult.name || '未识别' }}</span>
                      <span>成品重量：{{ aiStore.parseResult.finishedWeight ? aiStore.parseResult.finishedWeight + 'g' : '未识别' }}</span>
                      <span>业务员：{{ aiStore.parseResult.salesmanName || '未识别' }}</span>
                      <span>原料数：{{ aiStore.parseResult.materials?.length || 0 }}</span>
                    </div>
                    <div v-if="hasUnmatchedMaterials" class="unmatched-warn">
                      <t-icon name="error-circle" />
                      {{ unmatchedMaterials.length }} 个原料未匹配
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ═══ 区域三：原料配比表 ═══ -->
          <section class="form-section zone-materials-table">
            <div class="zone-header">
              <h3 class="zone-title">
                <t-icon name="view-list" />
                原料配比表
              </h3>
            </div>
            <div class="zone-content">
              <div class="materials-table-wrapper">
                <table class="materials-table">
                  <thead>
                    <tr>
                      <th>原料名称</th>
                      <th class="qty-header">用量（g）</th>
                      <th class="ratio-header">含量比</th>
                      <th class="price-header">单价(/kg)</th>
                      <th class="subtotal-header">小计</th>
                      <th class="adjust-header">调整</th>
                      <th class="w-16">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in formData.materials" :key="index" class="material-row"
                      :id="'mat-row-' + index" :class="{ 'material-row--highlight': highlightRowIdx === index, 'material-row--adjusted': item.adjustedPrice != null && item.adjustedPrice !== getMaterialBasePrice(index) }">
                      <td>
                        <t-select v-model="item.materialId" placeholder="搜索或选择原料" clearable filterable
                          :loading="materialSelectLoading" class="material-select" :filter-icon="() => null"
                          aria-label="选择原料" @search="handleMaterialSearch" @change="handleMaterialChange(index)"
                          @focus="handleMaterialFocus">
                          <t-option v-for="material in getFilteredMaterials(index)" :key="material.id"
                            :value="material.id" :label="`${material.name} (${material.unit})`">
                            <div class="material-option">
                              <span>{{ material.name }} ({{ material.unit }})</span>
                              <t-tag v-if="material.materialType === 'supplement'" theme="primary"
                                variant="light-outline" size="small">辅料</t-tag>
                              <t-tag v-else theme="success" variant="light-outline" size="small">药材</t-tag>
                            </div>
                          </t-option>
                          <template #empty>
                            <div class="select-empty-tip">
                              {{ materialSearchKeyword ? '未找到匹配原料' : '暂无原料数据' }}
                            </div>
                          </template>
                        </t-select>
                      </td>
                      <td>
                        <t-input-number v-model="item.quantity" :min="0" placeholder="用量" class="quantity-input"
                          :aria-label="`原料用量第${index + 1}行`" />
                      </td>
                      <td class="text-center font-mono ratio-cell" :class="{ 'ratio-cell--supplement': isSupplementMaterial(index) }">
                        {{ calculateMaterialRatio(index) }}
                      </td>
                      <td>
                        <div v-if="getMaterialBasePrice(index) != null" class="price-edit-cell">
                          <t-input-number :model-value="getEffectivePrice(index)"
                            @change="(val: number) => handlePriceAdjust(index, val)" :min="0" :precision="2"
                            size="small" theme="normal" style="width: 80px" />
                          <span class="price-unit">/kg</span>
                        </div>
                        <span v-else class="price-missing">未录入</span>
                      </td>
                      <td class="text-right font-mono subtotal-cell" :class="{ 'subtotal-cell--missing': getEffectivePrice(index) == null }">
                        {{ getMaterialSubtotal(index) != null ? '¥' + getMaterialSubtotal(index)!.toFixed(2) : '—' }}
                      </td>
                      <td class="text-center adjust-cell">
                        <span v-if="item.adjustedPrice != null && item.adjustedPrice !== getMaterialBasePrice(index)" class="col-adjust-badge"
                          :title="'基价: ¥' + (getMaterialBasePrice(index) ?? '--') + '/kg'">
                          <svg viewBox="0 0 12 12" width="10" height="10">
                            <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9L3 11L3.5 7.5L1 5L4.5 4.5Z" fill="#d97706" />
                          </svg>
                          价
                        </span>
                        <button v-if="item.adjustedPrice != null && item.adjustedPrice !== getMaterialBasePrice(index)" type="button" class="col-restore-btn"
                          @click="handleRestorePrice(index)"
                          :title="'恢复基价: ¥' + (getMaterialBasePrice(index) ?? '--') + '/kg'">
                          <t-icon name="rollback" size="12px" />
                        </button>
                      </td>
                      <td class="text-center">
                        <t-button variant="text" size="small" @click="removeMaterial(index)" class="delete-btn"
                          :aria-label="`删除第${index + 1}行原料`">
                          <template #icon>
                            <t-icon name="delete" />
                          </template>
                        </t-button>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot v-if="formData.materials.length > 0">
                    <tr class="total-row">
                      <td class="font-bold">合计</td>
                      <td class="font-mono font-bold">{{ totalQuantity }} g</td>
                      <td></td>
                      <td></td>
                      <td class="font-mono font-bold">
                        <span :class="{ 'cost-incomplete': priceQuote.missingPrices.length > 0 }">¥{{ priceQuote.materialTotal.toFixed(2) }}</span>
                      </td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
                <button type="button" class="add-first-btn" @click="addMaterial">
                  <t-icon name="add" />
                  添加原料
                </button>
              </div>
            </div>
          </section>

          <!-- ═══ 区域四：底部信息区 ═══ -->
          <section class="form-section zone-bottom-info">
            <div class="zone-content">
              <div class="bottom-grid">
                <!-- 配方报价 -->
                <div class="quote-card">
                  <div class="card-header">
                    <t-icon name="currency-exchange" size="14px" />
                    <span>配方报价</span>
                  </div>
                  <div class="card-body">
                    <div v-if="priceQuote.adjustedCount > 0" class="quote-toolbar">
                      <span class="qt-badge-info">
                        <svg viewBox="0 0 14 14" width="13" height="13">
                          <path d="M7 1L8.75 5.25L13 6L9.75 9L10.5 13.25L7 11L3.5 13.25L4.25 9L1 6L5.25 5.25Z" fill="#f59e0b" />
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
                        <div class="qs-input-wrap"><t-input-number v-model="formData.packagingPrice" :min="0" :precision="2" size="small" theme="normal" style="width:200px" /><span class="qs-unit">元</span></div>
                      </div>
                      <div class="qs-row">
                        <label><t-icon name="edit-1" size="14px" class="qs-label-icon" /> 其他费用</label>
                        <div class="qs-input-wrap"><t-input-number v-model="formData.otherPrice" :min="0" :precision="2" size="small" theme="normal" style="width:200px" /><span class="qs-unit">元</span></div>
                      </div>
                      <div class="qs-divider"></div>
                      <div class="qs-row qs-subtotal">
                        <label><t-icon name="wallet" size="14px" class="qs-label-icon" /> 成本小计</label>
                        <span>¥{{ priceQuote.costSubtotal.toFixed(2) }}</span>
                      </div>
                      <div class="qs-row">
                        <label><t-icon name="chart-pie" size="14px" class="qs-label-icon" /> 利润率</label>
                        <div class="qs-input-wrap"><t-input-number v-model="formData.profitMargin" :min="0" :max="999" :precision="1" size="small" theme="normal" style="width:200px" /><span class="qs-unit">%</span></div>
                      </div>
                      <div class="qs-divider qs-divider--bold"></div>
                      <div class="qs-row qs-final">
                        <label><t-icon name="money-filled" size="16px" class="qs-label-icon qs-label-icon--final" /> 最终报价</label>
                        <span>¥{{ priceQuote.totalPrice.toFixed(2) }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 含量比校验 -->
                <div class="ratio-card" v-if="formData.materials.length > 0 && formData.finishedWeight > 0">
                  <div class="card-header">
                    <t-icon name="check-circle" size="14px" />
                    <span>含量比校验</span>
                    <span class="ratio-status" :class="'status--' + ratioValidation.level">
                      {{ ratioValidation.level === 'normal' ? '通过' : ratioValidation.level === 'warning' ? '预警' : '异常' }}
                    </span>
                  </div>
                  <div class="card-body">
                    <div class="ratio-bar-track">
                      <div class="ratio-bar-fill" :style="{ width: ratioBarWidth }"></div>
                      <div class="ratio-bar-marker" :style="{ left: ratioMarkerLeft }"></div>
                    </div>
                    <div class="ratio-labels">
                      <span>0.92</span><span>0.98</span><span class="center">1.00</span><span>1.02</span><span>1.08</span>
                    </div>
                    <div class="ratio-value">
                      总和：<strong>{{ ratioValidation.totalRatio.toFixed(5) }}</strong>
                      <span class="deviation" :class="'deviation--' + ratioValidation.level">{{ ratioDeviationText }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </t-form>
    </main>

    <QuickCreateSalesmanDialog v-model:visible="showQuickCreateSalesman" :default-name="parsedSalesmanName"
      @created="onQuickSalesmanCreated" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useFormulaStore } from '@/stores/formula';
import { useSalesmanStore } from '@/stores/salesman';
import { useMaterialStore } from '@/stores/material';
import { useAiStore } from '@/stores/ai';
import { MessagePlugin } from 'tdesign-vue-next';
import type { FormRule } from 'tdesign-vue-next';
import type { MaterialItem, RatioFactorValidationResult } from '@/api/formula';
import { formulaApi } from '@/api/formula';
import { agentApi } from '@/api/agent';
import QuickCreateSalesmanDialog from '@/components/QuickCreateSalesmanDialog.vue';

const router = useRouter();
const route = useRoute();
const formulaStore = useFormulaStore();
const salesmanStore = useSalesmanStore();
const materialStore = useMaterialStore();
const aiStore = useAiStore();

const formRef = ref<any>(null);
const versionReasonRef = ref<any>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const loading = ref(false);
const supplementPriceMap = ref<Record<string, number>>({});
const versionReasonError = ref(false);
const aiGenerating = ref(false);
const selectedFile = ref<File | null>(null);
const isDragOver = ref(false);


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
  const breakdown = materials.map((m: any) => {
    const mat = allMats.find((x: any) => x.id === m.materialId);
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
  const messages: Record<string, { message: string; description: string; allowed: boolean; requiresManualReview: boolean; }> = {
    normal: {
      message: '含量比校验通过',
      description: `原料含量比总和为 ${totalRatio.toFixed(5)}（偏差 ${deviation}%），在正常范围内 [${thresholds.normalLow}, ${thresholds.normalHigh}]`,
      allowed: true,
      requiresManualReview: false,
    },
    warning: {
      message: `含量比偏差预警（偏差 ${deviation}%）`,
      description: `原料含量比总和为 ${totalRatio.toFixed(5)}，超出正常范围 [${thresholds.normalLow}, ${thresholds.normalHigh}]，偏差 ${deviation}%。建议检查原料用量是否合理，仍可继续创建。`,
      allowed: true,
      requiresManualReview: false,
    },
    high_warning: {
      message: `含量比严重偏差（偏差 ${deviation}%）`,
      description: `原料含量比总和为 ${totalRatio.toFixed(5)}，严重偏离标准值 1.0，偏差 ${deviation}%。需要人工审核确认后方可创建，请仔细核对原料用量数据。`,
      allowed: true,
      requiresManualReview: true,
    },
    error: {
      message: `含量比校验失败（偏差 ${deviation}%）`,
      description: `原料含量比总和为 ${totalRatio.toFixed(5)}，偏差 ${deviation}% 超出允许范围 [${thresholds.highWarningLow}, ${thresholds.highWarningHigh}]。配方数据存在错误，无法创建，请修正原料用量后重试。`,
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
  const matDetails = formData.materials.map((item: any) => {
    const mat = allMats.find((m: any) => m.id === item.materialId);
    const basePrice = mat?.unitPrice ?? priceMap[item.materialId] ?? null;
    // 优先使用 adjustedPrice，其次使用 unitPrice，最后使用 basePrice
    const adjustedPrice = item.adjustedPrice;
    const effectivePrice = adjustedPrice != null ? adjustedPrice : (item.unitPrice ?? basePrice);
    const isAdjusted = adjustedPrice != null && adjustedPrice !== basePrice;
    const subtotal = effectivePrice != null ? Number((item.quantity / 1000 * effectivePrice).toFixed(4)) : 0;
    return { ...item, unitPrice: effectivePrice, basePrice, isAdjusted, subtotal, name: item.materialName || '' };
  });
  const materialTotal = matDetails.reduce((s: number, m: any) => s + (m.subtotal || 0), 0);
  const costSubtotal = Number((materialTotal + (formData.packagingPrice || 0) + (formData.otherPrice || 0)).toFixed(4));
  const margin = formData.profitMargin ?? 20;
  const totalPrice = Number((costSubtotal * (1 + margin / 100)).toFixed(4));
  const missingPrices = matDetails.filter((m: any) => m.unitPrice === null).map((m: any) => m.name);
  const adjustedCount = matDetails.filter((m: any) => m.isAdjusted).length;
  return { materials: matDetails, materialTotal, packagingPrice: formData.packagingPrice || 0, otherPrice: formData.otherPrice || 0, costSubtotal, profitMargin: margin, totalPrice, missingPrices, adjustedCount };
});

const isEdit = computed(() => !!route.params.id);

const isAiPrefill = ref(false);
const showQuickCreateSalesman = ref(false);
const parsedSalesmanName = ref('');
const materialSelectLoading = ref(false);
const materialSearchKeyword = ref('');
const highlightRowIdx = ref(-1);

const salesmanNotMatched = computed(() => {
  const name = parsedSalesmanName.value;
  if (!name) return false;
  return !salesmanStore.allSalesmen.find(
    (s: any) => s.name === name || s.name.includes(name) || name.includes(s.name)
  );
});

const totalQuantity = computed(() => {
  return formData.materials.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
});

const addMaterial = () => {
  formData.materials.push({
    materialId: '',
    materialName: '',
    quantity: 0,
  });
};

const removeMaterial = (index: number) => {
  formData.materials.splice(index, 1);
};

const getFilteredMaterials = (_index: number) => {
  const keyword = materialSearchKeyword.value?.trim().toLowerCase();
  const allMats = materialStore.allMaterials ?? [];
  if (!keyword) return allMats;
  return allMats.filter((m: any) =>
    m.name?.toLowerCase().includes(keyword) ||
    m.code?.toLowerCase().includes(keyword)
  );
};

const handleMaterialSearch = (val: string) => {
  materialSearchKeyword.value = val;
};

const handleMaterialChange = (index: number) => {
  const item = formData.materials[index];
  if (item.materialId) {
    const mat = (materialStore.allMaterials ?? []).find((m: any) => m.id === item.materialId);
    if (mat) {
      item.materialName = mat.name;
      highlightRowIdx.value = index;
      setTimeout(() => { highlightRowIdx.value = -1; }, 1500);
    }
  }
};

const handleMaterialFocus = () => {
  if (materialStore.allMaterials.length === 0) {
    materialSelectLoading.value = true;
    materialStore.fetchMaterials().finally(() => { materialSelectLoading.value = false; });
  }
};

const isSupplementMaterial = (index: number) => {
  const item = formData.materials[index];
  if (!item?.materialId) return false;
  const mat = (materialStore.allMaterials ?? []).find((m: any) => m.id === item.materialId);
  return mat?.materialType === 'supplement';
};

const calculateMaterialRatio = (index: number) => {
  const item = formData.materials[index];
  if (!item || !formData.finishedWeight || !item.quantity) return '—';
  const isSupp = isSupplementMaterial(index);
  const factor = isSupp ? (formData.supplementRatioFactor || 1.0) : (formData.ratioFactor || 0.18);
  const ratio = Math.round((item.quantity / formData.finishedWeight) * factor * 100000) / 100000;
  return ratio.toFixed(5);
};

const getMaterialBasePrice = (index: number) => {
  const item = formData.materials[index];
  if (!item?.materialId) return null;
  return supplementPriceMap.value[item.materialId] ?? null;
};

const getEffectivePrice = (index: number) => {
  const item = formData.materials[index];
  if (!item) return undefined;
  if (item.adjustedPrice != null) return item.adjustedPrice;
  return getMaterialBasePrice(index);
};

const getMaterialSubtotal = (index: number) => {
  const item = formData.materials[index];
  if (!item || !item.quantity) return null;
  const price = getEffectivePrice(index);
  if (price == null) return null;
  return Number((item.quantity / 1000 * price).toFixed(4));
};

const handlePriceAdjust = (index: number, val: number | undefined) => {
  const item = formData.materials[index];
  if (!item) return;
  if (val === undefined || val === null || val === getMaterialBasePrice(index)) {
    delete item.adjustedPrice;
  } else {
    item.adjustedPrice = val;
  }
};

const handleRestorePrice = (index: number) => {
  const item = formData.materials[index];
  if (!item) return;
  delete item.adjustedPrice;
};

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  isDragOver.value = true;
};

const handleDragLeave = () => {
  isDragOver.value = false;
};

const handleDrop = (e: DragEvent) => {
  isDragOver.value = false;
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'image/png',
      'image/jpeg',
    ];
    if (validTypes.includes(file.type) || /\.(xlsx|xls|png|jpg|jpeg)$/i.test(file.name)) {
      selectedFile.value = file;
    } else {
      MessagePlugin.warning('请上传 Excel 或图片文件（.xlsx/.xls/.png/.jpg）');
    }
  }
};

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0];
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const handleParse = async () => {
  if (!selectedFile.value) return;
  try {
    await aiStore.parseFormula(selectedFile.value);
  } catch {
    MessagePlugin.error('解析失败');
  }
};

const cancelFileSelection = () => {
  selectedFile.value = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};

const parseProgressHint = computed(() => {
  if (aiStore.parseAborted) return '解析已终止';
  return '正在解析配方文件，请稍候...';
});

const handleAbortParse = () => {
  aiStore.abortParseFormula();
};

const unmatchedMaterials = computed(() => {
  if (!aiStore.parseResult?.materials) return [];
  const allMats = materialStore.allMaterials ?? [];
  return aiStore.parseResult.materials.filter((m: any) => {
    const name = (m.name || m.materialName || '').trim();
    return !allMats.find((mat: any) => mat.name === name || mat.name.includes(name) || name.includes(mat.name));
  });
});

const hasUnmatchedMaterials = computed(() => unmatchedMaterials.value.length > 0);

const backfillData = () => {
  if (!aiStore.parseResult) return;
  const result = aiStore.parseResult;
  if (result.name) formData.name = result.name;
  if (result.finishedWeight) formData.finishedWeight = result.finishedWeight;
  if (result.salesmanName) {
    parsedSalesmanName.value = result.salesmanName;
    const matched = salesmanStore.allSalesmen.find(
      (s: any) => s.name === result.salesmanName || s.name.includes(result.salesmanName)
    );
    if (matched) formData.salesmanId = matched.id;
  }
  if (result.materials && result.materials.length > 0) {
    const allMats = materialStore.allMaterials ?? [];
    formData.materials = result.materials.map((m: any) => {
      const name = (m.name || m.materialName || '').trim();
      const matched = allMats.find((mat: any) => mat.name === name || mat.name.includes(name) || name.includes(mat.name));
      return {
        materialId: matched?.id || '',
        materialName: name,
        quantity: m.quantity || 0,
      };
    });
  }
  if (result.description) formData.description = result.description;
  isAiPrefill.value = true;
  aiStore.clearParseResult();
  selectedFile.value = null;
  MessagePlugin.success('数据已回填');
};

const resetUpload = () => {
  selectedFile.value = null;
  aiStore.clearParseResult();
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};

const clearResult = () => {
  aiStore.clearParseResult();
};

const onQuickSalesmanCreated = async (salesman: any) => {
  await salesmanStore.fetchAllForSelect();
  const matched = salesmanStore.allSalesmen.find((s: any) => s.id === salesman.id || s.name === salesman.name);
  if (matched) {
    formData.salesmanId = matched.id;
    MessagePlugin.success(`业务员「${matched.name}」已创建并自动选中`);
  }
};

const formData = reactive<any>({
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
  if (aiGenerating.value) return;
  if (!formData.name) {
    MessagePlugin.warning('请先填写配方名称');
    return;
  }
  const materials = formData.materials.map((m: any) => ({
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
    aiGenerating.value = true;
    try {
      const res = await agentApi.generateDescription({
        formulaName: formData.name,
        materials,
        finishedWeight: formData.finishedWeight || undefined,
        revisionReason: reason,
        existingDescription: formData.description,
        type: 'description',
      });
      if (res.success && res.data) {
        formData.description = res.data.content;
        MessagePlugin.success('配方描述已智能生成');
      }
    } catch {
      MessagePlugin.error('生成失败');
    } finally {
      aiGenerating.value = false;
    }
    return;
  }
  aiGenerating.value = true;
  try {
    const res = await agentApi.generateDescription({
      formulaName: formData.name,
      materials,
      finishedWeight: formData.finishedWeight || undefined,
      type: 'description',
    });
    if (res.success && res.data) {
      formData.description = res.data.content;
      MessagePlugin.success('配方描述已智能生成');
    }
  } catch {
    MessagePlugin.error('生成失败');
  } finally {
    aiGenerating.value = false;
  }
}

async function handleGeneratePreparation() {
  if (aiGenerating.value) return;
  if (!formData.name) {
    MessagePlugin.warning('请先填写配方名称');
    return;
  }
  const materials = formData.materials.map((m: any) => ({
    name: m.materialName || m.name,
    quantity: m.quantity,
    type: m.supplement ? 'supplement' : 'herb',
  }));
  aiGenerating.value = true;
  try {
    const res = await agentApi.generateDescription({
      formulaName: formData.name,
      materials,
      finishedWeight: formData.finishedWeight || undefined,
      type: 'preparation',
    });
    if (res.success && res.data) {
      formData.preparationMethod = res.data.content;
      MessagePlugin.success('制法已智能生成');
    }
  } catch {
    MessagePlugin.error('生成失败');
  } finally {
    aiGenerating.value = false;
  }
}

async function handleGenerateVersionReason() {
  if (aiGenerating.value) return;
  if (!formData.name) {
    MessagePlugin.warning('请先填写配方名称');
    return;
  }
  const materials = formData.materials.map((m: any) => ({
    name: m.materialName || m.name,
    quantity: m.quantity,
    type: m.supplement ? 'supplement' : 'herb',
  }));
  aiGenerating.value = true;
  try {
    const res = await agentApi.generateDescription({
      formulaName: formData.name,
      materials,
      finishedWeight: formData.finishedWeight || undefined,
      type: 'version_reason',
    });
    if (res.success && res.data) {
      formData.versionReason = res.data.content;
      MessagePlugin.success('升版原因已智能生成');
    }
  } catch {
    MessagePlugin.error('生成失败');
  } finally {
    aiGenerating.value = false;
  }
}

const clearVersionReasonError = () => {
  if (versionReasonError.value && formData.versionReason?.trim()) {
    versionReasonError.value = false;
  }
};

const handleSubmit = async ({ validateResult }: any) => {
  if (validateResult === true) {
    if (isEdit.value && !formData.versionReason?.trim()) {
      versionReasonError.value = true;
      await nextTick();
      const textareaEl = versionReasonRef.value?.$el?.querySelector('textarea')
        || versionReasonRef.value?.$el;
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
          const dialogInstance = (window as any).$tdesign?.DialogPlugin?.confirm?.({
            header: '含量比严重偏差',
            body: validation.description,
            confirmBtn: '确认提交（需人工审核）',
            cancelBtn: '返回修改',
            theme: 'warning',
            onConfirm: () => { resolve(true); },
            onCancel: () => { resolve(false); },
            onClose: () => { resolve(false); },
          });
          if (!dialogInstance) {
            resolve(window.confirm(validation.description + '\n\n点击确定继续提交，点击取消返回修改。'));
          }
        });
        if (!confirmed) return;
      }
      if (validation.level === 'warning') {
        const confirmed = await new Promise<boolean>((resolve) => {
          const dialogInstance = (window as any).$tdesign?.DialogPlugin?.confirm?.({
            header: '含量比偏差提醒',
            body: validation.description,
            confirmBtn: '继续创建',
            cancelBtn: '返回修改',
            theme: 'info',
            onConfirm: () => { resolve(true); },
            onCancel: () => { resolve(false); },
            onClose: () => { resolve(false); },
          });
          if (!dialogInstance) {
            resolve(window.confirm(validation.description + '\n\n点击确定继续创建，点击取消返回修改。'));
          }
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

onMounted(async () => {
  await Promise.all([
    salesmanStore.fetchAllForSelect(),
    materialStore.fetchAllForSelect(),
  ]);

  const id = route.params.id as string;
  if (isEdit.value && id) {
    const formula = await formulaStore.getFormula(id);
    if (formula) {
      const allMats = materialStore.allMaterials ?? [];
      const materials = (formula.materials || []).map((m: any) => {
        let materialId = m.materialId;
        if (!allMats.find(mat => mat.id === materialId) && m.materialName) {
          const matched = allMats.find(mat => mat.name === m.materialName);
          if (matched) materialId = matched.id;
        }
        const item: any = { materialId, materialName: m.materialName, quantity: m.quantity };
        if (m.adjustedPrice != null) item.adjustedPrice = m.adjustedPrice;
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
        preparationMethod: (formula as any).preparationMethod || ''
      });

      try {
        const quoteData = await formulaApi.getPriceQuote(id);
        if (quoteData?.materials) {
          const map: Record<string, number> = {};
          quoteData.materials.forEach((m: any) => {
            if (m.unitPrice != null && m.materialId) {
              map[m.materialId] = m.unitPrice;
            }
          });
          supplementPriceMap.value = map;
        }
      } catch (e) {
        console.warn('获取报价补充数据失败:', e);
      }
    }
  }

  // AI 预填数据（从 route.query 读取）
  if (route.query.ai === 'true') {
    try {
      const materials = JSON.parse(route.query.materials as string);
      formData.name = (route.query.name as string) || '';
      formData.materials = materials.map((m: any) => ({
        materialId: m.materialId || '',
        materialName: (m.name || '').replace(/[\uFEFF\u200B\u200C\u200D\u00A0\u3000]/g, '').trim(),
        quantity: m.quantity || 0,
      }));
      if (route.query.finishedWeight) {
        formData.finishedWeight = Number(route.query.finishedWeight) || 0;
      }
      // AI 解析的业务员姓名 → 匹配 salesmanId
      if (route.query.salesmanName) {
        const salesmanName = route.query.salesmanName as string;
        const matched = salesmanStore.allSalesmen.find(
          (s: any) => s.name === salesmanName || s.name.includes(salesmanName)
        );
        if (matched) {
          formData.salesmanId = matched.id;
        }
      }
      // AI 解析的配方日期（暂存备注，表单无日期字段）
      if (route.query.formulaDate && route.query.description) {
        formData.description = `${route.query.description}（配方时间：${route.query.formulaDate}）`;
      } else if (route.query.formulaDate) {
        formData.description = `配方时间：${route.query.formulaDate}`;
      } else if (route.query.description) {
        formData.description = route.query.description as string;
      }
      isAiPrefill.value = true;
    } catch {
      console.error('[FormulaForm] AI 预填数据解析失败');
    }
  }
});
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.formula-form {

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
    padding: 16px 32px; // px-8 py-4（内部内容仍保持间距）
    background-color: $overlay-white-80; // bg-white/80
    backdrop-filter: blur(12px); // backdrop-blur-md
    border-bottom: 1px solid $border-color-light; // border-slate-100
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
        color: $text-placeholder; // text-slate-400
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
        gap: 6px; // 增加面包屑与标题间距

        // 面包屑导航：flex items-center gap-2 text-xs text-slate-400
        .header-breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px; // gap-2
          font-size: 12px; // text-xs
          line-height: 1;

          .breadcrumb-link {
            color: $text-placeholder; // text-slate-400
            cursor: pointer;
            transition: color 0.15s;
            text-decoration: none;

            &:hover {
              color: $emerald-500; // hover:text-emerald-500
            }
          }

          .breadcrumb-sep {
            font-size: 12px;
            color: $text-placeholder;
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
        color: #ffffff;
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
          background-color: #047857; // emerald-700
        }

        // 次要按钮样式
        &.secondary {
          background-color: $border-color-light; // slate-100
          color: #64748b; // slate-500
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.10);

          &:hover {
            background-color: #e2e8f0; // slate-200
            color: #475569; // slate-600
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.10);
          }

          &:active {
            background-color: #cbd5e1; // slate-300
          }
        }
      }
    }
  }

  // 主内容区域
  .form-main {
    margin-top: 24px;
    padding-bottom: 32px;
    animation: fadeInUp 0.5s ease-out forwards;

    // ═══ 垂直四区域布局 ═══
    .form-vertical-layout {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    // 区域样式
    .zone-basic-info,
    .zone-materials-table,
    .zone-bottom-info {
      background: #fff;
      padding: 32px;
      border-radius: 2.5rem;
      box-shadow: 0 1px 3px $overlay-black-05;
      border: 1px solid #f8fafc;
      overflow: hidden;
    }

    .zone-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;

      .zone-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        color: $text-placeholder;
        text-transform: uppercase;
        letter-spacing: 0.12em;

        .t-icon {
          color: $emerald-500;
          font-size: 16px;
        }
      }
    }

    .zone-content {
    }

    // 区域一：基础信息 - 紧凑网格布局
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

        .field-compact {
          .field-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            font-weight: 700;
            color: #334155;
            margin-bottom: 8px;

            .label-icon {
              color: $emerald-500;
            }

            .required {
              color: #f43f5e;
            }

            .field-help-inline {
              margin-left: 4px;
              font-size: 11px;
              font-weight: 400;
              color: #94a3b8;
            }

            .btn-ai-generate {
              margin-left: auto;
              display: inline-flex;
              align-items: center;
              gap: 4px;
              padding: 2px 10px;
              border: 1px solid rgba(16, 185, 129, 0.25);
              border-radius: 12px;
              background: rgba(16, 185, 129, 0.06);
              color: $emerald-500;
              font-size: 11px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.15s ease;
              white-space: nowrap;

              &:hover:not(:disabled) {
                background: rgba(16, 185, 129, 0.12);
                border-color: rgba(16, 185, 129, 0.4);
              }

              &:disabled {
                opacity: 0.4;
                cursor: not-allowed;
              }
            }
          }

          .field-help {
            margin-top: 4px;
            font-size: 11px;
            color: #94a3b8;
            line-height: 1.4;
          }

          .field-error-msg {
            display: flex;
            align-items: center;
            gap: 4px;
            margin-top: 4px;
            font-size: 12px;
            color: #f43f5e;
          }

          :deep(.t-input),
          :deep(.t-input-number),
          :deep(.t-textarea),
          :deep(.t-select) {
            border-radius: 16px !important;
            min-height: 48px !important;
          }

          :deep(.t-input) {
            background-color: #f8fafc !important;
            border: 1px solid $border-color-light !important;
            padding: 14px 20px !important;
            font-size: 14px !important;
            color: #334155 !important;
            transition: all $transition-fast;

            &:hover:not(.t-is-disabled) {
              border-color: #e2e8f0 !important;
            }

            &.t-is-focused {
              background-color: #fff !important;
              border-color: transparent !important;
              box-shadow: 0 0 0 2px $emerald-500 !important;
              outline: none !important;
            }

            &::placeholder {
              color: $text-placeholder !important;
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
              background-color: #f8fafc !important;
              border: 1px solid $border-color-light !important;
              border-radius: 16px !important;
              padding: 10px 12px !important;
              min-height: 48px;
              transition: all $transition-fast;

              &:hover:not(.t-is-disabled) {
                border-color: #e2e8f0 !important;
              }
            }

            &.t-is-focused .t-select__wrap {
              background-color: #fff !important;
              border-color: transparent !important;
              box-shadow: 0 0 0 2px $emerald-500 !important;
              outline: none !important;
            }

            .t-select__placeholder,
            .t-select__single-value {
              font-size: 14px !important;
              color: #334155 !important;
            }

            .t-select__placeholder {
              color: $text-placeholder !important;
            }

            .t-icon {
              color: $text-placeholder !important;
            }
          }

          :deep(.t-input-number) {
            width: 100%;
            background-color: #f8fafc !important;
            border: 1px solid $border-color-light !important;
            border-radius: 16px !important;
            min-height: 48px;
            transition: all $transition-fast;

            &:hover:not(.t-is-disabled) {
              border-color: #e2e8f0 !important;
            }

            &.t-is-focused {
              background-color: #fff !important;
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
              color: #334155 !important;
              padding: 14px 12px !important;
              min-height: 46px;

              &::placeholder {
                color: $text-placeholder !important;
              }
            }
          }

          :deep(.t-textarea) {
            .t-textarea__inner {
              background-color: #f8fafc !important;
              border: 1px solid $border-color-light !important;
              border-radius: 16px !important;
              padding: 14px 20px !important;
              font-size: 14px !important;
              color: #334155 !important;
              transition: all $transition-fast;

              &:hover:not(:focus) {
                border-color: #e2e8f0 !important;
              }

              &:focus {
                background-color: #fff !important;
                border-color: transparent !important;
                box-shadow: 0 0 0 2px $emerald-500 !important;
                outline: none !important;
              }

              &::placeholder {
                color: $text-placeholder !important;
              }
            }
          }
        }
      }
    }

    // 区域二：AI 操作区
    .zone-ai-operation {
      background: linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, $border-color-light 100%);
      padding: 32px;
      border-radius: 2.5rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px $overlay-emerald-06;
      border: 1px solid rgba(148, 163, 184, 0.15);
      color: #334155;
      position: relative;
      overflow: hidden;
      animation: fadeInUp 0.5s ease both;
      animation-delay: 0.1s;

      &::before {
        content: '';
        position: absolute;
        top: -40px;
        right: -40px;
        width: 180px;
        height: 180px;
        background: radial-gradient(circle, $overlay-emerald-12 0%, transparent 70%);
        filter: blur(60px);
        border-radius: 50%;
        pointer-events: none;
      }

      .zone-header {
        position: relative;
        z-index: 1;
      }

      .zone-content {
        position: relative;
        z-index: 1;
      }

      .ai-two-col {
        display: grid;
        grid-template-columns: 280px 1fr;
        gap: 24px;

        @media (max-width: 900px) {
          grid-template-columns: 1fr;
        }
      }

      .ai-col-left {
        .ai-section-label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 10px;
        }

        .model-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .model-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;

          &:hover {
            border-color: #cbd5e1;
            background: #f8fafc;
          }

          &.active {
            border-color: $emerald-500;
            background: rgba(16, 185, 129, 0.04);
            box-shadow: 0 0 0 1px $emerald-500;
          }

          .model-logo-wrap {
            width: 28px;
            height: 28px;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            position: relative;

            .model-logo {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }

            .model-fallback {
              display: none;
              width: 100%;
              height: 100%;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              font-weight: 700;
              background: #f1f5f9;
              border-radius: 8px;
            }
          }

          .model-info-row {
            display: flex;
            align-items: center;
            gap: 6px;
            flex: 1;
            min-width: 0;
          }

          .model-btn-name {
            font-size: 13px;
            font-weight: 600;
            color: #334155;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .model-vision-badge {
            font-size: 10px;
            padding: 1px 6px;
            border-radius: 6px;
            background: rgba(16, 185, 129, 0.08);
            color: $emerald-500;
            font-weight: 600;
            white-space: nowrap;
          }
        }

        .no-models {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          color: #94a3b8;
          font-size: 13px;
        }

        .template-selector {
          margin-top: 16px;

          .template-selector-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 8px;
          }
        }
      }

      .ai-col-right {
        .upload-area {
          .upload-zone {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            padding: 32px;
            border: 2px dashed rgba(148, 163, 184, 0.25);
            border-radius: 24px;
            cursor: pointer;
            transition: all $transition-fast;
            color: #64748b;

            &:hover, &.drag-over {
              border-color: $overlay-emerald-50;
              background: $overlay-emerald-04;
            }

            .upload-icon {
              width: 48px;
              height: 48px;
              border-radius: 50%;
              background: $overlay-emerald-08;
              display: flex;
              align-items: center;
              justify-content: center;
              color: $emerald-500;
              font-size: 20px;
            }

            .upload-text {
              text-align: center;

              .upload-title {
                font-size: 14px;
                font-weight: 600;
                color: #334155;
                margin: 0 0 4px;
              }

              .upload-hint {
                font-size: 12px;
                color: #94a3b8;
                margin: 0;
              }
            }
          }

          .file-selected-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 18px;
            background: #f8fafc;
            border: 1px solid $border-color-light;
            border-radius: 16px;
            margin-top: 12px;

            .file-info {
              display: flex;
              align-items: center;
              gap: 8px;
              min-width: 0;

              .file-name {
                font-size: 13px;
                font-weight: 600;
                color: #334155;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .file-size {
                font-size: 11px;
                color: #94a3b8;
                flex-shrink: 0;
              }

              .file-model-badge {
                font-size: 10px;
                padding: 1px 6px;
                border-radius: 6px;
                background: rgba(16, 185, 129, 0.08);
                color: $emerald-500;
                font-weight: 600;
                flex-shrink: 0;
              }
            }

            .file-actions {
              display: flex;
              gap: 8px;
              flex-shrink: 0;

              .parse-btn {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 6px 14px;
                border: none;
                border-radius: 10px;
                background: linear-gradient(135deg, #10b981, #059669);
                color: #fff;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.15s ease;

                &:hover:not(:disabled) {
                  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
                }

                &:disabled {
                  opacity: 0.5;
                  cursor: not-allowed;
                }
              }

              .clear-btn {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 6px 14px;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                background: #fff;
                color: #64748b;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s ease;

                &:hover {
                  border-color: #cbd5e1;
                  color: #334155;
                }
              }
            }
          }
        }

        .parsing-progress {
          padding: 20px;
          background: $overlay-emerald-04;
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.18);

          .progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;

            .progress-file-info {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 13px;
              color: #334155;

              .progress-file-name {
                font-weight: 600;
                max-width: 200px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .progress-file-size {
                color: #94a3b8;
                font-size: 11px;
              }
            }

            .progress-right {
              display: flex;
              align-items: center;
              gap: 10px;

              .progress-timer {
                font-size: 12px;
                color: #64748b;
                font-variant-numeric: tabular-nums;
              }

              .abort-btn {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 10px;
                border: 1px solid #fca5a5;
                border-radius: 8px;
                background: #fff;
                color: #dc2626;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.15s ease;

                &:hover {
                  background: #fef2f2;
                }
              }
            }
          }

          .progress-bar-wrapper {
            margin-bottom: 8px;

            .progress-bar {
              height: 6px;
              background: #e2e8f0;
              border-radius: 3px;
              overflow: hidden;

              .progress-fill--indeterminate {
                height: 100%;
                width: 40%;
                background: linear-gradient(90deg, #10b981, #34d399);
                border-radius: 3px;
                animation: progressIndeterminate 1.5s ease-in-out infinite;
              }
            }
          }

          .progress-hint {
            font-size: 12px;
            color: #64748b;
            margin: 0;
          }
        }

        .parse-error {
          padding: 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 16px;

          .parse-error-content {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #dc2626;
            font-size: 13px;
            font-weight: 500;
          }

          .parse-error-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 10px;

            .error-dismiss {
              border: none;
              background: none;
              color: #94a3b8;
              cursor: pointer;
              font-size: 14px;
              padding: 2px 6px;

              &:hover {
                color: #64748b;
              }
            }

            .error-recovery-btn {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              padding: 6px 12px;
              border: 1px solid #fbbf24;
              border-radius: 10px;
              background: #fffbeb;
              color: #92400e;
              font-size: 12px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.15s ease;

              &:hover {
                background: #fef3c7;
              }
            }
          }
        }

        .ai-result-preview {
          padding: 20px;
          background: $overlay-emerald-04;
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.18);

          .result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;

            .result-title {
              font-size: 12px;
              font-weight: 900;
              color: $emerald-500;
              text-transform: uppercase;
              letter-spacing: 0.1em;
            }
          }

          .result-summary {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            font-size: 13px;
            color: #64748b;
          }

          .unmatched-warn {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 12px;
            padding: 12px 16px;
            background: #fffbeb;
            border: 1px solid #fcd34d;
            border-radius: 12px;
            font-size: 13px;
            color: #dc2626;
          }
        }
      }

      .ai-status-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.3s ease;

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;

          &.status-dot--pulse {
            background: #3b82f6;
            animation: statusPulse 1.5s ease-in-out infinite;
          }

          &.status-dot--done {
            background: #10b981;
          }

          &.status-dot--ready {
            background: #f59e0b;
          }
        }

        .status-text {
          white-space: nowrap;
        }

        &.status--done {
          background: rgba(16, 185, 129, 0.08);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.15);
        }

        &.status--pulse {
          background: rgba(59, 130, 246, 0.08);
          color: #2563eb;
          border: 1px solid rgba(59, 130, 246, 0.15);
        }

        &.status--ready {
          background: rgba(245, 158, 11, 0.08);
          color: #d97706;
          border: 1px solid rgba(245, 158, 11, 0.15);
        }
      }
    }

    // 区域三：原料管理表格
    .zone-materials-table {
      .mode-switcher {
        display: flex;
        gap: 8px;
      }
    }

    .zone-bottom-info {
      .bottom-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        align-items: start;

        @media (max-width: 900px) {
          grid-template-columns: 1fr;
        }
      }

      .ratio-card, .quote-card {
        background: #f8fafc;
        border-radius: $radius-lg;
        padding: 12px 16px;
        border: 1px solid #e2e8f0;

        .card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 12px;

          .t-icon {
            color: $emerald-500;
            font-size: 14px;
          }

          .ratio-status {
            margin-left: auto;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 500;

            &.status--normal {
              background: #dcfce7;
              color: #166534;
            }

            &.status--warning {
              background: #fef3c7;
              color: #92400e;
            }

            &.status--high_warning {
              background: #fee2e2;
              color: #991b1b;
            }
          }
        }

        .card-body {
          .ratio-bar-track {
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            position: relative;
            overflow: hidden;

            .ratio-bar-fill {
              height: 100%;
              background: linear-gradient(90deg, #10b981, #34d399);
              border-radius: 4px;
              transition: width 0.3s;
            }

            .ratio-bar-marker {
              position: absolute;
              top: -4px;
              width: 2px;
              height: 16px;
              background: #1e293b;
              transform: translateX(-50%);
            }
          }

          .ratio-labels {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #94a3b8;
            margin-top: 4px;

            .center {
              color: #10b981;
              font-weight: 500;
            }
          }

          .ratio-value {
            margin-top: 10px;
            font-size: 13px;
            color: #475569;

            strong {
              color: #1e293b;
              font-size: 15px;
            }

            .deviation {
              margin-left: 8px;
              color: #10b981;
            }
          }
        }
      }

      .quote-card {
        .card-body {
          .quote-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;

            .qt-badge-info {
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 12px;
              color: #92400e;
            }

            .qt-reset-btn {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              padding: 4px 10px;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              background: #fff;
              color: #64748b;
              font-size: 11px;
              cursor: pointer;

              &:hover {
                border-color: #cbd5e1;
                color: #334155;
              }
            }
          }

          .quote-warn-text {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: #dc2626;
            margin-bottom: 10px;
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
                gap: 6px;
                color: #64748b;
                font-weight: 500;
              }

              > span {
                font-weight: 600;
                color: #1e293b;
              }

              .qs-label-icon {
                color: #94a3b8;
              }

              .qs-input-wrap {
                display: flex;
                align-items: center;
                gap: 6px;

                .qs-unit {
                  font-size: 12px;
                  color: #94a3b8;
                }
              }

              &.qs-total {
                label {
                  color: #334155;
                  font-weight: 600;
                }

                > span {
                  color: #1e293b;
                  font-size: 14px;
                }
              }

              &.qs-subtotal {
                label {
                  color: #334155;
                  font-weight: 600;
                }

                > span {
                  color: #1e293b;
                  font-size: 15px;
                  font-weight: 700;
                }
              }

              &.qs-final {
                padding: 12px 0 4px;

                label {
                  color: #1e293b;
                  font-weight: 700;
                  font-size: 14px;
                }

                > span {
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
              background: #e2e8f0;
              margin: 6px 0;

              &.qs-divider--bold {
                height: 2px;
                background: $emerald-500;
                margin: 8px 0;
              }
            }
          }
        }
      }

      .submit-area {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .btn-cancel {
          width: 120px;
        }

        .btn-submit {
          width: 120px;
          background: linear-gradient(135deg, #10b981, #059669) !important;
          border: none !important;
          color: #fff !important;
          font-weight: 600;
        }
      }
    }

    // AI 预填提示
    .ai-prefill-alert {
      margin-bottom: 16px;
      animation: fadeInDown 0.3s ease;

      &.alert-flash {
        will-change: transform, opacity, box-shadow, border-color;
        animation: alertFlash 2.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) 2;
      }
    }

    // 表单 Section 样式
    .form-section {
      background: #fff;
      padding: 32px;
      border-radius: 2.5rem;
      box-shadow: 0 1px 3px $overlay-black-05;
      border: 1px solid #f8fafc;
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
      color: $text-placeholder;
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
      padding: 6px 12px;
      background-color: $overlay-emerald-08;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all $transition-fast;

      .t-icon {
        font-size: 14px;
      }

      &:hover {
        color: #047857;
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
      padding: 6px 12px;
      background-color: $overlay-emerald-08;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all $transition-fast;

      .t-icon {
        font-size: 14px;
      }

      &:hover:not(:disabled) {
        color: #047857;
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
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 700;
          color: #334155;
          margin-bottom: 8px;

          .label-icon {
            color: #10b981;
            flex-shrink: 0;
          }

          .required {
            color: #f43f5e;
          }

          .btn-ai-generate {
            margin-left: auto;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 10px;
            border: 1px solid #10b981;
            border-radius: 6px;
            background: rgba(16, 185, 129, 0.08);
            color: #10b981;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            line-height: 22px;

            &:hover:not(:disabled) {
              background: rgba(16, 185, 129, 0.16);
              box-shadow: 0 1px 4px rgba(16, 185, 129, 0.2);
            }

            &:disabled {
              opacity: 0.45;
              cursor: not-allowed;
              border-color: #cbd5e1;
              color: #94a3b8;
              background: transparent;
            }
          }

          .field-help-inline {
            font-size: 12px;
            font-weight: 400;
            color: #94a3b8;
            margin-left: 4px;
          }
        }

        .field-input {
          width: 100%;
        }

        .field-help {
          margin-top: 4px;
          font-size: 12px;
          color: #64748b;
          text-align: left;
        }

        &.field-error {
          .field-label {
            color: #dc2626;
          }

          :deep(.t-textarea .t-textarea__inner) {
            border-color: #fca5a5 !important;
            background-color: #fef2f2 !important;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;

            &:focus {
              border-color: #ef4444 !important;
              box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
            }
          }
        }

        .field-error-msg {
          display: flex;
          align-items: center;
          gap: 4px;
          margin: 6px 0 0;
          font-size: 12px;
          font-weight: 600;
          color: #dc2626;
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
          background-color: #f8fafc !important;
          border: 1px solid $border-color-light !important;
          border-radius: 16px !important;
          padding: 14px 20px !important;
          min-height: 48px;
          font-size: 14px !important;
          color: #334155 !important;
          transition: all $transition-fast;

          &:hover:not(.t-is-disabled) {
            border-color: #e2e8f0 !important;
          }

          &.t-is-focused {
            background-color: #fff !important;
            border-color: transparent !important;
            box-shadow: 0 0 0 2px $emerald-500 !important;
            outline: none !important;
          }

          &::placeholder {
            color: $text-placeholder !important;
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
            background-color: #f8fafc !important;
            border: 1px solid $border-color-light !important;
            border-radius: 16px !important;
            padding: 10px 12px !important;
            min-height: 48px;
            transition: all $transition-fast;

            &:hover:not(.t-is-disabled) {
              border-color: #e2e8f0 !important;
            }
          }

          &.t-is-focused .t-select__wrap {
            background-color: #fff !important;
            border-color: transparent !important;
            box-shadow: 0 0 0 2px $emerald-500 !important;
            outline: none !important;
          }

          .t-select__placeholder,
          .t-select__single-value {
            font-size: 14px !important;
            color: #334155 !important;
            line-height: 22px;
          }

          .t-select__placeholder {
            color: $text-placeholder !important;
          }

          .t-icon {
            color: $text-placeholder !important;
          }
        }

        :deep(.t-input-number) {
          width: 100%;
          background-color: #f8fafc !important;
          border: 1px solid $border-color-light !important;
          border-radius: 16px !important;
          min-height: 48px;
          transition: all $transition-fast;

          &:hover:not(.t-is-disabled) {
            border-color: #e2e8f0 !important;
          }

          &.t-is-focused {
            background-color: #fff !important;
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
            color: #334155 !important;
            padding: 14px 12px !important;
            min-height: 46px;

            &::placeholder {
              color: $text-placeholder !important;
            }
          }
        }

        :deep(.t-textarea) {
          .t-textarea__inner {
            background-color: #f8fafc !important;
            border: 1px solid $border-color-light !important;
            border-radius: 16px !important;
            padding: 14px 20px !important;
            font-size: 14px !important;
            color: #334155 !important;
            transition: all $transition-fast;

            &:hover:not(:focus) {
              border-color: #e2e8f0 !important;
            }

            &:focus {
              background-color: #fff !important;
              border-color: transparent !important;
              box-shadow: 0 0 0 2px $emerald-500 !important;
              outline: none !important;
            }

            &::placeholder {
              color: $text-placeholder !important;
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
            color: $text-placeholder;
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
          background: #f8fafc;
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
              color: #475569;

              &--supplement {
                color: #6366f1;
              }
            }

            .price-edit-cell {
              display: flex;
              align-items: center;
              gap: 4px;

              .price-unit {
                font-size: 11px;
                color: #94a3b8;
                white-space: nowrap;
              }
            }

            .price-missing {
              font-size: 11px;
              color: #f59e0b;
              font-weight: 500;
            }

            .subtotal-cell {
              font-size: 13px;
              font-weight: 600;
              color: #1e293b;

              &--missing {
                color: #94a3b8;
              }
            }

            .adjust-cell {
              .col-adjust-badge {
                display: inline-flex;
                align-items: center;
                gap: 2px;
                font-size: 10px;
                color: #d97706;
                font-weight: 600;
              }

              .col-restore-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 22px;
                height: 22px;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                background: #fff;
                color: #64748b;
                cursor: pointer;
                margin-left: 4px;
                transition: all 0.15s ease;

                &:hover {
                  border-color: #10b981;
                  color: #10b981;
                  background: rgba(16, 185, 129, 0.06);
                }
              }
            }
          }

          &--highlight {
            background: linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.04) 100%);
            border-left: 3px solid #10b981;
            transition: background 0.3s ease, border-color 0.3s ease;
          }

          &--adjusted {
            background: rgba(217, 119, 6, 0.04);
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
          background: rgba(248, 250, 252, 0.6);
          margin-top: 4px;

          td {
            padding: 12px 12px;
            color: #64748b;
            font-size: 13px;

            &:first-child {
              border-radius: 12px 0 0 12px;
            }

            &:last-child {
              border-radius: 0 12px 12px 0;
            }
          }

          .cost-incomplete {
            color: #f59e0b;
          }
        }
      }
    }

    .add-first-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 16px 0;
      margin-top: 8px;
      font-size: 14px;
      font-weight: 700;
      color: $text-placeholder;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      background-color: transparent;
      border: 2px dashed #e2e8f0;
      border-radius: 24px;
      cursor: pointer;
      transition: all $transition-fast;

      .t-icon {
        font-size: 20px;
        color: $text-placeholder;
      }

      &:hover {
        color: $emerald-500;
        border-color: $overlay-emerald-40;
        background-color: #fff;

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
    margin-bottom: 16px;
  }

  .excel-collapsed-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%);
    border: 1.5px dashed #86efac;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.25s ease;
    user-select: none;

    &:hover {
      background: linear-gradient(135deg, #dcfce7 0%, #d1fae5 50%, #e0f2fe 100%);
      border-color: #4ade80;
      box-shadow: 0 2px 8px rgba(34, 197, 94, 0.12);
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }
  }

  .excel-collapsed-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .excel-collapsed-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, #22c55e, #16a34a);
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(34, 197, 94, 0.3);
  }

  .excel-collapsed-text {
    font-size: 14px;
    font-weight: 600;
    color: #15803d;
  }

  .excel-collapsed-hint {
    font-size: 11px;
    color: #86efac;
    background: rgba(34, 197, 94, 0.1);
    padding: 2px 8px;
    border-radius: 6px;
    font-weight: 500;
  }

  .excel-collapsed-arrow {
    color: #86efac;
    transition: transform 0.2s;
  }

  .excel-expanded-area {
    border: 1.5px solid #e2e8f0;
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
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #f1f5f9;
    }
  }

  .excel-expanded-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
  }

  .excel-expanded-arrow {
    color: #94a3b8;
    transition: transform 0.2s;
  }

  .excel-panel {
    margin-bottom: 0;
  }

  // AI 面板样式
  .ai-panel {
    background: linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, $border-color-light 100%);
    padding: 32px;
    border-radius: 2.5rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px $overlay-emerald-06;
    color: #334155;
    position: relative;
    overflow: hidden;
    animation: fadeInUp 0.5s ease both;
    animation-delay: 0.1s;
    border: 1px solid rgba(148, 163, 184, 0.15);

    .ai-panel-bg {
      position: absolute;
      top: -40px;
      right: -40px;
      width: 180px;
      height: 180px;
      background: radial-gradient(circle, $overlay-emerald-12 0%, transparent 70%);
      filter: blur(60px);
      border-radius: 50%;
    }

    .ai-panel-content {
      position: relative;
      z-index: 1;
    }

    .ai-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;

      .ai-icon {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, $emerald-500, $emerald-teal);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;

        .t-icon {
          font-size: 24px;
          color: #fff;
        }
      }

      .ai-title-group {
        .ai-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
        }

        .ai-subtitle {
          font-size: 12px;
          color: $text-placeholder;
          margin: 4px 0 0;
        }
      }
    }

    .ai-header-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.3s ease;
      margin-left: auto;

      &.status-indicator--done {
        background: rgba(16, 185, 129, 0.08);
        color: #059669;
        border: 1px solid rgba(16, 185, 129, 0.15);
      }

      &.status-indicator--ready {
        background: rgba(245, 158, 11, 0.08);
        color: #d97706;
        border: 1px solid rgba(245, 158, 11, 0.15);
      }

      &.status-indicator--pulse {
        background: rgba(59, 130, 246, 0.08);
        color: #2563eb;
        border: 1px solid rgba(59, 130, 246, 0.15);
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .status-dot--pulse {
        background: #3b82f6;
        animation: dot-pulse 1.4s ease-in-out infinite;
      }

      .status-dot--done {
        background: #10b981;
      }

      .status-dot--ready {
        background: #f59e0b;
        animation: dot-blink 2s ease-in-out infinite;
      }

      .status-text {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .ai-body {
      .model-select {
        margin-bottom: 24px;

        .model-label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .model-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;

          .model-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            padding: 14px 10px;
            background: $overlay-emerald-04;
            border: 1px solid rgba(148, 163, 184, 0.18);
            border-radius: 16px;
            color: #64748b;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all $transition-normal;
            opacity: 0.75;

            &:hover {
              opacity: 1;
              background: $overlay-emerald-08;
              border-color: $overlay-emerald-25;
              transform: translateY(-1px);
            }

            &.active {
              background: linear-gradient(135deg, $overlay-emerald-12 0%, rgba(45, 212, 191, 0.08) 100%);
              border-color: $overlay-emerald-35;
              opacity: 1;
              color: $emerald-600;
              box-shadow: 0 4px 12px -2px $overlay-emerald-12;
            }

            .model-logo-wrap {
              position: relative;
              width: 36px;
              height: 36px;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .model-logo {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }

            .model-fallback {
              display: none;
              position: absolute;
              inset: 0;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              font-weight: 700;
              background: $overlay-emerald-08;
              border-radius: 8px;
            }

            .model-btn-name {
              line-height: 1.2;
            }

            .model-info-row {
              display: inline-flex;
              align-items: center;
              gap: 4px;
            }

            .model-vision-badge {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-size: 9px;
              padding: 2px 6px;
              line-height: 1;
              background: $gradient-emerald-strong;
              color: #fff;
              border-radius: 8px;
              font-weight: 700;
              letter-spacing: 0.3px;
              opacity: 0.85;
            }
          }

          .no-models {
            grid-column: span 2;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 16px;
            color: $text-placeholder;
            font-size: 13px;

            .t-icon {
              font-size: 18px;
            }
          }
        }
      }

      .template-selector {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 16px;
        padding: 10px 14px;
        background: rgba(99, 102, 241, 0.04);
        border: 1px solid rgba(99, 102, 241, 0.12);
        border-radius: 12px;

        .template-selector-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #6366f1;
          white-space: nowrap;
          flex-shrink: 0;
          margin-top: 5px;
        }
      }

      // 上传区域
      .upload-area {
        .upload-zone {
          border: 2px dashed rgba(148, 163, 184, 0.25);
          border-radius: 24px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          cursor: pointer;
          transition: all $transition-fast;

          &:hover,
          &.drag-over {
            border-color: $overlay-emerald-50;
            background: $overlay-emerald-04;
          }

          .upload-icon {
            width: 64px;
            height: 64px;
            background: $overlay-emerald-08;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: $emerald-500;
            transition: transform 0.2s ease;
          }

          &:hover .upload-icon {
            transform: scale(1.1);
          }

          .upload-text {
            text-align: center;

            .upload-title {
              font-size: 14px;
              font-weight: 700;
              margin: 0;
            }

            .upload-hint {
              font-size: 10px;
              color: #64748b;
              margin: 4px 0 0;
            }
          }
        }

        .file-selected-row {
          margin-top: 16px;
          padding: 14px 18px;
          background: #f8fafc;
          border: 1px solid $border-color-light;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;

          .file-info {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
            flex: 1;

            .t-icon {
              color: #64748b;
              flex-shrink: 0;
            }

            .file-name {
              font-size: 13px;
              font-weight: 600;
              color: #334155;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .file-size {
              font-size: 11px;
              color: $text-placeholder;
              flex-shrink: 0;
            }

            .file-model-badge {
              font-size: 10px;
              padding: 2px 8px;
              background: $overlay-emerald-08;
              color: $emerald-600;
              border-radius: 10px;
              font-weight: 600;
              flex-shrink: 0;
              margin-left: auto;
            }
          }

          .file-actions {
            display: flex;
            gap: 8px;
            flex-shrink: 0;

            .parse-btn {
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 8px 20px;
              background: linear-gradient(135deg, $emerald-500, $emerald-teal);
              color: #fff;
              border: none;
              border-radius: 12px;
              font-size: 13px;
              font-weight: 700;
              cursor: pointer;
              transition: all $transition-fast;
              box-shadow: 0 4px 12px -2px $overlay-emerald-25;

              &:hover {
                transform: translateY(-1px);
                box-shadow: 0 6px 16px -2px $overlay-emerald-35;
              }

              &:active {
                transform: translateY(0);
              }

              &:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
              }
            }

            .clear-btn {
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 8px 16px;
              background: #fff;
              color: #64748b;
              border: 1px solid rgba(148, 163, 184, 0.25);
              border-radius: 12px;
              font-size: 13px;
              font-weight: 600;
              cursor: pointer;
              transition: all $transition-fast;
              white-space: nowrap;

              &:hover {
                background: #fef2f2;
                color: #dc2626;
                border-color: rgba(220, 38, 38, 0.18);
                transform: translateY(-1px);
              }

              &:active {
                transform: translateY(0);
              }
            }
          }
        }
      }

      // 解析进度
      .parsing-progress {
        padding: 24px;
        background: $overlay-emerald-04;
        border-radius: 24px;
        border: 1px solid rgba(148, 163, 184, 0.18);

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 8px;

          .progress-file-info {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;

            .progress-file-name {
              font-size: 12px;
              font-weight: 600;
              color: #334155;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              max-width: 200px;
            }

            .progress-file-size {
              font-size: 11px;
              color: #94a3b8;
              flex-shrink: 0;
            }
          }

          .progress-right {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
          }

          .progress-percent {
            font-size: 12px;
            font-weight: 600;
            color: $emerald-600;
            flex-shrink: 0;
          }

          .progress-timer {
            font-size: 12px;
            font-family: monospace;
            font-weight: 700;
            color: #64748b;
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 6px;
            letter-spacing: 0.5px;
          }

          .abort-btn {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border: 1px solid #fca5a5;
            border-radius: 8px;
            background: #fff;
            color: #ef4444;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;

            &:hover {
              background: #fef2f2;
              border-color: #ef4444;
            }
          }
        }

        .progress-bar-wrapper {
          margin-bottom: 12px;

          .progress-bar {
            height: 6px;
            background: rgba(148, 163, 184, 0.20);
            border-radius: 3px;
            overflow: hidden;

            .progress-fill {
              height: 100%;
              background: $gradient-emerald-light;
              background-size: 200% 100%;
              border-radius: 3px;

              &--indeterminate {
                width: 40% !important;
                animation: progressSlide 1.5s ease-in-out infinite;
              }
            }
          }
        }

        .progress-hint {
          font-size: 10px;
          color: #64748b;
          font-style: italic;
          margin: 0;
        }

        .progress-model-info {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 10px;
          padding: 6px 10px;
          background: rgba(99, 102, 241, 0.06);
          border: 1px solid rgba(99, 102, 241, 0.12);
          border-radius: 8px;
          color: #6366f1;
          font-size: 11px;

          .model-name {
            font-weight: 700;
          }

          .model-version {
            color: #94a3b8;
            font-family: monospace;
            font-size: 10px;
          }

          .model-feature {
            padding: 1px 6px;
            background: rgba(99, 102, 241, 0.1);
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
          }
        }
      }

      // 解析错误
      .parse-error {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 14px 18px;
        background: $color-danger-bg;
        border: 1px solid $color-danger-medium;
        border-radius: 16px;
        color: #dc2626;
        font-size: 12px;
        font-weight: 600;

        .parse-error-content {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;

          .t-icon {
            font-size: 18px;
            flex-shrink: 0;
          }

          span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        .parse-error-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .error-dismiss {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          font-size: 14px;
          opacity: 0.5;
          padding: 2px 4px;
          transition: opacity 0.2s;

          &:hover {
            opacity: 1;
          }
        }

        .error-recovery-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 12px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all $transition-fast;
          white-space: nowrap;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px -2px rgba(245, 158, 11, 0.35);
          }

          &:active {
            transform: translateY(0);
          }
        }
      }

      // 解析结果
      .analysis-result {
        .result-card {
          padding: 24px;
          background: $overlay-emerald-04;
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.18);

          .result-title {
            font-size: 12px;
            font-weight: 900;
            color: $emerald-500;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin: 0 0 16px;
          }

          .result-items {
            margin-bottom: 24px;

            .result-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 8px 0;
              font-size: 12px;

              .result-label {
                color: #64748b;
                flex-shrink: 0;
              }

              .result-value {
                font-weight: 700;
                color: #334155;

                &--empty {
                  color: $text-placeholder;
                  font-weight: 500;
                }
              }

              .result-badge {
                padding: 2px 8px;
                background: $overlay-emerald-12;
                color: $emerald-600;
                border-radius: 4px;
                font-size: 11px;
              }

              &--desc {
                flex-direction: column;
                align-items: flex-start;
                gap: 6px;
                padding: 12px 0;

                .result-desc-wrap {
                  font-size: 13px;
                  line-height: 1.7;
                  color: #334155;
                  text-align: justify;
                  word-break: break-word;
                  white-space: pre-wrap;
                  background: rgba(16, 185, 129, 0.04);
                  border: 1px solid rgba(16, 185, 129, 0.12);
                  border-radius: 8px;
                  padding: 12px 14px;
                  width: 100%;
                  max-height: 180px;
                  overflow-y: auto;

                  &--empty {
                    color: $text-placeholder;
                    font-weight: 500;
                  }
                }

                .result-label {
                  font-weight: 600;
                  color: #475569;
                }
              }
            }

            // 可信度
            .confidence-wrap {
              display: flex;
              align-items: center;
              gap: 8px;

              .confidence-bar {
                width: 80px;
                height: 6px;
                background: #e2e8f0;
                border-radius: 3px;
                overflow: hidden;

                .confidence-fill {
                  height: 100%;
                  background: linear-gradient(90deg, $emerald-500, $emerald-400);
                  border-radius: 3px;
                  transition: width 0.5s ease;
                }
              }

              .confidence-text {
                font-size: 12px;
                font-weight: 800;

                &.high {
                  color: $emerald-600;
                }

                &.medium {
                  color: #d97706;
                }

                &.low {
                  color: #dc2626;
                }
              }
            }

            // 重新解析下拉选项
            .reparse-model-option {
              display: flex;
              align-items: center;
              gap: 10px;
              width: 100%;
              min-height: 36px;
              padding: 2px 0;

              .reparse-model-logo {
                width: 24px;
                height: 24px;
                min-width: 24px;
                border-radius: 6px;
                overflow: hidden;
                position: relative;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: $border-color-light;

                img {
                  width: 16px;
                  height: 16px;
                  object-fit: contain;
                  display: block;
                }

                .reparse-model-fallback {
                  font-size: 12px;
                  font-weight: 800;
                  line-height: 1;
                }

                img+.reparse-model-fallback {
                  display: none;
                }

                img:error+.reparse-model-fallback {
                  display: block;
                }
              }

              .reparse-model-name {
                flex: 1;
                font-size: 13px;
                color: #334155;
                font-weight: 500;
                line-height: 1.4;
                white-space: nowrap;
              }

              .reparse-model-check {
                font-size: 16px;
                flex-shrink: 0;
                color: $emerald-500;

                &--active {
                  background: linear-gradient(135deg, $overlay-emerald-12, rgba(5, 150, 105, 0.08));
                  padding: 3px 7px;
                  border-radius: 6px;
                }
              }
            }
          }

          // 原料表格
          .materials-table {
            margin-bottom: 20px;
            border-radius: 14px;
            overflow: hidden;
            border: 1px solid rgba(148, 163, 184, 0.12);

            .materials-header {
              display: grid;
              grid-template-columns: 1fr 70px 50px 80px;
              background: $overlay-emerald-08;
              padding: 10px 14px;
              font-size: 11px;
              font-weight: 800;
              color: $emerald-600;
              text-transform: uppercase;
              letter-spacing: 0.05em;

              .col-status {
                text-align: right;
              }
            }

            .materials-row {
              display: grid;
              grid-template-columns: 1fr 70px 50px 80px;
              padding: 10px 14px;
              font-size: 12px;
              color: #334155;
              border-top: 1px solid rgba(148, 163, 184, 0.08);

              &:nth-child(even) {
                background: rgba(248, 250, 252, 0.5);
              }

              .col-name {
                font-weight: 600;
              }

              .col-qty {
                font-weight: 700;
              }

              .col-unit {
                color: #64748b;
              }

              .col-status {
                text-align: right;
              }
            }
          }

          // 可信度分条概述
          .confidence-summary {
            margin-bottom: 20px;
            border-radius: 16px;
            overflow: hidden;
            background: linear-gradient(135deg, $overlay-emerald-04 0%, rgba(59, 130, 246, 0.03) 100%);
            border: 1px solid rgba(148, 163, 184, 0.12);

            .summary-header {
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 10px 14px;
              font-size: 11px;
              font-weight: 800;
              color: $emerald-600;
              text-transform: uppercase;
              letter-spacing: 0.05em;

              .t-icon {
                font-size: 14px;
              }
            }

            }

            .summary-items {
              padding: 0 14px 12px;
              display: flex;
              flex-direction: column;
              gap: 8px;
            }

            .summary-item {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 6px 10px;
              border-radius: 10px;
              transition: background 0.2s;

              &--high {
                background: $overlay-emerald-06;
              }

              &--medium {
                background: $color-warning-bg;
              }

              &--low {
                background: $color-danger-bg;
              }

              .item-label {
                width: 56px;
                flex-shrink: 0;
                font-size: 11px;
                font-weight: 700;
                color: #475569;
              }

              .item-bar-wrap {
                flex: 1;
                display: flex;
                align-items: center;
                gap: 8px;

                .item-bar {
                  flex: 1;
                  height: 5px;
                  background: #e2e8f0;
                  border-radius: 3px;
                  overflow: hidden;

                  .item-fill {
                    height: 100%;
                    border-radius: 3px;
                    transition: width 0.5s ease;
                  }
                }

                .item-value {
                  font-size: 11px;
                  font-weight: 800;
                  min-width: 32px;
                  text-align: right;
                }
              }

              &--high .item-fill {
                background: linear-gradient(90deg, $emerald-500, $emerald-400);
              }

              &--high .item-value {
                color: $emerald-600;
              }

              &--medium .item-fill {
                background: linear-gradient(90deg, #d97706, #f59e0b);
              }

              &--medium .item-value {
                color: #d97706;
              }

              &--low .item-fill {
                background: linear-gradient(90deg, #dc2626, #ef4444);
              }

              &--low .item-value {
                color: #dc2626;
              }
            }
          }

          .unmatched-warning {
            margin: 12px 0;
            padding: 12px 16px;
            background: #fffbeb;
            border: 1px solid #fcd34d;
            border-radius: 12px;
            animation: fadeInUp 0.3s ease both;

            .unmatched-warning-header {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 12px;
              font-weight: 700;
              color: #b45309;
              margin-bottom: 8px;

              .t-icon {
                font-size: 14px;
                color: #f59e0b;
              }
            }

            .unmatched-list {
              list-style: none;
              padding: 0;
              margin: 0;

              .unmatched-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 4px 0;
                font-size: 12px;
                color: #92400e;
                border-bottom: 1px dashed #fde68a;

                &:last-child {
                  border-bottom: none;
                }

                .unmatched-name {
                  font-weight: 600;
                }

                .unmatched-qty {
                  font-size: 11px;
                  color: #a16207;
                  background: #fef3c7;
                  padding: 1px 8px;
                  border-radius: 6px;
                }
              }
            }
          }

      .submit-block-reasons {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 12px;

        .block-reason-item {
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;

          &--error {
            background: #FEF2F2;
            border: 1px solid #FECACA;

            .block-reason-header {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 4px;
            }

            .block-reason-dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: #EF4444;
              flex-shrink: 0;
            }

            .block-reason-text {
              font-weight: 600;
              color: #DC2626;
            }

            .block-reason-hint {
              font-size: 12px;
              color: #F87171;
              margin: 0 0 0 16px;
            }
          }

          &--warning {
            background: #FFFBEB;
            border: 1px solid #FDE68A;

            .block-reason-header {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 4px;
            }

            .block-reason-dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: #F59E0B;
              flex-shrink: 0;
            }

            .block-reason-text {
              font-weight: 600;
              color: #D97706;
            }

            .block-reason-hint {
              font-size: 12px;
              color: #FBBF24;
              margin: 0 0 0 16px;
            }
          }
        }
      }

          .result-actions {
            .backfill-btn {
              margin-bottom: 12px;
              border-radius: 14px;
              font-weight: 700;
              font-size: 13px;
              padding: 10px 20px;
              height: auto;
              box-shadow: 0 4px 12px -2px $overlay-emerald-20;
            }

            .secondary-actions {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;

              .action-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding: 9px 12px;
                border-radius: 14px;
                font-size: 12px;
                font-weight: 600;
                border: 1px solid transparent;
                cursor: pointer;
                transition: all $transition-fast;
                white-space: nowrap;

                .t-icon {
                  font-size: 15px;
                }

                &--default,
                &--danger,
                &--primary {
                  background: $border-color-light;
                  color: #475569;
                  border-color: #e2e8f0;

                  &:hover {
                    background: #e2e8f0;
                    color: #334155;
                    border-color: #cbd5e1;
                  }
                }
              }
            }
          }
        }
      }
    }
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
      background: #f8fafc;
      border-radius: $radius-lg;
      padding: 12px 16px;
      border: 1px solid #e2e8f0;
    }

    .quote-mat-header {
      display: grid;
      grid-template-columns: 1fr 70px 165px 85px;
      gap: 8px;
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
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
      padding: 5px 0;
      font-size: 13px;
      color: #334155;

      &--warn {
        color: #94a3b8;

        .qm-price {
          color: #f59e0b;
        }

        .qm-sub {
          color: #94a3b8;

          .qm-base-hint {
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

      &--adjusted {
        border-left: 3px solid #f59e0b;
        background: linear-gradient(90deg, rgba(254, 243, 199, 0.5) 0%, transparent 100%);

        .qm-name {
          color: #92400e;
          font-weight: 600;
        }

        .qm-sub {
          color: #78716c;

          .qm-base-hint {
            color: #d97706;
          }
        }
      }
    }

    .qm-name--link {
      cursor: pointer;
      transition: color 0.2s;

      &:hover {
        color: #10b981;
        text-decoration: underline;
      }
    }

    .qm-price-edit {
      display: flex;
      align-items: center;
      gap: 2px;

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
      color: #94a3b8;
      flex-shrink: 0;
    }

    .qm-adjust-badge {
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
      flex-shrink: 0;
      cursor: help;
      transition: all 0.2s;

      &:hover {
        background: linear-gradient(135deg, #fde68a, #fcd34d);
        transform: scale(1.05);
      }
    }

    .qm-restore-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 5px;
      border: 1px solid #e2e8f0;
      background: #fff;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
      padding: 0;

      &:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #059669;
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
        background: #d1fae5;
        border-color: #6ee7b7;
        color: #059669;
      }

      100% {
        background: #fff;
        border-color: #e2e8f0;
        color: #64748b;
      }
    }

    .quote-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 12px;
      padding: 10px 14px;
      border-radius: 12px;
      background: linear-gradient(135deg, #fffbeb, #fef3c7);
      border: 1px solid #fcd34d;

      .qt-badge-info {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #92400e;
        font-weight: 600;
      }

      .qt-reset-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px 14px;
        border: 1px solid rgba(217, 119, 6, 0.25);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.8);
        color: #d97706;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background: #fff7ed;
          border-color: rgba(217, 119, 6, 0.45);
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
        }

        &:active {
          transform: scale(0.97);
        }
      }
    }

    .quote-warn-text {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #f59e0b;
      background: #fffbeb;
      padding: 8px 14px;
      border-radius: $radius-lg;
      border: 1px solid #fde68a;
    }

    .quote-summary {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .qs-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;

      label {
        color: #64748b;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      span {
        font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
        font-weight: 600;
        color: #334155;
      }
    }

    .qs-label-icon {
      color: #94a3b8;
      flex-shrink: 0;
    }

    .qs-label-icon--final {
      color: #059669;
    }

    .qs-total span,
    .qs-subtotal span {
      color: #059669;
    }

    .qs-final {
      label {
        color: #059669;
        font-weight: 700;
        font-size: 15px;
      }

      span {
        font-size: 18px;
        color: #059669;
        font-weight: 800;
      }
    }

    .qs-input-wrap {
      display: flex;
      align-items: center;
      gap: 6px;

      :deep(.t-input-number),
      :deep(.t-input-number .t-input__inner) {
        text-align: right;
      }
    }

    .qs-unit {
      font-size: 12px;
      color: #94a3b8;
    }

    .qs-divider {
      height: 1px;
      background: #e2e8f0;

      &--bold {
        background: #cbd5e1;
      }
    }
  }

  // 提示面板
  .tips-panel {
    background: #fff;
    padding: 32px;
    border-radius: 2.5rem;
    box-shadow: 0 1px 3px $overlay-black-05;
    border: 1px solid #f8fafc;
    animation: fadeInUp 0.5s ease both;
    animation-delay: 0.2s;

    .tips-title {
      font-size: 14px;
      font-weight: 700;
      color: $text-placeholder;
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
        color: #64748b;

        .tip-icon {
          color: #fbbf24;
          font-size: 14px;
          margin-top: 2px;
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
      color: $text-primary;
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
        background-color: $bg-page;
        border-radius: $radius-lg;
        border: 1px solid $border-color-light;
      }
    }
  }

  .help-text {
    margin-left: $space-3;
    font-size: $font-size-caption;
    color: $text-secondary;
    line-height: 32px;
  }

  .select-empty-tip {
    padding: $space-2 0;
    text-align: center;
    color: $text-placeholder;
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
    0%, 100% {
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

  @keyframes alertFlash {
    0% {
      transform: scale(1);
      opacity: 1;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
      border-color: transparent;
    }

    15% {
      transform: scale(1.008);
      opacity: 1;
      box-shadow: 0 0 0 4px $overlay-emerald-18, 0 2px 14px $overlay-emerald-12;
      border-color: $emerald-500;
    }

    35% {
      transform: scale(1.013);
      opacity: 1;
      box-shadow: 0 0 0 10px $overlay-emerald-12, 0 0 0 22px $overlay-emerald-06, 0 4px 24px $overlay-emerald-18;
      border-color: $emerald-500;
    }

    55% {
      transform: scale(1.01);
      opacity: 0.92;
      box-shadow: 0 0 0 20px $overlay-emerald-06, 0 0 0 34px rgba(16, 185, 129, 0.03), 0 3px 16px $overlay-emerald-10;
      border-color: $overlay-emerald-55;
    }

    75% {
      transform: scale(1.005);
      opacity: 0.96;
      box-shadow: 0 0 0 28px rgba(16, 185, 129, 0.02), 0 2px 10px rgba(16, 185, 129, 0.07);
      border-color: $overlay-emerald-25;
    }

    90% {
      transform: scale(1.002);
      opacity: 0.98;
      box-shadow: 0 0 0 36px transparent, 0 1px 6px $overlay-emerald-05;
      border-color: $overlay-emerald-08;
    }

    100% {
      transform: scale(1);
      opacity: 1;
      box-shadow: 0 0 0 0 transparent;
      border-color: transparent;
    }
  }
}

.quick-create-salesman-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  color: #10B981;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #ecfdf5;
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
      background: #f0fdf4;
      border-color: #bbf7d0;
    }

    &--warning {
      background: #fffbeb;
      border-color: #fde68a;
    }

    &--high_warning {
      background: #fff7ed;
      border-color: #fed7aa;
    }

    &--error {
      background: #fef2f2;
      border-color: #fecaca;
    }
  }

  .ratio-summary-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;

    .ratio-summary--normal & {
      color: #16a34a;
    }

    .ratio-summary--warning & {
      color: #d97706;
    }

    .ratio-summary--high_warning & {
      color: #ea580c;
    }

    .ratio-summary--error & {
      color: #dc2626;
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
        #ef4444 0%,
        #f97316 15%,
        #eab308 30%,
        #22c55e 45%,
        #22c55e 55%,
        #eab308 70%,
        #f97316 85%,
        #ef4444 100%);
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
    background: #fff;
    border: 3px solid #1e293b;
    border-radius: 50%;
    transform: translateX(-50%);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: left 0.3s ease;
    z-index: 2;
  }

  .ratio-bar-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
    font-size: 10px;
    color: #94a3b8;

    .ratio-bar-center {
      font-weight: 700;
      color: #64748b;
    }
  }

  .ratio-summary-value {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 8px;
  }

  .ratio-value-label {
    font-size: 13px;
    color: #64748b;
  }

  .ratio-value-num {
    font-size: 20px;
    font-weight: 800;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: #1e293b;
  }

  .ratio-value-deviation {
    font-size: 13px;
    font-weight: 600;

    &.deviation--normal {
      color: #16a34a;
    }

    &.deviation--warning {
      color: #d97706;
    }

    &.deviation--high_warning {
      color: #ea580c;
    }

    &.deviation--error {
      color: #dc2626;
    }
  }

  .ratio-summary-desc {
    font-size: 12px;
    color: #64748b;
    line-height: 1.5;
    margin: 0;
  }

  .ratio-review-notice {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    padding: 8px 12px;
    background: rgba(234, 88, 12, 0.08);
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #ea580c;
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
    gap: 6px;
    padding: 8px 0;
    font-size: 13px;
    color: #64748b;
    cursor: pointer;
    list-style: none;
    user-select: none;

    &::-webkit-details-marker {
      display: none;
    }

    &:hover {
      color: #10b981;
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
      color: #64748b;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    td {
      padding: 8px 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }

    .font-mono {
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-weight: 600;
    }
  }
}
</style>

<style lang="scss">
@use '@/assets/styles/variables.scss' as *;

.unified-materials-section {
  .section-header {
    .switch-label {
      margin-left: 8px;
      font-size: 13px;
      color: #666;
    }
  }
}

.reparse-dropdown-popup {
  min-width: 160px !important;
  width: auto !important;
  border: none !important;
  outline: none !important;
  box-shadow: 0 6px 24px $overlay-emerald-28, 0 2px 8px $overlay-emerald-12 !important;

  .t-dropdown__menu {
    min-width: 140px !important;
    width: auto !important;
    padding: 4px !important;
    border: none !important;
    outline: none !important;
  }

  .t-dropdown__item {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    padding: 7px 12px !important;
    min-height: 38px;
    width: 100% !important;
    max-width: none !important;
    box-sizing: border-box !important;
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: nowrap !important;

    &:hover {
      background-color: $border-color-light !important;
    }

    &.t-dropdown__item--active {
      color: $emerald-600 !important;
      background-color: transparent !important;
    }
  }

  .reparse-model-option {
    display: inline-flex !important;
    align-items: center !important;
    gap: 16px !important;
    width: auto !important;
    min-width: 120px !important;
    max-width: none !important;
    overflow: visible !important;
    text-overflow: clip !important;

    .reparse-model-logo {
      width: 22px !important;
      height: 22px !important;
      min-width: 22px !important;
      border-radius: 5px !important;
      overflow: hidden !important;
      flex-shrink: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: $border-color-light !important;

      img {
        width: 15px !important;
        height: 15px !important;
        object-fit: contain !important;
        display: block !important;
      }

      .reparse-model-fallback {
        font-size: 11px !important;
        font-weight: 800 !important;
        line-height: 1 !important;
      }

      img+.reparse-model-fallback {
        display: none !important;
      }

      img:error+.reparse-model-fallback {
        display: block !important;
      }
    }

    .reparse-model-name {
      flex: 0 0 auto !important;
      font-size: 13px !important;
      color: #334155 !important;
      font-weight: 500 !important;
      line-height: 1.3 !important;
      white-space: nowrap !important;
      text-overflow: clip !important;
      overflow: visible !important;
    }

    .reparse-model-check {
      font-size: 20px !important;
      flex-shrink: 0 !important;
      color: $emerald-500 !important;
    }
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
    color: rgba(16, 185, 129, 0.6) !important;
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
