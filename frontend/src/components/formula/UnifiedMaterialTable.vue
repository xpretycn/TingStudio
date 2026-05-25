<template>
  <div class="unified-material-table">
    <!-- 工具栏 -->
    <div class="table-toolbar">
      <div class="toolbar-left">
        <t-input
          v-model="searchKeyword"
          placeholder="搜索原料名称..."
          clearable
          class="search-input"
          @change="handleSearch"
        >
          <template #prefix-icon>
            <t-icon name="search" />
          </template>
        </t-input>
        <t-button variant="outline" size="small" @click="handleFilter">
          <template #icon>
            <t-icon name="filter" />
          </template>
          筛选
        </t-button>
      </div>
      <div class="toolbar-right">
        <t-dropdown
          :popup-props="{ appendToBody: true, placement: 'bottom-right' }"
          trigger="click"
        >
          <t-button variant="outline" size="small" :disabled="selectedRows.length === 0">
            <template #icon>
              <t-icon name="list" />
            </template>
            批量操作 ({{ selectedRows.length }})
          </t-button>
          <t-dropdown-menu>
            <t-dropdown-item value="delete" @click="handleBatchDelete" :prefix-icon="() => null">
              <t-icon name="delete" style="color: #e34d59" />
              批量删除
            </t-dropdown-item>
            <t-dropdown-item value="move-up" @click="handleBatchMoveUp" :prefix-icon="() => null">
              <t-icon name="arrow-up" />
              上移
            </t-dropdown-item>
            <t-dropdown-item value="move-down" @click="handleBatchMoveDown" :prefix-icon="() => null">
              <t-icon name="arrow-down" />
              下移
            </t-dropdown-item>
          </t-dropdown-menu>
        </t-dropdown>
        <t-button variant="outline" size="small" :disabled="selectedRows.length === 0" @click="handleMoveUp">
          <template #icon>
            <t-icon name="arrow-up" />
          </template>
          上移
        </t-button>
        <t-button variant="outline" size="small" :disabled="selectedRows.length === 0" @click="handleMoveDown">
          <template #icon>
            <t-icon name="arrow-down" />
          </template>
          下移
        </t-button>
        <t-button theme="primary" size="small" @click="handleAddRow">
          <template #icon>
            <t-icon name="add" />
          </template>
          添加行
        </t-button>
        <t-button variant="outline" size="small" @click="handleExcelImport">
          <template #icon>
            <t-icon name="upload" />
          </template>
          Excel导入
        </t-button>
      </div>
    </div>

    <!-- 模式切换 -->
    <div class="mode-switcher">
      <t-radio-group v-model="currentMode" variant="default-filled" size="small">
        <t-radio-button value="edit">编辑模式</t-radio-button>
        <t-radio-button value="ai_preview">AI预览模式</t-radio-button>
      </t-radio-group>
    </div>

    <!-- 表格 -->
    <div class="table-container" ref="tableContainerRef">
      <table class="materials-table">
        <thead>
          <tr>
            <th class="col-checkbox">
              <t-checkbox
                :checked="isAllChecked"
                :indeterminate="isIndeterminate"
                @change="handleSelectAll"
              />
            </th>
            <th class="col-index">#</th>
            <th class="col-name">原料名称</th>
            <th class="col-quantity">用量(g)</th>
            <th class="col-ratio">含量比(%)</th>
            <th class="col-price">单价(元/kg)</th>
            <th class="col-amount">金额(元)</th>
            <th class="col-cost-ratio">成本占比(%)</th>
            <th v-if="currentMode === 'ai_preview'" class="col-original">原始名称</th>
            <th v-if="currentMode === 'ai_preview'" class="col-match">匹配状态</th>
            <th class="col-action">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in displayMaterials"
            :key="row._id || index"
            :class="{
              'row-selected': selectedRows.includes(index),
              'row-highlight': highlightRowIdx === index
            }"
            draggable="true"
            @dragstart="handleDragStart($event, index)"
            @dragover.prevent="handleDragOver($event, index)"
            @drop="handleDrop($event, index)"
            @dragend="handleDragEnd"
          >
            <td class="col-checkbox">
              <t-checkbox :checked="selectedRows.includes(index)" @change="() => toggleSelect(index)" />
            </td>
            <td class="col-index">{{ index + 1 }}</td>
            <td class="col-name">
              <t-select
                v-model="row.materialId"
                placeholder="搜索或选择原料"
                clearable
                filterable
                :loading="materialSelectLoading"
                class="material-select"
                @search="(val: string) => handleMaterialSearch(val, index)"
                @change="(val: string) => handleMaterialChange(val, index)"
              >
                <t-option
                  v-for="mat in getFilteredMaterials(index)"
                  :key="mat.id"
                  :value="mat.id"
                  :label="mat.name"
                >
                  <div class="material-option">
                    <span>{{ mat.name }}</span>
                    <t-tag
                      v-if="!mat.id.startsWith('__pending_') && mat.materialType === 'supplement'"
                      theme="primary"
                      variant="light-outline"
                      size="small"
                    >
                      辅料
                    </t-tag>
                    <t-tag
                      v-else-if="!mat.id.startsWith('__pending_')"
                      theme="success"
                      variant="light-outline"
                      size="small"
                    >
                      药材
                    </t-tag>
                    <t-tag v-else theme="warning" variant="light-outline" size="small">
                      未匹配
                    </t-tag>
                  </div>
                </t-option>
                <template #empty>
                  <div class="select-empty-tip">
                    {{ searchKeyword ? '未找到匹配原料' : '暂无原料数据' }}
                  </div>
                </template>
              </t-select>
            </td>
            <td class="col-quantity">
              <t-input-number
                v-model="row.quantity"
                :min="0"
                placeholder="用量"
                class="quantity-input"
                @change="() => handleQuantityChange(index)"
              />
            </td>
            <td class="col-ratio">
              <span class="ratio-value">{{ calculateRatio(row.quantity) }}</span>
            </td>
            <td class="col-price">
              <div class="price-cell" :class="{ 'price-adjusted': row.isPriceAdjusted }">
                <t-input-number
                  :model-value="row.unitPrice"
                  :min="0"
                  :precision="2"
                  size="small"
                  theme="normal"
                  @change="(val: number) => handlePriceChange(val, index)"
                />
                <span v-if="row.isPriceAdjusted" class="adjust-badge">调</span>
                <button
                  v-if="row.isPriceAdjusted"
                  type="button"
                  class="restore-btn"
                  title="撤销单价调整"
                  @click="() => handleRestorePrice(index)"
                >
                  <t-icon name="rollback" size="12px" />
                </button>
              </div>
            </td>
            <td class="col-amount">
              <span class="amount-value">{{ calculateAmount(row) }}</span>
            </td>
            <td class="col-cost-ratio">
              <span class="cost-ratio-value">{{ calculateCostRatio(row) }}</span>
            </td>
            <td v-if="currentMode === 'ai_preview'" class="col-original">
              <span class="original-name">{{ row.originalName || '--' }}</span>
            </td>
            <td v-if="currentMode === 'ai_preview'" class="col-match">
              <t-tag v-if="row.matched" theme="success" variant="light" size="small">
                已匹配
              </t-tag>
              <t-tag v-else theme="warning" variant="light" size="small">
                未匹配
              </t-tag>
            </td>
            <td class="col-action">
              <t-button variant="text" size="small" @click="handleDeleteRow(index)">
                <template #icon>
                  <t-icon name="delete" />
                </template>
              </t-button>
            </td>
          </tr>
          <!-- 添加新行按钮 -->
          <tr v-if="displayMaterials.length === 0" class="empty-row">
            <td :colspan="currentMode === 'ai_preview' ? 11 : 9" class="empty-cell">
              <button type="button" class="add-first-btn" @click="handleAddRow">
                <t-icon name="add-rectangle" />
                添加第一条原料
              </button>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="displayMaterials.length > 0">
          <tr class="total-row">
            <td :colspan="3" class="total-label">合计</td>
            <td class="total-quantity">{{ totalQuantity }} g</td>
            <td class="total-ratio">100%</td>
            <td class="total-price">--</td>
            <td class="total-amount">{{ totalAmount }} 元</td>
            <td class="total-cost-ratio">100%</td>
            <td v-if="currentMode === 'ai_preview'" colspan="2"></td>
            <td class="total-action"></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- 操作提示 Card -->
    <div class="operation-tips-card">
      <div class="tips-header">
        <t-icon name="lightbulb" class="tips-icon" />
        <span class="tips-title">操作提示</span>
      </div>
      <ul class="tips-list">
        <li class="tip-item">
          <span class="tip-text">支持拖拽排序调整原料顺序</span>
        </li>
        <li class="tip-item">
          <span class="tip-text">双击原料名称可直接搜索并匹配系统原料</span>
        </li>
        <li class="tip-item">
          <span class="tip-text">点击单价可调整，调整后显示"调"标签，按↩可撤销</span>
        </li>
        <li class="tip-item">
          <span class="tip-text">含量比实时计算，用量变更后自动刷新</span>
        </li>
        <li class="tip-item">
          <span class="tip-text">批量选择：勾选多行后可进行批量删除、上移、下移</span>
        </li>
      </ul>
    </div>

    <!-- Excel 导入对话框 -->
    <t-dialog
      v-model:visible="showExcelDialog"
      header="Excel 批量导入原料"
      :close-on-overlay-click="true"
      :close-on-esc-keydown="true"
      width="600px"
    >
      <div class="excel-import-dialog">
        <div
          class="upload-zone"
          :class="{ 'drag-over': isDragOverDialog }"
          @click="triggerFileInput"
          @dragover.prevent="handleDragOverDialog"
          @dragleave="handleDragLeaveDialog"
          @drop.prevent="handleDropDialog"
        >
          <input ref="dialogFileInputRef" type="file" accept=".xlsx,.xls" style="display: none" @change="handleFileSelect" />
          <div class="upload-icon">
            <t-icon name="upload" size="32px" />
          </div>
          <p class="upload-text">拖拽 Excel 文件到此处，或点击选择文件</p>
          <p class="upload-hint">支持格式：.xlsx, .xls，最大文件大小：10MB</p>
        </div>

        <div class="template-info">
          <t-icon name="file-excel" size="14px" />
          <span>Excel 模板说明：</span>
          <a class="download-template-link" @click="handleDownloadTemplate">下载模板</a>
        </div>

        <div v-if="importPreview.length > 0" class="preview-area">
          <h4 class="preview-title">导入预览</h4>
          <t-table :data="importPreview" :columns="previewColumns" row-key="index" size="small" />
          <p class="preview-summary">
            共 {{ importPreview.length }} 条，匹配成功 {{ matchedCount }} 条，未匹配 {{ unmatchedCount }} 条
          </p>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <t-button variant="outline" @click="showExcelDialog = false">取消</t-button>
          <t-button theme="primary" :disabled="importPreview.length === 0" @click="handleConfirmImport">导入</t-button>
        </div>
      </template>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useMaterialStore } from '@/stores/material';
import { MessagePlugin } from 'tdesign-vue-next';

interface SelectOption {
  id: string;
  name: string;
  code: string;
  unit: string;
  materialType: string;
  unitPrice?: number | null;
  raw?: boolean;
}

export interface UnifiedMaterialItem {
  _id?: string;
  materialId?: string;
  materialName?: string;
  quantity: number;
  unitPrice?: number;
  originalUnitPrice?: number;
  amount?: number;
  isPriceAdjusted?: boolean;
  adjustedPrice?: number;
  originalName?: string;
  matched?: boolean;
  confidence?: number;
}

interface Props {
  materials: UnifiedMaterialItem[];
  mode?: 'edit' | 'ai_preview';
  showCost?: boolean;
  selectable?: boolean;
}

interface Emits {
  (e: 'update:materials', value: UnifiedMaterialItem[]): void;
  (e: 'add', row: UnifiedMaterialItem): void;
  (e: 'remove', index: number): void;
  (e: 'reorder', fromIndex: number, toIndex: number): void;
  (e: 'match', index: number, materialId: string): void;
  (e: 'batch-action', action: string, indices: number[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'edit',
  showCost: true,
  selectable: true,
});

const emit = defineEmits<Emits>();

const materialStore = useMaterialStore();

const currentMode = ref<'edit' | 'ai_preview'>(props.mode);
const searchKeyword = ref('');
const selectedRows = ref<number[]>([]);
const materialSelectLoading = ref(false);
const materialSearchKeyword = ref('');
const highlightRowIdx = ref<number | null>(null);

const showExcelDialog = ref(false);
const isDragOverDialog = ref(false);
const dialogFileInputRef = ref<HTMLInputElement | null>(null);
const importPreview = ref<UnifiedMaterialItem[]>([]);

const tableContainerRef = ref<HTMLElement | null>(null);

let rowIdCounter = 0;
const generateRowId = () => `__row_${++rowIdCounter}_${Date.now()}`;

const displayMaterials = computed({
  get: () => {
    if (props.materials.length === 0) {
      return [createEmptyRow()];
    }
    return props.materials;
  },
  set: (value: UnifiedMaterialItem[]) => {
    emit('update:materials', value);
  },
});

const createEmptyRow = (): UnifiedMaterialItem => ({
  _id: generateRowId(),
  materialId: undefined,
  materialName: '',
  quantity: 0,
  unitPrice: undefined,
  isPriceAdjusted: false,
  matched: false,
});

const totalQuantity = computed(() => {
  const total = displayMaterials.value.reduce((sum, row) => sum + (row.quantity || 0), 0);
  return total.toFixed(2);
});

const totalAmount = computed(() => {
  const total = displayMaterials.value.reduce((sum, row) => sum + (calculateAmountValue(row) || 0), 0);
  return total.toFixed(2);
});

const calculateRatioValue = (quantity: number): string => {
  const total = displayMaterials.value.reduce((sum, row) => sum + (row.quantity || 0), 0);
  if (total === 0) return '--';
  return ((quantity / total) * 100).toFixed(2);
};

const calculateRatio = (quantity: number): string => {
  const ratio = calculateRatioValue(quantity);
  return ratio === '--' ? '--' : `${ratio}%`;
};

const calculateAmountValue = (row: UnifiedMaterialItem): number => {
  if (row.quantity == null || row.unitPrice == null) return 0;
  return Number((row.quantity / 1000 * row.unitPrice).toFixed(4));
};

const calculateAmount = (row: UnifiedMaterialItem): string => {
  const amount = calculateAmountValue(row);
  return amount > 0 ? `¥${amount.toFixed(2)}` : '--';
};

const calculateCostRatio = (row: UnifiedMaterialItem): string => {
  const amount = calculateAmountValue(row);
  if (amount <= 0) return '--';
  const total = displayMaterials.value.reduce((sum, r) => sum + calculateAmountValue(r), 0);
  if (total <= 0) return '--';
  return ((amount / total) * 100).toFixed(2) + '%';
};

const isAllChecked = computed(() => {
  return displayMaterials.value.length > 0 && selectedRows.value.length === displayMaterials.value.length;
});

const isIndeterminate = computed(() => {
  return selectedRows.value.length > 0 && selectedRows.value.length < displayMaterials.value.length;
});

watch(() => props.mode, (newMode) => {
  currentMode.value = newMode;
});

watch(currentMode, (newMode) => {
  if (newMode !== props.mode) {
    // ignore mode drift
  }
});

const handleSearch = () => {
};

const handleFilter = () => {
};

const handleAddRow = () => {
  const newRow = createEmptyRow();
  displayMaterials.value = [...displayMaterials.value, newRow];
  emit('add', newRow);
};

const handleDeleteRow = (index: number) => {
  if (displayMaterials.value.length <= 1) {
    MessagePlugin.warning('至少保留一行原料');
    return;
  }
  const newList = [...displayMaterials.value];
  newList.splice(index, 1);
  displayMaterials.value = newList;
  selectedRows.value = selectedRows.value.filter(i => i !== index).map(i => i > index ? i - 1 : i);
  emit('remove', index);
};

const handleSelectAll = (checked: boolean) => {
  if (checked) {
    selectedRows.value = displayMaterials.value.map((_, index) => index);
  } else {
    selectedRows.value = [];
  }
};

const toggleSelect = (index: number) => {
  const idx = selectedRows.value.indexOf(index);
  if (idx > -1) {
    selectedRows.value.splice(idx, 1);
  } else {
    selectedRows.value.push(index);
  }
};

const handleMaterialSearch = (keyword: string, _index: number) => {
  materialSearchKeyword.value = keyword;
  materialSelectLoading.value = true;
  setTimeout(() => {
    materialSelectLoading.value = false;
  }, 300);
};

const handleMaterialChange = (materialId: string, index: number) => {
  const material = materialStore.allMaterials.find(m => m.id === materialId);
  if (material) {
    const newList = [...displayMaterials.value];
    const existingAdjustedPrice = newList[index].adjustedPrice;
    newList[index] = {
      ...newList[index],
      materialId,
      materialName: material.name,
      unitPrice: existingAdjustedPrice ?? material.unitPrice ?? undefined,
      originalUnitPrice: material.unitPrice ?? undefined,
      isPriceAdjusted: existingAdjustedPrice != null && existingAdjustedPrice !== material.unitPrice,
    };
    displayMaterials.value = newList;
    emit('match', index, materialId);
  }
};

const handleQuantityChange = (_index: number) => {
};

const handlePriceChange = (price: number, index: number) => {
  const row = displayMaterials.value[index];
  const newList = [...displayMaterials.value];
  const isAdjusted = row.originalUnitPrice != null && price !== row.originalUnitPrice;
  newList[index] = {
    ...newList[index],
    unitPrice: price,
    isPriceAdjusted: isAdjusted,
    adjustedPrice: isAdjusted ? price : undefined,
  };
  displayMaterials.value = newList;
};

const handleRestorePrice = (index: number) => {
  const row = displayMaterials.value[index];
  if (row.originalUnitPrice != null) {
    const newList = [...displayMaterials.value];
    newList[index] = {
      ...newList[index],
      unitPrice: row.originalUnitPrice,
      isPriceAdjusted: false,
      adjustedPrice: undefined,
    };
    displayMaterials.value = newList;
    MessagePlugin.success('已恢复为原价');
  }
};

const handleBatchDelete = () => {
  if (selectedRows.value.length === 0) return;
  if (displayMaterials.value.length - selectedRows.value.length < 1) {
    MessagePlugin.warning('至少保留一行原料');
    return;
  }
  const indicesToDelete = [...selectedRows.value].sort((a, b) => b - a);
  let newList = [...displayMaterials.value];
  indicesToDelete.forEach(idx => {
    newList.splice(idx, 1);
  });
  displayMaterials.value = newList;
  selectedRows.value = [];
  emit('batch-action', 'delete', indicesToDelete);
  MessagePlugin.success(`已删除 ${indicesToDelete.length} 条`);
};

const handleBatchMoveUp = () => {
  if (selectedRows.value.length === 0) return;
  const sortedIndices = [...selectedRows.value].sort((a, b) => a - b);
  if (sortedIndices[0] === 0) {
    MessagePlugin.warning('选中的行已在最上方');
    return;
  }
  let newList = [...displayMaterials.value];
  sortedIndices.forEach(idx => {
    if (idx > 0) {
      const temp = newList[idx];
      newList[idx] = newList[idx - 1];
      newList[idx - 1] = temp;
    }
  });
  displayMaterials.value = newList;
  selectedRows.value = sortedIndices.map(idx => idx - 1);
  emit('batch-action', 'move-up', selectedRows.value);
};

const handleBatchMoveDown = () => {
  if (selectedRows.value.length === 0) return;
  const sortedIndices = [...selectedRows.value].sort((a, b) => b - a);
  if (sortedIndices[0] === displayMaterials.value.length - 1) {
    MessagePlugin.warning('选中的行已在最下方');
    return;
  }
  let newList = [...displayMaterials.value];
  sortedIndices.forEach(idx => {
    if (idx < displayMaterials.value.length - 1) {
      const temp = newList[idx];
      newList[idx] = newList[idx + 1];
      newList[idx + 1] = temp;
    }
  });
  displayMaterials.value = newList;
  selectedRows.value = sortedIndices.map(idx => idx + 1);
  emit('batch-action', 'move-down', selectedRows.value);
};

const handleMoveUp = () => {
  if (selectedRows.value.length === 0) return;
  const sortedIndices = [...selectedRows.value].sort((a, b) => a - b);
  if (sortedIndices[0] === 0) {
    MessagePlugin.warning('选中的行已在最上方');
    return;
  }
  handleBatchMoveUp();
};

const handleMoveDown = () => {
  if (selectedRows.value.length === 0) return;
  const sortedIndices = [...selectedRows.value].sort((a, b) => b - a);
  if (sortedIndices[0] === displayMaterials.value.length - 1) {
    MessagePlugin.warning('选中的行已在最下方');
    return;
  }
  handleBatchMoveDown();
};

let draggedIndex: number | null = null;

const handleDragStart = (event: DragEvent, index: number) => {
  draggedIndex = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
};

const handleDragOver = (_event: DragEvent, index: number) => {
  if (draggedIndex !== null && draggedIndex !== index) {
    // drag over different position
  }
};

const handleDrop = (_event: DragEvent, targetIndex: number) => {
  if (draggedIndex === null || draggedIndex === targetIndex) return;
  const newList = [...displayMaterials.value];
  const [draggedItem] = newList.splice(draggedIndex, 1);
  newList.splice(targetIndex, 0, draggedItem);
  displayMaterials.value = newList;
  emit('reorder', draggedIndex, targetIndex);
  draggedIndex = null;
};

const handleDragEnd = () => {
  draggedIndex = null;
};

const handleExcelImport = () => {
  showExcelDialog.value = true;
  importPreview.value = [];
};

const triggerFileInput = () => {
  dialogFileInputRef.value?.click();
};

const handleDragOverDialog = (event: DragEvent) => {
  event.preventDefault();
  isDragOverDialog.value = true;
};

const handleDragLeaveDialog = () => {
  isDragOverDialog.value = false;
};

const handleDropDialog = (event: DragEvent) => {
  event.preventDefault();
  isDragOverDialog.value = false;
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    processFile(files[0]);
  }
};

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    processFile(input.files[0]);
  }
};

const processFile = (file: File) => {
  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    MessagePlugin.error('仅支持 .xlsx 和 .xls 格式的文件');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    MessagePlugin.error('文件大小不能超过 10MB');
    return;
  }
  MessagePlugin.info('正在解析 Excel 文件...');
  setTimeout(() => {
    importPreview.value = [
      { _id: generateRowId(), materialId: '1', materialName: '原料A', quantity: 100, unitPrice: 120, matched: true },
      { _id: generateRowId(), materialId: undefined, materialName: '未知原料', quantity: 50, matched: false },
    ];
    MessagePlugin.success('Excel 解析完成');
  }, 1000);
};

const matchedCount = computed(() => importPreview.value.filter(r => r.matched).length);
const unmatchedCount = computed(() => importPreview.value.filter(r => !r.matched).length);

const previewColumns = [
  { colKey: 'index', title: '#', width: 50 },
  { colKey: 'materialName', title: '原料名称', width: 150 },
  { colKey: 'quantity', title: '用量(g)', width: 100 },
  { colKey: 'matched', title: '状态', width: 100, cell: (_h: unknown, props: Record<string, unknown>) => {
    const row = props.row as UnifiedMaterialItem;
    return row.matched ? '✅ 匹配' : '⚠️ 未匹配';
  }},
];

const handleConfirmImport = () => {
  const matchedRows = importPreview.value.filter(r => r.matched);
  const newList = [...displayMaterials.value, ...matchedRows];
  displayMaterials.value = newList;
  showExcelDialog.value = false;
  MessagePlugin.success(`成功导入 ${matchedRows.length} 条原料`);
};

const handleDownloadTemplate = () => {
  MessagePlugin.info('正在下载模板...');
};

const getFilteredMaterials = (currentIndex: number): SelectOption[] => {
  const list: SelectOption[] = (materialStore.allMaterials ?? []).map(m => ({
    id: m.id,
    name: m.name,
    code: m.code,
    unit: m.unit,
    materialType: m.materialType,
    unitPrice: m.unitPrice,
  }));
  const selectedIds = displayMaterials.value
    .map((m, i) => i !== currentIndex && m.materialId ? m.materialId : null)
    .filter(Boolean) as string[];
  let result: SelectOption[] = list;
  if (selectedIds.length > 0) {
    const idSet = new Set(selectedIds);
    result = list.filter(m => !idSet.has(m.id));
  }
  const currentItem = displayMaterials.value[currentIndex];
  if (!materialSearchKeyword.value) {
    if (currentItem?.materialId && currentItem?.materialName && !result.find(m => m.id === currentItem.materialId)) {
      result = [{
        id: currentItem.materialId,
        name: currentItem.materialName,
        code: '',
        unit: 'g',
        materialType: '',
        raw: true,
      }, ...result];
    }
    if (!currentItem?.materialId && currentItem?.materialName) {
      result = [{
        id: `__pending_${currentIndex}`,
        name: currentItem.materialName + '（未匹配）',
        code: '',
        unit: 'g',
        materialType: '',
        raw: true,
      }, ...result];
    }
    return result;
  }
  const kw = materialSearchKeyword.value.toLowerCase();
  const filtered = result.filter(m => m.name.toLowerCase().includes(kw) || m.code.toLowerCase().includes(kw));
  if (currentItem?.materialId && currentItem?.materialName && !filtered.find(m => m.id === currentItem.materialId)) {
    filtered.unshift({
      id: currentItem.materialId,
      name: currentItem.materialName,
      code: '',
      unit: 'g',
      materialType: '',
      raw: true,
    });
  }
  if (!currentItem?.materialId && currentItem?.materialName) {
    filtered.unshift({
      id: `__pending_${currentIndex}`,
      name: currentItem.materialName + '（未匹配）',
      code: '',
      unit: 'g',
      materialType: '',
      raw: true,
    });
  }
  return filtered;
};
</script>

<style lang="scss" scoped>
.unified-material-table {
  width: 100%;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafbfc;
  border: 1px solid #e7e7e7;
  border-radius: 8px 8px 0 0;

  .toolbar-left {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .toolbar-right {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .search-input {
    width: 240px;
  }
}

.mode-switcher {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  background: #fff;
  border-left: 1px solid #e7e7e7;
  border-right: 1px solid #e7e7e7;
}

.table-container {
  overflow-x: auto;
  border: 1px solid #e7e7e7;
}

.materials-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  thead {
    background: #f5f7fa;

    th {
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      color: #333;
      border-bottom: 1px solid #e7e7e7;
      white-space: nowrap;
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid #f0f0f0;
      transition: background-color 0.2s;

      &:hover {
        background: #fafbfc;
      }

      &.row-selected {
        background: #e6f7ff;
      }

      &.row-highlight {
        background: #fffbe6;
      }

      &.empty-row {
        &:hover {
          background: transparent;
        }
      }
    }

    td {
      padding: 8px 16px;
      vertical-align: middle;
    }
  }

  tfoot {
    tr.total-row {
      background: #f5f7fa;
      font-weight: 600;

      td {
        padding: 12px 16px;
        border-top: 2px solid #e7e7e7;
      }
    }
  }

  .col-checkbox {
    width: 40px;
    text-align: center;
  }

  .col-index {
    width: 50px;
    text-align: center;
    color: #999;
  }

  .col-name {
    min-width: 200px;
  }

  .col-quantity {
    width: 120px;
  }

  .col-ratio {
    width: 100px;
    text-align: right;
  }

  .col-price {
    width: 140px;
  }

  .col-amount {
    width: 100px;
    text-align: right;
  }

  .col-cost-ratio {
    width: 100px;
    text-align: right;
  }

  .cost-ratio-value {
    color: #666;
    font-family: 'Monaco', 'Menlo', monospace;
  }

  .col-original {
    width: 150px;
  }

  .col-match {
    width: 100px;
  }

  .col-action {
    width: 60px;
    text-align: center;
  }

  .material-select {
    width: 100%;
  }

  .quantity-input {
    width: 100%;
  }

  .ratio-value {
    color: #666;
    font-family: 'Monaco', 'Menlo', monospace;
  }

  .price-cell {
    display: flex;
    align-items: center;
    gap: 4px;

    &.price-adjusted {
      .t-input {
        background: #fff7e6;
      }
    }

    .adjust-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-0-5) var(--space-1-5);
      background: #d97706;
      color: #fff;
      font-size: 10px;
      font-weight: 600;
      border-radius: 4px;
    }

    .restore-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      color: #999;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;

      &:hover {
        background: #f0f0f0;
        color: #333;
      }
    }
  }

  .amount-value {
    font-family: 'Monaco', 'Menlo', monospace;
    color: #333;
  }

  .original-name {
    color: #999;
    font-style: italic;
  }

  .empty-cell {
    padding: 32px 16px;
    text-align: center;
  }

  .add-first-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    border: 2px dashed #d9d9d9;
    background: transparent;
    color: #666;
    font-size: 14px;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;

    &:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  .total-label {
    text-align: left;
    font-weight: 600;
  }

  .total-quantity,
  .total-ratio,
  .total-amount {
    font-family: 'Monaco', 'Menlo', monospace;
  }

  .total-amount {
    color: #333;
    font-weight: 600;
  }
}

.operation-tips-card {
  margin-top: 16px;
  padding: 16px;
  background: #f0f5ff;
  border: 1px solid #adc6ff;
  border-radius: 8px;

  .tips-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;

    .tips-icon {
      color: #2462d8;
    }

    .tips-title {
      font-weight: 600;
      color: #333;
    }
  }

  .tips-list {
    list-style: none;
    margin: 0;
    padding: 0;

    .tip-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 4px 0;

      &::before {
        content: '•';
        color: #2462d8;
        font-weight: bold;
      }

      .tip-text {
        color: #666;
        line-height: 1.5;
      }
    }
  }
}

.excel-import-dialog {
  .upload-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    border: 2px dashed #d9d9d9;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover,
    &.drag-over {
      border-color: var(--color-primary);
      background: #f6ffed;
    }

    .upload-icon {
      color: #999;
      margin-bottom: 16px;
    }

    .upload-text {
      color: #333;
      font-size: 14px;
      margin-bottom: 8px;
    }

    .upload-hint {
      color: #999;
      font-size: 12px;
    }
  }

  .template-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    padding: 12px;
    background: #fafbfc;
    border-radius: 8px;
    font-size: 13px;
    color: #666;

    .download-template-link {
      color: var(--color-primary);
      cursor: pointer;
      text-decoration: underline;

      &:hover {
        color: #0d9a6d;
      }
    }
  }

  .preview-area {
    margin-top: 16px;

    .preview-title {
      margin-bottom: 12px;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }

    .preview-summary {
      margin-top: 12px;
      font-size: 13px;
      color: #666;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.material-option {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
}

.select-empty-tip {
  padding: 8px 0;
  text-align: center;
  color: #999;
  font-size: 12px;
}
</style>
