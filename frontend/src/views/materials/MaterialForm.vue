<template>
  <div class="material-form" data-testid="material-form">
    <header class="detail-header">
      <div class="header-left">
        <button class="header-back-btn" @click="handleBack" title="返回列表" aria-label="返回原料列表">
          <t-icon name="arrow-left" />
        </button>
        <div class="header-title-group">
          <nav class="header-breadcrumb">
            <a class="breadcrumb-link" @click="handleBack">原料管理</a>
            <t-icon name="chevron-right" class="breadcrumb-sep" />
            <span class="breadcrumb-current">{{ isEdit ? '编辑原料' : '新增原料' }}</span>
          </nav>
          <h2 class="formula-title">
            {{ isEdit ? '编辑原料' : '新增原料' }}
          </h2>
        </div>
      </div>
      <div class="header-actions">
        <button class="header-action-btn secondary" @click="handleBack" aria-label="取消编辑，返回列表"
          data-testid="material-cancel-btn">
          <t-icon name="close" class="btn-icon" />
          取消
        </button>
        <button class="header-action-btn" @click="handleSubmit({ validateResult: true })" aria-label="保存原料"
          data-testid="material-save-btn">
          <t-icon name="save" class="btn-icon" />
          {{ isEdit ? '保存' : '创建' }}
        </button>
      </div>
    </header>

    <main class="form-main">
      <t-form ref="formRef" :data="formData" :rules="rules" scroll-to-first-error @submit="handleSubmit">
        <div class="form-grid">
          <!-- 左侧表单区域 -->
          <div class="form-grid-left animate-fade-in">
            <!-- 基础信息录入 -->
            <section class="form-section">
              <h3 class="section-title">
                <t-icon name="info-circle" class="section-icon" />
                基础信息录入
              </h3>
              <div class="section-content space-y-6">
                <!-- 原料名称 -->
                <div class="form-field">
                  <label class="field-label" id="lbl-material-name"><t-icon name="edit-1" size="12px"
                      class="label-icon" /> 原料名称 <span class="required">*</span></label>
                  <t-input v-model="formData.name" placeholder="请输入原料名称" clearable class="field-input"
                    aria-required="true" aria-labelledby="lbl-material-name" data-testid="material-name-input" />
                </div>
                <!-- 原料类型 -->
                <div class="form-field">
                  <label class="field-label" id="lbl-material-type"><t-icon name="layers" size="12px"
                      class="label-icon" /> 原料类型 <span class="required">*</span></label>
                  <t-radio-group v-model="formData.materialType" class="field-input" aria-required="true"
                    role="radiogroup" aria-labelledby="lbl-material-type">
                    <t-radio value="herb">药材</t-radio>
                    <t-radio value="supplement">辅料</t-radio>
                  </t-radio-group>
                </div>
                <!-- 原料编码（自动根据名称拼音缩写生成） -->
                <div class="form-field">
                  <label class="field-label" id="lbl-material-code"><t-icon name="barcode" size="12px"
                      class="label-icon" /> 原料编码 <span class="required">*</span></label>
                  <t-input v-model="formData.code" placeholder="输入原料名称后自动生成" :disabled="!formData.name" clearable
                    class="field-input" aria-required="true" aria-labelledby="lbl-material-code" />
                  <span class="field-help">根据原料名称拼音首字母自动生成，可手动修改</span>
                </div>
                <!-- 单位 -->
                <div class="grid grid-cols-2 gap-6">
                  <div class="form-field">
                    <label class="field-label" id="lbl-unit"><t-icon name="ruler" size="12px" class="label-icon" /> 单位
                      <span class="required">*</span></label>
                    <t-select v-model="formData.unit" placeholder="请选择单位" :options="unitOptions" clearable
                      class="field-input" aria-required="true" aria-labelledby="lbl-unit" />
                  </div>
                  <div class="form-field">
                    <label class="field-label" id="lbl-stock"><t-icon name="box" size="12px" class="label-icon" /> 库存数量
                      <span class="required">*</span></label>
                    <t-input-number v-model="formData.stock" :min="0" placeholder="0" class="field-input"
                      aria-required="true" aria-labelledby="lbl-stock" />
                  </div>
                  <div class="form-field">
                    <label class="field-label" id="lbl-unit-price"><t-icon name="currency-exchange" size="12px"
                        class="label-icon" /> 单价（元/kg）</label>
                    <t-input-number v-model="formData.unitPrice" :min="0" :precision="2" placeholder="暂不录入"
                      class="field-input" aria-labelledby="lbl-unit-price" />
                    <span class="field-help">可选，用于配方报价自动计算</span>
                  </div>
                </div>
              </div>
            </section>
            <div v-if="isEdit" class="ai-disabled-overlay">
              <span class="ai-disabled-text">编辑模式下不可操作</span>
            </div>

            <!-- 营养成分录入 -->
            <section v-if="showNutrition" class="form-section nutrition-sec">
              <div class="section-header">
                <h3 class="section-title">
                  <t-icon name="chart-bar" class="section-icon" />
                  营养成分（每100g）
                  <t-tag v-if="hasNutrition" theme="success" variant="light" size="small" shape="round">已录入</t-tag>
                </h3>
              </div>
              <div class="section-content">
                <NutritionExcelImport @import="handleNutritionExcelImport" class="excel-panel" />

                <div class="row-actions collapse-toolbar">
                  <button type="button" class="clear-btn" @click="handleClearNutrition" aria-label="清空所有营养成分">
                    <t-icon name="delete" />
                    清空
                  </button>
                  <button type="button" class="add-row-btn" @click="expandAllGroups" aria-label="展开所有营养成分分组">
                    <t-icon name="unfold-more" />
                    展开
                  </button>
                  <button type="button" class="add-row-btn" @click="collapseAllGroups" aria-label="收起所有营养成分分组">
                    <t-icon name="unfold-less" />
                    收起
                  </button>
                </div>

                <t-collapse :value="Object.keys(collapseExpanded).filter(k => collapseExpanded[k])"
                  @change="handleCollapseChange">
                  <t-collapse-panel v-for="group in nutritionFieldGroups" :key="group.title" :value="group.title">
                    <template #header>
                      <div class="group-header">
                        <t-icon :name="group.icon" size="16px" />
                        <span>{{ group.title }}</span>
                        <t-tag size="small" variant="light" theme="default" shape="round">
                          {{ group.fields.length }}项
                        </t-tag>
                      </div>
                    </template>
                    <div class="nutrition-grid">
                      <!-- 普通营养字段（能量单独处理） -->
                      <div v-for="field in group.fields.filter(f => f.key !== 'energy')" :key="field.key"
                        class="nutrition-field-item">
                        <label class="nf-label">{{ field.label }}</label>
                        <div class="nf-input-wrap">
                          <t-input-number v-model="nutritionData[field.key]" :min="0" :decimal-places="field.decimals"
                            :placeholder="field.placeholder" theme="normal" style="width: 100px" />
                          <span class="nf-unit">{{ field.unit }}</span>
                        </div>
                      </div>
                      <!-- 能量计算：独占一行 -->
                      <div v-if="group.fields.some(f => f.key === 'energy')"
                        class="nutrition-field-item nf-calculated nf-full-width" style="margin-top: 12px;">
                        <label class="nf-label">能量</label>
                        <div class="nf-calc-wrap">
                          <span class="nf-calc-value">{{ calculatedEnergy }}</span>
                          <span class="nf-unit">kJ</span>
                          <span class="nf-calc-formula">= 蛋白×17 + 脂肪×37 + 碳水×17</span>
                        </div>
                      </div>
                    </div>
                  </t-collapse-panel>
                </t-collapse>

                <div class="nutrition-meta">
                  <div class="nm-row">
                    <label class="nm-label">数据来源</label>
                    <t-input v-model="nutritionMeta.dataSource" placeholder="如：中国食物成分表（第6版）" clearable
                      style="width: 280px" />
                  </div>
                  <div class="nm-row nm-row--confidence">
                    <label class="nm-label">数据可信度</label>
                    <t-radio-group v-model="nutritionMeta.confidence" variant="default-filled" size="small">
                      <t-radio-button v-for="opt in confidenceOptions" :key="opt.value" :value="opt.value"
                        class="confidence-opt-btn">
                        {{ opt.label }}
                      </t-radio-button>
                    </t-radio-group>
                  </div>
                  <div class="nm-row">
                    <label class="nm-label">备注</label>
                    <t-input v-model="nutritionMeta.notes" placeholder="可选备注信息" clearable style="width: 280px" />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- 右侧 AI 助手区域（编辑模式只读） -->
          <div class="form-grid-right animate-fade-in" :class="{ 'ai-panel--disabled': isEdit }"
            style="animation-delay: 0.1s;">
            <section class="ai-panel">
              <div class="ai-panel-bg"></div>
              <div class="ai-panel-content">
                <div class="ai-header">
                  <div class="ai-icon">
                    <t-icon name="cloud" />
                  </div>
                  <div class="ai-title-group">
                    <h3 class="ai-title">AI 智能营养解析</h3>
                    <p class="ai-subtitle">支持识别 Excel、图片及手写草稿中的营养数据</p>
                  </div>
                </div>

                <div class="ai-body">
                  <div ref="modelSelectRef" class="model-select">
                    <label class="model-label">选择 AI 模型</label>
                    <div class="model-grid">
                      <template v-if="aiStore.models.length > 0">
                        <button v-for="model in aiStore.models" :key="model.provider" type="button" class="model-btn"
                          :class="{ active: aiStore.selectedModel === model.provider }"
                          @click="selectModel(model.provider)" :aria-label="`选择${model.name}模型`"
                          :aria-pressed="aiStore.selectedModel === model.provider">
                          <div class="model-logo-wrap">
                            <img loading="lazy" :src="getModelLogo(model)" :alt="model.name" class="model-logo"
                              @error="(e: Event) => handleLogoError(e, model)" />
                            <span class="model-fallback" :style="{ color: getFallbackColor(model) }">
                              {{ getFallbackLetter(model) }}
                            </span>
                          </div>
                          <div class="model-info-row">
                            <span class="model-btn-name">{{ model.name }}</span>
                            <span class="model-vision-badge">文本</span>
                            <span v-if="model.supportsVision" class="model-vision-badge">图片</span>
                          </div>
                        </button>
                      </template>
                      <div v-else class="no-models">
                        <t-icon name="error-circle" />
                        <span>暂无可用模型</span>
                      </div>
                    </div>
                  </div>

                  <div v-if="!aiStore.materialParseLoading && !aiStore.materialParseResult" class="upload-zone"
                    :class="{ 'drag-over': isDragOver }" @click="triggerFileInput" @dragover.prevent="handleDragOver"
                    @dragleave="handleDragLeave" @drop.prevent="handleDrop">
                    <input ref="fileInputRef" type="file" accept=".xlsx,.xls,.png,.jpg,.jpeg" style="display: none;"
                      @change="handleFileChange" />
                    <div class="upload-icon">
                      <t-icon name="upload" />
                    </div>
                    <div class="upload-text">
                      <p class="upload-title">点击或拖拽文件上传</p>
                      <p class="upload-hint">支持 .xlsx, .jpg, .png (最大 10MB)</p>
                    </div>
                  </div>

                  <div v-if="aiStore.materialParseLoading" class="parsing-progress">
                    <div class="progress-header">
                      <span class="progress-status">AI 正在解析文件内容...</span>
                      <span class="progress-percent">{{ parseProgressText }}</span>
                    </div>
                    <div class="progress-bar">
                      <div class="progress-fill progress-fill--indeterminate"></div>
                    </div>
                    <p class="progress-hint">{{ parseProgressHint }}</p>
                  </div>

                  <div v-if="aiStore.materialParseError" class="parse-error">
                    <t-icon name="error-circle" />
                    <span>{{ aiStore.materialParseError }}</span>
                    <button type="button" class="error-dismiss" @click="aiStore.materialParseError = ''">✕</button>
                  </div>

                  <div v-if="aiStore.materialParseResult" class="analysis-result">
                    <div class="result-card">
                      <h4 class="result-title">解析结果预览</h4>
                      <div class="result-items">
                        <div class="result-item">
                          <span class="result-label">解析原料数</span>
                          <span class="result-value">{{ parseNutritionItems.length }} 条</span>
                        </div>
                        <div class="result-item">
                          <span class="result-label">数据来源</span>
                          <span class="result-value" :class="{ 'result-value--empty': !firstResultDataSource }">
                            {{ firstResultDataSource || '未识别' }}
                          </span>
                        </div>
                        <div v-if="avgConfidence != null" class="result-item">
                          <span class="result-label">解析可信度</span>
                          <div class="confidence-wrap">
                            <div class="confidence-bar">
                              <div class="confidence-fill" :style="{ width: (avgConfidence * 100) + '%' }"></div>
                            </div>
                            <span class="confidence-text" :class="getConfidenceLevel(avgConfidence)">
                              {{ (avgConfidence * 100).toFixed(0) }}%
                            </span>
                          </div>
                        </div>
                        <div v-if="aiStore.materialParseResult?.usage" class="result-item">
                          <span class="result-label">Token 用量</span>
                          <span class="result-badge">{{ aiStore.materialParseResult.usage.totalTokens }}</span>
                        </div>

                      </div>
                      <!-- 原料营养表 -->
                      <table v-if="parseNutritionItems.length" class="nutrition-materials-table">
                        <thead>
                          <tr>
                            <th class="col-name">原料名称</th>
                            <th class="col-protein">蛋白质(g)</th>
                            <th class="col-fat">脂肪(g)</th>
                            <th class="col-carb">碳水(g)</th>
                            <th class="col-sodium">钠(mg)</th>
                            <th class="col-status">匹配状态</th>
                            <th class="col-operation">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          <template v-for="(item, idx) in parseNutritionItems" :key="idx">
                            <tr :class="{ 'row--diff': item.isRecorded && hasDiff(item) }">
                              <td class="col-name">{{ item.name || '未命名' }}</td>
                              <td class="col-protein" :class="{ 'cell--diff': getDiffInfo(item, 'protein') }">
                                {{ item.protein ?? '-' }}
                                <span
                                  v-if="getDiffInfo(item, 'protein') && Math.abs(getDiffInfo(item, 'protein')!.diff) > 0.01"
                                  class="diff-badge" :class="getDiffInfo(item, 'protein')!.diff > 0 ? 'up' : 'down'">
                                  {{ getDiffInfo(item, 'protein')!.diff > 0 ? '↑' : '↓' }}
                                </span>
                              </td>
                              <td class="col-fat" :class="{ 'cell--diff': getDiffInfo(item, 'fat') }">
                                {{ item.fat ?? '-' }}
                                <span v-if="getDiffInfo(item, 'fat') && Math.abs(getDiffInfo(item, 'fat')!.diff) > 0.01"
                                  class="diff-badge" :class="getDiffInfo(item, 'fat')!.diff > 0 ? 'up' : 'down'">
                                  {{ getDiffInfo(item, 'fat')!.diff > 0 ? '↑' : '↓' }}
                                </span>
                              </td>
                              <td class="col-carb" :class="{ 'cell--diff': getDiffInfo(item, 'carbohydrate') }">
                                {{ item.carbohydrate ?? '-' }}
                                <span
                                  v-if="getDiffInfo(item, 'carbohydrate') && Math.abs(getDiffInfo(item, 'carbohydrate')!.diff) > 0.01"
                                  class="diff-badge"
                                  :class="getDiffInfo(item, 'carbohydrate')!.diff > 0 ? 'up' : 'down'">
                                  {{ getDiffInfo(item, 'carbohydrate')!.diff > 0 ? '↑' : '↓' }}
                                </span>
                              </td>
                              <td class="col-sodium" :class="{ 'cell--diff': getDiffInfo(item, 'sodium') }">
                                {{ item.sodium ?? '-' }}
                                <span
                                  v-if="getDiffInfo(item, 'sodium') && Math.abs(getDiffInfo(item, 'sodium')!.diff) > 0.01"
                                  class="diff-badge" :class="getDiffInfo(item, 'sodium')!.diff > 0 ? 'up' : 'down'">
                                  {{ getDiffInfo(item, 'sodium')!.diff > 0 ? '↑' : '↓' }}
                                </span>
                              </td>
                              <td class="col-status">
                                <t-tag v-if="item.isRecorded && !hasDiff(item)" theme="success" variant="light"
                                  size="small">已录入</t-tag>
                                <t-tag v-else-if="item.isRecorded && hasDiff(item)" theme="warning" variant="light"
                                  size="small">已录入 ⚠</t-tag>
                                <t-tag v-else theme="warning" variant="light" size="small">未录入</t-tag>
                              </td>
                              <td class="col-operation">
                                <template v-if="registerStatusMap[idx] === 'loading'">
                                  <t-button size="small" theme="success" variant="outline" loading>录入中</t-button>
                                </template>
                                <template v-else-if="registerStatusMap[idx] === 'success'">
                                  <span class="reg-success"><t-icon name="check-circle" /> 录入成功</span>
                                </template>
                                <template v-else-if="registerStatusMap[idx] === 'error'">
                                  <t-button size="small" theme="danger" variant="outline"
                                    @click="handleImmediateRegister(item, idx)">
                                    <template #icon><t-icon name="close-circle" /></template>
                                    重试
                                  </t-button>
                                </template>
                                <template v-else-if="!item.isRecorded">
                                  <t-button size="small" theme="success" class="reg-btn--primary"
                                    @click="handleImmediateRegister(item, idx)">
                                    <template #icon><t-icon name="send" /></template>
                                    录入
                                  </t-button>
                                </template>
                                <template v-else-if="hasDiff(item)">
                                  <button type="button" class="diff-toggle-btn" @click="toggleDiffRow(idx)">
                                    差异
                                    <t-icon :name="expandedDiffRow === idx ? 'chevron-up' : 'chevron-down'"
                                      size="12px" />
                                  </button>
                                </template>
                                <template v-else>
                                  <span class="reg-done">—</span>
                                </template>
                              </td>
                            </tr>
                            <tr v-if="expandedDiffRow === idx" class="diff-detail-row">
                              <td colspan="7">
                                <div class="diff-panel">
                                  <table class="diff-inner-table">
                                    <thead>
                                      <tr>
                                        <th>指标</th>
                                        <th>数据库(旧)</th>
                                        <th>AI解析(新)</th>
                                        <th>差异</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr v-for="field in NUTRITION_FIELDS" :key="field"
                                        :class="'diff-row--' + diffDirection(item, field)">
                                        <td>{{ NUTRITION_LABELS[field] }}</td>
                                        <td>{{ (existingNutritionMap[item.materialId ? String(item.materialId) :
                                          '']?.[field] ??
                                          0).toFixed(1) }}
                                        </td>
                                        <td>{{ (item[field] ?? '-').toString() }}</td>
                                        <td class="diff-val">{{ diffArrow(item, field) }}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                  <div class="diff-actions">
                                    <button type="button" class="diff-btn diff-btn--apply"
                                      @click="handleUseNewData(item, idx)">使用新数据</button>
                                    <button type="button" class="diff-btn diff-btn--keep"
                                      @click="toggleDiffRow(idx)">保留原数据</button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </template>
                        </tbody>
                      </table>
                      <!-- 操作按键 -->
                      <div class="result-actions">
                        <t-button theme="success" block @click="handleBatchRegister" :loading="batchRegistering"
                          :disabled="allRecorded" class="backfill-btn" aria-label="一键录入所有AI解析的原料数据">
                          <template #icon><t-icon name="check-circle" /></template>
                          一键录入
                        </t-button>
                        <div class="secondary-actions">
                          <button type="button" class="action-btn action-btn--default" @click.stop="resetUpload"
                            aria-label="重新选择文件">
                            <t-icon name="refresh" />重新选择文件
                          </button>
                          <button type="button" class="action-btn action-btn--danger" @click.stop="clearResult"
                            aria-label="清空AI解析结果">
                            <t-icon name="delete" />清空
                          </button>
                          <t-dropdown trigger="hover"
                            :popup-props="{ appendToBody: true, placement: 'bottom-right', overlayClassName: 'reparse-dropdown-popup' }">
                            <button type="button" class="action-btn action-btn--primary" @click.stop>
                              <t-icon name="play-circle" />
                              重新解析
                              <t-icon name="chevron-down" size="12px" style="margin-left: 2px;" />
                            </button>
                            <t-dropdown-menu>
                              <t-dropdown-item v-for="model in aiStore.models" :key="model.provider"
                                :value="model.provider"
                                @click="(ctx: any) => handleReparseWithModel({ value: ctx.value })">
                                <div class="reparse-model-option">
                                  <div class="reparse-model-logo">
                                    <img loading="lazy" :src="getModelLogo(model)" :alt="model.name"
                                      @error="(e: Event) => handleLogoError(e, model)" />
                                    <span class="reparse-model-fallback" :style="{ color: getFallbackColor(model) }">
                                      {{ getFallbackLetter(model) }}
                                    </span>
                                  </div>
                                  <span class="reparse-model-name">{{ model.name }}</span>
                                  <t-icon v-if="aiStore.selectedModel === model.provider" name="check"
                                    class="reparse-model-check reparse-model-check--active" />
                                </div>
                              </t-dropdown-item>
                            </t-dropdown-menu>
                          </t-dropdown>
                        </div>
                      </div>
                      <!-- 可信度分条概述 -->
                      <div v-if="getConfidenceItems().length" class="confidence-summary">
                        <div class="summary-header">
                          <t-icon name="info-circle" />
                          <span>解析可信度概览</span>
                        </div>
                        <div class="summary-items">
                          <div v-for="(item, idx) in getConfidenceItems()" :key="idx" class="summary-item"
                            :class="'summary-item--' + item.level">
                            <span class="item-label">{{ item.label }}</span>
                            <div class="item-bar-wrap">
                              <div class="item-bar">
                                <div class="item-fill" :style="{ width: item.value + '%' }"></div>
                              </div>
                              <span class="item-value">{{ item.value }}%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
              <div v-if="isEdit" class="ai-disabled-overlay">
                <span class="ai-disabled-text">编辑模式下不可操作</span>
              </div>
            </section>
          </div>
        </div>
      </t-form>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMaterialStore } from '@/stores/material';
import { useAiStore } from '@/stores/ai';
import { nutritionApi } from '@/api/nutrition';
import { materialApi } from '@/api/material';
import { MessagePlugin } from 'tdesign-vue-next';
import type { FormInstanceFunctions, FormRule } from 'tdesign-vue-next';
import NutritionExcelImport from '@/components/NutritionExcelImport.vue';

const router = useRouter();
const route = useRoute();
const materialStore = useMaterialStore();
const aiStore = useAiStore();

const formRef = ref<FormInstanceFunctions>();
const loading = ref(false);
const showNutrition = ref(false);
const hasNutrition = ref(false);

const isEdit = computed(() => !!route.params.id);

const formData = reactive<any>({
  code: '',
  name: '',
  unit: '',
  stock: 0,
  materialType: 'herb',
  unitPrice: undefined as number | undefined,
});

const unitOptions = [
  { label: '千克 (kg)', value: 'kg' },
  { label: '克 (g)', value: 'g' },
  { label: '升 (L)', value: 'L' },
  { label: '毫升 (mL)', value: 'mL' },
  { label: '个', value: '个' },
  { label: '件', value: '件' },
  { label: '包', value: '包' },
  { label: '箱', value: '箱' }
];

const pinyinCodeMap: Record<string, string> = {
  佛手: 'FS', 重瓣玫瑰: 'RBPL', 茯苓: 'FL', 熟地: 'SD', 党参: 'DS', 益母草: 'YMC',
  高果糖浆: 'GGTJ', 蜂蜜: 'FM', 巴戟天: 'BJT', 佛手玫苓膏: 'FSQLG', 纯净水: 'CJS',
  龙眼肉: 'LYR', 黄精: 'HJ', 酸枣仁: 'SZR', 灵芝: 'LZ', 石斛: 'SH', 西洋参: 'XYX',
  陈皮: 'CP', 当归: 'DG', 黄芪: 'HQ', 红枣: 'HZ', 枸杞: 'GQ', 桑葚: 'SS', 阿胶: 'EJ',
  人参: 'RS', 鹿茸: 'LR', 冬虫夏草: 'DCXC', 藏红花: 'ZHH', 川贝: 'CB', 百合: 'BH',
  麦冬: 'MD', 五味子: 'WWZ', 远志: 'YZ', 酸梅膏: 'SMG', 甘草: 'GC', 白术: 'BS',
  山药: 'SY', 莲子: 'LZ', 芡实: 'QS', 薏米: 'YM', 赤小豆: 'CXD', 扁豆: 'BD',
  山楂: 'SZ', 神曲: 'SQ', 麦芽: 'MY', 谷芽: 'GY', 鸡内金: 'JNJ', 莱菔子: 'LFZ',
  决明子: 'JMZ', 菊花: 'JH', 金银花: 'JYH', 连翘: 'LQ', 板蓝根: 'BLG', 蒲公英: 'PGY',
  鱼腥草: 'YXC', 薄荷: 'BH2', 紫苏: 'ZS', 香附: 'XF', 郁金: 'YJ', 延胡索: 'YHS',
  丹参: 'DS2', 红花: 'HH', 桃仁: 'TR', 三棱: 'SL', 莪术: 'EW', 水蛭: 'SZ2',
  地龙: 'DL', 全蝎: 'QX', 蜈蚣: 'WG', 僵蚕: 'JC', 蝉蜕: 'CT', 牛黄: 'NH'
};

const generatePinyinCode = (name: string): string => {
  if (!name.trim()) return '';
  if (pinyinCodeMap[name]) return pinyinCodeMap[name];
  return name.substring(0, Math.min(5, name.length)).split('').map(c => {
    const code = c.charCodeAt(0);
    if (code >= 0x4e00 && code <= 0x9fff) return String.fromCharCode(0x41 + ((code - 0x4e00) % 26));
    return c.toUpperCase();
  }).join('');
};

watch(() => formData.name, (newName) => {
  if (!isEdit.value && newName && newName.length >= 2) {
    const autoCode = generatePinyinCode(newName);
    if (autoCode) formData.code = autoCode;
  }
});

const rules: Record<string, FormRule[]> = {
  code: [
    { required: true, message: '请输入原料编码', trigger: 'blur' },
    { pattern: /^[A-Z0-9-]+$/, message: '编码只能包含大写字母、数字和横线', trigger: 'change' },
  ],
  name: [
    { required: true, message: '请输入原料名称', trigger: 'blur' },
    { min: 2, message: '原料名称至少2个字符', trigger: 'change' },
  ],
  unit: [{ required: true, message: '请选择单位', trigger: 'change' }],
  stock: [{ required: true, message: '请输入库存数量', trigger: 'blur' }],
};

const nutritionFieldGroups = [
  {
    title: '基础营养成分', icon: 'chart-bar', expanded: true,
    fields: [
      { key: 'protein', label: '蛋白质', unit: 'g', decimals: 2, placeholder: '克' },
      { key: 'fat', label: '脂肪', unit: 'g', decimals: 2, placeholder: '克' },
      { key: 'carbohydrate', label: '碳水化合物', unit: 'g', decimals: 2, placeholder: '克' },
      { key: 'fiber', label: '膳食纤维', unit: 'g', decimals: 2, placeholder: '克' },
      { key: 'sugars', label: '糖', unit: 'g', decimals: 2, placeholder: '克' },
      { key: 'energy', label: '能量', unit: 'kJ', decimals: 1, placeholder: '千焦' },
    ]
  },
  {
    title: '矿物质', icon: 'layers', expanded: false,
    fields: [
      { key: 'sodium', label: '钠', unit: 'mg', decimals: 1, placeholder: '毫克' },
      { key: 'potassium', label: '钾', unit: 'mg', decimals: 1, placeholder: '毫克' },
      { key: 'calcium', label: '钙', unit: 'mg', decimals: 1, placeholder: '毫克' },
      { key: 'iron', label: '铁', unit: 'mg', decimals: 2, placeholder: '毫克' },
      { key: 'zinc', label: '锌', unit: 'mg', decimals: 2, placeholder: '毫克' },
      { key: 'magnesium', label: '镁', unit: 'mg', decimals: 1, placeholder: '毫克' },
      { key: 'phosphorus', label: '磷', unit: 'mg', decimals: 1, placeholder: '毫克' },
    ]
  },
  {
    title: '维生素', icon: 'lightbulb', expanded: false,
    fields: [
      { key: 'vitaminA', label: '维生素A', unit: 'μg RE', decimals: 1, placeholder: '微克视黄醇当量' },
      { key: 'vitaminC', label: '维生素C', unit: 'mg', decimals: 2, placeholder: '毫克' },
      { key: 'vitaminD', label: '维生素D', unit: 'μg', decimals: 2, placeholder: '微克' },
      { key: 'vitaminE', label: '维生素E', unit: 'mg α-TE', decimals: 2, placeholder: '毫克' },
      { key: 'vitaminB1', label: '维生素B1', unit: 'mg', decimals: 3, placeholder: '毫克' },
      { key: 'vitaminB2', label: '维生素B2', unit: 'mg', decimals: 3, placeholder: '毫克' },
      { key: 'vitaminB3', label: '烟酸(B3)', unit: 'mg', decimals: 2, placeholder: '毫克' },
      { key: 'vitaminB6', label: '维生素B6', unit: 'mg', decimals: 3, placeholder: '毫克' },
      { key: 'vitaminB12', label: '维生素B12', unit: 'μg', decimals: 2, placeholder: '微克' },
      { key: 'folate', label: '叶酸', unit: 'μg DFE', decimals: 1, placeholder: '微克' },
    ]
  },
  {
    title: '其他', icon: 'more', expanded: false,
    fields: [
      { key: 'cholesterol', label: '胆固醇', unit: 'mg', decimals: 1, placeholder: '毫克' },
      { key: 'saturatedFat', label: '饱和脂肪', unit: 'g', decimals: 2, placeholder: '克' },
      { key: 'transFat', label: '反式脂肪', unit: 'g', decimals: 2, placeholder: '克' },
    ]
  }
];

const collapseExpanded = reactive<Record<string, boolean>>({
  '基础营养成分': true, '矿物质': false, '维生素': false, '其他': false
});

const nutritionFields = nutritionFieldGroups.flatMap(g => g.fields);

const nutritionData = reactive<Record<string, number>>(
  Object.fromEntries(nutritionFields.map(f => [f.key, 0]))
);
const nutritionMeta = reactive({
  dataSource: '', notes: '',
  confidence: 'medium' as 'high' | 'medium' | 'low',
});

const confidenceOptions = [
  { label: '高（实验室检测）', value: 'high' },
  { label: '中（文献数据）', value: 'medium' },
  { label: '低（估算值）', value: 'low' },
];

const calculatedEnergy = computed(() => {
  const p = nutritionData.protein || 0;
  const f = nutritionData.fat || 0;
  const c = nutritionData.carbohydrate || 0;
  return (p * 17 + f * 37 + c * 17).toFixed(1);
});

// ━━ AI 助手状态 ━━
const fileInputRef = ref<HTMLInputElement>();
const modelSelectRef = ref<HTMLElement>();
const resultRef = ref<HTMLElement>();
const isDragOver = ref(false);
const parseStartTime = ref<number>(0);

const selectedFile = ref<File | null>(null);

const parseProgressText = computed(() => {
  if (!aiStore.materialParseLoading) return '';
  const elapsed = Date.now() - parseStartTime.value;
  if (elapsed < 2000) return '连接 AI 服务...';
  if (elapsed < 5000) return '上传文件中...';
  if (elapsed < 10000) return 'AI 分析中...';
  if (elapsed < 20000) return '提取营养数据...';
  return '即将完成...';
});

const parseProgressHint = computed(() => {
  const hints = [
    '正在识别文档结构与内容',
    '提取营养成分信息',
    '匹配标准营养数据库',
    '计算每100g含量值',
    '生成结构化数据'
  ];
  if (!aiStore.materialParseLoading) return '';
  const stage = Math.floor((Date.now() - parseStartTime.value) / 4000) % hints.length;
  return hints[stage] + '...';
});

const getConfidenceLevel = (c: number): string => c >= 0.8 ? 'conf-high' : c >= 0.5 ? 'conf-mid' : 'conf-low';

const getConfidenceItems = () => {
  const data = aiStore.materialParseResult;
  if (!data || !data.materials?.length) return [];
  const items: { label: string; value: number; level: string; }[] = [];

  const firstMat = data.materials[0];
  const baseConf = firstMat.confidence != null ? Math.round(firstMat.confidence * 100) : null;

  if (firstMat.name && firstMat.name !== '未识别') {
    const v = baseConf ?? 100;
    items.push({ label: '原料名称', value: v, level: v >= 80 ? 'high' : v >= 50 ? 'medium' : 'low' });
  }

  const hasNutrients = data.materials.some(
    m => m.protein != null || m.fat != null || m.carbohydrate != null || m.sodium != null
  );
  if (hasNutrients) {
    const validConfs = data.materials.filter(m => m.confidence != null).map(m => m.confidence!);
    const avgNutrConf = validConfs.length > 0
      ? Math.round(validConfs.reduce((a, b) => a + b, 0) / validConfs.length * 100)
      : (baseConf ?? 85);
    items.push({ label: '营养数据', value: avgNutrConf, level: avgNutrConf >= 80 ? 'high' : avgNutrConf >= 50 ? 'medium' : 'low' });
  }

  if (firstMat.dataSource) {
    const v = baseConf ?? 90;
    items.push({ label: '数据来源', value: v, level: v >= 80 ? 'high' : v >= 50 ? 'medium' : 'low' });
  }
  return items;
};

const handleReparseWithModel = async (data: { value: string; }) => {
  aiStore.selectedModel = data.value;
  (Object.keys(registerStatusMap) as string[]).forEach(k => delete registerStatusMap[k]);
  existingNutritionMap.value = {};
  expandedDiffRow.value = null;
  batchRegistering.value = false;
  aiStore.clearMaterialParseResult();
  if (selectedFile.value) {
    nextTick(() => {
      const progressEl = document.querySelector('.parsing-progress');
      if (progressEl) {
        progressEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        resultRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    try {
      await handleFileSelect(selectedFile.value);
    } catch (err: any) {
      console.error('[重新解析失败]', err);
    }
  }
};

const parseNutritionItems = computed(() => {
  const result = aiStore.materialParseResult;
  if (!result || !result.materials) return [];
  return result.materials.map((item: any) => ({
    name: item.name || '未识别',
    protein: item.protein,
    fat: item.fat,
    carbohydrate: item.carbohydrate,
    sodium: item.sodium,
    dataSource: item.dataSource,
    confidence: item.confidence,
    isRecorded: !!item.isRecorded,
    materialId: item.materialId || null,
  }));
});

const allRecorded = computed(() => {
  const items = parseNutritionItems.value;
  if (!items.length) return true;
  return items.every((item: any) => item.isRecorded);
});

const existingNutritionMap = ref<Record<string, { protein: number; fat: number; carbohydrate: number; sodium: number; }>>({});
const expandedDiffRow = ref<number | null>(null);

watch(() => aiStore.materialParseResult, async (result) => {
  if (!result?.materials) return;
  const recordedItems = result.materials.filter((m: any) => m.isRecorded && m.materialId);
  await Promise.allSettled(
    recordedItems.map(async (mat: any) => {
      try {
        const key = mat.materialId ? String(mat.materialId) : '';
        if (!key) {
          console.warn('[差异对比] 跳过无materialId的原料:', mat.name);
          return;
        }
        if (existingNutritionMap.value[key]) return;
        const res: any = await nutritionApi.getMaterialNutrition(key, true);
        if (res?.per100g) {
          existingNutritionMap.value[key] = {
            protein: res.per100g.protein ?? 0,
            fat: res.per100g.fat ?? 0,
            carbohydrate: res.per100g.carbohydrate ?? 0,
            sodium: res.per100g.sodium ?? 0,
          };
        }
      } catch (err: any) {
        console.error(`[差异对比] 获取 ${mat.name || '未知'} 营养数据失败 [${err?.response?.status || 'N/A'}]:`, err?.message || err);
      }
    })
  );
}, { immediate: true });

const NUTRITION_FIELDS = ['protein', 'fat', 'carbohydrate', 'sodium'] as const;
const NUTRITION_LABELS: Record<string, string> = { protein: '蛋白质(g)', fat: '脂肪(g)', carbohydrate: '碳水(g)', sodium: '钠(mg)' };

function hasDiff(item: any): boolean {
  const key = item.materialId ? String(item.materialId) : '';
  const existing = existingNutritionMap.value[key];
  if (!existing || !item.materialId) return false;
  return NUTRITION_FIELDS.some(f => Math.abs((existing[f] ?? 0) - (item[f] ?? 0)) > 0.01);
}

function getDiffInfo(item: any, field: string): { old: number; new: number; diff: number; } | null {
  const key = item.materialId ? String(item.materialId) : '';
  const existing = existingNutritionMap.value[key];
  if (!existing) return null;
  const oldVal = (existing as Record<string, number>)[field] ?? 0;
  const newVal = item[field] ?? 0;
  return { old: oldVal, new: newVal, diff: newVal - oldVal };
}

function diffDirection(item: any, field: string): string {
  const info = getDiffInfo(item, field);
  if (!info) return '';
  return info.diff > 0 ? 'up' : info.diff < 0 ? 'down' : 'same';
}

function diffArrow(item: any, field: string): string {
  const info = getDiffInfo(item, field);
  if (!info) return '—';
  if (Math.abs(info.diff) <= 0.01) return '—';
  const sign = info.diff > 0 ? '↑' : '↓';
  return `${sign} ${Math.abs(info.diff).toFixed(1)}`;
}

function toggleDiffRow(idx: number) {
  expandedDiffRow.value = expandedDiffRow.value === idx ? null : idx;
}

async function handleUseNewData(item: any, _idx: number) {
  if (!item.materialId) return;
  try {
    const per100g: Record<string, number> = {};
    if (item.protein != null) per100g.protein = Number(item.protein);
    if (item.fat != null) per100g.fat = Number(item.fat);
    if (item.carbohydrate != null) per100g.carbohydrate = Number(item.carbohydrate);
    if (item.sodium != null) per100g.sodium = Number(item.sodium);

    await nutritionApi.setMaterialNutrition(item.materialId, {
      per100g,
      dataSource: item.dataSource || 'AI导入',
      confidence: (item.confidence ?? 0.7) >= 0.8 ? 'high' : 'medium',
    });

    existingNutritionMap.value[String(item.materialId)] = {
      protein: Number(item.protein ?? 0),
      fat: Number(item.fat ?? 0),
      carbohydrate: Number(item.carbohydrate ?? 0),
      sodium: Number(item.sodium ?? 0),
    };

    expandedDiffRow.value = null;
    MessagePlugin.success(`${item.name} 营养数据已更新`);
  } catch (err: any) {
    MessagePlugin.error(`更新失败: ${err.message}`);
  }
}

const firstResultDataSource = computed(() => {
  const result = aiStore.materialParseResult;
  if (!result?.materials?.length) return '';
  return result.materials[0].dataSource || '';
});

const avgConfidence = computed(() => {
  const result = aiStore.materialParseResult;
  if (!result?.materials?.length) return null;
  const valid = result.materials.filter((m: any) => m.confidence != null);
  if (!valid.length) return null;
  const sum = valid.reduce((acc: number, m: any) => acc + m.confidence, 0);
  return sum / valid.length;
});

const MODEL_LOGO_MAP: Record<string, string> = {
  openai: 'openai', gpt: 'openai', chatgpt: 'openai',
  anthropic: 'claude', claude: 'claude',
  google: 'google', gemini: 'google',
  deepseek: 'deepseek', qwen: 'qwen', tongyi: 'qwen', '通义千问': 'qwen',
  zhipu: 'zhipu', chatglm: 'zhipu', 智谱: 'zhipu', glm: 'zhipu',
};

const FALLBACK_ICONS: Record<string, { letter: string; color: string; }> = {
  openai: { letter: 'O', color: '#10a37f' },
  claude: { letter: 'C', color: '#cc8b19' },
  google: { letter: 'G', color: '#4285f4' },
  deepseek: { letter: 'D', color: '#4f46e5' },
  qwen: { letter: 'Q', color: '#059669' },
  zhipu: { letter: 'Z', color: '#615ced' },
  moonshot: { letter: 'M', color: '#000' },
  minimax: { letter: 'M', color: '#615ced' },
  tencent: { letter: 'T', color: '#0052d9' },
};

const getModelLogo = (model: any): string => {
  const provider = (model.provider || '').toLowerCase();
  const name = (model.name || '').toLowerCase();

  for (const [key, slug] of Object.entries(MODEL_LOGO_MAP)) {
    if (provider.includes(key) || name.includes(key)) {
      return slug.startsWith('http') ? slug : `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/${slug}.svg`;
    }
  }

  return `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/openai.svg`;
};

const getModelSlug = (model: any): string => {
  const provider = (model.provider || '').toLowerCase();
  const name = (model.name || '').toLowerCase();

  for (const [key, slug] of Object.entries(MODEL_LOGO_MAP)) {
    if (provider.includes(key) || name.includes(key)) {
      return slug.startsWith('http') ? key : slug;
    }
  }

  return 'openai';
};

const getFallbackLetter = (model: any): string => {
  const slug = getModelSlug(model);
  return FALLBACK_ICONS[slug]?.letter || '?';
};

const getFallbackColor = (model: any): string => {
  const slug = getModelSlug(model);
  return FALLBACK_ICONS[slug]?.color || '#94a3b8';
};

const handleLogoError = (e: Event, _model: any) => {
  const img = e.target as HTMLImageElement;
  img.style.display = 'none';
  const wrap = img.parentElement;
  if (wrap) {
    const fallback = wrap.querySelector('.model-fallback');
    if (fallback) (fallback as HTMLElement).style.display = 'flex';
  }
};

const selectModel = (model: string) => { aiStore.selectedModel = model; };

const triggerFileInput = () => fileInputRef.value?.click();
const handleDragOver = () => { isDragOver.value = true; };
const handleDragLeave = () => { isDragOver.value = false; };

const handleDrop = (e: DragEvent) => {
  isDragOver.value = false;
  const files = e.dataTransfer?.files;
  if (files?.length) startParse(files[0]);
};

const handleFileChange = (e: Event) => {
  const files = (e.target as HTMLInputElement).files;
  if (files?.length) startParse(files[0]);
};

const handleFileSelect = async (file: File) => {
  selectedFile.value = file;
  parseStartTime.value = Date.now();
  await aiStore.parseMaterial(file);
};

const startParse = async (file: File) => {
  await handleFileSelect(file);
};

const batchRegistering = ref(false);

const handleBatchRegister = async () => {
  const items = parseNutritionItems.value;
  const unregistered = items.filter((item: any, idx: number) => !item.isRecorded && registerStatusMap[idx] !== 'success');
  if (!unregistered.length) {
    MessagePlugin.info('没有需要录入的原料');
    return;
  }

  batchRegistering.value = true;
  let successCount = 0;
  let failCount = 0;

  for (const item of unregistered) {
    const idx = items.indexOf(item);
    if (registerStatusMap[idx] === 'loading' || registerStatusMap[idx] === 'success') continue;

    registerStatusMap[idx] = 'loading';
    try {
      const code = generatePinyinCode(item.name) || `MAT${String(Date.now()).slice(-3)}`;
      const fileName = selectedFile.value?.name || 'AI导入';

      const matRes: any = await materialApi.create({
        name: item.name,
        code,
        unit: 'g',
        stock: 0,
        materialType: 'herb',
      });

      const matId = matRes?.id || matRes?.data?.id;
      if (!matId) throw new Error('创建原料失败：未返回原料ID');

      const per100g: Record<string, number> = {};
      if (item.protein != null) per100g.protein = Number(item.protein);
      if (item.fat != null) per100g.fat = Number(item.fat);
      if (item.carbohydrate != null) per100g.carbohydrate = Number(item.carbohydrate);
      if (item.sodium != null) per100g.sodium = Number(item.sodium);

      const confLevel = (item.confidence ?? 0.7) >= 0.8 ? 'high' : (item.confidence ?? 0.7) >= 0.5 ? 'medium' : 'low';
      await nutritionApi.setMaterialNutrition(matId, {
        per100g,
        dataSource: item.dataSource || 'AI导入',
        notes: fileName,
        confidence: confLevel,
      });

      registerStatusMap[idx] = 'success';
      item.isRecorded = true;
      item.materialId = matId;

      const batchMaterials = aiStore.materialParseResult?.materials;
      if (batchMaterials && batchMaterials[idx]) {
        batchMaterials[idx].isRecorded = true;
        batchMaterials[idx].materialId = matId;
      }

      existingNutritionMap.value[String(matId)] = {
        protein: Number(item.protein ?? 0),
        fat: Number(item.fat ?? 0),
        carbohydrate: Number(item.carbohydrate ?? 0),
        sodium: Number(item.sodium ?? 0),
      };

      successCount++;
    } catch (err: any) {
      console.error('[批量录入失败]', item.name, err);
      registerStatusMap[idx] = 'error';
      failCount++;
    }
  }

  batchRegistering.value = false;

  if (failCount === 0) {
    MessagePlugin.success(`批量录入完成，共 ${successCount} 条原料录入成功`);
  } else {
    MessagePlugin.warning(`批量录入完成：${successCount} 条成功，${failCount} 条失败（可点击重试）`);
  }
};

const resetUpload = () => {
  aiStore.clearMaterialParseResult();
  selectedFile.value = null;
  if (fileInputRef.value) fileInputRef.value.value = '';
  (Object.keys(registerStatusMap) as string[]).forEach(k => delete registerStatusMap[k]);
  existingNutritionMap.value = {};
  expandedDiffRow.value = null;
  batchRegistering.value = false;
};
const clearResult = () => {
  aiStore.clearMaterialParseResult();
  (Object.keys(registerStatusMap) as string[]).forEach(k => delete registerStatusMap[k]);
  existingNutritionMap.value = {};
  expandedDiffRow.value = null;
  batchRegistering.value = false;
};

const registerStatusMap = reactive<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});

const handleImmediateRegister = async (item: any, idx: number) => {
  if (registerStatusMap[idx] === 'loading') return;
  registerStatusMap[idx] = 'loading';
  try {
    const code = generatePinyinCode(item.name) || `MAT${String(Date.now()).slice(-3)}`;
    const fileName = selectedFile.value?.name || 'AI导入';

    const matRes: any = await materialApi.create({
      name: item.name,
      code,
      unit: 'g',
      stock: 0,
      materialType: 'herb',
    });

    const matId = matRes?.id || matRes?.data?.id;
    if (!matId) throw new Error('创建原料失败：未返回原料ID');

    const per100g: Record<string, number> = {};
    if (item.protein != null) per100g.protein = Number(item.protein);
    if (item.fat != null) per100g.fat = Number(item.fat);
    if (item.carbohydrate != null) per100g.carbohydrate = Number(item.carbohydrate);
    if (item.sodium != null) per100g.sodium = Number(item.sodium);

    const confLevel = (item.confidence ?? 0.7) >= 0.8 ? 'high' : (item.confidence ?? 0.7) >= 0.5 ? 'medium' : 'low';
    await nutritionApi.setMaterialNutrition(matId, {
      per100g,
      dataSource: item.dataSource || 'AI导入',
      notes: fileName,
      confidence: confLevel,
    });

    registerStatusMap[idx] = 'success';
    item.isRecorded = true;
    item.materialId = matId;

    const materials = aiStore.materialParseResult?.materials;
    if (materials && materials[idx]) {
      materials[idx].isRecorded = true;
      materials[idx].materialId = matId;
    }

    existingNutritionMap.value[String(matId)] = {
      protein: Number(item.protein ?? 0),
      fat: Number(item.fat ?? 0),
      carbohydrate: Number(item.carbohydrate ?? 0),
      sodium: Number(item.sodium ?? 0),
    };

    MessagePlugin.success(`${item.name} 录入成功`);
  } catch (err: any) {
    console.error('[立即录入失败]', err);
    registerStatusMap[idx] = 'error';
    MessagePlugin.error(`${item.name || '原料'} 录入失败: ${err.message || '未知错误'}`);
  }
};

const handleClearNutrition = () => {
  for (const field of nutritionFields) nutritionData[field.key] = 0;
  nutritionMeta.dataSource = '';
  nutritionMeta.notes = '';
  nutritionMeta.confidence = 'medium';
  hasNutrition.value = false;
};

const handleNutritionExcelImport = (data: { nutritionData: Record<string, number>; dataSource: string; confidence: string; notes: string; }) => {
  showNutrition.value = true;
  hasNutrition.value = true;

  for (const [key, val] of Object.entries(data.nutritionData)) {
    if (nutritionData[key] !== undefined) nutritionData[key] = Number(val);
  }

  if (data.dataSource) nutritionMeta.dataSource = data.dataSource;
  if (data.confidence) nutritionMeta.confidence = data.confidence as 'high' | 'medium' | 'low';
  if (data.notes) nutritionMeta.notes = data.notes;

  const count = Object.values(data.nutritionData).filter(v => v > 0).length;
  MessagePlugin.success(`已导入 ${count} 项营养素数据`);
};

const handleCollapseChange = (value: string[]) => {
  for (const key of Object.keys(collapseExpanded)) collapseExpanded[key] = value.includes(key);
};
const expandAllGroups = () => { for (const k of Object.keys(collapseExpanded)) collapseExpanded[k] = true; };
const collapseAllGroups = () => { for (const k of Object.keys(collapseExpanded)) collapseExpanded[k] = false; };

const buildPer100g = (): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const field of nutritionFields) {
    const val = nutritionData[field.key];
    if (val !== undefined && val !== null && val > 0) result[field.key] = val;
  }
  return result;
};

const saveNutrition = async (materialId: string) => {
  const per100g = buildPer100g();
  if (Object.keys(per100g).length === 0) return;
  try {
    await nutritionApi.setMaterialNutrition(materialId, {
      per100g,
      dataSource: nutritionMeta.dataSource || undefined,
      notes: nutritionMeta.notes || undefined,
      confidence: nutritionMeta.confidence,
    });
  } catch (error: any) { console.error('保存营养成分失败:', error); }
};

const handleSubmit = async ({ validateResult }: any) => {
  if (validateResult === true) {
    if (loading.value) return;
    loading.value = true;
    try {
      const id = route.params.id as string;
      let result;
      if (isEdit.value && id) result = await materialStore.updateMaterial(id, formData);
      else result = await materialStore.createMaterial(formData);

      if (result.success) {
        if (showNutrition.value) {
          const materialId = isEdit.value ? id : (result as any).data?.id;
          if (materialId) await saveNutrition(materialId);
        }
        MessagePlugin.success(isEdit.value ? '保存成功' : '创建成功');
        router.push('/materials');
      } else MessagePlugin.error(result.message || '操作失败');
    } finally { loading.value = false; }
  }
};

const handleBack = () => { router.push('/materials'); };

const loadNutrition = async (materialId: string) => {
  try {
    const res = await nutritionApi.getMaterialNutrition(materialId) as any;
    if (res?.per100g) {
      hasNutrition.value = true;
      showNutrition.value = true;
      const per100g = res.per100g || {};
      for (const key of Object.keys(per100g))
        if (per100g[key] !== undefined && per100g[key] !== null) nutritionData[key] = Number(per100g[key]);
      if (res.dataSource) nutritionMeta.dataSource = res.dataSource;
      if (res.notes) nutritionMeta.notes = res.notes;
      if (res.confidence) nutritionMeta.confidence = res.confidence;
    }
  } catch { }
};

onMounted(async () => {
  await aiStore.fetchModels();

  if (!aiStore.selectedModel && aiStore.models.length > 0) {
    const visionModel = aiStore.models.find(m => m.supportsVision);
    if (visionModel) aiStore.selectedModel = visionModel.provider;
    else aiStore.selectedModel = aiStore.models[0].provider;
  }

  if (!isEdit.value) {
    aiStore.clearParseResult();
  }

  const id = route.params.id as string;
  if (isEdit.value && id) {
    const material = await materialStore.getMaterial(id);
    if (material) {
      Object.assign(formData, {
        code: material.code, name: material.name, unit: material.unit,
        stock: material.stock, materialType: material.materialType || 'herb',
        unitPrice: material.unitPrice ?? undefined,
      });
      await loadNutrition(id);
    }
  } else {
    showNutrition.value = true;
  }
});
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.material-form {

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
    background-color: $overlay-white-80;
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

        .formula-title {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.35;
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
        box-shadow: 0 10px 15px -3px $overlay-emerald-25;
        cursor: pointer;
        transition: all $transition-fast;

        .btn-icon {
          font-size: 18px;
        }

        &:hover {
          background-color: #059669;
          transform: translateY(-1px);
          box-shadow: 0 14px 20px -3px $overlay-emerald-35;
        }

        &:active {
          transform: translateY(0);
          background-color: #047857;
        }

        &.secondary {
          background-color: #f1f5f9;
          color: #64748b;
          box-shadow: 0 1px 3px $shadow-float;

          &:hover {
            background-color: #e2e8f0;
            color: #475569;
            box-shadow: 0 4px 6px $shadow-float;
          }

          &:active {
            background-color: #cbd5e1;
          }
        }
      }
    }
  }

  .form-main {
    margin-top: 24px;
    padding-bottom: 32px;
    animation: fadeInUp 0.5s ease-out forwards;

    .form-grid {
      display: grid;
      grid-template-columns: 40% 60%;
      gap: 32px;

      @media (max-width: 1023px) {
        grid-template-columns: 1fr;
      }
    }

    .form-grid-left {
      display: flex;
      flex-direction: column;
      gap: 32px;
      min-width: 0;

      @media (max-width: 1023px) {
        grid-column: 1 / -1;
      }
    }

    .form-grid-right {
      display: flex;
      flex-direction: column;
      gap: 32px;
      position: relative;
      min-width: 0;

      @media (max-width: 1023px) {
        grid-column: 1 / -1;
      }

      &--disabled {
        pointer-events: none;
      }

      .ai-disabled-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(248, 250, 252, 0.60);
        backdrop-filter: blur(1.5px);
        border-radius: 20px;
        z-index: 30;

        .ai-disabled-text {
          font-size: 13px;
          font-weight: 600;
          color: #94a3b8;
          letter-spacing: 0.5px;
          background: $overlay-white-90;
          padding: 10px 24px;
          border-radius: 20px;
          box-shadow: 0 2px 12px rgba(148, 163, 184, 0.15);
        }
      }
    }

    .grid-cols-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }

    .grid {
      &.grid-cols-2 {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 24px;

        >.form-field {
          min-width: 0;
          overflow: hidden;

          .field-input {
            width: 100%;

            :deep(.t-select),
            :deep(.t-input),
            :deep(.t-input-number) {
              width: 100%;
              min-width: 0;
            }
          }
        }
      }
    }

    .gap-6 {
      gap: 24px;
    }

    .space-y-6>*+* {
      margin-top: 24px;
    }
  }

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
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin: 0 0 24px;

      .section-icon {
        color: #10b981;
        font-size: 16px;
      }
    }

    .row-actions {
      display: flex;
      align-items: center;
      gap: 8px;

      &.collapse-toolbar {
        justify-content: flex-end;
        margin-bottom: 10px;
        padding: 0 4px;
      }
    }

    .add-row-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 700;
      color: #059669;
      padding: 6px 12px;
      background-color: $overlay-emerald-08;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all $transition-fast;

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
      color: #ef4444;
      padding: 6px 12px;
      background-color: $color-danger-bg;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all $transition-fast;

      &:hover:not(:disabled) {
        color: #dc2626;
        background-color: $color-danger-medium;
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
        }

        .field-input {
          width: 100%;

          :deep(.t-select),
          :deep(.t-input),
          :deep(.t-input-number) {
            width: 100%;
          }
        }

        :deep(.t-input) {
          background-color: #f8fafc !important;
          border: 1px solid #f1f5f9 !important;
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
            box-shadow: 0 0 0 2px #10b981 !important;
            outline: none !important;
          }

          &::placeholder {
            color: #94a3b8 !important;
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
            border: 1px solid #f1f5f9 !important;
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
            box-shadow: 0 0 0 2px #10b981 !important;
            outline: none !important;
          }

          .t-select__placeholder,
          .t-select__single-value {
            font-size: 14px !important;
            color: #334155 !important;
            line-height: 22px;
          }

          .t-select__placeholder {
            color: #94a3b8 !important;
          }

          .t-icon {
            color: #94a3b8 !important;
          }
        }

        :deep(.t-input-number) {
          width: 100%;
          background-color: #f8fafc !important;
          border: 1px solid #f1f5f9 !important;
          border-radius: 16px !important;
          min-height: 48px;
          transition: all $transition-fast;

          &:hover:not(.t-is-disabled) {
            border-color: #e2e8f0 !important;
          }

          &.t-is-focused {
            background-color: #fff !important;
            border-color: transparent !important;
            box-shadow: 0 0 0 2px #10b981 !important;
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
            color: #10b981 !important;
            border-radius: 50% !important;
            width: 28px !important;
            height: 28px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            transition: all 0.15s ease;

            &:hover {
              background-color: $overlay-emerald-08 !important;
              color: #059669 !important;
            }
          }

          .t-input__inner {
            background: transparent !important;
            font-size: 14px !important;
            color: #334155 !important;
            padding: 14px 12px !important;
            min-height: 46px;

            &::placeholder {
              color: #94a3b8 !important;
            }
          }
        }

        :deep(.t-radio-group) {
          display: flex;
          gap: 20px;
        }
      }
    }
  }

  // 营养成分 section 特殊样式
  .nutrition-sec {
    .section-header {
      margin-bottom: 12px;
    }

    .section-title {
      margin-bottom: 8px;
    }

    :deep(.t-collapse) {
      background-color: #f8fafc;
      border-radius: 16px;
      padding: 4px;
    }

    :deep(.t-collapse-panel) {
      background-color: #f8fafc;
      border-radius: 12px;
      margin-bottom: 4px;

      &:last-child {
        margin-bottom: 0;
      }

      .t-collapse-panel__header {
        background-color: #f8fafc;
        border-radius: 12px;
        padding: 12px 16px;

        &:hover {
          background-color: #f1f5f9;
        }
      }

      .t-collapse-panel__body {
        background-color: #f8fafc;
        padding: 16px;
        border-radius: 0 0 12px 12px;
      }
    }

    :deep(.t-radio-group) {
      display: flex;
      gap: 8px;

      .t-radio-button {
        background-color: #f8fafc !important;
        border: 1px solid #f1f5f9 !important;
        border-radius: 10px !important;
        transition: all $transition-fast;

        &:hover:not(.t-is-checked) {
          background-color: #f1f5f9 !important;
          border-color: #e2e8f0 !important;
        }

        &.t-is-checked {
          background-color: $overlay-emerald-08 !important;
          border-color: #10b981 !important;
          color: #059669 !important;
        }
      }
    }

    .group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: $font-weight-semibold;
      color: $text-primary;
    }

    .nutrition-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 24px;
      padding: 8px 0;

      @media (max-width: 640px) {
        grid-template-columns: 1fr;
      }

      >.nutrition-field-item {
        min-width: 0;
        overflow: hidden;
      }
    }

    .nutrition-field-item {
      &.nf-full-width {
        grid-column: 1 / -1;
      }

      &.nf-calculated {
        background: linear-gradient(135deg, $overlay-emerald-04, rgba(45, 212, 191, 0.03));
        border: 1px solid $overlay-emerald-12;
        border-radius: 12px;
        padding: 12px 14px;
      }

      .nf-label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: #475569;
        margin-bottom: 6px;
      }

      .nf-calc-wrap {
        display: flex;
        align-items: center;
        gap: 8px;

        .nf-calc-value {
          font-size: 20px;
          font-weight: 800;
          color: #10b981;
          font-family: 'SF Mono', 'Consolas', monospace;
        }

        .nf-calc-formula {
          font-size: 10px;
          color: #94a3b8;
          background: #f1f5f9;
          padding: 3px 8px;
          border-radius: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex-shrink: 0;
          min-width: 0;
        }
      }

      .nf-input-wrap {
        display: flex;
        align-items: center;
        gap: 8px;

        .nf-unit {
          flex-shrink: 0;
          font-size: 11px;
          color: #94a3b8;
          background: #f1f5f9;
          padding: 4px 10px;
          border-radius: 8px;
          white-space: nowrap;
          min-width: 52px;
          text-align: center;
        }
      }
    }

    .nutrition-meta {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #f1f5f9;

      .nm-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
        flex-wrap: nowrap;

        &:last-child {
          margin-bottom: 0;
        }

        .nm-label {
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          white-space: nowrap;
          min-width: 80px;
          flex-shrink: 0;
        }

        :deep(.t-radio-group) {
          flex-wrap: nowrap !important;
          flex: 1;
          min-width: 0;
          background: transparent !important;
        }

        :deep(.t-radio-button) {
          font-size: 11px !important;
          padding: 2px 8px !important;
          height: auto !important;
          line-height: 1.6 !important;
        }
      }
    }
  }

  // 底部操作栏
  .form-actions-bar {
    display: flex;
    align-items: center;
    gap: 12px;

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: none;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all $transition-fast;

      &--outline {
        background: $overlay-emerald-08;
        color: #059669;

        &:hover {
          background: $overlay-emerald-15;
        }
      }

      &--danger {
        background: $color-danger-bg;
        color: #ef4444;

        &:hover {
          background: $color-danger-medium;
        }
      }
    }
  }

  .excel-panel {
    margin-bottom: 16px;
  }

  // ━━ AI 面板样式 ━━
  .ai-panel {
    background: linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%);
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
        background: linear-gradient(135deg, #10b981, #2dd4bf);
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
          color: #94a3b8;
          margin: 4px 0 0;
        }
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
              color: #059669;
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
              width: 28px;
              height: 28px;
              object-fit: contain;
              border-radius: 6px;
            }

            .model-fallback {
              display: none;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              font-weight: 700;
              background: $overlay-emerald-08;
              border-radius: 8px;
              width: 36px;
              height: 36px;
              position: absolute;
              top: 0;
              left: 0;
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
              background: linear-gradient(135deg, #10b981, #059669);
              color: #fff;
              border-radius: 8px;
              font-weight: 700;
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
            color: #94a3b8;
            font-size: 13px;

            .t-icon {
              font-size: 18px;
            }
          }
        }
      }

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
          border-color: rgba(16, 185, 129, 0.5);
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
          color: #10b981;
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

      .parsing-progress {
        padding: 24px;
        background: $overlay-emerald-04;
        border-radius: 24px;
        border: 1px solid rgba(148, 163, 184, 0.18);

        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;

          .progress-status {
            font-size: 12px;
            font-weight: 700;
            color: #64748b;
          }

          .progress-percent {
            font-size: 12px;
            font-family: monospace;
            color: #10b981;
          }
        }

        .progress-bar {
          height: 6px;
          background: rgba(148, 163, 184, 0.2);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 12px;

          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #34d399, #10b981);
            background-size: 200% 100%;
            border-radius: 3px;

            &--indeterminate {
              width: 40% !important;
              animation: progressSlide 1.5s ease-in-out infinite;
            }
          }
        }

        .progress-hint {
          font-size: 10px;
          color: #64748b;
          font-style: italic;
          margin: 0;
        }
      }

      .parse-error {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 14px 18px;
        background: $color-danger-bg;
        border: 1px solid rgba(239, 68, 68, 0.15);
        border-radius: 16px;
        color: #dc2626;
        font-size: 12px;
        font-weight: 600;

        .t-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .error-dismiss {
          margin-left: auto;
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
      }

      .analysis-result {
        .result-card {
          padding: 24px;
          background: $overlay-emerald-04;
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.18);

          .result-title {
            font-size: 12px;
            font-weight: 900;
            color: #10b981;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin: 0 0 16px;
          }

          .result-items {
            margin-bottom: 20px;

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
              }

              .result-value--empty {
                color: #94a3b8;
                font-weight: 500;
              }

              .result-badge {
                padding: 2px 8px;
                background: $overlay-emerald-12;
                color: #059669;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
              }

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
                    background: linear-gradient(90deg, #10b981, #34d399);
                    border-radius: 3px;
                    transition: width 0.6s ease;
                  }
                }

                .confidence-text {
                  font-size: 12px;
                  font-weight: 700;

                  &.conf-high {
                    color: #059669;
                  }

                  &.conf-mid {
                    color: #f59e0b;
                  }

                  &.conf-low {
                    color: #ef4444;
                  }
                }
              }
            }
          }

          .nutrition-materials-table {
            width: 100%;
            margin-bottom: 20px;
            border-collapse: separate;
            border-spacing: 0;
            border-radius: 12px;
            overflow: hidden;
            background: #f8fafc;

            thead {
              th {
                padding: 12px 14px;
                font-size: 11px;
                font-weight: 700;
                color: #94a3b8;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
                white-space: nowrap;

                &.col-name {
                  text-align: left;
                  width: 22%;
                }

                &.col-protein,
                &.col-fat,
                &.col-carb,
                &.col-sodium {
                  text-align: right;
                  width: 13%;
                }

                &.col-status {
                  text-align: center;
                  width: 13%;
                }

                &.col-operation {
                  text-align: right;
                  width: 13%;
                }
              }
            }

            tbody {
              tr {
                &:nth-child(odd) td {
                  background: #ffffff;
                }

                &:nth-child(even) td {
                  background: #fafbfc;
                }
              }

              td {
                padding: 11px 14px;
                font-size: 13px;
                color: #334155;
              }

              .col-name {
                font-weight: 600;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }

              .col-protein,
              .col-fat,
              .col-carb,
              .col-sodium {
                font-weight: 700;
                font-family: ui-monospace, monospace;
                text-align: right;
              }

              .col-status {
                text-align: center;
              }

              .col-operation {
                text-align: right;

                .reg-btn--primary {
                  border-radius: 10px;
                  font-weight: 600;

                  :deep(.t-button) {
                    height: 26px;
                    padding: 0 10px;
                    font-size: 11px;
                  }
                }

                .reg-success {
                  display: inline-flex;
                  align-items: center;
                  gap: 5px;
                  font-size: 12px;
                  font-weight: 600;
                  color: #059669;

                  .t-icon {
                    font-size: 16px;
                  }
                }

                .reg-done {
                  color: #cbd5e1;
                  font-size: 12px;
                }
              }
            }

            .row--diff {
              td {
                background-color: #fff7ed !important;
              }
            }

            .cell--diff {
              position: relative;
            }

            .diff-badge {
              font-size: 10px;
              font-weight: 700;
              margin-left: 4px;

              &.up {
                color: #059669;
              }

              &.down {
                color: #f59e0b;
              }
            }

            .diff-toggle-btn {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              font-size: 11px;
              font-weight: 600;
              padding: 4px 10px;
              background: #fff7ed;
              color: #d97706;
              border: 1px solid #fcd34d;
              border-radius: 8px;
              cursor: pointer;
              transition: all $transition-fast;

              &:hover {
                background: #ffedd5;
                border-color: #fbbf24;
              }
            }

            .diff-detail-row {
              td {
                padding: 0 !important;
                background: transparent !important;
              }
            }

            .diff-panel {
              background: linear-gradient(135deg, #fefce8 0%, #fffbeb 100%);
              border-top: 2px solid #fde68a;
              padding: 16px 20px;
              animation: diffSlideIn 0.25s ease both;
            }

            @keyframes diffSlideIn {
              from {
                opacity: 0;
                transform: translateY(-6px);
              }

              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            .diff-inner-table {
              width: 100%;
              border-collapse: collapse;

              th,
              td {
                padding: 8px 14px;
                text-align: center;
                font-size: 12px;
                border-bottom: 1px solid rgba(253, 230, 138, 0.5);
              }

              th {
                color: #94a3b8;
                font-weight: 700;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                font-size: 10px;
                background: rgba(254, 243, 199, 0.4);
              }

              tbody tr:last-child td {
                border-bottom: none;
              }

              .diff-row--up .diff-val {
                color: #059669;
                font-weight: 700;
              }

              .diff-row--down .diff-val {
                color: #f59e0b;
                font-weight: 700;
              }

              .diff-row--same .diff-val {
                color: #94a3b8;
              }
            }

            .diff-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              margin-top: 14px;
            }

            .diff-btn {
              padding: 8px 28px;
              border-radius: 10px;
              font-weight: 700;
              font-size: 13px;
              cursor: pointer;
              transition: all $transition-fast;
              border: none;

              &--apply {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;

                &:hover {
                  opacity: 0.9;
                  box-shadow: 0 4px 12px $overlay-emerald-30;
                }
              }

              &--keep {
                background: #e2e8f0;
                color: #64748b;

                &:hover {
                  background: #cbd5e1;
                }
              }
            }
          }

          // 可信度分条概述
          .confidence-summary {
            margin-top: 20px;
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
              color: #059669;
              text-transform: uppercase;
              letter-spacing: 0.05em;

              .t-icon {
                font-size: 14px;
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
                background: rgba(217, 119, 6, 0.06);
              }

              &--low {
                background: rgba(239, 68, 68, 0.05);
              }

              .item-label {
                width: 72px;
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
                  height: 6px;
                  border-radius: 3px;
                  background: #e2e8f0;
                  overflow: hidden;

                  .item-fill {
                    height: 100%;
                    border-radius: 3px;
                    transition: width 0.5s ease-out;
                  }
                }

                .item-value {
                  width: 36px;
                  text-align: right;
                  font-size: 11px;
                  font-weight: 800;
                  font-family: ui-monospace, monospace;
                }
              }

              &--high .item-fill {
                background: linear-gradient(90deg, #10b981, #34d399);
              }

              &--high .item-value {
                color: #059669;
              }

              &--medium .item-fill {
                background: linear-gradient(90deg, #d97706, #fbbf24);
              }

              &--medium .item-value {
                color: #b45309;
              }

              &--low .item-fill {
                background: linear-gradient(90deg, #ef4444, #f87171);
              }

              &--low .item-value {
                color: #dc2626;
              }
            }
          }

          .result-actions {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;

            .backfill-btn {
              border-radius: 12px;
              font-weight: 700;
            }

            .secondary-actions {
              display: contents;

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
                  background: #f1f5f9;
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
}

.animate-fade-in {
  animation: fadeInUp 0.4s ease both;
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
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}
</style>

<style lang="scss">
@use '@/assets/styles/variables.scss' as *;

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
      background-color: #f1f5f9 !important;
    }

    &.t-dropdown__item--active {
      color: #059669 !important;
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
      background: #f1f5f9 !important;

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
      font-size: 13px !important;
      font-weight: 600 !important;
      color: #334155 !important;
      flex: 1 !important;
    }

    .reparse-model-check {
      font-size: 14px !important;
      color: #cbd5e1 !important;
      transition: all $transition-fast;

      &--active {
        color: #10b981 !important;
        transform: scale(1.15);
      }
    }
  }
}
</style>
