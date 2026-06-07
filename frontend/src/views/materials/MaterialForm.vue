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
            {{ isEdit ? (formData.name || '编辑原料') : '新增原料' }}
            <span v-if="formData.materialType === 'supplement'" class="type-tag type-tag--supplement">辅料</span>
            <span v-else class="type-tag type-tag--herb">药材</span>
            <span v-if="isEdit" class="title-version-tag">v{{ versionMode.currentVersion }}</span>
            <span v-if="isEdit && materialStatus === 'draft'" class="title-status-tag title-status-tag--draft">草稿</span>
            <span v-else-if="isEdit && materialStatus === 'pending_review'"
              class="title-status-tag title-status-tag--pending">审批中</span>
            <span v-else-if="isEdit && materialStatus === 'published'"
              class="title-status-tag title-status-tag--published">已发布</span>
          </h2>
        </div>
      </div>
      <div class="header-actions">
        <button class="header-action-btn secondary" @click="handleBack" aria-label="取消编辑，返回列表"
          data-testid="material-cancel-btn">
          <t-icon name="close" class="btn-icon" />
          取消
        </button>
        <button v-if="isEdit && materialStatus === 'draft'" class="header-action-btn submit-review-btn"
          @click="handleSubmitReview" aria-label="提交审批">
          <t-icon name="upload" class="btn-icon" />
          提交审批
        </button>
        <button class="header-action-btn" @click="handleSubmit({ validateResult: true })" aria-label="保存原料"
          data-testid="material-save-btn">
          <t-icon name="save" class="btn-icon" />
          {{ isEdit ? '保存' : '创建' }}
        </button>
      </div>
    </header>
    <!-- 版本化编辑模式提示 -->
    <div v-if="versionMode.versioning" class="version-banner">
      <div class="version-banner-content">
        <div class="version-banner-icon">
          <t-icon name="layers" />
        </div>
        <div class="version-banner-text">
          <span class="version-banner-title">版本化编辑模式</span>
          <span class="version-banner-desc">
            当前版本 v{{ versionMode.currentVersion }} · 修改后将创建 v{{ versionMode.currentVersion + 1 }}，
            旧版本数据完整保留，新版本将为草稿状态
          </span>
          <span class="version-banner-refs" v-if="versionMode.referenceCount > 0">
            被 {{ versionMode.referenceCount }} 个配方引用
          </span>
        </div>
        <t-tag theme="warning" variant="light">修改后将创建新版本</t-tag>
      </div>
      <div v-if="versionMode.referencedFormulas.length > 0" class="version-banner-formulas">
        <div class="formula-list-header">
          <t-icon name="link" size="14px" />
          <span>引用此原料的配方</span>
        </div>
        <div class="formula-list-items">
          <div v-for="(formula, index) in versionMode.referencedFormulas" :key="formula.id" class="formula-list-item"
            @click="router.push(`/formulas/${formula.id}`)">
            <span class="formula-item-index">#{{ index + 1 }}</span>
            <span class="formula-item-code">{{ formula.id }}</span>
            <span class="formula-item-name">{{ formula.name }}</span>
            <span class="formula-item-version">v{{ formula.version }}</span>
            <span class="formula-item-status" :class="{
              'formula-item-status--draft': formula.status === 'draft',
              'formula-item-status--pending': formula.status === 'pending_review',
              'formula-item-status--published': formula.status === 'published',
            }">
              {{ formula.status === 'draft' ? '草稿' : formula.status === 'pending_review' ? '审批中' : '已发布' }}
            </span>
            <t-icon name="chevron-right" size="14px" class="formula-item-arrow" />
          </div>
        </div>
      </div>
    </div>
    <!-- 状态提示 -->
    <div v-if="!isEdit" class="status-banner status-banner--top">
      <t-alert theme="info" message="新建原料为草稿状态，完成编辑后需提交审批" />
    </div>

    <div v-if="isEdit && materialStatus === 'draft'" class="status-banner status-banner--top">
      <t-alert theme="info" message="当前原料为草稿状态，保存后可提交审批" />
    </div>

    <main class="form-main">
      <t-form ref="formRef" :data="formData" :rules="rules" scroll-to-first-error @submit="handleSubmit">
        <div class="form-vertical-layout">

          <section class="form-section zone-basic-info">
            <div v-if="basicInfoCollapsed" class="info-collapsed-bar" @click="toggleBasicInfoCollapsed">
              <div class="info-collapsed-left">
                <div class="info-collapsed-icon">
                  <t-icon name="edit-1" />
                </div>
                <span class="info-collapsed-text">基础信息</span>
                <span class="info-collapsed-hint">点击展开</span>
              </div>
              <t-icon name="chevron-down" class="info-collapsed-arrow" />
            </div>
            <template v-else>
              <div class="info-expanded-header" @click="toggleBasicInfoCollapsed">
                <div class="info-expanded-title">
                  <t-icon name="edit-1" />
                  <span>基础信息</span>
                </div>
                <t-icon name="chevron-up" class="info-expanded-arrow" />
              </div>
              <div class="zone-content">
                <div class="basic-info-two-col">
                  <div class="info-col-left info-card">
                    <div class="form-field field-compact field-inline">
                      <label class="field-label" id="lbl-material-name">原料名称<span class="required">*</span></label>
                      <div class="field-input">
                        <t-input v-model="formData.name" placeholder="请输入原料名称" clearable
                          data-testid="material-name-input" data-field="name" />
                      </div>
                    </div>
                    <div class="form-field field-compact field-inline">
                      <label class="field-label" id="lbl-material-type">原料类型<span class="required">*</span></label>
                      <div class="field-input">
                        <t-radio-group v-model="formData.materialType" data-field="material_type">
                          <t-radio value="herb">药材</t-radio>
                          <t-radio value="supplement">辅料</t-radio>
                        </t-radio-group>
                      </div>
                    </div>
                    <div class="form-field field-compact field-inline">
                      <label class="field-label" id="lbl-unit">单位<span class="required">*</span></label>
                      <div class="field-input">
                        <t-select v-model="formData.unit" placeholder="请选择单位" :options="unitOptions" clearable
                          :popup-props="{ appendToBody: true }" data-field="unit" />
                      </div>
                    </div>
                  </div>
                  <div class="info-col-right info-card">
                    <div v-if="isEdit" class="form-field field-compact field-inline">
                      <label class="field-label" id="lbl-material-code">原料编码</label>
                      <div class="field-input">
                        <t-input v-model="formData.code" disabled />
                      </div>
                      <p class="field-help-below">系统自动生成，不可修改</p>
                    </div>
                    <div class="form-field field-compact field-inline">
                      <label class="field-label" id="lbl-stock">库存数量<span class="required">*</span></label>
                      <div class="field-input">
                        <t-input-number v-model="formData.stock" :min="0" placeholder="0" data-field="stock" />
                      </div>
                    </div>
                    <div class="form-field field-compact field-inline">
                      <label class="field-label" id="lbl-unit-price">单价（元/kg）</label>
                      <div class="field-input">
                        <t-input-number v-model="formData.unitPrice" :min="0" :precision="2" placeholder="暂不录入"
                          data-field="unit_price" @change="handleUnitPriceChange" />
                      </div>
                      <p class="field-help-below">可选，由用户手动输入，不录入时保持为空</p>
                    </div>
                  </div>
                </div>
                <div class="enum-fields-row">
                  <div class="form-field field-compact field-inline">
                    <label class="field-label">性状</label>
                    <div class="field-input">
                      <t-select v-model="formData.appearance" multiple :options="appearanceOptions"
                        placeholder="选择性状（可多选）" clearable :popup-props="{ appendToBody: true }" />
                    </div>
                  </div>
                  <div class="form-field field-compact field-inline">
                    <label class="field-label">口感</label>
                    <div class="field-input">
                      <t-select v-model="formData.taste" multiple :options="tasteOptions" placeholder="选择口感（可多选）"
                        clearable :popup-props="{ appendToBody: true }" />
                    </div>
                  </div>
                  <div class="form-field field-compact field-inline">
                    <label class="field-label">功效</label>
                    <div class="field-input">
                      <t-select v-model="formData.efficacy" multiple :options="efficacyOptions" placeholder="选择功效（可多选）"
                        clearable :popup-props="{ appendToBody: true }" />
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </section>

          <section v-if="showNutrition" class="form-section zone-nutrition">
            <div class="zone-header">
              <h3 class="zone-title">
                <t-icon name="chart-bar" />
                营养成分（每100g）
                <t-tag v-if="hasNutrition" theme="success" variant="light" size="small" shape="round">已录入</t-tag>
                <NutritionSourceTag v-if="hasNutrition" :source-type="nutritionSourceType" size="small" />
              </h3>
            </div>
            <div class="zone-content">
              <div class="excel-panel-wrapper">
                <div v-if="!nutritionExcelExpanded" class="excel-collapsed-bar" @click="nutritionExcelExpanded = true">
                  <div class="excel-collapsed-left">
                    <div class="excel-collapsed-icon">
                      <t-icon name="file-excel" />
                    </div>
                    <span class="excel-collapsed-text">Excel导入营养成分</span>
                    <span class="excel-collapsed-hint">点击展开</span>
                  </div>
                  <t-icon name="chevron-down" class="excel-collapsed-arrow" />
                </div>
                <div v-else class="excel-expanded-area">
                  <div class="excel-expanded-header" @click="nutritionExcelExpanded = false">
                    <div class="excel-expanded-title">
                      <t-icon name="file-excel" />
                      <span>Excel 导入</span>
                    </div>
                    <t-icon name="chevron-up" class="excel-expanded-arrow" />
                  </div>
                  <NutritionExcelImport @import="handleNutritionExcelImport" class="excel-panel" />
                </div>
              </div>

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
                    <div v-for="field in group.fields.filter(f => f.key !== 'energy')" :key="field.key"
                      class="nutrition-field-item">
                      <label class="nf-label">{{ field.label }}</label>
                      <div class="nf-input-wrap">
                        <t-input-number v-model="nutritionData[field.key]" :min="0" :decimal-places="field.decimals"
                          :placeholder="field.placeholder" theme="normal" style="width: 100px" />
                        <span class="nf-unit">{{ field.unit }}</span>
                      </div>
                    </div>
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
      </t-form>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMaterialStore } from '@/stores/material';
import { useEnumStore } from '@/stores/enum';
import { nutritionApi } from '@/api/nutrition';
import { materialApi } from '@/api/material';
import { MessagePlugin } from 'tdesign-vue-next';
import type { FormInstanceFunctions, FormRule } from 'tdesign-vue-next';
import type { Material, UpdateResult } from '@/api/material';
import NutritionExcelImport from '@/components/NutritionExcelImport.vue';
import NutritionSourceTag from '@/components/nutrition/NutritionSourceTag.vue';

const router = useRouter();
const route = useRoute();
const materialStore = useMaterialStore();
const enumStore = useEnumStore();

const formRef = ref<FormInstanceFunctions>();
const loading = ref(false);
const showNutrition = ref(false);
const hasNutrition = ref(false);
const nutritionExcelExpanded = ref(false);
const basicInfoCollapsed = ref(localStorage.getItem('material-basic-info-collapsed') === 'true');

function toggleBasicInfoCollapsed() {
  basicInfoCollapsed.value = !basicInfoCollapsed.value;
  localStorage.setItem('material-basic-info-collapsed', String(basicInfoCollapsed.value));
}

const isEdit = computed(() => !!route.params.id);
const materialStatus = ref<"draft" | "pending_review" | "published">("draft");

const versionMode = reactive({
  versioning: false,
  currentVersion: 1,
  nextVersion: 2,
  referenceCount: 0,
  referencedFormulas: [] as { id: string; name: string; formulaCode: string; version: number; status: string; }[],
});

interface MaterialFormData {
  name: string;
  unit: string;
  stock: number;
  materialType: string;
  unitPrice: number | undefined;
  dataSource: string;
  code?: string;
  appearance: string[];
  taste: string[];
  efficacy: string[];
}

const formData = reactive<MaterialFormData>({
  name: '',
  unit: '',
  stock: 0,
  materialType: 'herb',
  unitPrice: undefined as number | undefined,
  dataSource: 'manual',
  appearance: [],
  taste: [],
  efficacy: [],
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

const appearanceOptions = computed(() =>
  enumStore.getActiveOptionsByCategory("appearance").map((o) => ({ label: o.label, value: o.value }))
);
const tasteOptions = computed(() =>
  enumStore.getActiveOptionsByCategory("taste").map((o) => ({ label: o.label, value: o.value }))
);
const efficacyOptions = computed(() =>
  enumStore.getActiveOptionsByCategory("efficacy").map((o) => ({ label: o.label, value: o.value }))
);

const rules: Record<string, FormRule[]> = {
  name: [
    { required: true, message: '请输入原料名称', trigger: 'blur' },
    { min: 2, message: '原料名称至少2个字符', trigger: 'change' },
    { max: 100, message: '原料名称不能超过100个字符', trigger: 'change' },
  ],
  unit: [{ required: true, message: '请选择单位', trigger: 'change' }],
  stock: [{ required: true, message: '请输入库存数量', trigger: 'blur' }],
  unitPrice: [
    { validator: (val: number) => val == null || val >= 0, message: '单价不能为负数', trigger: 'blur' },
  ],
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
const nutritionSourceType = ref<string>('manual');

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
  } catch (error: unknown) { console.error('保存营养成分失败:', error); }
};

const handleUnitPriceChange = (val: number | undefined) => {
  if (val === undefined || val === null) {
    formData.unitPrice = undefined;
  }
};

const handleSubmit = async ({ validateResult }: { validateResult: boolean | Record<string, unknown>; }) => {
  if (validateResult === true) {
    if (loading.value) return;
    loading.value = true;
    try {
      const id = route.params.id as string;
      let result: { success: boolean; message?: string; data?: Material; result?: UpdateResult; };
      if (isEdit.value && id) {
        result = await materialStore.updateMaterial(id, formData);
      } else {
        let code = '';
        try {
          const codeRes = await materialApi.getNextCode(formData.name);
          code = codeRes?.code || '';
        } catch (err) {
          console.error('[MaterialForm] 获取原料编码失败:', err);
        }
        if (!code) {
          MessagePlugin.error('获取原料编码失败，请重试');
          loading.value = false;
          return;
        }
        result = await materialStore.createMaterial({ ...formData, code });
      }

      if (result.success) {
        if (showNutrition.value) {
          const materialId = isEdit.value ? id : result.data?.id;
          if (materialId) await saveNutrition(materialId);
        }
        const isVersioned = versionMode.versioning && result.result?.versionAction === "created";
        const successMsg = isVersioned
          ? `原料版本已升级至 v${result.result?.version}，旧版本已存档`
          : (isEdit.value ? '保存成功' : '创建成功');
        MessagePlugin.success(successMsg);
        router.push({
          path: '/materials',
          query: route.query
        });
      } else MessagePlugin.error(result.message || '操作失败');
    } finally { loading.value = false; }
  }
};

const handleSubmitReview = async () => {
  const id = route.params.id as string;
  if (!id) return;
  const result = await materialStore.submitReview(id);
  if (result.success) {
    MessagePlugin.success("已提交审批");
    router.push({ path: "/materials", query: route.query });
  } else {
    MessagePlugin.error(result.message || "提交审批失败");
  }
};

const handleBack = () => {
  router.push({
    path: '/materials',
    query: route.query
  });
};

interface NutritionDataResponse {
  per100g?: Record<string, number>;
  dataSource?: string;
  notes?: string;
  confidence?: 'high' | 'medium' | 'low';
}

const loadNutrition = async (materialId: string) => {
  showNutrition.value = true;
  try {
    const res = await nutritionApi.getMaterialNutrition(materialId) as NutritionDataResponse;
    if (res?.per100g) {
      hasNutrition.value = true;
      const per100g = res.per100g || {};
      for (const key of Object.keys(per100g))
        if (per100g[key] !== undefined && per100g[key] !== null) nutritionData[key] = Number(per100g[key]);
      if (res.dataSource) nutritionMeta.dataSource = res.dataSource;
      if (res.notes) nutritionMeta.notes = res.notes;
      if (res.confidence) nutritionMeta.confidence = res.confidence;
      if (res.sourceType) nutritionSourceType.value = res.sourceType;
    }
  } catch {
    // ignore nutrition fetch failure
  }
};

onMounted(async () => {
  await enumStore.fetchEnums();
  const id = route.params.id as string;
  if (isEdit.value && id) {
    const material = await materialStore.getMaterial(id);
    if (material) {
      Object.assign(formData, {
        code: material.code, name: material.name, unit: material.unit,
        stock: material.stock, materialType: material.materialType || 'herb',
        unitPrice: material.unitPrice != null ? material.unitPrice : undefined,
        appearance: material.appearance || [],
        taste: material.taste || [],
        efficacy: material.efficacy || [],
      });
      materialStatus.value = material.status || "draft";
      versionMode.currentVersion = material.version || 1;
      await loadNutrition(id);

      if (material.referenceCount > 0) {
        versionMode.versioning = true;
        versionMode.referenceCount = material.referenceCount;
        versionMode.referencedFormulas = material.referencedFormulas || [];
      }
    }
  } else {
    showNutrition.value = true;
  }
});
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.material-form {
  padding-bottom: 24px;

  .version-banner {
    margin: 16px 0 0;
    padding: 12px 20px;
    background: var(--color-warning-bg);
    border: 1px solid #fde68a;
    border-radius: 12px;

    .status-banner {
      margin: 16px 0 0;

      :deep(.t-alert) {
        border-radius: 12px;
      }
    }

    .version-banner-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .version-banner-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--color-warning-bg);
      color: var(--color-warning);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }

    .version-banner-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-0-5);
    }

    .version-banner-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-warning-dark);
    }

    .version-banner-desc {
      font-size: 12px;
      color: #a16207;
    }

    .version-banner-refs {
      font-size: 11px;
      color: #ca8a04;
      background: #fef9c3;
      padding: 1px 8px;
      border-radius: 4px;
      display: inline-block;
      margin-top: var(--space-0-5);
    }

    .version-banner-formulas {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed #fde68a;

      .formula-list-header {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 600;
        color: #92400e;
        margin-bottom: 8px;
      }

      .formula-list-items {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .formula-list-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid #fde68a;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.95);
          border-color: #fbbf24;
          box-shadow: 0 2px 6px rgba(251, 191, 36, 0.15);
          transform: translateX(2px);
        }

        .formula-item-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-primary);
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .formula-item-index {
          font-size: 10px;
          font-weight: 700;
          color: var(--color-text-placeholder);
          background: var(--color-bg-page);
          padding: 1px 7px;
          border-radius: 999px;
          flex-shrink: 0;
          font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
        }

        .formula-item-version {
          font-size: 11px;
          font-weight: 700;
          color: var(--color-primary);
          background: var(--color-primary-bg);
          padding: 1px 8px;
          border-radius: 999px;
          font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
          flex-shrink: 0;
        }

        .formula-item-status {
          font-size: 10px;
          font-weight: 700;
          padding: 1px 8px;
          border-radius: 999px;
          flex-shrink: 0;

          &--draft {
            background: var(--color-bg-page);
            color: var(--color-text-placeholder);
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

        .formula-item-arrow {
          color: var(--color-text-placeholder);
          flex-shrink: 0;
          transition: transform 0.15s;
        }

        &:hover .formula-item-arrow {
          transform: translateX(2px);
          color: var(--color-primary);
        }
      }
    }
  }

  .status-banner--top {
    margin-top: 16px;

    :deep(.t-alert) {
      border-radius: 12px;
    }
  }

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
    background-color: var(--color-bg-container);
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
          color: $emerald-500;
          background-color: $emerald-50;
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
              color: $emerald-500;
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

        .formula-title {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
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
        background-color: $emerald-500;
        color: var(--color-text-white);
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
          background-color: $emerald-600;
          transform: translateY(-1px);
          box-shadow: 0 14px 20px -3px $overlay-emerald-35;
        }

        &:active {
          transform: translateY(0);
          background-color: var(--color-primary-deep);
        }

        &.secondary {
          background-color: var(--color-border-light);
          color: var(--color-text-secondary);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.10);

          &:hover {
            background-color: var(--color-border);
            color: var(--color-text-secondary);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.10);
          }

          &:active {
            background-color: var(--color-text-placeholder);
          }
        }

        &.submit-review-btn {
          background-color: var(--color-info);
          box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.25);

          &:hover {
            background-color: var(--color-info-dark);
            box-shadow: 0 14px 20px -3px rgba(59, 130, 246, 0.35);
          }

          &:active {
            background-color: #1d4ed8;
          }
        }
      }
    }
  }

  .form-main {
    margin-top: 24px;
    animation: fadeInUp 0.5s ease-out forwards;

    .form-vertical-layout {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .form-section {
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
      background: linear-gradient(135deg, var(--color-emerald-50) 0%, var(--color-emerald-50) 50%, var(--color-info-bg) 100%);
      border: 1.5px dashed var(--color-emerald-400);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.25s ease;
      user-select: none;

      &:hover {
        background: linear-gradient(135deg, #dcfce7 0%, var(--color-primary-bg) 50%, #e0f2fe 100%);
        border-color: var(--color-emerald-400);
        box-shadow: 0 2px 8px rgba(34, 197, 94, 0.12);
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
      background: linear-gradient(135deg, var(--color-emerald-400), var(--color-emerald-600));
      color: var(--color-text-white);
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(34, 197, 94, 0.3);
    }

    .info-collapsed-text {
      font-size: 14px;
      font-weight: 700;
      color: var(--color-emerald-600);
    }

    .info-collapsed-hint {
      font-size: 11px;
      color: var(--color-emerald-400);
      background: rgba(34, 197, 94, 0.1);
      padding: var(--space-0-5) 8px;
      border-radius: 6px;
      font-weight: 500;
    }

    .info-collapsed-arrow {
      color: var(--color-emerald-400);
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

    .enum-fields-row {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px dashed var(--color-border-light);

      .field-inline .field-input {
        max-width: calc(100% - 100px);
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
      }

      @media (max-width: 900px) {
        .field-inline {
          flex-direction: column;
          align-items: stretch;

          .field-label {
            justify-content: flex-start;
            min-width: 0;
            margin-bottom: 8px;
          }

          .field-input {
            max-width: 100%;
          }
        }
      }
    }

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
          .field-label-row {
            display: flex;
            align-items: center;
            gap: var(--space-1-5);
            margin-bottom: var(--space-1-5);

            .field-label {
              font-size: 12px;
              font-weight: 700;
              color: var(--color-text-secondary);
            }
          }

          .field-label {
            .required {
              color: #e34d59 !important;
              margin-left: 2px;
            }
          }

          .field-help {
            margin-top: 4px;
            font-size: 11px;
            color: var(--color-text-placeholder);
            line-height: 1.4;
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

    .zone-nutrition {
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

    .row-actions {
      display: flex;
      align-items: center;
      gap: 8px;

      &.collapse-toolbar {
        justify-content: flex-end;
        margin-bottom: var(--space-2-5);
        padding: 0 4px;
      }
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

    :deep(.t-collapse) {
      background-color: var(--color-bg-page);
      border-radius: 16px;
      padding: 4px;
    }

    :deep(.t-collapse-panel) {
      background-color: var(--color-bg-page);
      border-radius: 12px;
      margin-bottom: 4px;

      &:last-child {
        margin-bottom: 0;
      }

      .t-collapse-panel__header {
        background-color: var(--color-bg-page);
        border-radius: 12px;
        padding: 12px 16px;

        &:hover {
          background-color: var(--color-bg-hover);
        }
      }

      .t-collapse-panel__body {
        background-color: var(--color-bg-page);
        padding: 16px;
        border-radius: 0 0 12px 12px;
      }
    }

    :deep(.t-radio-group) {
      display: flex;
      gap: 8px;

      .t-radio-button {
        background-color: var(--color-bg-page) !important;
        border: 1px solid var(--color-border-light) !important;
        border-radius: 10px !important;
        transition: all $transition-fast;

        &:hover:not(.t-is-checked) {
          background-color: var(--color-border-light) !important;
          border-color: var(--color-border) !important;
        }

        &.t-is-checked {
          background-color: $overlay-emerald-08 !important;
          border-color: var(--color-primary) !important;
          color: var(--color-primary-dark) !important;
        }
      }
    }

    .group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: $font-weight-semibold;
      color: var(--color-text-primary);
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
        padding: 12px var(--space-3-5);
      }

      .nf-label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-secondary);
        margin-bottom: var(--space-1-5);
      }

      .nf-calc-wrap {
        display: flex;
        align-items: center;
        gap: 8px;

        .nf-calc-value {
          font-size: 20px;
          font-weight: 800;
          color: var(--color-primary);
          font-family: 'SF Mono', 'Consolas', monospace;
        }

        .nf-calc-formula {
          font-size: 10px;
          color: var(--color-text-placeholder);
          background: var(--color-border-light);
          padding: var(--space-1) 8px;
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
          color: var(--color-text-placeholder);
          background: var(--color-border-light);
          padding: 4px var(--space-2-5);
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
      border-top: 1px solid var(--color-border-light);

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
          color: var(--color-text-secondary);
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
          padding: var(--space-0-5) 8px !important;
          height: auto !important;
          line-height: 1.6 !important;
        }
      }
    }

    .excel-panel-wrapper {
      margin-bottom: 16px;
    }

    .excel-collapsed-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: linear-gradient(135deg, var(--color-emerald-50) 0%, var(--color-emerald-50) 50%, var(--color-info-bg) 100%);
      border: 1.5px dashed var(--color-emerald-400);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.25s ease;
      user-select: none;

      &:hover {
        background: linear-gradient(135deg, #dcfce7 0%, var(--color-primary-bg) 50%, #e0f2fe 100%);
        border-color: var(--color-emerald-400);
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
      gap: var(--space-2-5);
    }

    .excel-collapsed-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--color-emerald-400), var(--color-emerald-600));
      color: var(--color-text-white);
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(34, 197, 94, 0.3);
    }

    .excel-collapsed-text {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-emerald-600);
    }

    .excel-collapsed-hint {
      font-size: 11px;
      color: var(--color-emerald-400);
      background: rgba(34, 197, 94, 0.1);
      padding: var(--space-0-5) 8px;
      border-radius: 6px;
      font-weight: 500;
    }

    .excel-collapsed-arrow {
      color: var(--color-emerald-400);
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
}
</style>