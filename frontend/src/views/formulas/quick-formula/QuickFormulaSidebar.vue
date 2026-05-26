<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue"
import { useQuickFormulaListStore } from "@/stores/quickFormulaList"
import type { QuickFormulaItem } from "@/types/quickFormula"

const emit = defineEmits<{
  select: [item: QuickFormulaItem]
  "select-published": [item: QuickFormulaItem]
  create: [item: QuickFormulaItem]
}>()

const store = useQuickFormulaListStore()

const sidebarRef = ref<HTMLElement | null>(null)
const collapsed = ref(false)
const showCreateDialog = ref(false)
const newFormulaName = ref("")

const statusLabel = computed(() => {
  return (status: string) => {
    if (status === "draft") return "编辑中"
    if (status === "published") return "已发布"
    return status
  }
})

const statusTagClass = computed(() => {
  return (status: string) => {
    if (status === "draft") return "status-tag--draft"
    if (status === "published") return "status-tag--published"
    return ""
  }
})

function toggleCollapse() {
  collapsed.value = !collapsed.value
}

function handleItemClick(item: QuickFormulaItem) {
  if (item.status === "published") {
    emit("select-published", item)
  }
  emit("select", item)
}

async function handleCreate() {
  const name = newFormulaName.value.trim()
  if (!name) return
  const item = await store.createQuickFormula(name)
  if (item) {
    showCreateDialog.value = false
    newFormulaName.value = ""
    emit("create", item)
  }
}

async function handleDelete(id: string) {
  await store.deleteQuickFormula(id)
}

function handleCreateDialogClose() {
  showCreateDialog.value = false
  newFormulaName.value = ""
}

function handleDocumentClick(e: MouseEvent) {
  if (collapsed.value) return
  if (!sidebarRef.value) return
  if (sidebarRef.value.contains(e.target as Node)) return
  if (showCreateDialog.value) return
  collapsed.value = true
}

onMounted(() => {
  store.fetchList()
  document.addEventListener("mousedown", handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", handleDocumentClick)
})
</script>

<template>
  <div ref="sidebarRef" class="quick-formula-sidebar" :class="{ collapsed }">
    <div class="sidebar-inner">
      <!-- 折叠态：仅显示图标按钮 -->
      <template v-if="collapsed">
        <button class="collapse-icon-btn" title="展开侧边栏" @click="toggleCollapse">
          <t-icon name="chevron-right" size="20px" />
        </button>
      </template>

      <!-- 展开态：标题 + 新建按钮 + 列表 -->
      <template v-else>
        <div class="sidebar-header">
          <h3 class="sidebar-title">快速配方</h3>
          <div class="sidebar-header-actions">
            <button class="collapse-btn" title="折叠侧边栏" @click="toggleCollapse">
              <t-icon name="chevron-left" size="16px" />
            </button>
            <button class="add-btn" title="新建快速配方" @click="showCreateDialog = true">
              <t-icon name="add" size="16px" />
            </button>
          </div>
        </div>

        <div class="sidebar-list">
          <t-loading :loading="store.loading" size="small">
            <div v-if="store.list.length === 0 && !store.loading" class="empty-hint">
              <t-icon name="edit" size="24px" />
              <span>暂无快速配方</span>
            </div>
            <div
              v-for="item in store.list"
              :key="item.id"
              class="sidebar-item"
              :class="{ active: store.selectedId === item.id }"
              @click="handleItemClick(item)"
            >
              <div class="item-info">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-status" :class="statusTagClass(item.status)">
                  {{ statusLabel(item.status) }}
                </span>
              </div>
              <t-popconfirm
                content="确定删除此快速配方吗？"
                :confirm-btn="{ content: '确认', theme: 'danger' }"
                @confirm="handleDelete(item.id)"
              >
                <button class="item-delete-btn" @click.stop title="删除">
                  <t-icon name="delete" size="14px" />
                </button>
              </t-popconfirm>
            </div>
          </t-loading>
        </div>
      </template>
    </div>

    <!-- 新建快速配方弹窗 -->
    <t-dialog
      :visible="showCreateDialog"
      header="新建快速配方"
      :confirm-btn="{ content: '创建', theme: 'primary', disabled: !newFormulaName.trim() }"
      :on-confirm="handleCreate"
      :on-close="handleCreateDialogClose"
      :close-on-overlay-click="false"
      width="400px"
    >
      <t-input
        v-model="newFormulaName"
        placeholder="请输入配方名称"
        clearable
        :maxlength="50"
        @keydown.enter="handleCreate"
      />
    </t-dialog>
  </div>
</template>

<style lang="scss" scoped>
@use "@/assets/styles/variables" as *;

.quick-formula-sidebar {
  width: 260px;
  min-width: 260px;
  max-width: 260px;
  overflow: hidden;
  background: $bg-container;
  border-right: 1px solid $border-color-light;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.collapsed {
    width: 52px;
    min-width: 52px;
    max-width: 52px;

    .sidebar-inner {
      width: 52px;
    }
  }
}

.sidebar-inner {
  width: 260px;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

// 折叠态图标按钮
.collapse-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin: $space-2 0 0 $space-2;
  border: none;
  border-radius: $radius-circle;
  background: $overlay-emerald-08;
  color: $emerald-500;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $overlay-emerald-15;
    transform: scale(1.08);
  }
}

// 展开态头部
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-4 $space-4 $space-2;
  flex-shrink: 0;
}

.sidebar-title {
  margin: 0;
  font-size: $font-size-h3;
  font-weight: $font-weight-bold;
  color: $text-primary;
  letter-spacing: $ls-heading;
}

.sidebar-header-actions {
  display: flex;
  align-items: center;
  gap: $space-1-5;
}

.collapse-btn,
.add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;
}

.collapse-btn {
  background: transparent;
  color: $text-tertiary;

  &:hover {
    background: $bg-hover;
    color: $text-secondary;
  }
}

.add-btn {
  background: $emerald-500;
  color: $text-white;

  &:hover {
    background: $emerald-600;
    transform: scale(1.05);
  }
}

// 列表区域
.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: $space-2 $space-3;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: $border-color;
    border-radius: 2px;
  }
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-2;
  padding: $space-8 0;
  color: $text-placeholder;
  font-size: $font-size-body-sm;
}

// 列表项
.sidebar-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-2-5 $space-3;
  border-radius: $radius-lg;
  cursor: pointer;
  transition: all $transition-fast;
  margin-bottom: $space-1;

  &:hover {
    background: $bg-hover;

    .item-delete-btn {
      opacity: 1;
    }
  }

  &.active {
    background: $overlay-emerald-08;
    border-left: 3px solid $emerald-500;
    padding-left: calc(#{$space-3} - 3px);
  }
}

.item-info {
  display: flex;
  align-items: center;
  gap: $space-2;
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: $font-size-body-sm;
  font-weight: $font-weight-medium;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-status {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 1px $space-1-5;
  border-radius: $radius-pill;
  font-size: $font-size-micro;
  font-weight: $font-weight-semibold;

  &--draft {
    background: $color-warning-bg;
    color: $color-warning;
  }

  &--published {
    background: $color-success-bg;
    color: $color-success;
  }
}

.item-delete-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: $radius-sm;
  background: transparent;
  color: $text-placeholder;
  cursor: pointer;
  opacity: 0;
  transition: all $transition-fast;
  flex-shrink: 0;

  &:hover {
    background: $color-danger-light;
    color: $color-danger;
  }
}
</style>
