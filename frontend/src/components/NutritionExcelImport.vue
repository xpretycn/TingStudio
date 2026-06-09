<template>
  <div class="nutrition-excel-import">
    <!-- 操作说明 -->
    <t-alert theme="info" :close-btn="null">
      <template #title>
        <span class="guide-title">营养素 Excel 导入</span>
      </template>
      <div class="guide-content">
        <p>1. 点击「下载模板」获取营养素 Excel 模板</p>
        <p>2. 在模板中填写每 100g 的营养成分数值</p>
        <p>3. 点击「上传文件」导入已填写的 Excel</p>
        <p>4. 系统自动填充营养素表单（支持中国食物成分表格式）</p>
      </div>
    </t-alert>

    <!-- 操作按钮 -->
    <div class="import-actions">
      <t-button theme="primary" @click="downloadTemplate" :loading="downloading">
        <template #icon><t-icon name="download" /></template>
        下载模板
      </t-button>

      <t-upload ref="uploadRef" :show-upload-file="false" :before-upload="beforeUpload" :request-method="handleUpload"
        accept=".xlsx,.xls">
        <t-button theme="success" :loading="uploading">
          <template #icon><t-icon name="upload" /></template>
          上传文件
        </t-button>
      </t-upload>
    </div>

    <!-- 解析结果 -->
    <div v-if="parseResult" class="parse-result">
      <!-- 摘要信息 -->
      <t-card class="result-summary" :bordered="false">
        <div class="summary-content">
          <span class="summary-item">
            <t-icon name="file-excel" />
            数据来源：<strong>{{ parseResult.dataSource || '未标注' }}</strong>
          </span>
          <span class="summary-item success">
            <t-icon name="check-circle" />
            有效营养素 <strong>{{ validNutrientCount }}</strong> 项
          </span>
          <span v-if="unknownFields.length > 0" class="summary-item warning">
            <t-icon name="error-circle" />
            未识别字段 <strong>{{ unknownFields.length }}</strong> 个
          </span>
        </div>
      </t-card>

      <!-- 未识别字段提示 -->
      <t-alert v-if="unknownFields.length > 0" theme="warning" title="以下字段未被识别，已跳过" :close-btn="null"
        class="result-alert">
        <div class="missing-tags">
          <t-tag v-for="name in unknownFields" :key="name" theme="warning" variant="light" size="small">
            {{ name }}
          </t-tag>
        </div>
      </t-alert>

      <!-- 营养素预览 -->
      <t-card v-if="validNutrients.length > 0" class="preview-card" :bordered="false">
        <template #header>
          <div class="preview-header">
            <span>营养素预览（每 100g）</span>
            <t-space>
              <t-button theme="default" size="small" @click="cancelImport">取消</t-button>
              <t-button theme="primary" size="small" @click="confirmImport">确认导入</t-button>
            </t-space>
          </div>
        </template>
        <t-table :data="validNutrients" :columns="previewColumns" size="small" :max-height="320" row-key="key"
          :pagination="{ total: validNutrients.length, pageSize: 50 }">
          <template #group="{ row }">
            <t-tag :theme="groupTheme(row.group)" variant="light" size="small">{{ row.group }}</t-tag>
          </template>
        </t-table>
      </t-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import * as XLSX from 'xlsx';

interface NutritionParseResult {
  nutritionData: Record<string, number>;
  dataSource: string;
  confidence: string;
  notes: string;
}

const emit = defineEmits<{
  (e: 'import', data: { nutritionData: Record<string, number>; dataSource: string; confidence: string; notes: string; }): void;
}>();

const downloading = ref(false);
const uploading = ref(false);
const parseResult = ref<NutritionParseResult | null>(null);
const uploadRef = ref();

// 营养素分组映射
const groupMap: Record<string, string> = {
  protein: '基础营养', fat: '基础营养', carbohydrate: '基础营养',
  fiber: '基础营养', sugars: '基础营养', energy: '基础营养',
  sodium: '矿物质', potassium: '矿物质', calcium: '矿物质',
  iron: '矿物质', zinc: '矿物质', magnesium: '矿物质', phosphorus: '矿物质',
  vitaminA: '维生素', vitaminC: '维生素', vitaminD: '维生素',
  vitaminE: '维生素', vitaminB1: '维生素', vitaminB2: '维生素',
  vitaminB3: '维生素', vitaminB6: '维生素', vitaminB12: '维生素', folate: '维生素',
  cholesterol: '其他', saturatedFat: '其他', transFat: '其他',
};

function groupTheme(group: string) {
  if (group === '基础营养') return 'primary';
  if (group === '矿物质') return 'warning';
  if (group === '维生素') return 'success';
  return 'default';
}

const previewColumns = [
  { colKey: 'label', title: '名称', width: 110 },
  { colKey: 'group', title: '分类', width: 90 },
  { colKey: 'value', title: '数值', width: 100 },
  { colKey: 'unit', title: '单位', width: 90 },
];

// 有效营养素列表（有值的）
const validNutrients = computed(() => {
  if (!parseResult.value?.nutritionData) return [];
  return Object.entries(parseResult.value.nutritionData)
    .filter(([, val]) => val !== undefined && val !== null && Number(val) > 0)
    .map(([key, val]) => ({
      key,
      label: NUTRIENT_LABELS[key] || key,
      group: groupMap[key] || '其他',
      value: Number(val).toFixed(getDecimals(key)),
      unit: NUTRIENT_UNITS[key] || '',
    }));
});

const validNutrientCount = computed(() => validNutrients.value.length);

// 未识别的字段
const unknownFields = computed(() => {
  if (!parseResult.value?.nutritionData) return [];
  const knownKeys = new Set(Object.keys(NUTRIENT_LABELS));
  return Object.keys(parseResult.value.nutritionData).filter(k => !knownKeys.has(k));
});

function getDecimals(key: string): number {
  const map: Record<string, number> = {
    protein: 2, fat: 2, carbohydrate: 2, fiber: 2, sugars: 2,
    sodium: 1, potassium: 1, calcium: 1, iron: 2, zinc: 2,
    magnesium: 1, phosphorus: 1,
    vitaminA: 1, vitaminC: 2, vitaminD: 2, vitaminE: 2,
    vitaminB1: 3, vitaminB2: 3, vitaminB3: 2, vitaminB6: 3, vitaminB12: 2, folate: 1,
    cholesterol: 1, saturatedFat: 2, transFat: 2, energy: 1,
  };
  return map[key] || 1;
}

// 下载模板（前端生成）
function downloadTemplate() {
  downloading.value = true;
  try {
    const rows = [
      ['营养成分', '数值', '单位'],
      ['', '', ''],
      ['【基础营养成分】', '', ''],
      ['能量', '', 'kJ'],
      ['蛋白质', '', 'g'],
      ['脂肪', '', 'g'],
      ['碳水化合物', '', 'g'],
      ['膳食纤维', '', 'g'],
      ['糖', '', 'g'],
      ['', '', ''],
      ['【矿物质】', '', ''],
      ['钠', '', 'mg'],
      ['钾', '', 'mg'],
      ['钙', '', 'mg'],
      ['铁', '', 'mg'],
      ['锌', '', 'mg'],
      ['镁', '', 'mg'],
      ['磷', '', 'mg'],
      ['', '', ''],
      ['【维生素】', '', ''],
      ['维生素A', '', 'μg RE'],
      ['维生素C', '', 'mg'],
      ['维生素D', '', 'μg'],
      ['维生素E', '', 'mg α-TE'],
      ['维生素B1', '', 'mg'],
      ['维生素B2', '', 'mg'],
      ['烟酸(B3)', '', 'mg'],
      ['维生素B6', '', 'mg'],
      ['维生素B12', '', 'μg'],
      ['叶酸', '', 'μg DFE'],
      ['', '', ''],
      ['【其他】', '', ''],
      ['胆固醇', '', 'mg'],
      ['饱和脂肪', '', 'g'],
      ['反式脂肪', '', 'g'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '营养素模板');
    XLSX.writeFile(wb, '营养素导入模板.xlsx');
    MessagePlugin.success('模板下载成功');
  } catch (_error: unknown) {
    MessagePlugin.error('生成模板失败');
  } finally {
    downloading.value = false;
  }
}

// 上传前验证
function beforeUpload(file: { raw: File; }) {
  const rawFile = file.raw;
  const isExcel = rawFile.name.endsWith('.xlsx') || rawFile.name.endsWith('.xls');
  if (!isExcel) {
    MessagePlugin.error('只能上传 Excel 文件 (.xlsx, .xls)');
    return false;
  }
  const isLt5M = rawFile.size / 1024 / 1024 < 5;
  if (!isLt5M) {
    MessagePlugin.error('文件大小不能超过 5MB');
    return false;
  }
  return true;
}

// 上传并解析（前端解析）
async function handleUpload(options: { raw: File; }) {
  uploading.value = true;
  parseResult.value = null;

  try {
    const data = await options.raw.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][];

    const nutritionData: Record<string, number> = {};
    let dataSource = '';
    for (const row of rows) {
      if (!row || row.length === 0) continue;
      const name = String(row[0] || '').trim();
      const val = Number(row[1]) || 0;
      if (name.startsWith('【') || !name) continue;

      const key = Object.entries(NUTRIENT_LABELS).find(([, label]) => label === name)?.[0];
      if (key) nutritionData[key] = val;
      else if (name.includes('来源') || name.includes('数据源')) dataSource = String(row[1] || '').trim();
    }

    parseResult.value = { nutritionData, dataSource, confidence: 'medium', notes: '' };

    if (unknownFields.value.length > 0) {
      MessagePlugin.warning(`解析完成，${unknownFields.value.length} 个字段未识别`);
    } else {
      MessagePlugin.success(`解析成功，共 ${validNutrientCount.value} 项有效营养素`);
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '解析文件失败';
    MessagePlugin.error(msg);
  } finally {
    uploading.value = false;
  }
}

// 确认导入
function confirmImport() {
  if (!parseResult.value) return;
  emit('import', parseResult.value);
  parseResult.value = null;
  MessagePlugin.success('营养素数据已导入');
}

// 取消
function cancelImport() {
  parseResult.value = null;
}
</script>

<script lang="ts">
// 营养素标签映射（中文 → 显示名，用于预览）
export const NUTRIENT_LABELS: Record<string, string> = {
  energy: '能量', protein: '蛋白质', fat: '脂肪',
  carbohydrate: '碳水化合物', fiber: '膳食纤维', sugars: '糖',
  sodium: '钠', potassium: '钾', calcium: '钙',
  iron: '铁', zinc: '锌', magnesium: '镁', phosphorus: '磷',
  vitaminA: '维生素A', vitaminC: '维生素C', vitaminD: '维生素D',
  vitaminE: '维生素E', vitaminB1: '维生素B1', vitaminB2: '维生素B2',
  vitaminB3: '烟酸(B3)', vitaminB6: '维生素B6', vitaminB12: '维生素B12',
  folate: '叶酸', cholesterol: '胆固醇', saturatedFat: '饱和脂肪', transFat: '反式脂肪',
};

// 营养素单位映射
export const NUTRIENT_UNITS: Record<string, string> = {
  energy: 'kJ', protein: 'g', fat: 'g', carbohydrate: 'g',
  fiber: 'g', sugars: 'g', sodium: 'mg', potassium: 'mg',
  calcium: 'mg', iron: 'mg', zinc: 'mg', magnesium: 'mg', phosphorus: 'mg',
  vitaminA: 'μg RE', vitaminC: 'mg', vitaminD: 'μg', vitaminE: 'mg α-TE',
  vitaminB1: 'mg', vitaminB2: 'mg', vitaminB3: 'mg', vitaminB6: 'mg',
  vitaminB12: 'μg', folate: 'μg DFE', cholesterol: 'mg',
  saturatedFat: 'g', transFat: 'g',
};
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.nutrition-excel-import {
  padding: $space-4;
  background: var(--color-bg-container-alt);
  border-radius: $radius-md;
  margin-bottom: $space-4;

  // 暗色模式适配
  [data-theme="dark"] & {
    background: var(--color-bg-container);

    :deep(.t-alert) {
      background-color: var(--color-bg-container-alt) !important;
    }

    .import-actions {
      :deep(.t-button--theme-primary) {
        background: none !important;
      }

      :deep(.t-button--theme-success) {
        background: none !important;
      }
    }

    .result-summary,
    .preview-card {
      :deep(.t-card) {
        background: var(--color-bg-container-alt);
      }
    }

    .result-alert {
      :deep(.t-alert) {
        background: rgba(234, 179, 8, 0.08) !important;
      }
    }
  }
}

.guide-title {
  font-weight: $font-weight-semibold;
}

.guide-content {
  margin-top: $space-2;
  font-size: $font-size-body-sm;
  color: var(--color-text-regular);

  p {
    margin: $space-1 0;
  }
}

.import-actions {
  display: flex;
  gap: $space-3;
  margin-top: $space-4;
}

.parse-result {
  margin-top: $space-4;

  .result-summary {
    margin-bottom: $space-3;
    background: var(--color-bg-container);

    .summary-content {
      display: flex;
      gap: $space-6;
      flex-wrap: wrap;

      .summary-item {
        display: flex;
        align-items: center;
        gap: $space-1-5;
        font-size: $font-size-body;

        &.success {
          color: $color-success;
        }

        &.warning {
          color: $color-warning;
        }
      }
    }
  }

  .result-alert {
    margin-bottom: $space-3;

    .missing-tags {
      display: flex;
      flex-wrap: wrap;
      gap: $space-2;
      margin-top: $space-2;
    }
  }

  .preview-card {
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }
}
</style>
