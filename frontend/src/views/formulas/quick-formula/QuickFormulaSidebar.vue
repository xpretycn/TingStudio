<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useQuickFormulaListStore } from "@/stores/quickFormulaList";
import { useQuickFormulaStore } from "@/stores/quickFormula";
import type { QuickFormulaItem, QuickFormulaDraft } from "@/types/quickFormula";

const props = defineProps<{
  isEditing: boolean;
  collapsed: boolean;
  currentQuickFormulaId: string | null;
  triggerCreate: boolean;
}>();

const emit = defineEmits<{
  select: [item: QuickFormulaItem];
  "select-published": [item: QuickFormulaItem];
  create: [item: QuickFormulaItem];
  "update:collapsed": [value: boolean];
  "restore-draft": [draft: QuickFormulaDraft];
  "save-template": [];
  "update:triggerCreate": [value: boolean];
}>();

const store = useQuickFormulaListStore();
const quickFormulaStore = useQuickFormulaStore();

const sidebarRef = ref<HTMLElement | null>(null);
const newFormulaName = ref("");
const isCreatingInline = ref(false);
const editingId = ref<string | null>(null);
const editingName = ref("");
const draft = ref<QuickFormulaDraft | null>(null);

watch(
  () => props.isEditing,
  (editing) => {
    if (editing) {
      emit("update:collapsed", true);
    }
  },
  { immediate: true },
);

watch(
  () => props.triggerCreate,
  (val) => {
    if (val) {
      emit("update:collapsed", false);
      nextTick(() => {
        startCreateInline();
      });
      emit("update:triggerCreate", false);
    }
  },
);

const isOverlayMode = computed(() => props.isEditing && !props.collapsed);

const statusLabel = computed(() => {
  return (status: string) => {
    if (status === "draft") return "编辑中";
    if (status === "published") return "已发布";
    return status;
  };
});

const statusTagClass = computed(() => {
  return (status: string) => {
    if (status === "draft") return "status-tag--draft";
    if (status === "published") return "status-tag--published";
    return "";
  };
});

function toggleCollapse() {
  emit("update:collapsed", !props.collapsed);
}

function handleItemClick(item: QuickFormulaItem) {
  if (editingId.value === item.id) return;
  if (item.status === "published") {
    emit("select-published", item);
  }
  emit("select", item);
  if (props.isEditing) {
    emit("update:collapsed", true);
  }
}

async function handleCreate() {
  const name = newFormulaName.value.trim();
  if (!name) {
    isCreatingInline.value = false;
    newFormulaName.value = "";
    return;
  }
  const item = await store.createQuickFormula(name);
  if (item) {
    newFormulaName.value = "";
    isCreatingInline.value = false;
    emit("create", item);
    if (props.isEditing) {
      emit("update:collapsed", true);
    }
  }
}

function startCreateInline() {
  isCreatingInline.value = true;
  newFormulaName.value = "";
  nextTick(() => {
    const input = document.querySelector("[data-create-input]") as HTMLInputElement | null;
    input?.focus();
  });
}

function cancelCreateInline() {
  isCreatingInline.value = false;
  newFormulaName.value = "";
}

async function handleDelete(id: string) {
  await store.deleteQuickFormula(id);
}

function startRename(item: QuickFormulaItem) {
  editingId.value = item.id;
  editingName.value = item.name;
  nextTick(() => {
    const input = document.querySelector(`[data-rename-id="${item.id}"]`) as HTMLInputElement | null;
    input?.focus();
    input?.select();
  });
}

async function confirmRename() {
  const id = editingId.value;
  const name = editingName.value.trim();
  if (id && name) {
    await store.saveQuickFormula(id, { name });
  }
  editingId.value = null;
  editingName.value = "";
}

function cancelRename() {
  editingId.value = null;
  editingName.value = "";
}

function handleRestoreDraft() {
  if (draft.value) {
    quickFormulaStore.restoreDraft(draft.value);
    emit("restore-draft", draft.value);
    draft.value = null;
  }
}

function handleDiscardDraft() {
  quickFormulaStore.clearDraft();
  draft.value = null;
}

function handleDocumentClick(e: MouseEvent) {
  if (props.collapsed) return;
  if (!sidebarRef.value) return;
  if (sidebarRef.value.contains(e.target as Node)) return;
  if (isCreatingInline.value) return;
  const target = e.target as HTMLElement;
  if (target.closest(".t-popup, .t-popconfirm, .t-select-dropdown, .t-dialog, .t-drawer")) return;
  emit("update:collapsed", true);
}

onMounted(() => {
  store.fetchList();
  const loaded = quickFormulaStore.loadDraft();
  if (loaded) {
    draft.value = loaded;
  }
  document.addEventListener("mousedown", handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", handleDocumentClick);
});

function clearDraftBanner() {
  draft.value = null;
}

defineExpose({ clearDraftBanner });
</script>

<template>
  <div ref="sidebarRef" class="quick-formula-sidebar" :class="{
    'collapsed': props.collapsed,
    'sidebar--overlay': isOverlayMode,
  }">
    <div class="sidebar-inner">
      <template v-if="props.collapsed">
      </template>

      <template v-else>
        <div class="sidebar-header">
          <h3 class="sidebar-title">快速配方</h3>
          <button class="collapse-btn" title="折叠侧边栏" @click="toggleCollapse">
            <t-icon name="chevron-left" size="16px" />
          </button>
        </div>

        <button class="new-formula-btn" @click="startCreateInline" title="新建快速配方">
          <t-icon name="add" size="16px" />
          <span>新建配方</span>
        </button>

        <div v-if="draft" class="draft-banner">
          <div class="draft-banner-info">
            <t-icon name="time" size="14px" class="draft-banner-icon" />
            <span class="draft-banner-text">草稿：{{ draft.formulaName }}</span>
          </div>
          <div class="draft-banner-actions">
            <button class="draft-restore-btn" @click.stop="handleRestoreDraft">恢复</button>
            <button class="draft-discard-btn" @click.stop="handleDiscardDraft">丢弃</button>
          </div>
        </div>

        <div class="sidebar-list">
          <t-loading :loading="store.loading" size="small">
            <div v-if="isCreatingInline" class="sidebar-item sidebar-item--creating">
              <div class="item-info">
                <input data-create-input v-model="newFormulaName" class="rename-input" :maxlength="50"
                  placeholder="输入配方名称" @keydown.enter="handleCreate" @keydown.escape="cancelCreateInline"
                  @blur="handleCreate" @click.stop />
              </div>
            </div>
            <div v-if="store.list.length === 0 && !store.loading && !isCreatingInline" class="empty-hint">
              <t-icon name="edit" size="24px" />
              <span>暂无快速配方</span>
            </div>
            <div v-for="item in store.list" :key="item.id" class="sidebar-item"
              :class="{ active: store.selectedId === item.id }" @click="handleItemClick(item)">
              <div class="item-info">
                <template v-if="editingId === item.id">
                  <input :data-rename-id="item.id" v-model="editingName" class="rename-input" :maxlength="50"
                    @keydown.enter="confirmRename" @keydown.escape="cancelRename" @blur="confirmRename" @click.stop />
                </template>
                <template v-else>
                  <span class="item-name" @dblclick.stop="startRename(item)">{{ item.name }}</span>
                  <span class="item-status" :class="statusTagClass(item.status)">
                    {{ statusLabel(item.status) }}
                  </span>
                </template>
              </div>
              <div class="item-actions">
                <button v-if="editingId !== item.id && item.id === currentQuickFormulaId && item.status === 'draft'"
                  class="item-save-btn" @click.stop="emit('save-template')" title="保存为模板">
                  <t-icon name="folder" size="12px" />
                </button>
                <button v-if="editingId !== item.id" class="item-rename-btn" @click.stop="startRename(item)"
                  title="重命名">
                  <t-icon name="edit-1" size="12px" />
                </button>
                <t-popconfirm content="确定删除此快速配方吗？" :confirm-btn="{ content: '确认', theme: 'danger' }"
                  @confirm="handleDelete(item.id)">
                  <button class="item-delete-btn" @click.stop title="删除">
                    <t-icon name="delete" size="14px" />
                  </button>
                </t-popconfirm>
              </div>
            </div>
          </t-loading>
        </div>
      </template>
    </div>

  </div>
</template>

<style lang="scss" scoped>
@use "@/assets/styles/variables" as *;

.quick-formula-sidebar {
  position: relative;
  overflow: visible;
  background: $bg-container;
  border-right: 1px solid $border-color-light;
  width: 220px;
  min-width: 220px;
  max-width: 220px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.collapsed {
    width: 0;
    min-width: 0;
    max-width: 0;
    border-right: none;
    overflow: hidden;

    .sidebar-inner {
      width: 0;
      opacity: 0;
    }
  }

  &.sidebar--overlay {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 30;
    height: 100%;
    box-shadow: $shadow-float;
    border-right: none;
    border-radius: 0 $radius-3xl $radius-3xl 0;
    overflow: hidden;
  }
}

.sidebar-inner {
  width: 220px;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 $space-3 $space-2;
  flex-shrink: 0;
}

.sidebar-title {
  margin: 0;
  font-size: $font-size-body;
  font-weight: $font-weight-bold;
  color: $text-primary;
  letter-spacing: $ls-heading;
}

.collapse-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: $radius-md;
  background: transparent;
  color: $text-tertiary;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $bg-hover;
    color: $text-secondary;
  }
}

.new-formula-btn {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin: 0 $space-2-5 $space-2;
  padding: $space-2 $space-3;
  border: 1px dashed $border-color;
  border-radius: $radius-lg;
  background: $bg-container;
  cursor: pointer;
  color: $text-secondary;
  font-size: $font-size-body-sm;
  font-weight: $font-weight-medium;
  transition: all $transition-fast;
  white-space: nowrap;

  &:hover {
    border-color: $emerald-500;
    color: $emerald-500;
    background: $overlay-emerald-04;
  }
}

.draft-banner {
  margin: 0 $space-2;
  padding: $space-2;
  background: $color-warning-bg;
  border: 1px solid $color-warning-alpha-light;
  border-radius: $radius-lg;
  display: flex;
  flex-direction: column;
  gap: $space-1-5;
}

.draft-banner-info {
  display: flex;
  align-items: center;
  gap: $space-1;
}

.draft-banner-icon {
  color: $color-warning;
  flex-shrink: 0;
}

.draft-banner-text {
  font-size: $font-size-caption;
  font-weight: $font-weight-medium;
  color: $color-warning-orange;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draft-banner-actions {
  display: flex;
  gap: $space-1;
}

.draft-restore-btn,
.draft-discard-btn {
  flex: 1;
  padding: $space-0-5 0;
  border: none;
  border-radius: $radius-sm;
  font-size: $font-size-micro;
  font-weight: $font-weight-semibold;
  cursor: pointer;
  transition: all $transition-fast;
}

.draft-restore-btn {
  background: $emerald-500;
  color: $text-white;

  &:hover {
    background: $emerald-600;
  }
}

.draft-discard-btn {
  background: transparent;
  color: $text-tertiary;
  border: 1px solid $border-color;

  &:hover {
    border-color: $color-danger;
    color: $color-danger;
  }
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: $space-2 $space-2;

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
  padding: $space-6 0;
  color: $text-placeholder;
  font-size: $font-size-body-sm;
}

.sidebar-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-2 $space-2-5;
  border-radius: $radius-lg;
  cursor: pointer;
  transition: all $transition-fast;
  margin-bottom: $space-0-5;

  &:hover {
    background: $bg-hover;

    .item-delete-btn,
    .item-rename-btn,
    .item-save-btn {
      opacity: 1;
    }
  }

  &.active {
    background: $overlay-emerald-08;
    border-left: 3px solid $emerald-500;
    padding-left: calc(#{$space-2-5} - 3px);
  }

  &--creating {
    background: $overlay-emerald-04;
    border: 1px dashed $emerald-500;
    padding: $space-1-5 $space-2-5;
  }
}

.item-info {
  display: flex;
  align-items: center;
  gap: $space-1-5;
  flex: 1;
  min-width: 0;
}

.rename-input {
  flex: 1;
  min-width: 0;
  padding: 2px $space-1;
  border: 1px solid $emerald-500;
  border-radius: $radius-sm;
  background: $bg-container;
  font-size: $font-size-body-sm;
  font-weight: $font-weight-medium;
  color: $text-primary;
  outline: none;
  line-height: 1.4;

  &:focus {
    box-shadow: 0 0 0 2px $overlay-emerald-08;
  }
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.item-rename-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: $radius-sm;
  background: transparent;
  color: $text-placeholder;
  cursor: pointer;
  opacity: 0;
  transition: all $transition-fast;
  flex-shrink: 0;

  &:hover {
    background: $overlay-emerald-08;
    color: $emerald-500;
  }
}

.item-save-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: $radius-sm;
  background: transparent;
  color: $emerald-500;
  cursor: pointer;
  opacity: 0;
  transition: all $transition-fast;
  flex-shrink: 0;

  &:hover {
    background: $overlay-emerald-08;
    color: $emerald-600;
  }
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
  padding: 1px $space-1;
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
  width: 22px;
  height: 22px;
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
