<template>
  <div class="enum-manage-grid">
    <!-- 性状 Card -->
    <div class="enum-category-card">
      <div class="enum-card-header">
        <div class="enum-card-title-group">
          <div class="enum-card-icon" style="background: var(--color-info-medium); color: var(--color-info);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-5.07l-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0l-2.83-2.83M9.76 9.76L6.93 6.93"/>
            </svg>
          </div>
          <div class="enum-card-title-details">
            <h5 class="enum-card-title">性状管理</h5>
            <span class="enum-card-subtitle">共 {{ appearanceList.length }} 项</span>
          </div>
        </div>
        <div class="enum-card-actions-top">
          <t-input v-model="keywordMap.appearance" placeholder="搜索..." clearable size="small" class="enum-search-sm">
            <template #prefix-icon><t-icon name="search" /></template>
          </t-input>
          <t-button theme="primary" size="small" @click="openCreateDialog('appearance')">
            <template #icon><t-icon name="add" /></template>
            添加
          </t-button>
        </div>
      </div>

      <div v-if="pagedAppearanceList.length > 0" class="enum-card-body">
        <div v-for="(item, index) in pagedAppearanceList" :key="item.id" class="enum-item"
          :class="{ 'is-inactive': !item.isActive }">
          <div class="enum-item-main">
            <div class="enum-item-index">{{ (appearancePage - 1) * PAGE_SIZE + index + 1 }}</div>
            <span class="enum-item-label">{{ item.label }}</span>
            <t-tag v-if="!item.isActive" theme="default" variant="light" size="small">已停用</t-tag>
          </div>
          <div class="enum-item-actions">
            <t-switch :value="item.isActive" size="small" @change="(val: boolean) => handleToggleActive(item, val)" />
            <t-button variant="text" theme="default" size="small" @click="openEditDialog(item)">编辑</t-button>
            <t-popconfirm content="确定删除该枚举值吗？删除后不可恢复。" @confirm="handleDelete(item)">
              <t-button variant="text" theme="danger" size="small">删除</t-button>
            </t-popconfirm>
          </div>
        </div>
      </div>
      <div v-else class="enum-card-empty">
        <p>{{ keywordMap.appearance ? '未找到匹配项' : '暂无数据' }}</p>
      </div>

      <div v-if="appearanceTotalPages > 1" class="enum-card-footer">
        <div class="enum-pagination">
          <button class="pagination-btn" :disabled="appearancePage <= 1" @click="appearancePage--">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="pagination-text">{{ appearancePage }} / {{ appearanceTotalPages }}</span>
          <button class="pagination-btn" :disabled="appearancePage >= appearanceTotalPages" @click="appearancePage++">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 口感 Card -->
    <div class="enum-category-card">
      <div class="enum-card-header">
        <div class="enum-card-title-group">
          <div class="enum-card-icon" style="background: var(--overlay-emerald-10); color: var(--color-emerald);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </div>
          <div class="enum-card-title-details">
            <h5 class="enum-card-title">口感管理</h5>
            <span class="enum-card-subtitle">共 {{ tasteList.length }} 项</span>
          </div>
        </div>
        <div class="enum-card-actions-top">
          <t-input v-model="keywordMap.taste" placeholder="搜索..." clearable size="small" class="enum-search-sm">
            <template #prefix-icon><t-icon name="search" /></template>
          </t-input>
          <t-button theme="primary" size="small" @click="openCreateDialog('taste')">
            <template #icon><t-icon name="add" /></template>
            添加
          </t-button>
        </div>
      </div>

      <div v-if="pagedTasteList.length > 0" class="enum-card-body">
        <div v-for="(item, index) in pagedTasteList" :key="item.id" class="enum-item"
          :class="{ 'is-inactive': !item.isActive }">
          <div class="enum-item-main">
            <div class="enum-item-index">{{ (tastePage - 1) * PAGE_SIZE + index + 1 }}</div>
            <span class="enum-item-label">{{ item.label }}</span>
            <t-tag v-if="!item.isActive" theme="default" variant="light" size="small">已停用</t-tag>
          </div>
          <div class="enum-item-actions">
            <t-switch :value="item.isActive" size="small" @change="(val: boolean) => handleToggleActive(item, val)" />
            <t-button variant="text" theme="default" size="small" @click="openEditDialog(item)">编辑</t-button>
            <t-popconfirm content="确定删除该枚举值吗？删除后不可恢复。" @confirm="handleDelete(item)">
              <t-button variant="text" theme="danger" size="small">删除</t-button>
            </t-popconfirm>
          </div>
        </div>
      </div>
      <div v-else class="enum-card-empty">
        <p>{{ keywordMap.taste ? '未找到匹配项' : '暂无数据' }}</p>
      </div>

      <div v-if="tasteTotalPages > 1" class="enum-card-footer">
        <div class="enum-pagination">
          <button class="pagination-btn" :disabled="tastePage <= 1" @click="tastePage--">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="pagination-text">{{ tastePage }} / {{ tasteTotalPages }}</span>
          <button class="pagination-btn" :disabled="tastePage >= tasteTotalPages" @click="tastePage++">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 功效 Card -->
    <div class="enum-category-card">
      <div class="enum-card-header">
        <div class="enum-card-title-group">
          <div class="enum-card-icon" style="background: var(--color-warning-medium); color: var(--color-warning);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div class="enum-card-title-details">
            <h5 class="enum-card-title">功效管理</h5>
            <span class="enum-card-subtitle">共 {{ efficacyList.length }} 项</span>
          </div>
        </div>
        <div class="enum-card-actions-top">
          <t-input v-model="keywordMap.efficacy" placeholder="搜索..." clearable size="small" class="enum-search-sm">
            <template #prefix-icon><t-icon name="search" /></template>
          </t-input>
          <t-button theme="primary" size="small" @click="openCreateDialog('efficacy')">
            <template #icon><t-icon name="add" /></template>
            添加
          </t-button>
        </div>
      </div>

      <div v-if="pagedEfficacyList.length > 0" class="enum-card-body">
        <div v-for="(item, index) in pagedEfficacyList" :key="item.id" class="enum-item"
          :class="{ 'is-inactive': !item.isActive }">
          <div class="enum-item-main">
            <div class="enum-item-index">{{ (efficacyPage - 1) * PAGE_SIZE + index + 1 }}</div>
            <span class="enum-item-label">{{ item.label }}</span>
            <t-tag v-if="!item.isActive" theme="default" variant="light" size="small">已停用</t-tag>
          </div>
          <div class="enum-item-actions">
            <t-switch :value="item.isActive" size="small" @change="(val: boolean) => handleToggleActive(item, val)" />
            <t-button variant="text" theme="default" size="small" @click="openEditDialog(item)">编辑</t-button>
            <t-popconfirm content="确定删除该枚举值吗？删除后不可恢复。" @confirm="handleDelete(item)">
              <t-button variant="text" theme="danger" size="small">删除</t-button>
            </t-popconfirm>
          </div>
        </div>
      </div>
      <div v-else class="enum-card-empty">
        <p>{{ keywordMap.efficacy ? '未找到匹配项' : '暂无数据' }}</p>
      </div>

      <div v-if="efficacyTotalPages > 1" class="enum-card-footer">
        <div class="enum-pagination">
          <button class="pagination-btn" :disabled="efficacyPage <= 1" @click="efficacyPage--">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="pagination-text">{{ efficacyPage }} / {{ efficacyTotalPages }}</span>
          <button class="pagination-btn" :disabled="efficacyPage >= efficacyTotalPages" @click="efficacyPage++">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 互斥规则 Card -->
    <div class="enum-category-card">
      <div class="enum-card-header">
        <div class="enum-card-title-group">
          <div class="enum-card-icon" style="background: var(--color-danger-strong); color: var(--color-danger);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </div>
          <div class="enum-card-title-details">
            <h5 class="enum-card-title">互斥规则</h5>
            <span class="enum-card-subtitle">共 {{ exclusionFilteredList.length }} 条</span>
          </div>
        </div>
        <div class="enum-card-actions-top">
          <t-input v-model="exclusionKeyword" placeholder="搜索..." clearable size="small" class="enum-search-sm">
            <template #prefix-icon><t-icon name="search" /></template>
          </t-input>
          <t-button theme="primary" size="small" @click="openCreateExclusionDialog">
            <template #icon><t-icon name="add" /></template>
            添加
          </t-button>
        </div>
      </div>

      <div v-if="pagedExclusionList.length > 0" class="enum-card-body">
        <div v-for="(item, index) in pagedExclusionList" :key="item.id" class="enum-item exclusion-item">
          <div class="enum-item-main">
            <div class="enum-item-index">{{ (exclusionPage - 1) * PAGE_SIZE + index + 1 }}</div>
            <div class="exclusion-relation">
              <span class="exclusion-value">{{ item.labelA || item.valueA }}</span>
              <span class="exclusion-symbol">&harr;</span>
              <span class="exclusion-value">{{ item.labelB || item.valueB }}</span>
            </div>
            <t-tag
              :theme="item.category === 'appearance' ? 'primary' : 'success'"
              variant="light"
              size="small"
            >
              {{ item.category === 'appearance' ? '性状' : '口感' }}
            </t-tag>
          </div>
          <div class="enum-item-actions">
            <t-popconfirm content="确定删除该互斥规则吗？删除后不可恢复。" @confirm="handleDeleteExclusion(item)">
              <t-button variant="text" theme="danger" size="small">删除</t-button>
            </t-popconfirm>
          </div>
        </div>
      </div>
      <div v-else class="enum-card-empty">
        <p>{{ exclusionKeyword ? '未找到匹配规则' : '暂无互斥规则' }}</p>
      </div>

      <div v-if="exclusionTotalPages > 1" class="enum-card-footer">
        <div class="enum-pagination">
          <button class="pagination-btn" :disabled="exclusionPage <= 1" @click="exclusionPage--">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="pagination-text">{{ exclusionPage }} / {{ exclusionTotalPages }}</span>
          <button class="pagination-btn" :disabled="exclusionPage >= exclusionTotalPages" @click="exclusionPage++">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 枚举值新建/编辑对话框 -->
  <t-dialog v-model:visible="dialogVisible"
    :header="dialogMode === 'create' ? '添加枚举值' : '编辑枚举值'"
    :confirm-btn="{ loading: dialogLoading }"
    :on-confirm="handleDialogConfirm"
    @close="handleDialogClose">
    <t-form label-width="80px">
      <t-form-item label="所属分类">
        <t-tag theme="primary" variant="light">{{ CATEGORY_LABELS[dialogCategory] }}</t-tag>
      </t-form-item>
      <t-form-item label="枚举值名称">
        <t-input v-model="formLabel" placeholder="请输入枚举值名称" clearable maxlength="50" show-limit-number
          @enter="handleDialogConfirm" />
      </t-form-item>
    </t-form>
  </t-dialog>

  <!-- 互斥规则对话框 -->
  <t-dialog v-model:visible="exclusionDialogVisible"
    header="添加互斥规则"
    :confirm-btn="{ loading: exclusionDialogLoading }"
    :on-confirm="handleCreateExclusion"
    @close="exclusionFormValueA = ''; exclusionFormValueB = ''">
    <t-form label-width="80px">
      <t-form-item label="分类">
        <t-select v-model="exclusionFormCategory" :options="[{ label: '性状', value: 'appearance' }, { label: '口感', value: 'taste' }]" />
      </t-form-item>
      <t-form-item label="选项A">
        <t-select v-model="exclusionFormValueA" :options="exclusionCategoryOptions" placeholder="请选择选项A" clearable filterable />
      </t-form-item>
      <t-form-item label="选项B" :help="exclusionBHelpText">
        <t-select v-model="exclusionFormValueB" :options="exclusionFormBOptions" placeholder="请选择选项B" clearable filterable />
      </t-form-item>
    </t-form>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive } from "vue";
import { MessagePlugin } from "tdesign-vue-next";
import { useEnumStore } from "@/stores/enum";
import { enumApi } from "@/api/enum";
import type { EnumOption, ExclusionRule } from "@/api/enum";

const enumStore = useEnumStore();

const PAGE_SIZE = 8;

// ─── 搜索关键词（每个分类独立） ───
const keywordMap = reactive<Record<string, string>>({
  appearance: "",
  taste: "",
  efficacy: "",
});
const exclusionKeyword = ref("");

// ─── 分页状态（每个分类独立） ───
const appearancePage = ref(1);
const tastePage = ref(1);
const efficacyPage = ref(1);
const exclusionPage = ref(1);

// ─── 对话框状态 ───
const dialogVisible = ref(false);
const dialogLoading = ref(false);
const dialogMode = ref<"create" | "edit">("create");
const dialogCategory = ref<"appearance" | "taste" | "efficacy">("appearance");
const editingItem = ref<EnumOption | null>(null);
const formLabel = ref("");

const exclusionList = ref<ExclusionRule[]>([]);
const exclusionDialogVisible = ref(false);
const exclusionDialogLoading = ref(false);
const exclusionFormCategory = ref<"appearance" | "taste">("appearance");
const exclusionFormValueA = ref("");
const exclusionFormValueB = ref("");

const CATEGORY_LABELS: Record<string, string> = {
  appearance: "性状",
  taste: "口感",
  efficacy: "功效",
  "exclusion-rules": "互斥规则",
};

// ─── 各分类列表（带搜索过滤） ───
const appearanceList = computed(() => {
  const list = enumStore.getOptionsByCategory("appearance");
  if (!keywordMap.appearance) return list;
  const kw = keywordMap.appearance.toLowerCase();
  return list.filter((item) => item.label.toLowerCase().includes(kw) || item.value.toLowerCase().includes(kw));
});

const tasteList = computed(() => {
  const list = enumStore.getOptionsByCategory("taste");
  if (!keywordMap.taste) return list;
  const kw = keywordMap.taste.toLowerCase();
  return list.filter((item) => item.label.toLowerCase().includes(kw) || item.value.toLowerCase().includes(kw));
});

const efficacyList = computed(() => {
  const list = enumStore.getOptionsByCategory("efficacy");
  if (!keywordMap.efficacy) return list;
  const kw = keywordMap.efficacy.toLowerCase();
  return list.filter((item) => item.label.toLowerCase().includes(kw) || item.value.toLowerCase().includes(kw));
});

const exclusionFilteredList = computed(() => {
  if (!exclusionKeyword.value) return exclusionList.value;
  const kw = exclusionKeyword.value.toLowerCase();
  return exclusionList.value.filter(
    (item) =>
      (item.labelA || item.valueA).toLowerCase().includes(kw) ||
      (item.labelB || item.valueB).toLowerCase().includes(kw) ||
      item.category.toLowerCase().includes(kw)
  );
});

// ─── 分页计算 ───
const appearanceTotalPages = computed(() => Math.max(1, Math.ceil(appearanceList.value.length / PAGE_SIZE)));
const tasteTotalPages = computed(() => Math.max(1, Math.ceil(tasteList.value.length / PAGE_SIZE)));
const efficacyTotalPages = computed(() => Math.max(1, Math.ceil(efficacyList.value.length / PAGE_SIZE)));
const exclusionTotalPages = computed(() => Math.max(1, Math.ceil(exclusionFilteredList.value.length / PAGE_SIZE)));

const pagedAppearanceList = computed(() => {
  const start = (appearancePage.value - 1) * PAGE_SIZE;
  return appearanceList.value.slice(start, start + PAGE_SIZE);
});
const pagedTasteList = computed(() => {
  const start = (tastePage.value - 1) * PAGE_SIZE;
  return tasteList.value.slice(start, start + PAGE_SIZE);
});
const pagedEfficacyList = computed(() => {
  const start = (efficacyPage.value - 1) * PAGE_SIZE;
  return efficacyList.value.slice(start, start + PAGE_SIZE);
});
const pagedExclusionList = computed(() => {
  const start = (exclusionPage.value - 1) * PAGE_SIZE;
  return exclusionFilteredList.value.slice(start, start + PAGE_SIZE);
});

// ─── 搜索/列表变化时重置分页 ───
watch(() => keywordMap.appearance, () => { appearancePage.value = 1; });
watch(() => keywordMap.taste, () => { tastePage.value = 1; });
watch(() => keywordMap.efficacy, () => { efficacyPage.value = 1; });
watch(exclusionKeyword, () => { exclusionPage.value = 1; });

watch(() => appearanceList.value.length, () => {
  if (appearancePage.value > appearanceTotalPages.value) appearancePage.value = Math.max(1, appearanceTotalPages.value);
});
watch(() => tasteList.value.length, () => {
  if (tastePage.value > tasteTotalPages.value) tastePage.value = Math.max(1, tasteTotalPages.value);
});
watch(() => efficacyList.value.length, () => {
  if (efficacyPage.value > efficacyTotalPages.value) efficacyPage.value = Math.max(1, efficacyTotalPages.value);
});
watch(() => exclusionFilteredList.value.length, () => {
  if (exclusionPage.value > exclusionTotalPages.value) exclusionPage.value = Math.max(1, exclusionTotalPages.value);
});

watch(exclusionFormValueA, (newA) => {
  const bVal = exclusionFormValueB.value;
  if (!bVal) return;
  if (bVal === newA) { exclusionFormValueB.value = ""; return; }
  if (!newA) return;
  const excludedValues = enumStore.getExcludedValues(exclusionFormCategory.value, newA);
  if (excludedValues.has(bVal)) exclusionFormValueB.value = "";
});
watch(exclusionFormCategory, () => {
  exclusionFormValueA.value = "";
  exclusionFormValueB.value = "";
});

onMounted(() => {
  enumStore.fetchEnums();
  fetchExclusionRules();
});

// ─── 枚举值 CRUD ───
const openCreateDialog = (category: "appearance" | "taste" | "efficacy") => {
  dialogMode.value = "create";
  dialogCategory.value = category;
  editingItem.value = null;
  formLabel.value = "";
  dialogVisible.value = true;
};

const openEditDialog = (item: EnumOption) => {
  dialogMode.value = "edit";
  dialogCategory.value = item.category as "appearance" | "taste" | "efficacy";
  editingItem.value = item;
  formLabel.value = item.label;
  dialogVisible.value = true;
};

const handleDialogClose = () => {
  formLabel.value = "";
  editingItem.value = null;
};

const handleDialogConfirm = async () => {
  if (!formLabel.value.trim()) {
    MessagePlugin.warning("请输入枚举值名称");
    return false;
  }
  dialogLoading.value = true;
  try {
    if (dialogMode.value === "create") {
      await enumStore.createOption({
        category: dialogCategory.value,
        label: formLabel.value.trim(),
        value: formLabel.value.trim(),
      });
      MessagePlugin.success("添加成功");
    } else if (editingItem.value) {
      await enumStore.updateOption(editingItem.value.id, {
        label: formLabel.value.trim(),
        value: formLabel.value.trim(),
      });
      MessagePlugin.success("修改成功");
    }
    dialogVisible.value = false;
    return true;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "操作失败";
    MessagePlugin.error(msg);
    return false;
  } finally {
    dialogLoading.value = false;
  }
};

const handleDelete = async (item: EnumOption) => {
  try {
    const result = await enumStore.deleteOption(item.id);
    if (result.referenceCount > 0) {
      MessagePlugin.warning(`该选项已被 ${result.referenceCount} 个原料使用，已删除`);
    } else {
      MessagePlugin.success("删除成功");
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "删除失败";
    MessagePlugin.error(msg);
  }
};

const handleToggleActive = async (item: EnumOption, newActive: boolean) => {
  try {
    await enumStore.updateOption(item.id, { isActive: newActive });
    MessagePlugin.success(newActive ? "已启用" : "已停用");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "操作失败";
    MessagePlugin.error(msg);
  }
};

// ─── 互斥规则 CRUD ───
async function fetchExclusionRules() {
  try {
    const data = await enumApi.getExclusions();
    exclusionList.value = [...(data.appearance || []), ...(data.taste || [])];
  } catch {
    exclusionList.value = [];
  }
}

function openCreateExclusionDialog() {
  exclusionFormCategory.value = "appearance";
  exclusionFormValueA.value = "";
  exclusionFormValueB.value = "";
  exclusionDialogVisible.value = true;
}

async function handleCreateExclusion() {
  if (!exclusionFormValueA.value || !exclusionFormValueB.value) {
    MessagePlugin.warning("请选择两个互斥选项");
    return false;
  }
  if (exclusionFormValueA.value === exclusionFormValueB.value) {
    MessagePlugin.warning("两个选项不能相同");
    return false;
  }
  const aVal = exclusionFormValueA.value;
  const bVal = exclusionFormValueB.value;
  const cat = exclusionFormCategory.value;
  const existsInList = exclusionList.value.some(
    (r) => (r.valueA === aVal && r.valueB === bVal) || (r.valueA === bVal && r.valueB === aVal)
  );
  if (existsInList) {
    MessagePlugin.warning("该组合的互斥规则（或逆向组合）已存在，请重新选择");
    return false;
  }
  const aExcluded = enumStore.getExcludedValues(cat, aVal);
  if (aExcluded.has(bVal)) {
    MessagePlugin.warning("该组合的互斥规则（或逆向组合）已存在，请重新选择");
    return false;
  }
  exclusionDialogLoading.value = true;
  try {
    await enumApi.createExclusion({ category: cat, valueA: aVal, valueB: bVal });
    MessagePlugin.success("互斥规则创建成功");
    exclusionDialogVisible.value = false;
    await fetchExclusionRules();
    await enumStore.fetchExclusions();
    return true;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "创建失败";
    MessagePlugin.error(msg);
    return false;
  } finally {
    exclusionDialogLoading.value = false;
  }
}

async function handleDeleteExclusion(item: ExclusionRule) {
  try {
    await enumApi.deleteExclusion(item.id);
    MessagePlugin.success("互斥规则删除成功");
    await fetchExclusionRules();
    await enumStore.fetchExclusions();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "删除失败";
    MessagePlugin.error(msg);
  }
}

const exclusionCategoryOptions = computed(() => {
  const options = enumStore.getActiveOptionsByCategory(exclusionFormCategory.value);
  return options.map((o) => ({ label: o.label, value: o.value }));
});

const exclusionFormBOptions = computed(() => {
  const allOptions = enumStore.getActiveOptionsByCategory(exclusionFormCategory.value);
  const aVal = exclusionFormValueA.value;
  if (!aVal) return allOptions.map((o) => ({ label: o.label, value: o.value }));
  const excludedValues = enumStore.getExcludedValues(exclusionFormCategory.value, aVal);
  return allOptions
    .filter((o) => o.value !== aVal)
    .filter((o) => !excludedValues.has(o.value))
    .map((o) => ({ label: o.label, value: o.value }));
});

const exclusionFilteredCount = computed(() => {
  const allOptions = enumStore.getActiveOptionsByCategory(exclusionFormCategory.value);
  const aVal = exclusionFormValueA.value;
  if (!aVal) return 0;
  const excludedValues = enumStore.getExcludedValues(exclusionFormCategory.value, aVal);
  let count = 0;
  if (allOptions.some((o) => o.value === aVal)) count++;
  count += [...excludedValues].filter((v) => allOptions.some((o) => o.value === v)).length;
  return count;
});

const exclusionBHelpText = computed(() => {
  if (!exclusionFormValueA.value) return "";
  const count = exclusionFilteredCount.value;
  if (count === 0) return "";
  return `已根据选项A过滤 ${count} 个不可选的选项（相同值或已有互斥规则）`;
});
</script>

<style scoped lang="scss">
@use "@/assets/styles/variables.scss" as *;

.enum-manage-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.enum-category-card {
  background: var(--color-bg-container);
  border-radius: 16px;
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: var(--color-text-placeholder);
    transform: translateY(-2px);
  }

  .enum-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0;
    padding: 20px 20px 12px;
    border-bottom: 1px solid var(--color-border-light);
    gap: 12px;

    .enum-card-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;

      .enum-card-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .enum-card-title-details {
        .enum-card-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0 0 4px 0;
        }

        .enum-card-subtitle {
          font-size: 12px;
          color: var(--color-text-placeholder);
        }
      }
    }

    .enum-card-actions-top {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
      flex-shrink: 0;

      .enum-search-sm {
        width: 140px;
      }
    }
  }

  .enum-card-body {
    flex: 1;
    padding: 12px 20px;
    overflow-y: auto;
    max-height: 460px;

    .enum-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid var(--color-bg-hover);
      transition: background 0.15s ease;

      &:last-child {
        border-bottom: none;
      }

      &.is-inactive {
        opacity: 0.6;
        .enum-item-label {
          color: var(--color-text-disabled);
          text-decoration: line-through;
        }
      }

      .enum-item-main {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
        min-width: 0;

        .enum-item-index {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: var(--color-bg-page);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-placeholder);
          flex-shrink: 0;
        }

        .enum-item-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .enum-item-actions {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
      }
    }
  }

  .enum-card-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 20px;
    color: var(--color-text-placeholder);
    font-size: 13px;
  }

  .enum-card-footer {
    padding: 10px 20px 14px;
    border-top: 1px solid var(--color-border-light);

    .enum-pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .pagination-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      border: none;
      background: var(--color-bg-hover);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all $transition-fast;

      &:hover:not(:disabled) {
        background: var(--color-border);
        color: var(--color-text-primary);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    .pagination-text {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-placeholder);
      min-width: 40px;
      text-align: center;
    }
  }
}

.exclusion-relation {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  overflow: hidden;

  .exclusion-value {
    padding: 2px 8px;
    border-radius: 6px;
    background: var(--color-bg-page);
    white-space: nowrap;
  }

  .exclusion-symbol {
    color: var(--color-danger);
    font-weight: 600;
    flex-shrink: 0;
  }
}

@media (max-width: 900px) {
  .enum-manage-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .enum-category-card .enum-card-header {
    flex-direction: column;

    .enum-card-actions-top {
      width: 100%;
      margin-left: 0;

      .enum-search-sm {
        flex: 1;
        width: auto;
      }
    }
  }
}
</style>
