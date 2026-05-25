<template>
  <div class="enum-manage">
    <!-- 顶部 Header -->
    <header class="detail-header">
      <div class="header-left">
        <button class="header-back-btn" @click="$router.back()" title="返回">
          <t-icon name="arrow-left" />
        </button>
        <div class="header-title-group">
          <nav class="header-breadcrumb">
            <a class="breadcrumb-link" @click="$router.push('/')">首页</a>
            <t-icon name="chevron-right" class="breadcrumb-sep" />
            <span class="breadcrumb-current">枚举值管理</span>
          </nav>
          <h2 class="page-title">枚举值管理</h2>
        </div>
      </div>
    </header>

    <!-- 主内容区域 -->
    <main class="enum-main">
      <section class="enum-card">
        <!-- 说明文字 -->
        <p class="enum-desc">
          管理原料属性中的枚举选项，包括性状、口感、功效三类。停用的选项不会出现在新建/编辑原料的选项列表中。
        </p>

        <!-- Tabs -->
        <t-tabs v-model="activeTab" class="enum-tabs">
          <t-tab-panel
            v-for="cat in categories"
            :key="cat.value"
            :value="cat.value"
            :label="cat.label"
          >
            <div class="tab-toolbar">
              <t-input
                v-model="keyword"
                placeholder="搜索枚举值..."
                clearable
                class="search-input"
              >
                <template #prefix-icon><t-icon name="search" /></template>
              </t-input>
              <t-button theme="primary" @click="openCreateDialog">
                <template #icon><t-icon name="add" /></template>
                添加枚举值
              </t-button>
            </div>

            <!-- 列表 -->
            <div v-if="currentList.length > 0" class="enum-list">
              <div
                v-for="(item, index) in currentList"
                :key="item.id"
                class="enum-item"
                :class="{ 'is-inactive': !item.isActive }"
              >
                <span class="enum-index">{{ index + 1 }}</span>
                <span class="enum-label">{{ item.label }}</span>
                <t-tag
                  v-if="!item.isActive"
                  theme="default"
                  variant="light"
                  size="small"
                  class="inactive-tag"
                >
                  已停用
                </t-tag>
                <div class="enum-actions">
                  <t-switch
                    :value="item.isActive"
                    size="small"
                    @change="handleToggleActive(item)"
                  />
                  <t-button
                    variant="text"
                    theme="default"
                    size="small"
                    @click="openEditDialog(item)"
                  >
                    <template #icon><t-icon name="edit" /></template>
                  </t-button>
                  <t-popconfirm
                    content="确定删除该枚举值吗？删除后不可恢复。"
                    @confirm="handleDelete(item)"
                  >
                    <t-button
                      variant="text"
                      theme="danger"
                      size="small"
                    >
                      <template #icon><t-icon name="delete" /></template>
                    </t-button>
                  </t-popconfirm>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-else class="enum-empty">
              <t-icon name="folder-open" size="48px" class="empty-icon" />
              <p class="empty-text">
                {{ keyword ? "未找到匹配的枚举值" : "暂无枚举值，点击上方按钮添加" }}
              </p>
            </div>
          </t-tab-panel>
        </t-tabs>
      </section>
    </main>

    <!-- 新增/编辑弹窗 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="dialogMode === 'create' ? '添加枚举值' : '编辑枚举值'"
      :confirm-btn="{ loading: dialogLoading }"
      :on-confirm="handleDialogConfirm"
      @close="handleDialogClose"
    >
      <t-form label-width="80px">
        <t-form-item label="所属分类">
          <t-tag theme="primary" variant="light">
            {{ CATEGORY_LABELS[activeTab] }}
          </t-tag>
        </t-form-item>
        <t-form-item label="枚举值名称">
          <t-input
            v-model="formLabel"
            placeholder="请输入枚举值名称"
            clearable
            maxlength="50"
            show-limit-number
            @enter="handleDialogConfirm"
          />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { MessagePlugin } from "tdesign-vue-next";
import { useEnumStore } from "@/stores/enum";
import type { EnumOption } from "@/api/enum";

const enumStore = useEnumStore();

const activeTab = ref("appearance");
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

const categories = [
  { value: "appearance", label: "性状" },
  { value: "taste", label: "口感" },
  { value: "efficacy", label: "功效" },
];

const currentList = computed(() => {
  const list = enumStore.getOptionsByCategory(
    activeTab.value as "appearance" | "taste" | "efficacy"
  );
  if (!keyword.value) return list;
  const kw = keyword.value.toLowerCase();
  return list.filter(
    (item) =>
      item.label.toLowerCase().includes(kw) ||
      item.value.toLowerCase().includes(kw)
  );
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
        category: activeTab.value,
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

const handleToggleActive = async (item: EnumOption) => {
  try {
    await enumStore.updateOption(item.id, { isActive: !item.isActive });
    MessagePlugin.success(item.isActive ? "已停用" : "已启用");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "操作失败";
    MessagePlugin.error(msg);
  }
};
</script>

<style scoped lang="scss">
@use "@/assets/styles/variables.scss" as *;

.enum-manage {
  // ─── Header ───
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
    border-bottom: 1px solid $border-color-light;
    animation: fadeInDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;

    .header-left {
      display: flex;
      align-items: center;
      gap: $space-4;

      .header-back-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: $radius-xl;
        background: transparent;
        color: $text-placeholder;
        cursor: pointer;
        transition: all $transition-fast;
        font-size: 20px;

        &:hover {
          color: $brand-primary;
          background-color: $brand-primary-bg;
        }
      }

      .header-title-group {
        display: flex;
        flex-direction: column;
        gap: $space-1-5;

        .header-breadcrumb {
          display: flex;
          align-items: center;
          gap: $space-1-5;
          font-size: $font-size-caption;
          line-height: 1;

          .breadcrumb-link {
            color: $text-placeholder;
            cursor: pointer;
            transition: color 0.15s;
            text-decoration: none;

            &:hover {
              color: $brand-primary;
            }
          }

          .breadcrumb-sep {
            font-size: $font-size-caption;
            color: $text-placeholder;
          }

          .breadcrumb-current {
            color: $text-secondary;
          }
        }

        .page-title {
          margin: 0;
          font-size: $font-size-h2;
          font-weight: $font-weight-bold;
          color: $text-primary;
          line-height: $line-height-tight;
        }
      }
    }
  }

  // ─── Main ───
  .enum-main {
    margin-top: $space-6;

    .enum-card {
      background: $bg-container;
      padding: $space-6;
      border-radius: $radius-2xl;
      box-shadow: $shadow-elevation-1;
      border: 1px solid $border-color-light;
      animation: fadeInUp 0.35s ease both;
    }

    .enum-desc {
      margin: 0 0 $space-5;
      font-size: $font-size-body-sm;
      color: $text-tertiary;
      line-height: $line-height-normal;
    }
  }

  // ─── Tabs ───
  .enum-tabs {
    :deep(.t-tabs__nav-item.t-is-active) {
      color: $brand-primary;
    }

    :deep(.t-tabs__active-bar) {
      background-color: $brand-primary;
    }

    :deep(.t-tabs__content) {
      padding-top: $space-5;
    }
  }

  // ─── Toolbar ───
  .tab-toolbar {
    display: flex;
    align-items: center;
    gap: $space-3;
    margin-bottom: $space-5;

    .search-input {
      max-width: 280px;
    }
  }

  // ─── List ───
  .enum-list {
    display: flex;
    flex-direction: column;
    gap: $space-2;
  }

  .enum-item {
    display: flex;
    align-items: center;
    gap: $space-3;
    padding: $space-3 $space-4;
    border-radius: $radius-xl;
    border: 1px solid $border-color-light;
    background: $bg-container;
    transition: all $transition-fast;

    &:hover {
      background: $bg-hover;
      border-color: $border-color;
    }

    &.is-inactive {
      opacity: 0.6;

      .enum-label {
        color: $text-tertiary;
        text-decoration: line-through;
      }
    }

    .enum-index {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: $radius-md;
      background: $bg-page;
      font-size: $font-size-caption;
      font-weight: $font-weight-semibold;
      color: $text-tertiary;
      flex-shrink: 0;
    }

    .enum-label {
      flex: 1;
      font-size: $font-size-body;
      font-weight: $font-weight-medium;
      color: $text-primary;
    }

    .inactive-tag {
      flex-shrink: 0;
    }

    .enum-actions {
      display: flex;
      align-items: center;
      gap: $space-2;
      flex-shrink: 0;
    }
  }

  // ─── Empty ───
  .enum-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: $space-10 0;

    .empty-icon {
      color: $text-placeholder;
      margin-bottom: $space-3;
    }

    .empty-text {
      font-size: $font-size-body-sm;
      color: $text-tertiary;
      margin: 0;
    }
  }

  // ─── Animations ───
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

  // ─── Responsive ───
  @media (max-width: 768px) {
    .detail-header {
      padding: $space-3 $space-4;

      .header-left .header-title-group .page-title {
        font-size: $font-size-h3;
      }
    }

    .tab-toolbar {
      flex-direction: column;
      align-items: stretch;

      .search-input {
        max-width: none;
      }
    }

    .enum-item {
      flex-wrap: wrap;
      gap: $space-2;

      .enum-label {
        flex-basis: calc(100% - 44px);
      }

      .enum-actions {
        margin-left: 36px;
      }
    }
  }
}
</style>
