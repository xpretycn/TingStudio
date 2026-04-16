<template>
  <div class="formula-form">
    <!-- 顶部 Header（还原 FormulaDetail.vue 设计） -->
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
        <button class="header-action-btn secondary" @click="handleBack">
          <t-icon name="close" class="btn-icon" />
          取消
        </button>
        <button class="header-action-btn" @click="handleSubmit({ validateResult: true })">
          <t-icon name="save" class="btn-icon" />
          {{ isEdit ? '保存' : '创建' }}
        </button>
      </div>
    </header>
    <!-- 主内容区域：左右两栏网格 -->
    <main class="form-main">
      <t-form ref="formRef" :data="formData" :rules="rules" scroll-to-first-error @submit="handleSubmit">
        <div class="form-grid">
          <!-- 左侧表单区域 -->
          <div class="form-grid-left animate-fade-in">
            <!-- AI 预填提示 -->
            <t-alert v-if="isAiPrefill" theme="info" closable class="ai-prefill-alert">
              <template #message>已从 AI 解析结果预填配方信息，请核对原料匹配和参数后保存</template>
            </t-alert>

            <!-- 第一个section：基础信息 -->
            <section class="form-section">
              <h3 class="section-title">
                <t-icon name="info-circle" class="section-icon" />
                基础信息录入
              </h3>
              <div class="section-content space-y-6">
                <div class="form-field">
                  <label class="field-label">配方名称 <span class="required">*</span></label>
                  <t-input v-model="formData.name" placeholder="例如：佛手玫苓膏" clearable class="field-input" />
                </div>

                <div class="form-field">
                  <label class="field-label">所属业务员 <span class="required">*</span></label>
                  <t-select v-model="formData.salesmanId" placeholder="请选择业务员" clearable filterable class="field-input">
                    <t-option v-for="salesman in salesmanStore.salesmen" :key="salesman.id" :value="salesman.id"
                      :label="salesman.name" />
                  </t-select>
                </div>

                <div class="grid grid-cols-2 gap-6">
                  <div class="form-field">
                    <label class="field-label">成品重量(g) <span class="required">*</span></label>
                    <t-input-number v-model="formData.finishedWeight" :min="0" :decimal-places="2" placeholder="1000"
                      class="field-input" />
                  </div>
                  <div class="form-field">
                    <label class="field-label">主料含量比系数 <span class="required">*</span></label>
                    <t-input-number v-model="formData.ratioFactor" :min="0.15" :max="0.25" :decimal-places="2"
                      placeholder="0.18" class="field-input" />
                  </div>
                </div>

                <div class="form-field">
                  <label class="field-label">辅料含量比系数 <span class="required">*</span></label>
                  <t-input-number v-model="formData.supplementRatioFactor" :min="0.5" :max="1.5" :decimal-places="2"
                    placeholder="1.0" class="field-input" />
                  <p class="field-help">用于营养成分含量比计算，主料系数范围0.15-0.25，辅料系数范围0.5-1.5</p>
                </div>

                <div class="form-field">
                  <label class="field-label">配方描述</label>
                  <t-textarea v-model="formData.description" placeholder="简述该配方的研发目标和主要特点..."
                    :autosize="{ minRows: 3, maxRows: 6 }" class="field-input" />
                </div>

                <div v-if="isEdit" class="form-field">
                  <label class="field-label">升版原因 <span class="required">*</span></label>
                  <t-textarea v-model="formData.versionReason" placeholder="请输入升版原因（必填）"
                    :autosize="{ minRows: 2, maxRows: 4 }" class="field-input" />
                </div>
              </div>
            </section>

            <!-- 第二个section：原料配比表 -->
            <section class="form-section">
              <div class="section-header">
                <h3 class="section-title">
                  <t-icon name="view-list" class="section-icon" />
                  原料配比表
                </h3>
                <div class="row-actions">
                  <button type="button" class="clear-btn" @click="clearMaterials"
                    :disabled="formData.materials.length === 0">
                    <t-icon name="delete" />
                    清空
                  </button>
                  <button type="button" class="add-row-btn" @click="addMaterial">
                    <t-icon name="add" />
                    添加行
                  </button>
                </div>
              </div>
              <div class="section-content">
                <!-- Excel导入面板 -->
                <ExcelImportPanel @import="handleExcelImport" class="excel-panel" />

                <div class="materials-table-wrapper">
                  <table class="materials-table">
                    <thead>
                      <tr>
                        <th>原料名称</th>
                        <th class="qty-header">数量</th>
                        <th class="w-16">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, index) in formData.materials" :key="index" class="material-row">
                        <td>
                          <t-select v-model="item.materialId" placeholder="搜索或选择原料" clearable filterable
                            :loading="materialSelectLoading" class="material-select" :filter-icon="() => null"
                            @search="handleMaterialSearch" @change="handleMaterialChange(index)"
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
                          <t-input-number v-model="item.quantity" :min="0" placeholder="数量" class="quantity-input" />
                        </td>
                        <td class="text-center">
                          <t-button variant="text" size="small" @click="removeMaterial(index)" class="delete-btn">
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
                      </tr>
                    </tfoot>
                  </table>

                  <div class="empty-materials">
                    <button type="button" class="add-first-btn" @click="addMaterial">
                      <t-icon name="add-rectangle" />
                      继续添加配方原料
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
          <!-- 右侧 AI 助手区域 -->
          <div class="form-grid-right animate-fade-in" style="animation-delay: 0.1s;">
            <!-- AI 智能解析卡片 -->
            <section class="ai-panel">
              <div class="ai-panel-bg"></div>
              <div class="ai-panel-content">
                <div class="ai-header">
                  <div class="ai-icon">
                    <t-icon name="cloud" />
                  </div>
                  <div class="ai-title-group">
                    <h3 class="ai-title">AI 智能配方解析</h3>
                    <p class="ai-subtitle">支持识别 Excel、图片及手写草稿</p>
                  </div>
                </div>

                <div class="ai-body">
                  <!-- 模型选择 -->
                  <div ref="modelSelectRef" class="model-select">
                    <label class="model-label">选择 AI 模型</label>
                    <div class="model-grid">
                      <template v-if="aiStore.models.length > 0">
                        <button v-for="model in aiStore.models" :key="model.provider" type="button" class="model-btn"
                          :class="{ active: aiStore.selectedModel === model.provider }"
                          @click="selectModel(model.provider)">
                          <div class="model-logo-wrap">
                            <img :src="getModelLogo(model)" :alt="model.name" class="model-logo"
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

                  <!-- 文件上传区域 -->
                  <div v-if="!aiStore.parseLoading && !aiStore.parseResult" class="upload-zone"
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

                  <!-- 解析进度 -->
                  <div v-if="aiStore.parseLoading" class="parsing-progress">
                    <div class="progress-header">
                      <span class="progress-status">AI 正在解析文件内容...</span>
                      <span class="progress-percent">{{ parseProgressText }}</span>
                    </div>
                    <div class="progress-bar">
                      <div class="progress-fill progress-fill--indeterminate"></div>
                    </div>
                    <p class="progress-hint">{{ parseProgressHint }}</p>
                  </div>

                  <!-- 解析错误 -->
                  <div v-if="aiStore.parseError" class="parse-error">
                    <t-icon name="error-circle" />
                    <span>{{ aiStore.parseError }}</span>
                  </div>

                  <!-- 解析结果 -->
                  <div ref="resultRef" v-if="aiStore.parseResult" class="analysis-result">
                    <div class="result-card">
                      <h4 class="result-title">解析结果预览</h4>
                      <div class="result-items">
                        <div class="result-item">
                          <span class="result-label">配方名称</span>
                          <span class="result-value">{{ aiStore.parseResult.name || '未识别' }}</span>
                        </div>
                        <div class="result-item">
                          <span class="result-label">配方时间</span>
                          <span class="result-value"
                            :class="{ 'result-value--empty': !aiStore.parseResult.formulaDate }">
                            {{ aiStore.parseResult.formulaDate || '未识别' }}
                          </span>
                        </div>
                        <div class="result-item">
                          <span class="result-label">业务员</span>
                          <span class="result-value"
                            :class="{ 'result-value--empty': !aiStore.parseResult.salesmanName }">
                            {{ aiStore.parseResult.salesmanName || '未识别' }}
                          </span>
                        </div>
                        <div class="result-item">
                          <span class="result-label">成品重量</span>
                          <span class="result-value"
                            :class="{ 'result-value--empty': !aiStore.parseResult.finishedWeight }">
                            {{ aiStore.parseResult.finishedWeight ? aiStore.parseResult.finishedWeight + 'g' : '未识别' }}
                          </span>
                        </div>
                        <div v-if="aiStore.parseResult.confidence != null" class="result-item">
                          <span class="result-label">解析可信度</span>
                          <div class="confidence-wrap">
                            <div class="confidence-bar">
                              <div class="confidence-fill"
                                :style="{ width: (aiStore.parseResult.confidence * 100) + '%' }"></div>
                            </div>
                            <span class="confidence-text" :class="getConfidenceLevel(aiStore.parseResult.confidence)">
                              {{ (aiStore.parseResult.confidence * 100).toFixed(0) }}%
                            </span>
                          </div>
                        </div>
                        <div v-if="aiStore.parseResult.usage" class="result-item">
                          <span class="result-label">Token 用量</span>
                          <span class="result-badge">{{ aiStore.parseResult.usage.totalTokens }}</span>
                        </div>
                      </div>

                      <!-- 原料列表 -->
                      <div v-if="aiStore.parseResult.materials?.length" class="materials-table">
                        <div class="materials-header">
                          <span class="col-name">原料名称</span>
                          <span class="col-qty">用量</span>
                          <span class="col-unit">单位</span>
                          <span class="col-status">匹配状态</span>
                        </div>
                        <div v-for="(m, idx) in aiStore.parseResult.materials" :key="idx" class="materials-row">
                          <span class="col-name">{{ m.name }}</span>
                          <span class="col-qty">{{ m.quantity }}</span>
                          <span class="col-unit">{{ m.unit || 'g' }}</span>
                          <span class="col-status">
                            <t-tag v-if="m.matched" theme="success" variant="light" size="small">已匹配</t-tag>
                            <t-tag v-else theme="warning" variant="light" size="small">未匹配</t-tag>
                          </span>
                        </div>
                      </div>

                      <!-- 可信度分条概述 -->
                      <div v-if="getConfidenceItems().length" class="confidence-summary">
                        <div class="summary-header">
                          <t-icon name="info-circle" />
                          <span>解析可信度概览</span>
                        </div>
                        <!-- 解析可信度概览： -->
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

                      <div class="result-actions">
                        <t-button theme="success" block @click="backfillData" class="backfill-btn">
                          <template #icon>
                            <t-icon name="check-circle" />
                          </template>
                          确认并回填数据
                        </t-button>
                        <div class="secondary-actions">
                          <button type="button" class="action-btn action-btn--default" @click.stop="resetUpload">
                            <t-icon name="refresh" />
                            重新选择文件
                          </button>
                          <button type="button" class="action-btn action-btn--danger" @click.stop="clearResult">
                            <t-icon name="delete" />
                            清空
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
                                @click="(ctx: { value: string; }) => handleReparseWithModel({ value: ctx.value })">
                                <div class="reparse-model-option">
                                  <div class="reparse-model-logo">
                                    <img :src="getModelLogo(model)" :alt="model.name"
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
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- 操作提示卡片 -->
            <section class="tips-panel">
              <h3 class="tips-title">操作提示</h3>
              <ul class="tips-list">
                <li class="tip-item">
                  <t-icon name="lightbulb" class="tip-icon" />
                  <span>点击「下载模板」获取Excel模板文件</span>
                </li>
                <li class="tip-item">
                  <t-icon name="lightbulb" class="tip-icon" />
                  <span>点击「上传文件」或拖拽导入已填写的Excel文件</span>
                </li>
                <li class="tip-item">
                  <t-icon name="lightbulb" class="tip-icon" />
                  <span>解析成功后自动填充配方原料清单</span>
                </li>
                <li class="tip-item">
                  <t-icon name="lightbulb" class="tip-icon" />
                  <span>上传清晰的 Excel 模版可以获得 100% 的解析准确率</span>
                </li>
                <li class="tip-item">
                  <t-icon name="lightbulb" class="tip-icon" />
                  <span>合计比例必须为 100% 才能正式提交版本</span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </t-form>
    </main>
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
import type { MaterialItem } from '@/api/formula';
import type { ParsedMaterial } from '@/api/excelImport';
import ExcelImportPanel from '@/components/ExcelImportPanel.vue';

const router = useRouter();
const route = useRoute();
const formulaStore = useFormulaStore();
const salesmanStore = useSalesmanStore();
const materialStore = useMaterialStore();
const aiStore = useAiStore();

const formRef = ref<any>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const modelSelectRef = ref<HTMLElement | null>(null);
const resultRef = ref<HTMLElement | null>(null);
const loading = ref(false);
const materialSelectLoading = ref(false);
const materialSearchKeyword = ref('');

// AI 相关状态
const selectedFile = ref<File | null>(null);
const isDragOver = ref(false);
const parseStartTime = ref<number>(0);
const parseProgressStage = ref(0);

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
const isImageFile = computed(() => {
  if (!selectedFile.value) return false;
  const ext = '.' + selectedFile.value.name.split('.').pop()?.toLowerCase();
  return IMAGE_EXTS.includes(ext);
});

// 计算原料总数量
const totalQuantity = computed(() => {
  return formData.materials.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0).toFixed(2);
});

// 解析进度反馈
const parseProgressText = computed(() => {
  if (!aiStore.parseLoading) return '';
  const elapsed = Date.now() - parseStartTime.value;
  if (elapsed < 2000) return '连接 AI 服务...';
  if (elapsed < 5000) return '上传文件中...';
  if (elapsed < 10000) return 'AI 分析中...';
  if (elapsed < 20000) return '提取配方数据...';
  return '即将完成...';
});

const parseProgressHint = computed(() => {
  const hints = [
    '正在识别文档结构与内容',
    '提取原料名称与用量信息',
    '匹配系统原料数据库',
    '计算配方比例与权重',
    '生成结构化数据'
  ];
  if (!aiStore.parseLoading) return '';
  const stage = Math.floor((Date.now() - parseStartTime.value) / 4000) % hints.length;
  return hints[stage] + '...';
});

// 过滤原料列表：排除其他行已选的原料，防止重复添加
const getFilteredMaterials = (currentIndex: number) => {
  const list = materialStore.allMaterials ?? [];
  const selectedIds = formData.materials
    .map((m: any, i: number) => i !== currentIndex && m.materialId ? m.materialId : null)
    .filter(Boolean);
  let result = list;
  if (selectedIds.length > 0) {
    const idSet = new Set(selectedIds);
    result = list.filter(m => !idSet.has(m.id));
  }
  if (!materialSearchKeyword.value) return result;
  const kw = materialSearchKeyword.value.toLowerCase();
  return result.filter(
    m => m.name.toLowerCase().includes(kw) || m.code.toLowerCase().includes(kw)
  );
};

const isEdit = computed(() => !!route.params.id);

// AI 预填标志
const isAiPrefill = ref(false);

const formData = reactive<any>({
  name: '',
  salesmanId: '',
  materials: [],
  finishedWeight: 0,
  ratioFactor: 0.18,
  supplementRatioFactor: 1.0,
  description: '',
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
  versionReason: [{ required: true, message: '请填写升版原因', trigger: 'blur' }],
};

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

const clearMaterials = () => {
  if (formData.materials.length === 0) return;
  formData.materials.splice(0);
};

const handleMaterialChange = (index: number) => {
  const item = formData.materials[index];
  const material = materialStore.allMaterials.find(m => m.id === item.materialId);
  if (material) {
    item.materialName = material.name;
  }
};

const handleMaterialSearch = (keyword: string) => {
  materialSearchKeyword.value = keyword;
};

const handleMaterialFocus = () => {
  if (!materialStore.allMaterials || materialStore.allMaterials.length === 0) {
    materialSelectLoading.value = true;
    materialStore.fetchAllForSelect().finally(() => {
      materialSelectLoading.value = false;
    });
  }
};

// 处理Excel导入的原料数据
const handleExcelImport = (materials: ParsedMaterial[]) => {
  // 清空现有原料清单，使用导入的数据
  formData.materials.splice(0, formData.materials.length, ...materials.map(m => ({
    materialId: m.materialId,
    materialName: m.materialName,
    quantity: m.quantity,
  })));
  MessagePlugin.success(`已导入 ${materials.length} 条原料`);
};

const handleSubmit = async ({ validateResult }: any) => {
  if (validateResult === true) {
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
        router.push('/formulas');
      } else {
        MessagePlugin.error(result.message || '操作失败');
      }
    } finally {
      loading.value = false;
    }
  }
};

const handleBack = () => {
  router.push('/formulas');
};

// AI 模型选择
const selectModel = (model: string) => {
  aiStore.selectedModel = model;
};

const MODEL_LOGO_MAP: Record<string, string> = {
  openai: 'openai',
  gpt: 'openai',
  chatgpt: 'openai',
  anthropic: 'claude',
  claude: 'claude',
  google: 'google',
  gemini: 'google',
  deepseek: 'deepseek',
  qwen: 'qwen',
  tongyi: 'qwen',
  '通义千问': 'qwen',
  zhipu: 'zhipu',
  chatglm: 'zhipu',
  智谱: 'zhipu',
  glm: 'zhipu',
  baidu: 'baidu',
  wenxin: 'baidu',
  文心: 'baidu',
  doubao: 'bytedance',
  豆包: 'bytedance',
  bytedance: 'bytedance',
  moonshot: 'moonshot',
  kimi: 'moonshot',
  月之暗面: 'moonshot',
  minimax: 'minimax',
  hunyuan: 'tencent',
  腾讯: 'tencent',
};

const FALLBACK_ICONS: Record<string, { letter: string; color: string; }> = {
  openai: { letter: 'O', color: '#10a37f' },
  claude: { letter: 'C', color: '#d97757' },
  google: { letter: 'G', color: '#4285f4' },
  deepseek: { letter: 'D', color: '#4b6bfb' },
  qwen: { letter: 'Q', color: '#6366f1' },
  alibabacloud: { letter: 'Q', color: '#ff6a00' },
  zhipu: { letter: 'Z', color: '#4268fa' },
  baidu: { letter: 'B', color: '#2932e1' },
  bytedance: { letter: 'D', color: '#25f4ee' },
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
      if (slug.startsWith('http')) {
        return key;
      }
      return slug;
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

const handleLogoError = (e: Event, model: any) => {
  const img = e.target as HTMLImageElement;
  img.style.display = 'none';
  const wrap = img.parentElement;
  if (wrap) {
    const fallback = wrap.querySelector('.model-fallback');
    if (fallback) fallback.style.display = 'flex';
  }
};

// 文件上传相关方法
const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const handleDragOver = () => {
  isDragOver.value = true;
};

const handleDragLeave = () => {
  isDragOver.value = false;
};

const handleDrop = (e: DragEvent) => {
  isDragOver.value = false;
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    handleFileSelect(files[0]);
  }
};

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (files && files.length > 0) {
    handleFileSelect(files[0]);
  }
};

const handleFileSelect = (file: File) => {
  selectedFile.value = file;
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (IMAGE_EXTS.includes(ext)) {
    const currentModel = aiStore.models.find(m => m.provider === aiStore.selectedModel);
    if (!currentModel?.supportsVision) {
      const visionModel = aiStore.models.find(m => m.supportsVision);
      if (visionModel) aiStore.selectedModel = visionModel.provider;
    }
  }
  handleParse();
};

const handleParse = async () => {
  if (!selectedFile.value) {
    MessagePlugin.warning('请先选择要解析的文件');
    return;
  }
  if (!aiStore.selectedModel) {
    MessagePlugin.warning('请先选择 AI 模型');
    return;
  }
  parseStartTime.value = Date.now();
  await aiStore.parseFormula(selectedFile.value);
};

// 回填数据到表单
const backfillData = () => {
  const data = aiStore.parseResult;
  if (!data?.name) return;

  formData.name = data.name;
  if (data.description) formData.description = data.description;
  if (data.finishedWeight) formData.finishedWeight = data.finishedWeight;

  if (data.salesmanName) {
    const matched = salesmanStore.salesmen.find(
      (s: any) => s.name === data.salesmanName || s.name.includes(data.salesmanName) || data.salesmanName.includes(s.name)
    );
    if (matched) {
      formData.salesmanId = matched.id;
    }
  }

  formData.materials.splice(0, formData.materials.length);
  data.materials.forEach((m: any) => {
    formData.materials.push({
      materialId: m.materialId || '',
      materialName: m.name,
      quantity: m.quantity
    });
  });

  MessagePlugin.success('AI 解析数据已回填到表单');
  isAiPrefill.value = true;
  nextTick(() => {
    const alertEl = document.querySelector('.ai-prefill-alert');
    if (alertEl) {
      alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      alertEl.classList.add('alert-flash');
      setTimeout(() => {
        alertEl.classList.remove('alert-flash');
      }, 5000);
    }
  });
};

// 重置上传
const resetUpload = () => {
  selectedFile.value = null;
  aiStore.clearParseResult();
  if (fileInputRef.value) fileInputRef.value = '';
  nextTick(() => {
    modelSelectRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
};

// 清空结果
const clearResult = () => {
  selectedFile.value = null;
  aiStore.clearParseResult();
  if (fileInputRef.value) fileInputRef.value = '';
};

// 重新解析
const handleReparseWithModel = (data: { value: string; }) => {
  aiStore.selectedModel = data.value;
  aiStore.clearParseResult();
  if (selectedFile.value) {
    nextTick(() => {
      const progressEl = document.querySelector('.parsing-progress');
      if (progressEl) {
        progressEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        resultRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    handleParse();
  }
};

// 获取可信度等级
const getConfidenceLevel = (confidence: number) => {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
};

const getConfidenceItems = () => {
  const data = aiStore.parseResult;
  if (!data) return [];
  const items: { label: string; value: number; level: string; }[] = [];
  const baseConf = data.confidence != null ? Math.round(data.confidence * 100) : null;
  if (data.formulaDate) {
    const v = baseConf ?? 100;
    items.push({ label: '配方时间', value: v, level: getConfidenceLevel(v / 100) });
  } else {
    items.push({ label: '配方时间', value: 0, level: 'low' });
  }
  if (data.salesmanName) {
    const v = baseConf ?? 100;
    items.push({ label: '业务员', value: v, level: getConfidenceLevel(v / 100) });
  } else {
    items.push({ label: '业务员', value: 0, level: 'low' });
  }
  if (data.materials?.length) {
    const matchedCount = data.materials.filter((m: any) => m.matched).length;
    const v = matchedCount > 0 ? Math.round((matchedCount / data.materials.length) * 100) : 0;
    items.push({ label: '原料清单', value: v, level: getConfidenceLevel(v / 100) });
  }
  if (data.finishedWeight) {
    const v = baseConf ?? 100;
    items.push({ label: '成品重量', value: v, level: getConfidenceLevel(v / 100) });
  }
  return items;
};

onMounted(async () => {
  await Promise.all([
    salesmanStore.fetchSalesmen(),
    materialStore.fetchAllForSelect(),
    aiStore.fetchModels()
  ]);

  if (!aiStore.selectedModel && aiStore.models.length > 0) {
    aiStore.selectedModel = aiStore.models[0].provider;
  }

  const id = route.params.id as string;
  if (isEdit.value && id) {
    const formula = await formulaStore.getFormula(id);
    if (formula) {
      const allMats = materialStore.allMaterials ?? [];
      const materials = (formula.materials || []).map((m: any) => {
        // 校正 materialId：若当前原料列表中找不到该 ID，则通过名称匹配
        let materialId = m.materialId;
        if (!allMats.find(mat => mat.id === materialId) && m.materialName) {
          const matched = allMats.find(mat => mat.name === m.materialName);
          if (matched) materialId = matched.id;
        }
        return { materialId, materialName: m.materialName, quantity: m.quantity };
      });
      Object.assign(formData, {
        name: formula.name,
        salesmanId: formula.salesmanId,
        materials,
        finishedWeight: formula.finishedWeight || 0,
        ratioFactor: formula.ratioFactor ?? 0.18,
        supplementRatioFactor: formula.supplementRatioFactor ?? 1.0,
        description: formula.description || ''
      });
    }
  }

  // AI 预填数据（从 route.query 读取）
  if (route.query.ai === 'true') {
    try {
      const materials = JSON.parse(route.query.materials as string);
      formData.name = (route.query.name as string) || '';
      formData.materials = materials.map((m: any) => ({
        materialId: m.materialId || '',
        materialName: m.name || '',
        quantity: m.quantity || 0,
      }));
      if (route.query.finishedWeight) {
        formData.finishedWeight = Number(route.query.finishedWeight) || 0;
      }
      // AI 解析的业务员姓名 → 匹配 salesmanId
      if (route.query.salesmanName) {
        const salesmanName = route.query.salesmanName as string;
        const matched = salesmanStore.salesmen.find(
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
        transition: all 0.2s ease; // transition-all
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
        gap: 6px; // 增加面包屑与标题间距

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
        transition: all 0.2s ease; // transition-all

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

        // 次要按钮样式
        &.secondary {
          background-color: #f1f5f9; // slate-100
          color: #64748b; // slate-500
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

          &:hover {
            background-color: #e2e8f0; // slate-200
            color: #475569; // slate-600
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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

    // ═══ 两栏 Grid 布局（参照 new-recipe.html grid grid-cols-12 gap-8）═══
    .form-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 32px;

      @media (max-width: 1023px) {
        grid-template-columns: 1fr;
      }
    }

    .form-grid-left {
      grid-column: span 7;
      display: flex;
      flex-direction: column;
      gap: 32px;

      @media (max-width: 1023px) {
        grid-column: span 12;
      }
    }

    .form-grid-right {
      grid-column: span 5;
      display: flex;
      flex-direction: column;
      gap: 32px;

      @media (max-width: 1023px) {
        grid-column: span 12;
      }
    }

    // 内部嵌套的2列grid（表单字段用）
    .grid-cols-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }

    .gap-6 {
      gap: 24px;
    }

    .space-y-8>*+* {
      margin-top: 32px;
    }

    .space-y-6>*+* {
      margin-top: 24px;
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
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
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
    }

    .add-row-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 700;
      color: #059669;
      padding: 6px 12px;
      background-color: rgba(16, 185, 129, 0.08);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;

      .t-icon {
        font-size: 14px;
      }

      &:hover {
        color: #047857;
        background-color: rgba(16, 185, 129, 0.15);
      }
    }

    .clear-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 700;
      color: #059669;
      padding: 6px 12px;
      background-color: rgba(16, 185, 129, 0.08);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;

      .t-icon {
        font-size: 14px;
      }

      &:hover:not(:disabled) {
        color: #047857;
        background-color: rgba(16, 185, 129, 0.15);
      }

      &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
    }

    .section-content {
      .form-field {
        .field-label {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: #334155;
          margin-bottom: 8px;

          .required {
            color: #f43f5e;
          }
        }

        .field-input {
          width: 100%;
        }

        .field-help {
          margin-top: 4px;
          font-size: 12px;
          color: #64748b;
        }

        // ═══ 输入框 — 参照 new-recipe.html 样式 ═══
        // w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700
        // focus:ring-2 focus:ring-emerald-500 focus:bg-white

        :deep(.t-input) {
          background-color: #f8fafc !important;
          border: 1px solid #f1f5f9 !important;
          border-radius: 16px !important;
          padding: 14px 20px !important;
          min-height: 48px;
          font-size: 14px !important;
          color: #334155 !important;
          transition: all 0.2s ease;

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
            transition: all 0.2s ease;

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
          transition: all 0.2s ease;

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
              background-color: rgba(16, 185, 129, 0.08) !important;
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

        :deep(.t-textarea) {
          .t-textarea__inner {
            background-color: #f8fafc !important;
            border: 1px solid #f1f5f9 !important;
            border-radius: 16px !important;
            padding: 14px 20px !important;
            font-size: 14px !important;
            color: #334155 !important;
            transition: all 0.2s ease;

            &:hover:not(:focus) {
              border-color: #e2e8f0 !important;
            }

            &:focus {
              background-color: #fff !important;
              border-color: transparent !important;
              box-shadow: 0 0 0 2px #10b981 !important;
              outline: none !important;
            }

            &::placeholder {
              color: #94a3b8 !important;
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
            padding: 8px 16px;
            font-size: 10px;
            font-weight: 900;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            text-align: left;

            &.w-16 {
              width: 64px;
              text-align: center;
            }

            &.qty-header {
              width: 150px;
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
            padding: 12px 16px;
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
              width: 150px;
            }
          }
        }
      }

      tfoot {
        .total-row {
          background: rgba(16, 185, 129, 0.05);
          border-radius: 12px;

          td {
            padding: 16px;
            color: #059669;

            &:first-child {
              border-radius: 12px 0 0 12px;
            }

            &:last-child {
              border-radius: 0 12px 12px 0;
            }
          }
        }
      }
    }

    .empty-materials {
      padding: 12px 0 0;
      background-color: rgba(248, 250, 252, 0.2);
      border-top: 1px solid #f8fafc;

      .add-first-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        padding: 16px 0;
        font-size: 14px;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        background-color: transparent;
        border: 2px dashed #e2e8f0;
        border-radius: 24px;
        cursor: pointer;
        transition: all 0.2s ease;

        .t-icon {
          font-size: 20px;
          color: #94a3b8;
        }

        &:hover {
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.4);
          background-color: #fff;

          .t-icon {
            color: #10b981;
          }
        }
      }
    }
  }

  .material-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .excel-panel {
    margin-bottom: 16px;
  }

  // AI 面板样式
  .ai-panel {
    background: linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%);
    padding: 32px;
    border-radius: 2.5rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(16, 185, 129, 0.06);
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
      background: radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%);
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
            background: rgba(16, 185, 129, 0.04);
            border: 1px solid rgba(148, 163, 184, 0.18);
            border-radius: 16px;
            color: #64748b;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.25s ease;
            opacity: 0.75;

            &:hover {
              opacity: 1;
              background: rgba(16, 185, 129, 0.08);
              border-color: rgba(16, 185, 129, 0.25);
              transform: translateY(-1px);
            }

            &.active {
              background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(45, 212, 191, 0.08) 100%);
              border-color: rgba(16, 185, 129, 0.35);
              opacity: 1;
              color: #059669;
              box-shadow: 0 4px 12px -2px rgba(16, 185, 129, 0.12);
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
              background: rgba(16, 185, 129, 0.08);
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
              background: linear-gradient(135deg, #10b981, #059669);
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
            color: #94a3b8;
            font-size: 13px;

            .t-icon {
              font-size: 18px;
            }
          }
        }
      }

      // 上传区域
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
        transition: all 0.2s ease;

        &:hover,
        &.drag-over {
          border-color: rgba(16, 185, 129, 0.5);
          background: rgba(16, 185, 129, 0.04);
        }

        .upload-icon {
          width: 64px;
          height: 64px;
          background: rgba(16, 185, 129, 0.08);
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

      // 解析进度
      .parsing-progress {
        padding: 24px;
        background: rgba(16, 185, 129, 0.04);
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

      // 解析错误
      .parse-error {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 14px 18px;
        background: rgba(239, 68, 68, 0.06);
        border: 1px solid rgba(239, 68, 68, 0.15);
        border-radius: 16px;
        color: #dc2626;
        font-size: 12px;
        font-weight: 600;

        .t-icon {
          font-size: 18px;
          flex-shrink: 0;
        }
      }

      // 解析结果
      .analysis-result {
        .result-card {
          padding: 24px;
          background: rgba(16, 185, 129, 0.04);
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
                  color: #94a3b8;
                  font-weight: 500;
                }
              }

              .result-badge {
                padding: 2px 8px;
                background: rgba(16, 185, 129, 0.12);
                color: #059669;
                border-radius: 4px;
                font-size: 11px;
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
                  background: linear-gradient(90deg, #10b981, #34d399);
                  border-radius: 3px;
                  transition: width 0.5s ease;
                }
              }

              .confidence-text {
                font-size: 12px;
                font-weight: 800;

                &.high {
                  color: #059669;
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
                background: #f1f5f9;

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
                color: #10b981;

                &--active {
                  background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.08));
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
              background: rgba(16, 185, 129, 0.08);
              padding: 10px 14px;
              font-size: 11px;
              font-weight: 800;
              color: #059669;
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
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(59, 130, 246, 0.03) 100%);
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
                background: rgba(16, 185, 129, 0.06);
              }

              &--medium {
                background: rgba(217, 119, 6, 0.06);
              }

              &--low {
                background: rgba(239, 68, 68, 0.06);
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
                background: linear-gradient(90deg, #10b981, #34d399);
              }

              &--high .item-value {
                color: #059669;
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

          .result-actions {
            .backfill-btn {
              margin-bottom: 12px;
              border-radius: 14px;
              font-weight: 700;
              font-size: 13px;
              padding: 10px 20px;
              height: auto;
              box-shadow: 0 4px 12px -2px rgba(16, 185, 129, 0.2);
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
                transition: all 0.2s ease;
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

  // 提示面板
  .tips-panel {
    background: #fff;
    padding: 32px;
    border-radius: 2.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    border: 1px solid #f8fafc;
    animation: fadeInUp 0.5s ease both;
    animation-delay: 0.2s;

    .tips-title {
      font-size: 14px;
      font-weight: 700;
      color: #94a3b8;
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
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.18), 0 2px 14px rgba(16, 185, 129, 0.12);
      border-color: #10b981;
    }

    35% {
      transform: scale(1.013);
      opacity: 1;
      box-shadow: 0 0 0 10px rgba(16, 185, 129, 0.12), 0 0 0 22px rgba(16, 185, 129, 0.06), 0 4px 24px rgba(16, 185, 129, 0.18);
      border-color: #10b981;
    }

    55% {
      transform: scale(1.01);
      opacity: 0.92;
      box-shadow: 0 0 0 20px rgba(16, 185, 129, 0.06), 0 0 0 34px rgba(16, 185, 129, 0.03), 0 3px 16px rgba(16, 185, 129, 0.10);
      border-color: rgba(16, 185, 129, 0.55);
    }

    75% {
      transform: scale(1.005);
      opacity: 0.96;
      box-shadow: 0 0 0 28px rgba(16, 185, 129, 0.02), 0 2px 10px rgba(16, 185, 129, 0.07);
      border-color: rgba(16, 185, 129, 0.25);
    }

    90% {
      transform: scale(1.002);
      opacity: 0.98;
      box-shadow: 0 0 0 36px transparent, 0 1px 6px rgba(16, 185, 129, 0.05);
      border-color: rgba(16, 185, 129, 0.08);
    }

    100% {
      transform: scale(1);
      opacity: 1;
      box-shadow: 0 0 0 0 transparent;
      border-color: transparent;
    }
  }
}
</style>

<style lang="scss">
.reparse-dropdown-popup {
  min-width: 160px !important;
  width: auto !important;
  border: none !important;
  outline: none !important;
  box-shadow: 0 6px 24px rgba(16, 185, 129, 0.28), 0 2px 8px rgba(16, 185, 129, 0.12) !important;

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
      color: #10b981 !important;
    }
  }
}
</style>

<style lang="scss">
.formula-form .materials-table-wrapper {

  // ── 选择框（原料名称）──
  .t-select {

    .t-input,
    .t-select__wrap {
      border-color: rgba(16, 185, 129, 0.25) !important;
      transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
    }

    &:hover:not(.t-is-disabled) .t-input,
    &:hover:not(.t-is-disabled) .t-select__wrap {
      border-color: rgba(16, 185, 129, 0.4) !important;
    }
  }

  .t-select .t-input,
  .t-select .t-input.t-is-focused,
  .t-select .t-input:focus-within {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12) !important;
  }

  .t-select.t-is-focused .t-input,
  .t-select.t-is-focused .t-select__wrap,
  .t-select.t-is-focused .t-input.t-is-focused {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12) !important;
  }

  // ── 数量输入框 ──
  .t-input-number {
    border-color: rgba(16, 185, 129, 0.25) !important;
    transition: border-color 0.2s ease, box-shadow 0.2s ease !important;

    &:hover:not(.t-is-disabled) {
      border-color: rgba(16, 185, 129, 0.4) !important;
    }
  }

  .t-input-number .t-input,
  .t-input-number .t-input.t-is-focused,
  .t-input-number .t-input:focus-within {
    border-color: #10b981 !important;
    box-shadow: none !important;
  }

  .t-input-number.t-is-focused,
  .t-input-number.t-is-focused .t-input,
  .t-input-number.t-is-focused .t-input.t-is-focused {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12) !important;
  }

  .t-input-number__decrease,
  .t-input-number__increase {
    color: #10b981 !important;
    border-color: rgba(16, 185, 129, 0.3) !important;

    &:hover {
      background: rgba(16, 185, 129, 0.1) !important;
      color: #059669 !important;
      border-color: rgba(16, 185, 129, 0.5) !important;
    }
  }

  .t-input-number__increase {
    border-left-color: rgba(16, 185, 129, 0.3) !important;
  }

  .t-input-number__decrease {
    border-right-color: rgba(16, 185, 129, 0.3) !important;
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
      color: #10b981 !important;
      background: rgba(16, 185, 129, 0.08) !important;
      border: none !important;

      .t-button__text,
      .t-button__icon,
      .t-icon {
        color: #10b981 !important;
      }
    }
  }
}
</style>
