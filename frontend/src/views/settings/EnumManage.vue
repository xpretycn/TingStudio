<template>
  <div class="mm-body">
    <div class="mm-nav" :class="{ 'mm-nav--collapsed': navCollapsed }">
      <button type="button" class="nav-collapse-btn" @click="navCollapsed = !navCollapsed"
        :title="navCollapsed ? '展开导航' : '折叠导航'" aria-label="切换导航折叠状态">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"
          :style="{ transform: navCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <div v-for="cat in categories" :key="cat.value" class="nav-tab"
        :class="{ active: activeCategory === cat.value }"
        :title="navCollapsed ? cat.label : ''" role="tab" tabindex="0"
        @click="activeCategory = cat.value; keyword = ''"
        @keydown.enter="activeCategory = cat.value; keyword = ''">
        <svg class="nav-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" v-html="cat.iconPath"></svg>
        <span class="nav-tab-label">{{ cat.label }}</span>
      </div>
    </div>

    <div class="mm-content">
      <Transition name="content-fade" mode="out-in">
        <div :key="activeCategory" class="tab-panel">
          <div class="section-header-enhanced">
            <div class="section-title-group">
              <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                :stroke="currentCategoryColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                v-html="currentCategory.iconPath"></svg>
              <h4 class="section-title-text">{{ currentCategory.label }}管理</h4>
            </div>
            <span class="section-title-count">共 {{ currentList.length }} 项</span>
            <div v-if="currentList.length > PAGE_SIZE" class="activity-nav">
              <button class="activity-nav-btn" :disabled="currentPage <= 1" @click="pagePrev" title="上一页">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span class="activity-nav-page">{{ currentPage }} / {{ totalPages }}</span>
              <button class="activity-nav-btn" :disabled="currentPage >= totalPages" @click="pageNext" title="下一页">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>

          <div class="enum-toolbar">
            <t-input v-model="keyword" placeholder="搜索枚举值..." clearable class="enum-search-input">
              <template #prefix-icon><t-icon name="search" /></template>
            </t-input>
            <t-button theme="primary" @click="openCreateDialog">
              <template #icon><t-icon name="add" /></template>
              添加枚举值
            </t-button>
          </div>

          <div v-if="currentList.length > 0" class="enum-list">
            <div v-for="(item, index) in pagedList" :key="item.id" class="enum-card"
              :class="{ 'is-inactive': !item.isActive }">
              <div class="enum-card-header">
                <div class="enum-name-row">
                  <div class="enum-index-wrap">
                    <span class="enum-index">{{ (currentPage - 1) * PAGE_SIZE + index + 1 }}</span>
                  </div>
                  <span class="enum-label">{{ item.label }}</span>
                  <t-tag v-if="!item.isActive" theme="default" variant="light" size="small">已停用</t-tag>
                </div>
              </div>
              <div class="enum-card-footer">
                <div class="enum-usage-mini">
                  <span>{{ item.isActive ? '启用中' : '已停用' }}</span>
                  <span>排序 #{{ item.sortOrder }}</span>
                </div>
                <div class="enum-actions">
                  <t-switch :value="item.isActive" size="small" @change="(val: boolean) => handleToggleActive(item, val)" />
                  <t-button variant="text" theme="default" size="small" @click="openEditDialog(item)">
                    编辑
                  </t-button>
                  <t-popconfirm content="确定删除该枚举值吗？删除后不可恢复。" @confirm="handleDelete(item)">
                    <t-button variant="text" theme="danger" size="small">删除</t-button>
                  </t-popconfirm>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <div class="empty-icon-wrap">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-placeholder)"
                stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
            </div>
            <p class="empty-text">{{ keyword ? '未找到匹配的枚举值' : '暂无枚举值' }}</p>
            <p class="empty-hint">{{ keyword ? '尝试其他关键词' : '点击上方按钮添加第一个枚举值' }}</p>
          </div>
        </div>
      </Transition>
    </div>
  </div>

  <t-dialog v-model:visible="dialogVisible"
    :header="dialogMode === 'create' ? '添加枚举值' : '编辑枚举值'"
    :confirm-btn="{ loading: dialogLoading }"
    :on-confirm="handleDialogConfirm"
    @close="handleDialogClose">
    <t-form label-width="80px">
      <t-form-item label="所属分类">
        <t-tag theme="primary" variant="light">{{ CATEGORY_LABELS[activeCategory] }}</t-tag>
      </t-form-item>
      <t-form-item label="枚举值名称">
        <t-input v-model="formLabel" placeholder="请输入枚举值名称" clearable maxlength="50" show-limit-number
          @enter="handleDialogConfirm" />
      </t-form-item>
    </t-form>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { MessagePlugin } from "tdesign-vue-next";
import { useEnumStore } from "@/stores/enum";
import type { EnumOption } from "@/api/enum";

const enumStore = useEnumStore();

const navCollapsed = ref(false);
const activeCategory = ref("appearance");
const keyword = ref("");
const dialogVisible = ref(false);
const dialogLoading = ref(false);
const dialogMode = ref<"create" | "edit">("create");
const editingItem = ref<EnumOption | null>(null);
const formLabel = ref("");

const CATEGORY_LABELS: Record<string, string> = {
  appearance: "性状",
  taste: "口感",
  efficacy: "功效",
};

const CATEGORY_COLORS: Record<string, string> = {
  appearance: "#3B82F6",
  taste: "#10B981",
  efficacy: "#F59E0B",
};

const categories = [
  {
    value: "appearance",
    label: "性状",
    iconPath:
      '<circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-5.07l-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0l-2.83-2.83M9.76 9.76L6.93 6.93"/>',
  },
  {
    value: "taste",
    label: "口感",
    iconPath:
      '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
  },
  {
    value: "efficacy",
    label: "功效",
    iconPath:
      '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  },
];

const currentCategory = computed(() =>
  categories.find((c) => c.value === activeCategory.value) || categories[0]
);

const currentCategoryColor = computed(
  () => CATEGORY_COLORS[activeCategory.value] || "#3B82F6"
);

const currentList = computed(() => {
  const list = enumStore.getOptionsByCategory(
    activeCategory.value as "appearance" | "taste" | "efficacy"
  );
  if (!keyword.value) return list;
  const kw = keyword.value.toLowerCase();
  return list.filter(
    (item) =>
      item.label.toLowerCase().includes(kw) ||
      item.value.toLowerCase().includes(kw)
  );
});

const PAGE_SIZE = 10;
const currentPage = ref(1);
const totalPages = computed(() => Math.max(1, Math.ceil(currentList.value.length / PAGE_SIZE)));
const pagedList = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return currentList.value.slice(start, start + PAGE_SIZE);
});
const pagePrev = () => { if (currentPage.value > 1) currentPage.value--; };
const pageNext = () => { if (currentPage.value < totalPages.value) currentPage.value++; };

watch(activeCategory, () => { currentPage.value = 1; });
watch(keyword, () => { currentPage.value = 1; });
watch(() => currentList.value.length, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = Math.max(1, totalPages.value);
  }
});

onMounted(() => {
  enumStore.fetchEnums();
});

const openCreateDialog = () => {
  dialogMode.value = "create";
  editingItem.value = null;
  formLabel.value = "";
  dialogVisible.value = true;
};

const openEditDialog = (item: EnumOption) => {
  dialogMode.value = "edit";
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
        category: activeCategory.value,
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
      MessagePlugin.warning(
        `该选项已被 ${result.referenceCount} 个原料使用，已删除`
      );
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
</script>

<style scoped lang="scss">
@use "@/assets/styles/variables.scss" as *;

.mm-body {
  display: flex;
  gap: 0;
  min-height: 480px;
}

.mm-nav {
  width: 170px;
  flex-shrink: 0;
  padding: 24px 12px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  position: relative;

  &--collapsed {
    width: 56px;
    padding: 24px var(--space-1-5);

    .nav-tab {
      justify-content: center;
      padding: 12px 0;

      .nav-tab-icon {
        width: 24px;
        height: 24px;
      }

      .nav-tab-label {
        display: none;
      }
    }

    .nav-collapse-btn {
      margin: 0 auto 12px auto;
      width: 36px;
      height: 36px;
    }
  }

  .nav-tab {
    display: flex;
    align-items: center;
    gap: var(--space-2-5);
    padding: 12px 16px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--color-text-secondary);
    font-size: 14px;
    font-weight: 500;
    border: 1px solid transparent;
    margin-bottom: 8px;
    white-space: nowrap;
    overflow: hidden;

    .nav-tab-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    &:hover {
      background: #f1f5f9;
      color: var(--color-text-primary);
    }

    &.active {
      background: linear-gradient(
        135deg,
        var(--color-primary),
        var(--color-primary-dark)
      );
      color: white;
      box-shadow: 0 4px 12px $overlay-emerald-25;
      border-color: transparent;
      font-weight: 600;
    }

    .nav-tab-label {
      flex: 1;
      transition: opacity 0.2s ease;
    }
  }

  .nav-collapse-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: #fff;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 12px;
    color: var(--color-text-placeholder);

    &:hover {
      background: #f1f5f9;
      color: var(--color-text-secondary);
      border-color: #cbd5e1;
    }
  }
}

.mm-content {
  flex: 1;
  min-width: 0;
  padding: 24px var(--space-7);
  border-left: 1px solid #f1f5f9;
}

.content-fade-enter-active,
.content-fade-leave-active {
  transition: opacity 0.2s ease;
}

.content-fade-enter-from,
.content-fade-leave-to {
  opacity: 0;
}

.section-header-enhanced {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  .section-title-group {
    display: flex;
    align-items: center;
    gap: 10px;

    .section-title-icon {
      flex-shrink: 0;
    }

    .section-title-text {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-primary);
    }
  }

  .section-title-count {
    font-size: 13px;
    color: var(--color-text-placeholder);
  }
}

.activity-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.activity-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: #f1f5f9;
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

.activity-nav-page {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-placeholder);
  min-width: 40px;
  text-align: center;
}

.enum-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  .enum-search-input {
    max-width: 280px;
  }
}

.enum-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.enum-card {
  border-radius: 12px;
  border: 1px solid var(--color-border-light, #e5e7eb);
  background: var(--color-bg-container, #fff);
  transition: all 0.2s ease;
  overflow: hidden;

  &:hover {
    border-color: var(--color-border, #d1d5db);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  &.is-inactive {
    opacity: 0.6;

    .enum-label {
      color: var(--color-text-disabled, #9ca3af);
      text-decoration: line-through;
    }
  }

  .enum-card-header {
    padding: 14px 16px 0;

    .enum-name-row {
      display: flex;
      align-items: center;
      gap: 10px;

      .enum-index-wrap {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: var(--color-bg-page, #f3f4f6);
        flex-shrink: 0;

        .enum-index {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-placeholder, #9ca3af);
        }
      }

      .enum-label {
        flex: 1;
        font-size: 14px;
        font-weight: 500;
        color: var(--color-text-primary, #1f2937);
      }
    }
  }

  .enum-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px 14px;

    .enum-usage-mini {
      display: flex;
      gap: 12px;
      font-size: 12px;
      color: var(--color-text-placeholder, #9ca3af);
    }

    .enum-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;

  .empty-icon-wrap {
    margin-bottom: 16px;
  }

  .empty-text {
    font-size: 15px;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin: 0 0 4px;
  }

  .empty-hint {
    font-size: 13px;
    color: var(--color-text-placeholder);
    margin: 0;
  }
}

@media (max-width: 768px) {
  .mm-body {
    flex-direction: column;
  }

  .mm-nav {
    width: 100% !important;
    flex-direction: row;
    padding: 8px;
    overflow-x: auto;
    border-bottom: 1px solid #f1f5f9;

    .nav-collapse-btn {
      display: none;
    }

    .nav-tab {
      padding: 8px 12px;
      margin-bottom: 0;
      margin-right: 4px;

      .nav-tab-icon {
        width: 16px;
        height: 16px;
      }

      .nav-tab-label {
        font-size: 13px;
      }
    }
  }

  .mm-content {
    padding: 16px;
    border-left: none;
  }

  .enum-toolbar {
    flex-direction: column;
    align-items: stretch;

    .enum-search-input {
      max-width: none;
    }
  }
}
</style>
