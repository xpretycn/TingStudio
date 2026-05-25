<template>
  <div class="material-table-core" :class="{ 'material-table-core--edit': mode === 'edit' }">

    <div class="card-header--materials">
      <div class="card-header-left">
        <h4 class="card-header-title">原料信息</h4>
        <span class="card-header-badge">{{ materials.length }} 种</span>
      </div>
      <button v-if="!batchMode" type="button" class="batch-mode-enter-btn" @click="enterBatchMode">
        <t-icon name="check-circle" size="14px" />
        批量操作
      </button>
    </div>

    <Transition name="batch-bar-slide">
      <div v-if="batchMode && selectedIndices.size > 0" class="batch-action-bar">
        <div class="batch-info">
          <span class="batch-count"><strong>{{ selectedIndices.size }}</strong> 项已选择</span>
          <div class="batch-divider"></div>
          <div class="batch-buttons">
            <button class="batch-action-btn" :disabled="!canMoveUp" @click="batchMoveUp">
              <t-icon name="move-up" size="14px" />
              上移
            </button>
            <button class="batch-action-btn" :disabled="!canMoveDown" @click="batchMoveDown">
              <t-icon name="move-down" size="14px" />
              下移
            </button>
            <t-popconfirm theme="danger" :content="`确定要删除所选的 ${selectedIndices.size} 种原料吗？`" @confirm="batchDelete">
              <button class="batch-action-btn">
                <t-icon name="delete" size="14px" />
                批量删除
              </button>
            </t-popconfirm>
          </div>
        </div>
        <button class="batch-cancel-btn" @click="exitBatchMode">取消</button>
      </div>
    </Transition>

    <div class="table-scroll-wrapper">
      <div class="materials-table">
        <!-- 表头 -->
        <div class="materials-header" :style="{ gridTemplateColumns: gridColumns }">
          <span v-if="batchMode" class="col-check">
            <t-checkbox :checked="isAllSelected" :indeterminate="isIndeterminate" @change="toggleSelectAll" />
          </span>
          <span class="col-name">原料名称</span>
          <span class="col-version">版本</span>
          <span class="col-qty col-header-unit">用量(g)</span>
          <span class="col-price">单价(元/kg)</span>
          <span class="col-ratio col-header-unit">含量比</span>
          <template v-if="mode === 'edit'">
            <span class="col-nutrition col-header-unit">能量</span>
            <span class="col-nutrition col-header-unit">蛋白质</span>
            <span class="col-nutrition col-header-unit">脂肪</span>
            <span class="col-nutrition col-header-unit">碳水</span>
            <span class="col-nutrition col-header-unit">钠</span>
          </template>
          <span class="col-subtotal">小计</span>
          <span v-if="mode === 'parse'" class="col-status">状态</span>
          <span class="col-action">操作</span>
        </div>
        <!-- 表体 -->
        <div v-for="(row, idx) in materials" :key="idx" class="materials-row"
          :style="{ gridTemplateColumns: gridColumns }" :class="{
            'materials-row--warn': getBasePrice(idx) == null,
            'materials-row--adjusted': isPriceAdjusted(idx),
            'materials-row--qty-adjusted': isQtyAdjusted(idx),
            'materials-row--restore-flash': restoreFlashIdx === idx,
            'materials-row--new': isNewRow(idx),
            'materials-row--selected': batchMode && selectedIndices.has(idx),
          }">
          <template v-if="isNewRow(idx)">
            <t-select :value="row.materialId || undefined" placeholder="搜索原料名称..." filterable
              :filter="filterMaterialsByName"
              :style="batchMode ? 'grid-column: 2 / -1; width: 100%;' : 'grid-column: 1 / -1; width: 100%;'"
              :popup-props="{ appendToBody: true }" @change="(val: string) => onNewMaterialSelected(idx, val)">
              <t-option v-for="mat in availableMaterialsForSelect" :key="mat.id" :value="mat.id" :label="mat.name" />
            </t-select>
          </template>
          <template v-else>
            <span v-if="batchMode" class="col-check" @click.stop="toggleSelectRow(idx)">
              <t-checkbox :checked="selectedIndices.has(idx)" />
            </span>
            <span class="col-name">
              <template v-if="mode === 'edit'">
                <t-select :value="row.materialId || undefined" placeholder="搜索原料" filterable
                  :filter="filterMaterialsByName" class="material-name-select" :popup-props="{ appendToBody: true }"
                  @change="(val: string) => onMaterialChange(idx, val)">
                  <template #valueDisplay>
                    <div v-if="row.materialId" class="material-name-with-tag">
                      <span class="material-name-text">{{ row.materialName }}</span>
                      <t-tag :class="isSupplement(idx) ? 'material-type-tag--supplement' : 'material-type-tag--herb'"
                        size="small">
                        {{ isSupplement(idx) ? '辅料' : '药材' }}
                      </t-tag>
                    </div>
                  </template>
                  <t-option v-for="mat in availableMaterialsForSelect" :key="mat.id" :value="mat.id" :label="mat.name">
                    <div class="material-option">
                      <span>{{ mat.name }}</span>
                      <t-tag
                        :class="mat.materialType === 'supplement' ? 'material-type-tag--supplement' : 'material-type-tag--herb'"
                        size="small">
                        {{ mat.materialType === 'supplement' ? '辅料' : '药材' }}
                      </t-tag>
                    </div>
                  </t-option>
                </t-select>
              </template>
              <template v-else>
                <span class="col-name-text">{{ row.materialName || '(待选择)' }}</span>
                <t-tag :class="isSupplement(idx) ? 'material-type-tag--supplement' : 'material-type-tag--herb'"
                  size="small">
                  {{ isSupplement(idx) ? '辅料' : '药材' }}
                </t-tag>
              </template>
            </span>
            <span class="col-version">
              <template v-if="row.materialId && props.materialVersions[row.materialId]">
                <span v-if="props.materialVersions[row.materialId].isLatest" class="version-tag version-tag--latest">
                  v{{ props.materialVersions[row.materialId].currentVersion }}
                </span>
                <t-tooltip v-else :content="`此原料已更新至 v${props.materialVersions[row.materialId].latestVersion}`">
                  <span class="version-tag version-tag--outdated">
                    v{{ props.materialVersions[row.materialId].currentVersion }}
                  </span>
                </t-tooltip>
              </template>
              <span v-else class="version-tag version-tag--none">—</span>
            </span>
            <div class="col-qty-edit">
              <t-input-number :model-value="row.quantity" @change="(val: number) => handleQtyChange(idx, val)" :min="0"
                :decimal-places="2" size="small" theme="normal" style="width: 72px"
                :class="{ 'col-qty-input--invalid': !row.quantity || row.quantity <= 0 }" />
            </div>
            <span class="col-price" v-if="getBasePrice(idx) == null">
              <span class="col-price-missing">未录入</span>
            </span>
            <div class="col-price-edit" v-else>
              <t-input-number :model-value="getEffectivePrice(idx)"
                @change="(val: number) => handlePriceAdjust(idx, val)" :min="0" :precision="2" size="small"
                theme="normal" style="width: 80px" />
            </div>
            <span class="col-ratio" :class="{ 'col-ratio--supplement': isSupplement(idx) }">
              {{ calculateRatio(idx) }}
            </span>
            <template v-if="mode === 'edit'">
              <span class="col-nutrition">{{ getNutritionValue(idx, 'energy') }}</span>
              <span class="col-nutrition">{{ getNutritionValue(idx, 'protein') }}</span>
              <span class="col-nutrition">{{ getNutritionValue(idx, 'fat') }}</span>
              <span class="col-nutrition">{{ getNutritionValue(idx, 'carbohydrate') }}</span>
              <span class="col-nutrition">{{ getNutritionValue(idx, 'sodium') }}</span>
            </template>
            <span class="col-subtotal" :class="{ 'col-subtotal--missing': getSubtotal(idx) == null }">
              {{ getSubtotal(idx) != null ? '¥' + getSubtotal(idx)!.toFixed(2) : '—' }}
            </span>
            <span v-if="mode === 'parse'" class="col-status">
              <t-tag v-if="row.matched" theme="success" variant="light" size="small">已匹配</t-tag>
              <template v-else>
                <t-tag theme="warning" variant="light" size="small">未匹配</t-tag>
                <button type="button" class="quick-add-material-btn" @click="$emit('quickAddMaterial', row)"
                  title="快速录入此原料">
                  <t-icon name="add" size="12px" />
                </button>
              </template>
            </span>
            <span class="col-action">
              <span v-if="isQtyAdjusted(idx)" class="col-adjust-badge col-adjust-badge--qty"
                :title="'原始用量: ' + (materials[idx]?.originalQuantity ?? '--')">
                <svg viewBox="0 0 12 12" width="10" height="10">
                  <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9L3 11L3.5 7.5L1 5L4.5 4.5Z" fill="#3b82f6" />
                </svg>
                量
              </span>
              <button v-if="isQtyAdjusted(idx)" type="button" class="col-restore-btn"
                :class="{ 'col-restore-btn--flash': restoreFlashIdx === idx }" @click="handleRestoreQty(idx)"
                :title="'恢复原始用量: ' + (materials[idx]?.originalQuantity ?? '--')">
                <t-icon name="rollback" size="12px" />
              </button>
              <span v-if="isPriceAdjusted(idx)" class="col-adjust-badge"
                :title="'基价: ¥' + (getBasePrice(idx) ?? '--') + '/kg'">
                <svg viewBox="0 0 12 12" width="10" height="10">
                  <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9L3 11L3.5 7.5L1 5L4.5 4.5Z" fill="#d97706" />
                </svg>
                价
              </span>
              <button v-if="isPriceAdjusted(idx)" type="button" class="col-restore-btn"
                :class="{ 'col-restore-btn--flash': restoreFlashIdx === idx }" @click="handleRestorePrice(idx)"
                :title="'恢复基价: ¥' + (getBasePrice(idx) ?? '--') + '/kg'">
                <t-icon name="rollback" size="12px" />
              </button>
              <t-popconfirm content="确认移除此原料？" @confirm="removeMaterial(idx)">
                <button type="button" class="remove-material-btn" title="移除此原料">
                  <t-icon name="delete" size="12px" />
                </button>
              </t-popconfirm>
            </span>
          </template>
        </div>
        <!-- 添加原料按钮 -->
        <div class="materials-add-row">
          <button class="add-material-inline-btn" @click="addMaterial">
            <t-icon name="add" size="14px" style="color: var(--color-primary)" />
            添加原料
          </button>
        </div>
        <!-- 系数栏 -->
        <div v-if="mode === 'edit'" class="coefficient-bar">
          <div class="coeff-item">
            <label class="coeff-label">主料系数</label>
            <t-input-number :model-value="ratioFactor" @update:model-value="$emit('update:ratioFactor', $event)"
              :min="0.15" :max="0.25" :decimal-places="2" size="small" theme="normal" style="width: 100px" />
          </div>
          <div class="coeff-item">
            <label class="coeff-label">辅料系数</label>
            <t-input-number :model-value="supplementRatioFactor"
              @update:model-value="$emit('update:supplementRatioFactor', $event)" :min="0.5" :max="1.5"
              :decimal-places="2" size="small" theme="normal" style="width: 100px" />
          </div>
          <div class="coeff-divider"></div>
          <div class="coeff-item">
            <label class="coeff-label">成品重量(g)</label>
            <t-input-number :model-value="finishedWeight" @update:model-value="$emit('update:finishedWeight', $event)"
              :min="0" :decimal-places="1" size="small" theme="normal" style="width: 120px" placeholder="输入成品重量" />
          </div>
        </div>
        <!-- 营养数据汇总区 -->
        <div v-if="materials.length > 0" class="nutrition-summary-zone">
          <div class="nsz-row nsz-row--header" :style="{ gridTemplateColumns: gridColumns }">
            <span v-if="batchMode" class="col-check"></span>
            <span class="col-unit-header">营养成分</span>
            <span class="col-unit-header"></span>
            <span class="col-unit-header">总重(g)</span>
            <span class="col-unit-header">¥/kg</span>
            <span class="col-unit-header">含量比(%)</span>
            <template v-if="mode === 'edit'">
              <span class="col-unit-header">能量(kJ)</span>
              <span class="col-unit-header">蛋白质(g)</span>
              <span class="col-unit-header">脂肪(g)</span>
              <span class="col-unit-header">碳水(g)</span>
              <span class="col-unit-header">钠(mg)</span>
            </template>
            <span class="col-unit-header">¥</span>
            <span v-if="mode === 'parse'" class="col-unit-header"></span>
            <span class="col-unit-header"></span>
          </div>
          <div class="nsz-row nsz-row--total" :style="{ gridTemplateColumns: gridColumns }">
            <span v-if="batchMode" class="col-check"></span>
            <span class="col-total-label">合计</span>
            <span class="col-version"></span>
            <span class="col-total-qty">{{ totalQuantity }} g</span>
            <span class="col-price"></span>
            <span class="col-ratio col-ratio--total" :class="'ratio-level--' + ratioValidation.level">
              {{ totalRatioDisplay }}
            </span>
            <template v-if="mode === 'edit'">
              <span class="col-nutrition col-nutrition--total">{{ nutritionSummary.energy }}</span>
              <span class="col-nutrition col-nutrition--total">{{ nutritionSummary.protein }}</span>
              <span class="col-nutrition col-nutrition--total">{{ nutritionSummary.fat }}</span>
              <span class="col-nutrition col-nutrition--total">{{ nutritionSummary.carbohydrate }}</span>
              <span class="col-nutrition col-nutrition--total">{{ nutritionSummary.sodium }}</span>
            </template>
            <span class="col-subtotal col-subtotal--total" :class="{ 'cost-incomplete': hasMissingPrices }">
              ¥{{ totalAmount.toFixed(2) }}
            </span>
            <span v-if="mode === 'parse'" class="col-status"></span>
            <span class="col-action"></span>
          </div>
          <template v-if="mode === 'edit'">
            <div class="nsz-row nsz-row--nrv" :style="{ gridTemplateColumns: gridColumns }">
              <span v-if="batchMode" class="col-check"></span>
              <span class="col-total-label col-total-label--nrv">NRV</span>
              <span class="col-version"></span>
              <span class="col-total-qty"></span>
              <span class="col-price"></span>
              <span class="col-ratio"></span>
              <span class="col-nutrition col-nutrition--nrv">{{ NRV_REFERENCE.energy }}</span>
              <span class="col-nutrition col-nutrition--nrv">{{ NRV_REFERENCE.protein }}</span>
              <span class="col-nutrition col-nutrition--nrv">{{ NRV_REFERENCE.fat }}</span>
              <span class="col-nutrition col-nutrition--nrv">{{ NRV_REFERENCE.carbohydrate }}</span>
              <span class="col-nutrition col-nutrition--nrv">{{ NRV_REFERENCE.sodium }}</span>
              <span class="col-subtotal"></span>
              <span class="col-action"></span>
            </div>
            <div class="nsz-row nsz-row--nrv-pct" :style="{ gridTemplateColumns: gridColumns }">
              <span v-if="batchMode" class="col-check"></span>
              <span class="col-total-label col-total-label--nrv-pct">NRV%</span>
              <span class="col-version"></span>
              <span class="col-total-qty"></span>
              <span class="col-price"></span>
              <span class="col-ratio"></span>
              <span class="col-nutrition col-nutrition--nrv-pct">{{ nutritionNrvPercent.energy }}</span>
              <span class="col-nutrition col-nutrition--nrv-pct">{{ nutritionNrvPercent.protein }}</span>
              <span class="col-nutrition col-nutrition--nrv-pct">{{ nutritionNrvPercent.fat }}</span>
              <span class="col-nutrition col-nutrition--nrv-pct">{{ nutritionNrvPercent.carbohydrate }}</span>
              <span class="col-nutrition col-nutrition--nrv-pct">{{ nutritionNrvPercent.sodium }}</span>
              <span class="col-subtotal"></span>
              <span class="col-action"></span>
            </div>
          </template>
        </div>
        <!-- 提交校验 -->
        <div v-if="materials.length > 0 && ratioValidation.level !== 'none'" class="ratio-validation-bar"
          :class="'ratio-validation-bar--' + ratioValidation.level">
          <div class="rv-left">
            <t-icon :name="ratioValidationIcon" size="14px" />
            <span class="rv-badge" :class="'rv-badge--' + ratioValidation.level">{{ ratioValidation.badgeText }}</span>
            <span class="rv-desc">{{ ratioValidation.description }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { MessagePlugin } from "tdesign-vue-next";
import { useMaterialStore } from "@/stores/material";
import { nutritionApi } from "@/api/nutrition";
import type { Material } from "@/api/material";

export interface MaterialTableRow {
  materialId?: string;
  materialName: string;
  quantity: number;
  originalQuantity?: number;
  unit?: string;
  basePrice?: number | null;
  adjustedPrice?: number | null;
  isPriceAdjusted?: boolean;
  isQtyAdjusted?: boolean;
  matched?: boolean;
  materialType?: "herb" | "supplement";
}

interface NutritionPer100g {
  energy?: number;
  protein?: number;
  fat?: number;
  carbohydrate?: number;
  sodium?: number;
}

const props = withDefaults(
  defineProps<{
    materials: MaterialTableRow[];
    mode: "parse" | "edit";
    finishedWeight: number;
    ratioFactor: number;
    supplementRatioFactor: number;
    supplementPriceMap?: Record<string, number>;
    materialVersions?: Record<string, { currentVersion: number; latestVersion: number; isLatest: boolean }>;
  }>(),
  {
    supplementPriceMap: () => ({}),
    materialVersions: () => ({}),
  }
);

const emit = defineEmits<{
  (e: "update:materials", value: MaterialTableRow[]): void;
  (e: "update:ratioFactor", value: number): void;
  (e: "update:supplementRatioFactor", value: number): void;
  (e: "update:finishedWeight", value: number): void;
  (e: "quickAddMaterial", row: MaterialTableRow): void;
  (e: "materialChange", idx: number, materialId: string): void;
}>();

const materialStore = useMaterialStore();

const batchMode = ref(false);
const selectedIndices = ref<Set<number>>(new Set());
const newMaterialSelectIdx = ref<number | null>(null);
const restoreFlashIdx = ref<number | null>(null);
const nutritionCache = ref<Record<string, NutritionPer100g>>({});
const nutritionLoading = ref<Set<string>>(new Set());

const parseGridBase = "1fr 60px 85px 85px 80px 70px 70px 110px";
const parseGridBatch = "36px 1fr 60px 80px 110px 80px 72px 90px 50px";
const editGridBase = "1fr 60px 80px 110px 80px 90px 90px 80px 90px 80px 90px 110px";
const editGridBatch = "36px 1fr 60px 80px 110px 80px 90px 90px 80px 90px 80px 90px 100px";

const gridColumns = computed(() => {
  if (props.mode === "edit") {
    return batchMode.value ? editGridBatch : editGridBase;
  }
  return batchMode.value ? parseGridBatch : parseGridBase;
});

const availableMaterialsForSelect = computed(() => {
  return materialStore.allMaterials ?? [];
});

const isAllSelected = computed(() => {
  if (!props.materials.length) return false;
  return props.materials.every((_: MaterialTableRow, idx: number) =>
    selectedIndices.value.has(idx)
  );
});

const isIndeterminate = computed(() => {
  if (!props.materials.length) return false;
  const count = props.materials.filter((_: MaterialTableRow, idx: number) =>
    selectedIndices.value.has(idx)
  ).length;
  return count > 0 && count < props.materials.length;
});

const canMoveUp = computed(() => {
  if (selectedIndices.value.size === 0) return false;
  const sorted = [...selectedIndices.value].sort((a, b) => a - b);
  return sorted[0] > 0;
});

const canMoveDown = computed(() => {
  if (selectedIndices.value.size === 0) return false;
  if (!props.materials.length) return false;
  const sorted = [...selectedIndices.value].sort((a, b) => a - b);
  return sorted[sorted.length - 1] < props.materials.length - 1;
});

const totalQuantity = computed(() => {
  return props.materials.reduce(
    (sum: number, row: MaterialTableRow) => sum + (row.quantity || 0),
    0
  );
});

const totalAmount = computed(() => {
  return props.materials.reduce((sum: number, _: MaterialTableRow, idx: number) => {
    const sub = getSubtotal(idx);
    return sum + (sub || 0);
  }, 0);
});

const hasMissingPrices = computed(() => {
  return props.materials.some((_: MaterialTableRow, idx: number) => getBasePrice(idx) == null);
});

const ZERO_THRESHOLDS: Record<string, number> = {
  energy: 17,
  protein: 0.5,
  fat: 0.5,
  carbohydrate: 0.5,
  sodium: 5,
};

const nutritionSummary = computed(() => {
  if (props.mode !== "edit") {
    return { energy: "--", protein: "--", fat: "--", carbohydrate: "--", sodium: "--" };
  }
  if (!props.finishedWeight || props.finishedWeight <= 0) {
    return { energy: "--", protein: "--", fat: "--", carbohydrate: "--", sodium: "--" };
  }

  let protein = 0, fat = 0, carbohydrate = 0, sodium = 0;
  let hasAny = false;

  for (let i = 0; i < props.materials.length; i++) {
    const row = props.materials[i];
    if (!row.materialId || !row.quantity || row.quantity <= 0) continue;
    const n = nutritionCache.value[row.materialId];
    if (!n) continue;
    hasAny = true;
    const factor = isSupplement(i) ? (props.supplementRatioFactor || 1.0) : (props.ratioFactor || 0.18);
    const ratio = (row.quantity / props.finishedWeight) * factor;
    if (n.protein != null) protein += n.protein * ratio;
    if (n.fat != null) fat += n.fat * ratio;
    if (n.carbohydrate != null) carbohydrate += n.carbohydrate * ratio;
    if (n.sodium != null) sodium += n.sodium * ratio;
  }

  if (!hasAny) return { energy: "--", protein: "--", fat: "--", carbohydrate: "--", sodium: "--" };

  let energy = Math.round((protein * 17 + fat * 37 + carbohydrate * 17) * 100) / 100;

  if (energy <= ZERO_THRESHOLDS.energy) energy = 0;
  if (protein <= ZERO_THRESHOLDS.protein) protein = 0;
  if (fat <= ZERO_THRESHOLDS.fat) fat = 0;
  if (carbohydrate <= ZERO_THRESHOLDS.carbohydrate) carbohydrate = 0;
  if (sodium <= ZERO_THRESHOLDS.sodium) sodium = 0;

  if (protein === 0 || fat === 0 || carbohydrate === 0) {
    energy = Math.round((protein * 17 + fat * 37 + carbohydrate * 17) * 100) / 100;
  }

  return {
    energy: energy.toFixed(1),
    protein: protein.toFixed(1),
    fat: fat.toFixed(1),
    carbohydrate: carbohydrate.toFixed(1),
    sodium: sodium.toFixed(1),
  };
});

const NRV_REFERENCE: Record<string, number> = {
  energy: 8400,
  protein: 60,
  fat: 60,
  carbohydrate: 300,
  sodium: 2000,
};

const nutritionNrvPercent = computed(() => {
  if (props.mode !== "edit") {
    return { energy: "--", protein: "--", fat: "--", carbohydrate: "--", sodium: "--" };
  }
  const summary = nutritionSummary.value;
  const calc = (val: string, key: string) => {
    if (val === "--") return "--";
    const num = parseFloat(val);
    const ref = NRV_REFERENCE[key];
    if (!ref || !num) return "--";
    return (num / ref * 100).toFixed(1) + "%";
  };
  return {
    energy: calc(summary.energy, "energy"),
    protein: calc(summary.protein, "protein"),
    fat: calc(summary.fat, "fat"),
    carbohydrate: calc(summary.carbohydrate, "carbohydrate"),
    sodium: calc(summary.sodium, "sodium"),
  };
});

interface RatioValidationResult {
  level: "none" | "normal" | "warning" | "high_warning" | "error";
  totalRatio: number;
  badgeText: string;
  description: string;
}

const ratioValidation = computed<RatioValidationResult>(() => {
  if (!props.materials.length || !props.finishedWeight || props.finishedWeight <= 0) {
    return { level: "none", totalRatio: 0, badgeText: "", description: "" };
  }

  let totalRatio = 0;
  for (let i = 0; i < props.materials.length; i++) {
    const row = props.materials[i];
    if (!row.quantity || row.quantity <= 0) continue;
    const baseRatio = row.quantity / props.finishedWeight;
    const factor = isSupplement(i) ? (props.supplementRatioFactor || 1.0) : (props.ratioFactor || 0.18);
    const ratio = Math.round(baseRatio * factor * 100000) / 100000;
    totalRatio += ratio;
  }
  totalRatio = Math.round(totalRatio * 100000) / 100000;

  const t = { normalLow: 0.98, normalHigh: 1.02, warningLow: 0.95, warningHigh: 1.05, highWarningLow: 0.92, highWarningHigh: 1.08 };

  let level: RatioValidationResult["level"];
  if (totalRatio >= t.normalLow && totalRatio <= t.normalHigh) {
    level = "normal";
  } else if (
    (totalRatio >= t.warningLow && totalRatio < t.normalLow) ||
    (totalRatio > t.normalHigh && totalRatio <= t.warningHigh)
  ) {
    level = "warning";
  } else if (
    (totalRatio >= t.highWarningLow && totalRatio < t.warningLow) ||
    (totalRatio > t.warningHigh && totalRatio <= t.highWarningHigh)
  ) {
    level = "high_warning";
  } else {
    level = "error";
  }

  const deviation = ((totalRatio - 1) * 100).toFixed(2);
  const messages: Record<string, { badgeText: string; description: string }> = {
    normal: { badgeText: "通过", description: `含量比总和 ${totalRatio.toFixed(5)}（偏差 ${deviation}%），在正常范围内` },
    warning: { badgeText: "预警", description: `含量比总和 ${totalRatio.toFixed(5)}，偏差 ${deviation}%，建议检查用量` },
    high_warning: { badgeText: "警告", description: `含量比总和 ${totalRatio.toFixed(5)}，偏差 ${deviation}%，需人工审核确认` },
    error: { badgeText: "失败", description: `含量比总和 ${totalRatio.toFixed(5)}，偏差 ${deviation}%，超出允许范围，请修正用量` },
  };

  const msg = messages[level];
  return { level, totalRatio, ...msg };
});

const totalRatioDisplay = computed(() => {
  if (!props.finishedWeight || props.finishedWeight <= 0) return "—";
  return (ratioValidation.value.totalRatio * 100).toFixed(3) + "%";
});

const ratioValidationIcon = computed(() => {
  const icons: Record<string, string> = {
    none: "help-circle",
    normal: "check-circle-filled",
    warning: "error-circle",
    high_warning: "error-circle",
    error: "close-circle-filled",
  };
  return icons[ratioValidation.value.level] || "info-circle";
});

function isNewRow(idx: number): boolean {
  if (props.mode === "edit") return false;
  const row = props.materials[idx];
  return !row.materialName && newMaterialSelectIdx.value === idx;
}

function isSupplement(idx: number): boolean {
  const row = props.materials[idx];
  if (!row) return false;
  if (row.materialType) return row.materialType === "supplement";
  if (row.materialId) {
    const mat = materialStore.allMaterials.find((m: Material) => m.id === row.materialId);
    if (mat) return mat.materialType === "supplement";
  }
  return false;
}

function getBasePrice(idx: number): number | null {
  const row = props.materials[idx];
  if (!row) return null;
  if (row.basePrice != null) return row.basePrice;
  if (row.materialId) {
    const mat = materialStore.allMaterials.find((m: Material) => m.id === row.materialId);
    if (mat?.unitPrice != null) return mat.unitPrice;
    if (props.supplementPriceMap[row.materialId] != null) return props.supplementPriceMap[row.materialId];
  }
  return null;
}

function getEffectivePrice(idx: number): number | undefined {
  const row = props.materials[idx];
  if (!row) return undefined;
  if (row.adjustedPrice != null) return row.adjustedPrice;
  return getBasePrice(idx) ?? undefined;
}

function isPriceAdjusted(idx: number): boolean {
  const row = props.materials[idx];
  if (!row) return false;
  return row.isPriceAdjusted === true;
}

function isQtyAdjusted(idx: number): boolean {
  const row = props.materials[idx];
  if (!row) return false;
  return row.isQtyAdjusted === true;
}

function getSubtotal(idx: number): number | null {
  const row = props.materials[idx];
  if (!row || !row.quantity) return null;
  const price = getEffectivePrice(idx);
  if (price == null) return null;
  return Number((row.quantity / 1000 * price).toFixed(4));
}

function calculateRatio(idx: number): string {
  const row = props.materials[idx];
  if (!row || !props.finishedWeight || props.finishedWeight <= 0) return "—";
  if (!row.quantity || row.quantity <= 0) return "—";
  const factor = isSupplement(idx)
    ? (props.supplementRatioFactor || 1.0)
    : (props.ratioFactor || 0.18);
  const ratio = (row.quantity / props.finishedWeight) * factor;
  return (ratio * 100).toFixed(3) + "%";
}

function getNutritionValue(idx: number, field: keyof NutritionPer100g): string {
  if (props.mode !== "edit") return "--";
  const row = props.materials[idx];
  if (!row?.materialId) return "--";
  const n = nutritionCache.value[row.materialId];
  if (!n) return "--";
  if (field === "energy") {
    if (n.energy != null) return n.energy.toFixed(1);
    if (n.protein != null && n.fat != null && n.carbohydrate != null) {
      const calculated = n.protein * 17 + n.fat * 37 + n.carbohydrate * 17;
      return calculated.toFixed(1);
    }
    return "--";
  }
  if (n[field] == null) return "--";
  return n[field]!.toFixed(1);
}

function filterMaterialsByName(keyword: string, option: Record<string, unknown>): boolean {
  if (!keyword) return true;
  const kw = keyword.toLowerCase();
  const label = (option.label || "").toLowerCase();
  return label.includes(kw);
}

function enterBatchMode() {
  batchMode.value = true;
  selectedIndices.value = new Set();
}

function exitBatchMode() {
  batchMode.value = false;
  selectedIndices.value = new Set();
}

function toggleSelectRow(idx: number) {
  const newSet = new Set(selectedIndices.value);
  if (newSet.has(idx)) {
    newSet.delete(idx);
  } else {
    newSet.add(idx);
  }
  selectedIndices.value = newSet;
}

function toggleSelectAll() {
  if (!props.materials.length) return;
  if (isAllSelected.value) {
    selectedIndices.value = new Set();
  } else {
    selectedIndices.value = new Set(
      props.materials.map((_: MaterialTableRow, idx: number) => idx)
    );
  }
}

function batchMoveUp() {
  if (!canMoveUp.value) return;
  const arr = [...props.materials];
  const sorted = [...selectedIndices.value].sort((a, b) => a - b);
  for (const idx of sorted) {
    const swapWith = idx - 1;
    if (swapWith < 0 || selectedIndices.value.has(swapWith)) continue;
    [arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]];
  }
  emit("update:materials", arr);
  selectedIndices.value = new Set(sorted.map((idx: number) => idx - 1));
  adjustNewMaterialIdx(sorted.map((idx: number) => idx - 1 > idx ? idx : idx - 1));
}

function batchMoveDown() {
  if (!canMoveDown.value) return;
  const arr = [...props.materials];
  const sorted = [...selectedIndices.value].sort((a, b) => b - a);
  for (const idx of sorted) {
    const swapWith = idx + 1;
    if (swapWith >= arr.length || selectedIndices.value.has(swapWith)) continue;
    [arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]];
  }
  emit("update:materials", arr);
  selectedIndices.value = new Set(sorted.map((idx: number) => idx + 1));
  adjustNewMaterialIdx(sorted.map((idx: number) => idx + 1 < idx ? idx : idx + 1));
}

function batchDelete() {
  if (selectedIndices.value.size === 0) return;
  const arr = props.materials.filter(
    (_: MaterialTableRow, idx: number) => !selectedIndices.value.has(idx)
  );
  emit("update:materials", arr);
  selectedIndices.value = new Set();
  if (arr.length === 0) batchMode.value = false;
  newMaterialSelectIdx.value = null;
}

function adjustNewMaterialIdx(_newIndices: number[]) {
  if (newMaterialSelectIdx.value != null) {
    newMaterialSelectIdx.value = null;
  }
}

function addMaterial() {
  const arr = [...props.materials];
  if (props.mode === "parse") {
    const newIdx = arr.length;
    arr.push({
      materialId: "",
      materialName: "",
      quantity: 0,
      unit: "g",
      matched: false,
    });
    newMaterialSelectIdx.value = newIdx;
  } else {
    arr.push({
      materialId: "",
      materialName: "",
      quantity: 0,
      unit: "g",
    });
  }
  emit("update:materials", arr);
}

function removeMaterial(idx: number) {
  const arr = [...props.materials];
  arr.splice(idx, 1);
  emit("update:materials", arr);
  if (newMaterialSelectIdx.value === idx) {
    newMaterialSelectIdx.value = null;
  } else if (newMaterialSelectIdx.value != null && newMaterialSelectIdx.value > idx) {
    newMaterialSelectIdx.value -= 1;
  }
}

function onNewMaterialSelected(idx: number, materialId: string) {
  const mat = materialStore.allMaterials.find((m: Material) => m.id === materialId);
  if (!mat) return;
  const arr = [...props.materials];
  arr[idx] = {
    ...arr[idx],
    materialId: mat.id,
    materialName: mat.name,
    unit: mat.unit || "g",
    basePrice: mat.unitPrice ?? null,
    matched: true,
    materialType: mat.materialType === "supplement" ? "supplement" : "herb",
  };
  emit("update:materials", arr);
  newMaterialSelectIdx.value = null;
  if (props.mode === "edit") {
    loadNutritionData(mat.id);
  }
}

function onMaterialChange(idx: number, materialId: string) {
  const mat = materialStore.allMaterials.find((m: Material) => m.id === materialId);
  if (!mat) return;
  const arr = [...props.materials];
  arr[idx] = {
    ...arr[idx],
    materialId: mat.id,
    materialName: mat.name,
    unit: mat.unit || "g",
    basePrice: mat.unitPrice ?? null,
    adjustedPrice: undefined,
    isPriceAdjusted: false,
    materialType: mat.materialType === "supplement" ? "supplement" : "herb",
  };
  emit("update:materials", arr);
  emit("materialChange", idx, materialId);
  if (props.mode === "edit") {
    loadNutritionData(mat.id);
  }
}

function handleQtyChange(idx: number, val: number) {
  const arr = [...props.materials];
  const row = arr[idx];
  if (!row) return;
  const originalQty = row.originalQuantity ?? row.quantity;
  const isAdjusted = val !== originalQty;
  arr[idx] = {
    ...row,
    quantity: val,
    originalQuantity: isAdjusted ? originalQty : undefined,
    isQtyAdjusted: isAdjusted,
  };
  emit("update:materials", arr);
}

function handlePriceAdjust(idx: number, val: number) {
  const arr = [...props.materials];
  const row = arr[idx];
  if (!row) return;
  const base = getBasePrice(idx);
  const isAdjusted = val !== base;
  arr[idx] = {
    ...row,
    adjustedPrice: isAdjusted ? val : undefined,
    isPriceAdjusted: isAdjusted,
  };
  emit("update:materials", arr);
}

function handleRestorePrice(idx: number) {
  const arr = [...props.materials];
  const row = arr[idx];
  if (!row) return;
  arr[idx] = {
    ...row,
    adjustedPrice: undefined,
    isPriceAdjusted: false,
  };
  emit("update:materials", arr);
  restoreFlashIdx.value = idx;
  setTimeout(() => { restoreFlashIdx.value = null; }, 600);
  MessagePlugin.success(`已恢复「${row.materialName}」单价为基价`);
}

function handleRestoreQty(idx: number) {
  const arr = [...props.materials];
  const row = arr[idx];
  if (!row) return;
  const originalQty = row.originalQuantity ?? row.quantity;
  arr[idx] = {
    ...row,
    quantity: originalQty,
    originalQuantity: undefined,
    isQtyAdjusted: false,
  };
  emit("update:materials", arr);
  restoreFlashIdx.value = idx;
  setTimeout(() => { restoreFlashIdx.value = null; }, 600);
  MessagePlugin.success(`已恢复「${row.materialName}」用量为原始值 ${originalQty}`);
}

async function loadNutritionData(materialId: string) {
  if (!materialId) return;
  if (nutritionCache.value[materialId]) return;
  if (nutritionLoading.value.has(materialId)) return;
  nutritionLoading.value = new Set([...nutritionLoading.value, materialId]);
  try {
    const res = await nutritionApi.getMaterialNutrition(materialId, true);
    if (res?.per100g) {
      nutritionCache.value = {
        ...nutritionCache.value,
        [materialId]: {
          energy: res.per100g.energy,
          protein: res.per100g.protein,
          fat: res.per100g.fat,
          carbohydrate: res.per100g.carbohydrate,
          sodium: res.per100g.sodium,
        },
      };
    }
  } catch {
    nutritionCache.value = {
      ...nutritionCache.value,
      [materialId]: {},
    };
  } finally {
    const newLoading = new Set(nutritionLoading.value);
    newLoading.delete(materialId);
    nutritionLoading.value = newLoading;
  }
}

watch(
  () => props.materials,
  (mats) => {
    if (props.mode === "edit") {
      for (const row of mats) {
        if (row.materialId && !nutritionCache.value[row.materialId] && !nutritionLoading.value.has(row.materialId)) {
          loadNutritionData(row.materialId);
        }
      }
    }
  },
  { immediate: true, deep: true }
);
</script>

<style lang="scss" scoped>
@import "@/assets/styles/variables.scss";

.material-table-core {
  width: 100%;

  &--edit {
    .table-scroll-wrapper {
      overflow-x: auto;

      @media (min-width: 1400px) {
        overflow-x: visible;
      }
    }

    .materials-table {
      min-width: 1100px;

      @media (min-width: 1400px) {
        min-width: 0;
      }
    }
  }
}

.coefficient-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: var(--space-2-5) var(--space-3-5);
  background: rgba(16, 185, 129, 0.04);
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 8px;
  margin-top: 8px;
  margin-bottom: 8px;

  .coeff-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .coeff-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  .coeff-divider {
    width: 1px;
    height: 20px;
    background: rgba(148, 163, 184, 0.25);
  }
}

.card-header--materials {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px var(--space-3-5) 8px;

  .card-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .card-header-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
  }

  .card-header-badge {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-primary);
    background: rgba(16, 185, 129, 0.1);
    padding: 1px 8px;
    border-radius: 10px;
  }

  .batch-mode-enter-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px var(--space-2-5);
    border-radius: 6px;
    border: 1px solid var(--color-border);
    background: #fff;
    color: var(--color-text-secondary);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
      color: var(--color-text-primary);
    }
  }
}

.batch-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px var(--space-3-5);
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary));
  color: #fff;
  border-radius: 0;
  position: relative;
  z-index: 2;

  .batch-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .batch-count {
    font-size: 12px;
    font-weight: 500;
  }

  .batch-divider {
    width: 1px;
    height: 16px;
    background: rgba(255, 255, 255, 0.3);
  }

  .batch-buttons {
    display: flex;
    align-items: center;
    gap: var(--space-1-5);
  }

  .batch-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px var(--space-2-5);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.25);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .batch-cancel-btn {
    padding: 4px var(--space-2-5);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    background: transparent;
    color: #fff;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  }
}

.batch-bar-slide-enter-active,
.batch-bar-slide-leave-active {
  transition: all 0.3s ease;
  max-height: 60px;
  overflow: hidden;
}

.batch-bar-slide-enter-from,
.batch-bar-slide-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.materials-table {
  .materials-header {
    display: grid;
    gap: 4px;
    padding: var(--space-2-5) var(--space-3-5);
    font-size: 11px;
    font-weight: 800;
    color: $emerald-600;
    text-transform: none;
    letter-spacing: 0.05em;
    background: $overlay-emerald-08;
    position: sticky;
    top: 0;
    z-index: 1;

    .col-check {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .col-qty {
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    .col-ratio,
    .col-price,
    .col-subtotal {
      text-align: center;
    }

    .col-status,
    .col-action {
      text-align: center;
    }

    .col-adjust {
      text-align: center;
    }

    .col-nutrition {
      text-align: center;
      font-size: 10px;
    }

    .col-header-unit {
      text-transform: none;
    }
  }

  .materials-row {
    display: grid;
    gap: 4px;
    padding: var(--space-2) var(--space-3-5);
    font-size: 12px;
    color: var(--color-text-primary);
    border-top: 1px solid rgba(148, 163, 184, 0.08);
    align-items: center;

    &:nth-child(even) {
      background: rgba(248, 250, 252, 0.5);
    }

    &:hover {
      background: $overlay-emerald-04;
    }

    &--warn {
      .col-price-missing {
        color: var(--color-warning);
        font-size: 11px;
        font-weight: 600;
      }
    }

    &--adjusted {
      border-left: 3px solid var(--color-warning);
      background: linear-gradient(90deg, rgba(254, 243, 199, 0.5) 0%, transparent 100%);

      .col-name {
        color: #92400e;
        font-weight: 600;
      }
    }

    &--qty-adjusted {
      border-left: 3px solid #3b82f6;
      background: linear-gradient(90deg, rgba(219, 234, 254, 0.5) 0%, transparent 100%);

      .col-name {
        color: #1e40af;
        font-weight: 600;
      }
    }

    &--restore-flash {
      animation: row-restore-flash 0.6s ease;
    }

    &--new {
      background: rgba(16, 185, 129, 0.06);
      border-left: 3px solid var(--color-primary);
    }

    &--selected {
      background: rgba(16, 185, 129, 0.08);
    }

    .col-check {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .col-name {
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: var(--space-1-5);

      .col-name-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .material-name-select {
        width: 100%;
        min-width: 0;

        :deep(.t-input) {
          font-size: 12px;
          font-weight: 600;
        }
      }

      .material-name-with-tag {
        display: flex;
        align-items: center;
        gap: var(--space-1-5);
        overflow: hidden;

        .material-name-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .material-type-tag--herb {
        flex-shrink: 0;
        background: rgba(16, 185, 129, 0.1);
        color: var(--color-primary-dark);
        border-color: var(--color-primary-lightest);
        font-size: 10px;
        padding: 0 4px;
        height: 18px;
        line-height: 16px;
      }

      .material-type-tag--supplement {
        flex-shrink: 0;
        background: rgba(99, 102, 241, 0.1);
        color: #4f46e5;
        border-color: #c7d2fe;
        font-size: 10px;
        padding: 0 4px;
        height: 18px;
        line-height: 16px;
      }
    }

    .col-version {
      display: flex;
      align-items: center;
      justify-content: center;

      .version-tag {
        display: inline-flex;
        align-items: center;
        padding: 1px 6px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
        font-family: ui-monospace, SFMono-Regular, "Cascadia Code", monospace;
        line-height: 16px;
        white-space: nowrap;
      }

      .version-tag--latest {
        background: rgba(16, 185, 129, 0.1);
        color: #059669;
      }

      .version-tag--outdated {
        background: rgba(245, 158, 11, 0.1);
        color: #d97706;
        cursor: help;
      }

      .version-tag--none {
        color: var(--td-text-color-disabled);
      }
    }

    .col-qty {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .col-qty-edit {
      display: flex;
      align-items: center;
      justify-content: center;

      :deep(.t-input-number) {
        width: 72px;

        .t-input__inner {
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          padding: var(--space-0-5) var(--space-1-5);
        }

        .t-input-number__decrease,
        .t-input-number__increase {
          display: none;
        }
      }
    }

    .col-qty-input--invalid {
      :deep(.t-input-number .t-input__inner) {
        border-color: var(--color-warning);
        background: #fffbeb;
      }
    }

    .col-ratio {
      color: var(--color-text-primary);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      text-align: center;
      font-family: ui-monospace, monospace;
      font-size: 11px;

      &--supplement {
        color: #6366f1;
      }
    }

    .col-nutrition {
      text-align: center;
      font-variant-numeric: tabular-nums;
      font-size: 11px;
      color: var(--color-text-secondary);
      font-family: ui-monospace, monospace;

      &--total {
        font-weight: 700;
        color: var(--color-text-primary);
      }
    }

    .col-price {
      text-align: right;

      .col-price-missing {
        color: var(--color-text-placeholder);
        font-size: 11px;
      }
    }

    .col-price-edit {
      display: flex;
      align-items: center;
      gap: var(--space-0-5);
      justify-content: center;

      .t-input-number {
        width: 80px;
      }

      :deep(.t-input-number .t-input__inner) {
        text-align: center;
        font-size: 12px;
        font-weight: 700;
        padding: var(--space-0-5) var(--space-1-5);
      }

      :deep(.t-input-number__decrease),
      :deep(.t-input-number__increase) {
        display: none;
      }
    }

    .col-adjust {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-0-5);

      .col-adjust-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--space-0-5);
        font-size: 10px;
        line-height: 1.4;
        padding: var(--space-0-5) var(--space-1-5);
        border-radius: 6px;
        background: linear-gradient(135deg, #fef3c7, #fde68a);
        color: #b45309;
        font-weight: 700;
        flex-shrink: 0;
        cursor: help;
        transition: all 0.2s;
        white-space: nowrap;

        &:hover {
          background: linear-gradient(135deg, #fde68a, #fcd34d);
          transform: scale(1.05);
        }
      }

      .col-adjust-badge--qty {
        background: linear-gradient(135deg, #dbeafe, #bfdbfe);
        color: #1d4ed8;

        &:hover {
          background: linear-gradient(135deg, #bfdbfe, #93c5fd);
        }
      }

      .col-restore-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border);
        background: #fff;
        color: var(--color-text-secondary);
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
        padding: 0;

        &:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: var(--color-primary-dark);
          transform: scale(1.1);
        }

        &:active {
          transform: scale(0.95);
        }

        &--flash {
          animation: restore-flash 0.5s ease;
        }
      }
    }

    .col-subtotal {
      text-align: center;
      font-weight: 600;
      font-variant-numeric: tabular-nums;

      &--missing {
        color: var(--color-text-placeholder);
      }

      &--total {
        font-weight: 800;
        color: var(--color-text-primary);
      }
    }

    .col-status {
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .col-action {
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-0-5);
      flex-wrap: wrap;
    }
  }
}

.quick-add-material-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-warning);
  background: #fffbeb;
  color: #d97706;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  padding: 0;

  &:hover {
    background: #fef3c7;
    border-color: #d97706;
    transform: scale(1.15);
    box-shadow: 0 2px 6px rgba(245, 158, 11, 0.25);
  }

  &:active {
    transform: scale(0.95);
  }
}

.remove-material-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-placeholder);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  padding: 0;

  &:hover {
    background: #fef2f2;
    border-color: #fca5a5;
    color: var(--color-danger);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
}

.materials-add-row {
  padding: var(--space-2-5) var(--space-3-5);
  border-top: 1px solid rgba(148, 163, 184, 0.08);
  width: 100%;
  box-sizing: border-box;

  .add-material-inline-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 100%;
    padding: 8px var(--space-3-5);
    border-radius: 8px;
    background: transparent;
    color: var(--color-primary);
    font-size: 12px;
    font-weight: 500;
    border: 1px dashed var(--color-primary);
    cursor: pointer;
    transition: all $transition-fast;
    box-sizing: border-box;

    &:hover {
      background: #ecfdf5;
    }
  }
}

.nutrition-summary-zone {
  border-top: 1px solid rgba(148, 163, 184, 0.12);

  .nsz-row {
    display: grid;
    gap: 4px;
    padding: var(--space-1-5) var(--space-3-5);
    align-items: center;
    text-align: center;
  }

  .nsz-row--header {
    font-size: 10px;
    font-weight: 600;
    color: var(--color-text-placeholder);
    padding: 4px var(--space-3-5) var(--space-1-5);

    .col-unit-header {
      text-align: center;
      font-variant-numeric: tabular-nums;
      text-transform: none;
    }
  }

  .nsz-row--total {
    font-size: 12px;
    font-weight: 700;
    color: var(--color-text-primary);
    border-top: 2px solid rgba(16, 185, 129, 0.2);
    background: rgba(16, 185, 129, 0.03);
    padding: var(--space-2-5) var(--space-3-5);

    .col-total-label {
      font-weight: 800;
      text-align: left;
    }

    .col-total-qty {
      font-variant-numeric: tabular-nums;
      text-align: center;
      font-weight: 700;
    }

    .col-ratio--total {
      font-family: ui-monospace, monospace;
      font-size: 11px;
      font-weight: 800;
      text-align: center;
    }

    .ratio-level--normal {
      color: var(--color-primary-dark);
    }

    .ratio-level--warning {
      color: #d97706;
    }

    .ratio-level--high_warning {
      color: #ea580c;
    }

    .ratio-level--error {
      color: var(--color-danger);
    }

    .cost-incomplete {
      color: var(--color-warning);
    }
  }

  .nsz-row--nrv {
    font-size: 11px;
    font-weight: 500;
    color: var(--color-text-secondary);
    border-top: 1px dashed rgba(148, 163, 184, 0.2);
    background: rgba(248, 250, 252, 0.5);
    padding: var(--space-1-5) var(--space-3-5);

    .col-total-label--nrv {
      font-weight: 600;
      color: var(--color-text-secondary);
      text-align: left;
    }

    .col-nutrition--nrv {
      font-variant-numeric: tabular-nums;
      color: var(--color-text-placeholder);
    }
  }

  .nsz-row--nrv-pct {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-primary);
    border-top: 1px dashed rgba(148, 163, 184, 0.2);
    background: rgba(248, 250, 252, 0.5);
    padding: var(--space-1-5) var(--space-3-5);

    .col-total-label--nrv-pct {
      font-weight: 700;
      color: var(--color-text-primary);
      text-align: left;
    }

    .col-nutrition--nrv-pct {
      font-variant-numeric: tabular-nums;
      color: var(--color-primary);
      font-weight: 700;
    }
  }
}

.ratio-validation-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px var(--space-3-5);
  font-size: 12px;
  border-top: 1px solid transparent;

  &--normal {
    background: rgba(16, 185, 129, 0.06);
    border-color: rgba(16, 185, 129, 0.15);
    color: var(--color-primary-dark);
  }

  &--warning {
    background: rgba(245, 158, 11, 0.06);
    border-color: rgba(245, 158, 11, 0.15);
    color: #b45309;
  }

  &--high_warning {
    background: rgba(234, 88, 12, 0.06);
    border-color: rgba(234, 88, 12, 0.15);
    color: #c2410c;
  }

  &--error {
    background: rgba(220, 38, 38, 0.06);
    border-color: rgba(220, 38, 38, 0.15);
    color: #b91c1c;
  }

  .rv-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .rv-badge {
    display: inline-flex;
    align-items: center;
    padding: 1px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;

    &--normal {
      background: rgba(16, 185, 129, 0.15);
      color: var(--color-primary-dark);
    }

    &--warning {
      background: rgba(245, 158, 11, 0.15);
      color: #b45309;
    }

    &--high_warning {
      background: rgba(234, 88, 12, 0.15);
      color: #c2410c;
    }

    &--error {
      background: rgba(220, 38, 38, 0.15);
      color: #b91c1c;
    }
  }

  .rv-desc {
    font-size: 11px;
    font-weight: 500;
  }
}

.material-option {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  width: 100%;

  >span:first-child {
    font-size: 12px;
    font-weight: 400;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .material-type-tag--herb {
    flex-shrink: 0;
    background: rgba(16, 185, 129, 0.1);
    color: var(--color-primary-dark);
    border-color: var(--color-primary-lightest);
    font-size: 10px;
    padding: 0 4px;
    height: 18px;
    line-height: 16px;
  }

  .material-type-tag--supplement {
    flex-shrink: 0;
    background: rgba(99, 102, 241, 0.1);
    color: #4f46e5;
    border-color: #c7d2fe;
    font-size: 10px;
    padding: 0 4px;
    height: 18px;
    line-height: 16px;
  }
}

@keyframes restore-flash {
  0% {
    background: var(--color-primary-bg);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }

  50% {
    background: var(--color-primary-lightest);
    box-shadow: 0 0 8px 2px rgba(16, 185, 129, 0.3);
  }

  100% {
    background: #fff;
    box-shadow: none;
  }
}

@keyframes row-restore-flash {
  0% {
    background: var(--color-primary-bg);
  }

  30% {
    background: var(--color-primary-lightest);
  }

  100% {
    background: transparent;
  }
}
</style>
