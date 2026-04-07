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
        <div class="grid grid-cols-12 gap-8">
          <!-- 左侧表单区域 -->
          <div class="col-span-12 lg:col-span-7 space-y-8">
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
                  <t-input v-model="formData.name" placeholder="例如：草莓酸奶燕麦能量棒" clearable class="field-input" />
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
                    <label class="field-label">主料含量比系数</label>
                    <t-input-number v-model="formData.ratioFactor" :min="0.15" :max="0.25" :decimal-places="2"
                      placeholder="0.18" class="field-input" />
                  </div>
                </div>

                <div class="form-field">
                  <label class="field-label">辅料含量比系数</label>
                  <t-input-number v-model="formData.supplementRatioFactor" :min="0.5" :max="1.5" :decimal-places="2"
                    placeholder="1.0" class="field-input" style="width: 50%;" />
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
                  <t-icon name="list" class="section-icon" />
                  原料配比表
                </h3>
                <t-button theme="primary" variant="text" size="small" @click="addMaterial" class="add-row-btn">
                  <template #icon>
                    <t-icon name="add" />
                  </template>
                  添加行
                </t-button>
              </div>
              <div class="section-content">
                <!-- Excel导入面板 -->
                <ExcelImportPanel @import="handleExcelImport" class="excel-panel" />

                <div class="materials-table-wrapper">
                  <table class="materials-table">
                    <thead>
                      <tr>
                        <th>原料名称</th>
                        <th>数量</th>
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
                          <t-button theme="danger" variant="text" size="small" @click="removeMaterial(index)"
                            class="delete-btn">
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

                  <div v-if="formData.materials.length === 0" class="empty-materials">
                    <t-button theme="default" variant="dashed" @click="addMaterial" class="add-first-btn">
                      <template #icon>
                        <t-icon name="add" />
                      </template>
                      点击添加第一行原料
                    </t-button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- 右侧 AI 助手区域 -->
          <div class="col-span-12 lg:col-span-5 space-y-8">
            <!-- AI 智能解析卡片 -->
            <section class="ai-panel">
              <div class="ai-panel-bg"></div>
              <div class="ai-panel-content">
                <div class="ai-header">
                  <div class="ai-icon">
                    <t-icon name="sparkles" />
                  </div>
                  <div class="ai-title-group">
                    <h3 class="ai-title">AI 智能配方解析</h3>
                    <p class="ai-subtitle">支持识别 Excel、图片及手写草稿</p>
                  </div>
                </div>

                <div class="ai-body">
                  <!-- 模型选择 -->
                  <div class="model-select">
                    <label class="model-label">选择 AI 模型</label>
                    <div class="model-grid">
                      <button type="button" class="model-btn" :class="{ active: currentModel === 'DeepFormulate' }"
                        @click="selectModel('DeepFormulate')">
                        <t-icon name="brain" class="model-icon" />
                        <span>DeepFormulate v2</span>
                      </button>
                      <button type="button" class="model-btn" :class="{ active: currentModel === 'Standard-Parse' }"
                        @click="selectModel('Standard-Parse')">
                        <t-icon name="cpu" class="model-icon" />
                        <span>通用 OCR 解析</span>
                      </button>
                    </div>
                  </div>

                  <!-- 文件上传区域 -->
                  <div v-if="!isParsing && !showResult" class="upload-zone" :class="{ 'drag-over': isDragOver }"
                    @click="triggerFileInput" @dragover.prevent="handleDragOver" @dragleave="handleDragLeave"
                    @drop.prevent="handleDrop">
                    <input ref="fileInputRef" type="file" accept=".xlsx,.xls,.png,.jpg,.jpeg" class="hidden"
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
                  <div v-if="isParsing" class="parsing-progress">
                    <div class="progress-header">
                      <span class="progress-status">{{ parsingStatus }}</span>
                      <span class="progress-percent">{{ parsingPercent }}%</span>
                    </div>
                    <div class="progress-bar">
                      <div class="progress-fill" :style="{ width: parsingPercent + '%' }"></div>
                    </div>
                    <p class="progress-hint">"{{ parsingHint }}"</p>
                  </div>

                  <!-- 解析结果 -->
                  <div v-if="showResult" class="analysis-result">
                    <div class="result-card">
                      <h4 class="result-title">解析结果预览</h4>
                      <div class="result-items">
                        <div class="result-item">
                          <span class="result-label">配方名称</span>
                          <span class="result-value">{{ aiResult.name }}</span>
                        </div>
                        <div class="result-item">
                          <span class="result-label">原料数量</span>
                          <span class="result-value">{{ aiResult.ingredients.length }} 种</span>
                        </div>
                        <div class="result-item">
                          <span class="result-label">解析置信度</span>
                          <span class="result-badge">{{ aiResult.confidence }}%</span>
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
                          <t-button theme="default" variant="text" size="small" @click="resetUpload">
                            重新选择文件
                          </t-button>
                          <t-button theme="danger" variant="text" size="small" @click="clearResult">
                            清空
                          </t-button>
                          <t-button theme="primary" variant="text" size="small" @click="reparse">
                            重新解析
                          </t-button>
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
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useFormulaStore } from '@/stores/formula';
import { useSalesmanStore } from '@/stores/salesman';
import { useMaterialStore } from '@/stores/material';
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

const formRef = ref<any>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const loading = ref(false);
const materialSelectLoading = ref(false);
const materialSearchKeyword = ref('');

// AI 相关状态
const currentModel = ref('DeepFormulate');
const isDragOver = ref(false);
const isParsing = ref(false);
const parsingPercent = ref(0);
const parsingStatus = ref('正在智能解析中...');
const parsingHint = ref('正在提取原料清单并映射营养成分...');
const showResult = ref(false);
const aiResult = reactive({
  name: '',
  ingredients: [] as any[],
  confidence: 98.2
});

// 计算原料总数量
const totalQuantity = computed(() => {
  return formData.materials.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0).toFixed(2);
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
  currentModel.value = model;
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
    handleFile(files[0]);
  }
};

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (files && files.length > 0) {
    handleFile(files[0]);
  }
};

const handleFile = (file: File) => {
  // 开始解析
  isParsing.value = true;
  parsingPercent.value = 0;
  parsingStatus.value = '正在智能解析中...';
  parsingHint.value = '正在提取原料清单并映射营养成分...';

  const interval = setInterval(() => {
    parsingPercent.value += Math.floor(Math.random() * 15) + 5;
    if (parsingPercent.value >= 100) {
      parsingPercent.value = 100;
      clearInterval(interval);
      showAnalysisResult(file.name);
    }
  }, 300);
};

const showAnalysisResult = (fileName: string) => {
  setTimeout(() => {
    isParsing.value = false;
    showResult.value = true;

    // 模拟生成的解析数据
    aiResult.name = '草莓燕麦条-' + Date.now().toString().slice(-4);
    aiResult.ingredients = [
      { name: '大片燕麦', percent: 45.0 },
      { name: '冻干草莓丁', percent: 15.0 },
      { name: '低聚异麦芽糖浆', percent: 20.0 },
      { name: '浓缩乳清蛋白粉', percent: 12.0 },
      { name: '椰子油', percent: 8.0 }
    ];
    aiResult.confidence = 98.2;
  }, 500);
};

// 回填数据到表单
const backfillData = () => {
  if (!aiResult.name) return;

  // 填充基础信息
  formData.name = aiResult.name;
  formData.description = '基于智能解析生成的健康能量棒配方，高纤维低热量。';
  formData.finishedWeight = 1000;

  // 清空并填充原料表
  formData.materials.splice(0, formData.materials.length);

  // 尝试匹配原料
  aiResult.ingredients.forEach((ing: any) => {
    const matched = materialStore.allMaterials.find(
      (m: any) => m.name.includes(ing.name) || ing.name.includes(m.name)
    );
    formData.materials.push({
      materialId: matched?.id || '',
      materialName: ing.name,
      quantity: Math.round(ing.percent * 10) // 模拟数量
    });
  });

  MessagePlugin.success('AI 解析数据已回填到表单');
  isAiPrefill.value = true;
};

// 重置上传
const resetUpload = () => {
  showResult.value = false;
  parsingPercent.value = 0;
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};

// 清空结果
const clearResult = () => {
  showResult.value = false;
  parsingPercent.value = 0;
  aiResult.name = '';
  aiResult.ingredients = [];
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};

// 重新解析
const reparse = () => {
  showResult.value = false;
  parsingPercent.value = 0;
  // 重新触发文件解析
  const lastFile = fileInputRef.value?.files?.[0];
  if (lastFile) {
    handleFile(lastFile);
  }
};

onMounted(async () => {
  await Promise.all([
    salesmanStore.fetchSalesmen(),
    materialStore.fetchAllForSelect()
  ]);

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
    animation: fadeInUp 0.5s ease-out forwards;

    // Grid 布局
    .grid {
      display: grid;
    }

    .grid-cols-12 {
      grid-template-columns: repeat(12, 1fr);
    }

    .gap-8 {
      gap: 32px;
    }

    .col-span-12 {
      grid-column: span 12;
    }

    @media (min-width: 1024px) {
      .lg\\:col-span-7 {
        grid-column: span 7;
      }

      .lg\\:col-span-5 {
        grid-column: span 5;
      }
    }

    .space-y-8 {
      &>*+* {
        margin-top: 32px;
      }
    }

    .space-y-6 {
      &>*+* {
        margin-top: 24px;
      }
    }

    .grid-cols-2 {
      grid-template-columns: repeat(2, 1fr);
    }

    .gap-6 {
      gap: 24px;
    }
  }

  // AI 预填提示
  .ai-prefill-alert {
    margin-bottom: 16px;
    animation: fadeInDown 0.3s ease;
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
      letter-spacing: 0.1em;
      margin: 0;

      .section-icon {
        color: #10b981;
        font-size: 16px;
      }
    }

    .add-row-btn {
      font-size: 12px;
      font-weight: 700;
      color: #10b981;

      &:hover {
        color: #059669;
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
              width: 120px;
            }

            .delete-btn {
              color: #cbd5e1;

              &:hover {
                color: #f43f5e;
              }
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
      padding: 48px;
      text-align: center;

      .add-first-btn {
        border-style: dashed;
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
    background: #0f172a;
    padding: 32px;
    border-radius: 2.5rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    color: #fff;
    position: relative;
    overflow: hidden;
    animation: fadeInUp 0.5s ease both;
    animation-delay: 0.1s;

    .ai-panel-bg {
      position: absolute;
      top: -40px;
      right: -40px;
      width: 160px;
      height: 160px;
      background: rgba(16, 185, 129, 0.2);
      filter: blur(80px);
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
        font-size: 20px;
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
            gap: 4px;
            padding: 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            color: #fff;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            opacity: 0.5;

            &:hover {
              opacity: 1;
            }

            &.active {
              background: rgba(16, 185, 129, 0.2);
              border-color: rgba(16, 185, 129, 0.5);
              opacity: 1;
            }

            .model-icon {
              font-size: 20px;
            }
          }
        }
      }

      // 上传区域
      .upload-zone {
        border: 2px dashed rgba(255, 255, 255, 0.1);
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
          background: rgba(255, 255, 255, 0.05);
        }

        .upload-icon {
          width: 64px;
          height: 64px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          color: #34d399;
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
        background: rgba(255, 255, 255, 0.05);
        border-radius: 24px;
        border: 1px solid rgba(255, 255, 255, 0.1);

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
            color: #34d399;
          }
        }

        .progress-bar {
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 12px;

          .progress-fill {
            height: 100%;
            background: #10b981;
            border-radius: 3px;
            transition: width 0.3s ease;
          }
        }

        .progress-hint {
          font-size: 10px;
          color: #64748b;
          font-style: italic;
          margin: 0;
        }
      }

      // 解析结果
      .analysis-result {
        .result-card {
          padding: 24px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);

          .result-title {
            font-size: 12px;
            font-weight: 900;
            color: #34d399;
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
              }

              .result-value {
                font-weight: 700;
              }

              .result-badge {
                padding: 2px 8px;
                background: rgba(16, 185, 129, 0.2);
                color: #34d399;
                border-radius: 4px;
                font-size: 11px;
              }
            }
          }

          .result-actions {
            .backfill-btn {
              margin-bottom: 12px;
            }

            .secondary-actions {
              display: flex;
              justify-content: center;
              gap: 16px;
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
}
</style>
