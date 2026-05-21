<template>
  <div class="version-list" :aria-busy="!initialized">
    <PageSkeleton v-if="!initialized" type="table" :rows="5" :columns="7" />
    <template v-else>
      <!-- ─── Header ─── -->
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" @click="handleBack" title="返回列表">
            <t-icon name="arrow-left" />
          </button>
          <div class="header-title-group">
            <nav class="header-breadcrumb">
              <a class="breadcrumb-link" @click="handleBack">配方管理</a>
              <span class="breadcrumb-sep">/</span>
              <span class="breadcrumb-current">版本控制中心</span>
            </nav>
            <h2 class="page-title">版本控制中心</h2>
          </div>
        </div>
        <div class="header-actions">
          <div class="status-filter-group">
            <button
              v-for="opt in statusOptions"
              :key="opt.value"
              class="status-filter-btn"
              :class="{ active: statusFilter === opt.value }"
              @click="statusFilter = opt.value; fetchVersions()"
            >{{ opt.label }}</button>
          </div>
          <div class="header-action-divider"></div>
          <button class="action-btn action-primary" @click="handleCreateVersion">
            <t-icon name="add" />
            <span>创建版本</span>
          </button>
          <button
            class="action-btn action-compare"
            :class="{ 'has-selection': selectedForCompare.length >= 2 }"
            :disabled="selectedForCompare.length < 2"
            @click="handleCompare"
          >
            <t-icon name="book" />
            <span>版本对比</span>
            <span v-if="selectedForCompare.length" class="compare-badge">{{ selectedForCompare.length }}</span>
          </button>
        </div>
      </header>

      <!-- ─── Two‑Column Content ─── -->
      <div class="content-layout">
        <!-- ── Left: Timeline ── -->
        <div class="timeline-section">
          <div class="section-head">
            <div class="section-head-left">
              <h3 class="section-title">版本时间线</h3>
              <span class="section-count">{{ versionStore.versions.length }}</span>
            </div>
            <button
              v-if="selectedForCompare.length"
              class="clear-compare-btn"
              @click="clearCompareSelection"
            >清除选择</button>
          </div>

          <div v-if="versionStore.versions.length === 0" class="empty-state">
            <div class="empty-icon"><t-icon name="bulletpoint" size="40px" /></div>
            <p class="empty-text">暂无版本数据</p>
            <t-button theme="primary" @click="handleCreateVersion">
              <template #icon><t-icon name="add" /></template>创建第一个版本
            </t-button>
          </div>

          <div v-else class="timeline">
            <div
              v-for="(ver, index) in versionStore.versions"
              :key="ver.versionId"
              class="timeline-item"
              :class="{
                active: selectedVersionId === ver.versionId,
                'item-current': ver.isCurrent,
              }"
            >
              <!-- Timeline visual connector -->
              <div class="timeline-connector">
                <div class="tl-dot" :class="{ 'dot-current': ver.isCurrent }">
                  <div v-if="ver.isCurrent" class="dot-pulse"></div>
                </div>
                <div v-if="index < versionStore.versions.length - 1" class="tl-line"></div>
              </div>

              <!-- Timeline card -->
              <div class="tl-card" @click="selectVersion(ver)">
                <div class="tl-card-top">
                  <div class="tl-card-header">
                    <span class="tl-version-badge">{{ ver.versionNumber }}</span>
                    <span v-if="ver.isCurrent" class="tl-current-tag">当前</span>
                    <span class="tl-status-chip" :class="'chip-' + ver.status">{{ statusLabel(ver.status) }}</span>
                  </div>
                  <span class="tl-date">{{ splitDateTime(ver.createdAt).date }}</span>
                </div>

                <p v-if="ver.versionReason" class="tl-reason">{{ ver.versionReason }}</p>

                <!-- Changes chips -->
                <div v-if="ver.changes?.length" class="tl-changes">
                  <span
                    v-for="(c, ci) in ver.changes.slice(0, 4)"
                    :key="ci"
                    class="tl-change-chip"
                    :class="'chip-' + c.changeType"
                  >
                    <t-icon :name="changeTypeIcon(c.changeType)" size="12px" />
                    {{ changeTypeLabel(c.changeType) }}
                  </span>
                  <span v-if="ver.changes.length > 4" class="tl-change-more">+{{ ver.changes.length - 4 }}</span>
                </div>

                <!-- Bottom row: compare checkbox -->
                <div class="tl-card-footer">
                  <label class="tl-compare-label" @click.stop>
                    <input
                      type="checkbox"
                      class="tl-checkbox"
                      :checked="selectedForCompare.includes(ver.versionId)"
                      @change="toggleSelect(ver.versionId)"
                    />
                    <span class="tl-checkbox-text">加入对比</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Right: Detail Panel ── -->
        <div class="detail-section">
          <div class="section-head">
            <h3 class="section-title">版本快照</h3>
            <button
              v-if="selectedVersion"
              class="section-close-btn"
              @click="selectedVersionId = null"
              title="关闭详情"
            >
              <t-icon name="close" />
            </button>
          </div>

          <!-- Empty state -->
          <div v-if="!selectedVersion" class="detail-empty">
            <div class="detail-empty-visual">
              <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                <rect x="8" y="12" width="56" height="48" rx="6" stroke="currentColor" stroke-width="2" fill="none" opacity="0.2"/>
                <rect x="16" y="40" width="40" height="2" rx="1" fill="currentColor" opacity="0.12"/>
                <rect x="16" y="46" width="28" height="2" rx="1" fill="currentColor" opacity="0.08"/>
                <circle cx="36" cy="28" r="8" stroke="currentColor" stroke-width="2" fill="none" opacity="0.2" stroke-dasharray="2 2"/>
                <line x1="42" y1="34" x2="48" y2="40" stroke="currentColor" stroke-width="2" opacity="0.2"/>
              </svg>
            </div>
            <p class="detail-empty-text">选择左侧版本查看<br />配方快照与变更详情</p>
          </div>

          <!-- Detail panel -->
          <div v-else class="detail-panel">
            <!-- Version identity -->
            <div class="detail-identity">
              <div class="identity-main">
                <span class="identity-version">{{ selectedVersion.versionNumber }}</span>
                <span v-if="selectedVersion.versionName" class="identity-name">{{ selectedVersion.versionName }}</span>
              </div>
              <div class="identity-meta">
                <span class="identity-status" :class="'st-' + selectedVersion.status">{{ statusLabel(selectedVersion.status) }}</span>
                <span v-if="selectedVersion.isCurrent" class="identity-current">当前版本</span>
                <span class="identity-time">{{ splitDateTime(selectedVersion.createdAt).date }} {{ splitDateTime(selectedVersion.createdAt).time }}</span>
              </div>
            </div>

            <!-- Changes summary -->
            <div v-if="selectedVersion.changes?.length" class="detail-card detail-changes">
              <h4 class="detail-card-title">变更摘要</h4>
              <div class="changes-list">
                <div v-for="(c, ci) in selectedVersion.changes" :key="ci" class="change-row" :class="'cr-' + c.changeType">
                  <span class="change-type-icon">
                    <t-icon :name="changeTypeIcon(c.changeType)" />
                  </span>
                  <span class="change-field">{{ c.fieldLabel || c.fieldName }}</span>
                  <span v-if="c.oldValue !== null && c.newValue !== null" class="change-values">
                    <span class="change-old">{{ c.oldValue }}</span>
                    <t-icon name="arrow-right" size="12px" class="change-arrow" />
                    <span class="change-new">{{ c.newValue }}</span>
                  </span>
                  <span v-else-if="c.newValue !== null" class="change-values">
                    <span class="change-new">{{ c.newValue }}</span>
                  </span>
                  <span v-else class="change-values">
                    <span class="change-old">{{ c.oldValue }}</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Formula snapshot -->
            <div class="detail-card detail-snapshot">
              <h4 class="detail-card-title">配方快照</h4>
              <div class="snapshot-grid">
                <div class="snapshot-field">
                  <span class="sn-field-label">配方编码</span>
                  <span class="sn-field-value">{{ snapshot?.formulaCode || '--' }}</span>
                </div>
                <div class="snapshot-field">
                  <span class="sn-field-label">成品重量</span>
                  <span class="sn-field-value">{{ snapshot?.finishedWeight || snapshot?.finished_weight || '--' }}g</span>
                </div>
                <div class="snapshot-field">
                  <span class="sn-field-label">配方名称</span>
                  <span class="sn-field-value">{{ formulaName || '--' }}</span>
                </div>
                <div class="snapshot-field">
                  <span class="sn-field-label">原料数量</span>
                  <span class="sn-field-value">{{ snapshot?.materials?.length || 0 }} 种</span>
                </div>
              </div>
            </div>

            <!-- Materials composition -->
            <div class="detail-card detail-materials">
              <div class="detail-card-title-row">
                <h4 class="detail-card-title">原料组成</h4>
                <span v-if="snapshot?.materials?.length" class="material-total">{{ snapshot.materials.length }} 项</span>
              </div>
              <div v-if="snapshot?.materials?.length" class="material-list">
                <div v-for="(m, i) in snapshot.materials" :key="i" class="material-row">
                  <div class="material-left">
                    <span class="material-index">{{ i + 1 }}</span>
                    <span class="material-name">{{ m.materialName || m.name || '--' }}</span>
                    <span v-if="getMaterialType(m) === 'supplement'" class="material-tag tag-supplement">辅料</span>
                    <span v-else-if="getMaterialType(m) === 'herb'" class="material-tag tag-herb">主料</span>
                  </div>
                  <div class="material-right">
                    <span class="material-weight">{{ calcActualWeight(m).toFixed(1) }}g</span>
                    <span class="material-pct">{{ (m.quantity || 0).toFixed(2) }}%</span>
                  </div>
                </div>
              </div>
              <p v-else class="material-empty">暂无原料数据</p>
            </div>

            <!-- Actions -->
            <div class="detail-actions">
              <t-popconfirm
                v-if="selectedVersion.status === 'draft'"
                content="确定要发布该版本吗？发布后将替换当前配方。"
                @confirm="handlePublish(selectedVersion)"
              >
                <button class="action-btn action-publish">
                  <t-icon name="send" /> 发布此版本
                </button>
              </t-popconfirm>
              <button class="action-btn action-secondary" @click="handleCompare">
                <t-icon name="book" /> 对比版本
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Create Version Dialog ─── -->
      <t-dialog
        v-model:visible="createVersionVisible"
        header="创建新版本"
        :confirm-btn="{ content: '创建', theme: 'primary' }"
        @confirm="confirmCreateVersion"
      >
        <div class="create-form">
          <label class="create-label">升版原因 <span class="required">*</span></label>
          <textarea
            v-model="createVersionReason"
            class="create-textarea"
            placeholder="请描述本次版本变更的原因或内容摘要"
            rows="3"
          ></textarea>
        </div>
      </t-dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useVersionStore } from '@/stores/version';
import { useFormulaStore } from '@/stores/formula';
import { useMaterialStore } from '@/stores/material';
import { MessagePlugin } from 'tdesign-vue-next';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';
import { splitDateTime } from '@/utils/timeFormat';

const router = useRouter();
const route = useRoute();
const versionStore = useVersionStore();
const formulaStore = useFormulaStore();
const materialStore = useMaterialStore();

const initialized = ref(false);

const formulaId = route.params.formulaId as string;
const formulaName = ref('');
const statusFilter = ref('');
const selectedForCompare = ref<string[]>([]);
const selectedVersionId = ref<string | null>(null);

const statusOptions = [
  { value: '', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已归档' },
];

const snapshot = computed(() => selectedVersion.value?.snapshot || null);
const selectedVersion = computed(() => {
  if (!selectedVersionId.value) return null;
  return versionStore.versions.find((v: any) => v.versionId === selectedVersionId.value) || null;
});

const selectVersion = (ver: any) => {
  selectedVersionId.value = ver.versionId;
};

const statusLabel = (s: string) =>
  s === 'published' ? '已发布' : s === 'draft' ? '草稿' : '已归档';

const changeTypeLabel = (t: string) =>
  t === 'add' ? '新增' : t === 'delete' ? '删除' : '修改';

const changeTypeIcon = (t: string) =>
  t === 'add' ? 'add' : t === 'delete' ? 'remove' : 'edit';

const toggleSelect = (id: string) => {
  const idx = selectedForCompare.value.indexOf(id);
  if (idx >= 0) {
    selectedForCompare.value.splice(idx, 1);
  } else {
    if (selectedForCompare.value.length >= 3) {
      MessagePlugin.warning('最多选择 3 个版本进行对比');
      return;
    }
    selectedForCompare.value.push(id);
  }
  localStorage.setItem('compare_versions', JSON.stringify(selectedForCompare.value));
};

const fetchVersions = () => {
  versionStore.fetchVersions(formulaId, statusFilter.value ? { status: statusFilter.value } : undefined);
};

const handleBack = () => router.push('/formulas');

const createVersionVisible = ref(false);
const createVersionReason = ref('');

const handleCreateVersion = () => {
  createVersionReason.value = '';
  createVersionVisible.value = true;
};

const confirmCreateVersion = async () => {
  if (!createVersionReason.value?.trim()) {
    MessagePlugin.warning('请填写升版原因');
    return;
  }
  const result = await versionStore.createVersion(formulaId, {
    versionReason: createVersionReason.value.trim(),
    status: 'draft',
  });
  if (result.success) {
    MessagePlugin.success(`版本 ${result.data?.versionNumber} 创建成功`);
    createVersionVisible.value = false;
    fetchVersions();
  } else {
    MessagePlugin.error(result.message || '创建失败');
  }
};

const handlePublish = async (row: any) => {
  const result = await versionStore.publishVersion(row.versionId);
  if (result.success) {
    MessagePlugin.success('发布成功，配方数据已同步');
    fetchVersions();
    const formula = await formulaStore.getFormula(formulaId);
    if (formula) formulaName.value = formula.name;
  } else {
    MessagePlugin.error(result.message || '发布失败');
  }
};

const clearCompareSelection = () => {
  selectedForCompare.value = [];
  localStorage.removeItem('compare_versions');
};

const handleCompare = () => router.push(`/versions/compare/${formulaId}`);

const getMaterialType = (material: any): string => {
  if (!material || (!material.materialId && !material.id)) return '';
  const mat = materialStore.allMaterials?.find((m: any) => m.id === (material.materialId || material.id));
  return mat?.materialType || '';
};

const calcActualWeight = (material: any): number => {
  const finishedWeight = snapshot.value?.finishedWeight || snapshot.value?.finished_weight || 0;
  const quantity = material.quantity || 0;
  return (quantity / 100) * finishedWeight;
};

// Restore compare selection from localStorage
const stored = localStorage.getItem('compare_versions');
if (stored) {
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) selectedForCompare.value = parsed;
  } catch { /* ignore */ }
}

onMounted(async () => {
  await Promise.all([
    versionStore.fetchVersions(formulaId, statusFilter.value ? { status: statusFilter.value } : undefined),
    (async () => {
      const formula = await formulaStore.getFormula(formulaId);
      if (formula) formulaName.value = formula.name;
    })(),
    materialStore.fetchMaterials(),
  ]);
  initialized.value = true;
});
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.version-list {
  // ─── Layout ────────────────────────────────────────────────
  .content-layout {
    display: flex;
    gap: 28px;
    align-items: flex-start;
    margin-top: 24px;
    animation: fadeIn 0.4s ease both;
  }

  .timeline-section,
  .detail-section {
    background: $bg-container;
    border-radius: $radius-2xl;
    border: 1px solid $border-color;
    box-shadow: $shadow-elevation-1;
  }

  .timeline-section {
    flex: 0 0 460px;
    max-width: 460px;
    align-self: flex-start;
    position: sticky;
    top: calc(88px + 24px);
    max-height: calc(100vh - 88px - 48px);
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: $border-color;
      border-radius: 4px;
    }
  }

  .detail-section {
    flex: 1;
    min-width: 0;
  }

  // ─── Section Header ─────────────────────────────────────────
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 16px;
    border-bottom: 1px solid $border-color-light;

    .section-head-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .section-title {
      margin: 0;
      font-size: $font-size-h3;
      font-weight: $font-weight-semibold;
      color: $text-primary;
      line-height: 1.3;
    }

    .section-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 22px;
      padding: 0 7px;
      background: var(--color-primary-bg);
      color: var(--color-primary);
      font-size: $font-size-micro;
      font-weight: $font-weight-bold;
      border-radius: $radius-pill;
      line-height: 1;
    }

    .section-close-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      border-radius: $radius-md;
      background: transparent;
      color: $text-tertiary;
      cursor: pointer;
      transition: all $transition-fast;

      &:hover {
        color: $text-regular;
        background: var(--overlay-brand-08);
      }
    }

    .clear-compare-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border: none;
      border-radius: $radius-pill;
      background: $color-danger-light;
      color: $color-danger;
      font-size: $font-size-caption;
      font-weight: $font-weight-medium;
      cursor: pointer;
      transition: all $transition-fast;

      &:hover {
        background: $color-danger-medium;
      }
    }
  }

  // ─── Page Header ────────────────────────────────────────────
  .page-header {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-left: -32px;
    margin-right: -32px;
    padding: 16px 32px;
    background: $overlay-white-80;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid $border-color-light;
    animation: fadeInDown 0.3s ease both;

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;

      .back-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: $radius-lg;
        background: transparent;
        color: $text-tertiary;
        cursor: pointer;
        transition: all $transition-fast;
        font-size: 20px;

        &:hover {
          color: var(--color-primary);
          background: var(--color-primary-bg);
        }
      }

      .header-title-group {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .header-breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          line-height: 1;
          color: $text-tertiary;

          .breadcrumb-link {
            color: $text-tertiary;
            cursor: pointer;
            transition: color 0.15s;
            text-decoration: none;

            &:hover {
              color: var(--color-primary);
            }
          }

          .breadcrumb-sep {
            color: $text-placeholder;
          }

          .breadcrumb-current {
            color: $text-secondary;
          }
        }

        .page-title {
          margin: 0;
          font-size: $font-size-h1;
          font-weight: $font-weight-bold;
          color: $text-primary;
          line-height: 1.35;
        }
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;

      .status-filter-group {
        display: flex;
        gap: 2px;
        padding: 3px;
        background: var(--color-primary-bg);
        border-radius: $radius-lg;
      }

      .status-filter-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 6px 14px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: $text-tertiary;
        font-size: $font-size-caption;
        font-weight: $font-weight-medium;
        cursor: pointer;
        transition: all $transition-fast;
        white-space: nowrap;

        &.active {
          background: $bg-container;
          color: var(--color-primary);
          font-weight: $font-weight-semibold;
          box-shadow: $shadow-xs;
        }

        &:hover:not(.active) {
          color: $text-regular;
        }
      }

      .header-action-divider {
        width: 1px;
        height: 28px;
        background: $border-color;
      }
    }
  }

  // ─── Action Buttons ────────────────────────────────────────
  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border: none;
    border-radius: $radius-lg;
    font-size: $font-size-body-sm;
    font-weight: $font-weight-semibold;
    cursor: pointer;
    transition: all $transition-smooth;
    white-space: nowrap;
    line-height: 1;

    .t-icon {
      font-size: 16px;
    }

    &.action-primary {
      background: var(--gradient-btn);
      color: $text-white;
      box-shadow: var(--shadow-brand-xs);

      &:hover {
        box-shadow: var(--shadow-brand-sm);
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
      }
    }

    &.action-compare {
      background: transparent;
      color: $text-tertiary;
      border: 1px solid $border-color;
      position: relative;

      &:hover:not(:disabled) {
        border-color: var(--color-primary-light);
        color: var(--color-primary);
        background: var(--color-primary-bg);
      }

      &.has-selection {
        border-color: var(--color-primary);
        color: var(--color-primary);
        background: var(--color-primary-bg);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .compare-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        background: var(--color-primary);
        color: $text-white;
        font-size: 10px;
        font-weight: $font-weight-bold;
        border-radius: $radius-pill;
      }
    }

    &.action-publish {
      background: var(--gradient-btn);
      color: $text-white;
      box-shadow: var(--shadow-brand-sm);

      &:hover {
        box-shadow: var(--shadow-brand-md);
        transform: translateY(-1px);
      }
    }

    &.action-secondary {
      background: transparent;
      color: $text-secondary;
      border: 1px solid $border-color;

      &:hover {
        border-color: var(--color-primary-light);
        color: var(--color-primary);
        background: var(--color-primary-bg);
      }
    }
  }

  // ─── Empty State ────────────────────────────────────────────
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 64px 24px;

    .empty-icon {
      color: $text-placeholder;
      margin-bottom: 12px;
    }

    .empty-text {
      margin: 0 0 16px;
      font-size: $font-size-body;
      color: $text-tertiary;
    }
  }

  // ─── Timeline ──────────────────────────────────────────────
  .timeline {
    padding: 16px 20px 20px;
  }

  .timeline-item {
    display: flex;
    gap: 14px;
    cursor: pointer;
    transition: opacity $transition-fast;

    &.active .tl-card {
      border-color: var(--color-primary);
      background: var(--color-primary-bg);
      box-shadow: 0 0 0 1px var(--color-primary-light);
    }

    &.item-current .tl-card {
      .tl-version-badge {
        color: var(--color-primary);
      }
    }
  }

  .timeline-connector {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 20px;
    flex-shrink: 0;

    .tl-dot {
      width: 12px;
      height: 12px;
      border-radius: $radius-circle;
      background: $border-color;
      margin-top: 14px;
      flex-shrink: 0;
      z-index: 1;
      position: relative;
      transition: all $transition-fast;

      &.dot-current {
        background: var(--color-primary);
        box-shadow: 0 0 0 4px var(--overlay-brand-15);
      }
    }

    .dot-pulse {
      position: absolute;
      inset: -4px;
      border-radius: $radius-circle;
      border: 2px solid var(--color-primary);
      animation: pulseRing 2s ease-out infinite;
    }

    .tl-line {
      width: 2px;
      flex: 1;
      min-height: 20px;
      background: linear-gradient(to bottom, $border-color, transparent);
    }
  }

  .tl-card {
    flex: 1;
    background: $bg-container;
    border: 1px solid $border-color-light;
    border-radius: $radius-xl;
    padding: 14px 16px;
    margin-bottom: 14px;
    transition: all $transition-smooth;

    &:hover {
      border-color: var(--color-primary-lighter);
      box-shadow: $shadow-elevation-1;
    }
  }

  .tl-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .tl-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tl-version-badge {
    font-size: $font-size-h4;
    font-weight: $font-weight-bold;
    color: var(--color-primary);
    font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
    line-height: 1.2;
  }

  .tl-current-tag {
    display: inline-flex;
    align-items: center;
    padding: 1px 8px;
    background: var(--color-primary-bg);
    color: var(--color-primary);
    font-size: 10px;
    font-weight: $font-weight-bold;
    border-radius: $radius-pill;
    letter-spacing: 0.03em;
  }

  .tl-status-chip {
    display: inline-flex;
    align-items: center;
    padding: 1px 8px;
    font-size: 10px;
    font-weight: $font-weight-semibold;
    border-radius: $radius-pill;
    letter-spacing: 0.03em;

    &.chip-draft {
      background: $color-warning-bg;
      color: $color-warning;
    }

    &.chip-published {
      background: $color-success-bg;
      color: $color-success;
    }

    &.chip-archived {
      background: $bg-cool-gray;
      color: $text-tertiary;
    }
  }

  .tl-date {
    font-size: $font-size-caption;
    color: $text-tertiary;
    white-space: nowrap;
    flex-shrink: 0;
    margin-top: 3px;
  }

  .tl-reason {
    margin: 6px 0 0;
    font-size: $font-size-body-sm;
    color: $text-regular;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
  }

  .tl-changes {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
  }

  .tl-change-chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    font-size: 10px;
    font-weight: $font-weight-medium;
    border-radius: $radius-pill;
    line-height: 1.4;

    &.chip-add {
      background: $color-success-bg;
      color: $color-success;
    }

    &.chip-delete {
      background: $color-danger-bg;
      color: $color-danger;
    }

    &.chip-modify {
      background: $color-info-bg;
      color: $color-info;
    }
  }

  .tl-change-more {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    font-size: 10px;
    font-weight: $font-weight-medium;
    color: $text-tertiary;
    background: $bg-cool-gray;
    border-radius: $radius-pill;
  }

  .tl-card-footer {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid $border-color-light;
  }

  .tl-compare-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    user-select: none;

    .tl-checkbox {
      appearance: none;
      width: 16px;
      height: 16px;
      border: 1.5px solid $border-color;
      border-radius: 4px;
      cursor: pointer;
      position: relative;
      transition: all $transition-fast;
      flex-shrink: 0;

      &:checked {
        background: var(--color-primary);
        border-color: var(--color-primary);

        &::after {
          content: '';
          position: absolute;
          top: 1px;
          left: 4px;
          width: 4px;
          height: 8px;
          border: solid $text-white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
      }

      &:hover:not(:checked) {
        border-color: var(--color-primary-lighter);
      }
    }

    .tl-checkbox-text {
      font-size: $font-size-caption;
      color: $text-tertiary;
      transition: color $transition-fast;
    }

    &:hover .tl-checkbox-text {
      color: $text-secondary;
    }
  }

  // ─── Detail Panel ───────────────────────────────────────────
  .detail-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 24px;
    text-align: center;

    .detail-empty-visual {
      color: $text-placeholder;
      margin-bottom: 16px;
    }

    .detail-empty-text {
      margin: 0;
      font-size: $font-size-body;
      color: $text-tertiary;
      line-height: 1.7;
    }
  }

  .detail-panel {
    padding: 24px;
  }

  // ── Identity ──
  .detail-identity {
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid $border-color-light;

    .identity-main {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 8px;
    }

    .identity-version {
      font-size: 28px;
      font-weight: $font-weight-bold;
      color: $text-primary;
      font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
      line-height: 1.2;
    }

    .identity-name {
      font-size: $font-size-h4;
      color: $text-secondary;
      font-weight: $font-weight-medium;
    }

    .identity-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .identity-status {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      font-size: $font-size-caption;
      font-weight: $font-weight-semibold;
      border-radius: $radius-pill;

      &.st-draft {
        background: $color-warning-bg;
        color: $color-warning;
      }

      &.st-published {
        background: $color-success-bg;
        color: $color-success;
      }

      &.st-archived {
        background: $bg-cool-gray;
        color: $text-tertiary;
      }
    }

    .identity-current {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      background: var(--overlay-brand-08);
      color: var(--color-primary);
      font-size: $font-size-caption;
      font-weight: $font-weight-semibold;
      border-radius: $radius-pill;
    }

    .identity-time {
      font-size: $font-size-caption;
      color: $text-tertiary;
      margin-left: auto;
    }
  }

  // ── Detail Cards ──
  .detail-card {
    margin-bottom: 20px;

    .detail-card-title {
      margin: 0 0 12px;
      font-size: $font-size-caption;
      font-weight: $font-weight-semibold;
      color: $text-secondary;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .detail-card-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;

      .detail-card-title {
        margin: 0;
      }

      .material-total {
        font-size: $font-size-caption;
        color: $text-tertiary;
        font-weight: $font-weight-medium;
      }
    }
  }

  // ── Changes ──
  .detail-changes {
    .changes-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .change-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: $radius-md;
      font-size: $font-size-body-sm;
      transition: background $transition-fast;

      &.cr-add {
        background: $color-success-light;

        .change-type-icon { color: $color-success; }
      }

      &.cr-delete {
        background: $color-danger-light;

        .change-type-icon { color: $color-danger; }
      }

      &.cr-modify {
        background: $color-info-light;

        .change-type-icon { color: $color-info; }
      }
    }

    .change-type-icon {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
      font-size: 14px;
    }

    .change-field {
      color: $text-regular;
      font-weight: $font-weight-medium;
      min-width: 60px;
    }

    .change-values {
      display: flex;
      align-items: center;
      gap: 4px;
      color: $text-secondary;
    }

    .change-old {
      text-decoration: line-through;
      color: $color-danger;
      opacity: 0.7;
    }

    .change-new {
      color: $text-primary;
      font-weight: $font-weight-medium;
    }

    .change-arrow {
      color: $text-placeholder;
    }
  }

  // ── Snapshot Grid ──
  .detail-snapshot {
    .snapshot-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .snapshot-field {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px 14px;
      background: var(--overlay-brand-05);
      border-radius: $radius-md;

      .sn-field-label {
        font-size: $font-size-micro;
        font-weight: $font-weight-semibold;
        color: $text-tertiary;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .sn-field-value {
        font-size: $font-size-h4;
        font-weight: $font-weight-semibold;
        color: $text-primary;
      }
    }
  }

  // ── Materials List ──
  .detail-materials {
    .material-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .material-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      border-radius: $radius-md;
      background: var(--overlay-brand-05);
      transition: background $transition-fast;

      &:hover {
        background: var(--color-primary-bg);
      }
    }

    .material-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .material-index {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: $bg-container;
      border: 1px solid $border-color-light;
      border-radius: $radius-xs;
      font-size: 10px;
      font-weight: $font-weight-bold;
      color: $text-tertiary;
      flex-shrink: 0;
    }

    .material-name {
      font-size: $font-size-body-sm;
      font-weight: $font-weight-medium;
      color: $text-primary;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .material-tag {
      display: inline-flex;
      align-items: center;
      padding: 0 6px;
      height: 18px;
      font-size: 9px;
      font-weight: $font-weight-bold;
      border-radius: $radius-xs;
      letter-spacing: 0.03em;
      flex-shrink: 0;

      &.tag-supplement {
        background: $color-warning-bg;
        color: $color-warning;
      }

      &.tag-herb {
        background: $color-success-bg;
        color: $color-success;
      }
    }

    .material-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .material-weight {
      font-size: $font-size-body-sm;
      font-weight: $font-weight-semibold;
      color: var(--color-primary);
      font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
    }

    .material-pct {
      font-size: $font-size-caption;
      color: $text-tertiary;
      font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
    }

    .material-empty {
      text-align: center;
      color: $text-tertiary;
      font-size: $font-size-body-sm;
      padding: 24px 0;
      margin: 0;
    }
  }

  // ── Detail Actions ──
  .detail-actions {
    display: flex;
    gap: 10px;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid $border-color-light;
  }

  // ─── Create Dialog ─────────────────────────────────────────
  :deep(.t-dialog) {
    border-radius: $radius-3xl;
    overflow: hidden;
  }

  :deep(.t-dialog__header) {
    font-size: $font-size-h3;
    font-weight: $font-weight-semibold;
    color: $text-primary;
  }

  :deep(.t-dialog__body) {
    padding-bottom: 8px;
  }

  :deep(.t-dialog__footer) {
    padding-top: 8px;
  }

  :deep(.t-btn--theme-primary) {
    background: var(--gradient-btn);
    border: none;
    box-shadow: var(--shadow-brand-xs);

    &:hover {
      box-shadow: var(--shadow-brand-sm);
    }
  }

  .create-form {
    .create-label {
      display: block;
      margin-bottom: 8px;
      font-size: $font-size-body-sm;
      font-weight: $font-weight-medium;
      color: $text-primary;

      .required {
        color: $color-danger;
      }
    }

    .create-textarea {
      display: block;
      width: 100%;
      padding: 10px 12px;
      border: 1px solid $border-color;
      border-radius: $radius-md;
      font-size: $font-size-body-sm;
      font-family: inherit;
      color: $text-primary;
      background: $bg-container;
      resize: vertical;
      transition: border-color $transition-fast;
      outline: none;
      box-sizing: border-box;

      &::placeholder {
        color: $text-placeholder;
      }

      &:focus {
        border-color: var(--color-primary-light);
        box-shadow: 0 0 0 2px var(--overlay-brand-10);
      }
    }
  }
}

// ─── Animations ──────────────────────────────────────
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulseRing {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.6);
    opacity: 0;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}
</style>
