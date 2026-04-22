<template>
  <div class="version-list" :aria-busy="!initialized">
    <PageSkeleton v-if="!initialized" type="table" :rows="5" :columns="7" />
    <template v-else>
      <header class="detail-header">
        <div class="header-left">
          <button class="header-back-btn" @click="handleBack" title="返回列表">
            <t-icon name="arrow-left" />
          </button>
          <div class="header-title-group">
            <nav class="header-breadcrumb">
              <a class="breadcrumb-link" @click="handleBack">配方管理</a>
              <t-icon name="chevron-right" class="breadcrumb-sep" />
              <span class="breadcrumb-current">版本管理</span>
            </nav>
            <h2 class="page-main-title">版本控制中心</h2>
          </div>
        </div>
        <div class="header-actions">
          <t-radio-group v-model="statusFilter" variant="default-filled" @change="fetchVersions" size="small">
            <t-radio-button value="">全部</t-radio-button>
            <t-radio-button value="draft">草稿</t-radio-button>
            <t-radio-button value="published">已发布</t-radio-button>
            <t-radio-button value="archived">已归档</t-radio-button>
          </t-radio-group>
          <button class="header-action-btn" @click="handleCreateVersion">
            <t-icon name="add" class="btn-icon" /> 创建版本
          </button>
          <button class="header-action-btn compare-btn" :class="{ 'has-selection': selectedForCompare.length > 0 }"
            @click="handleCompare">
            <t-icon name="book" class="btn-icon" /> 进入对比 (<span>{{ selectedForCompare.length }}</span>)
          </button>
        </div>
      </header>

      <main class="detail-main">
        <div class="version-table-card">
          <t-table :data="versionStore.versions" :columns="columns" :loading="versionStore.loading" row-key="versionId"
            hover table-layout="auto">
            <template #empty>
              <t-empty description="暂无版本数据" role="status">
                <template #action>
                  <t-button theme="primary" @click="handleCreateVersion">
                    <template #icon><t-icon name="add" /></template>创建第一个版本
                  </t-button>
                </template>
              </t-empty>
            </template>
            <template #row-select="{ row }">
              <div class="select-checkbox-wrap">
                <input type="checkbox" class="custom-checkbox" :checked="selectedForCompare.includes(row.versionId)"
                  @change="toggleSelect(row.versionId)" />
              </div>
            </template>
            <template #status="{ row }">
              <span class="status-pill" :class="'status-' + row.status">{{ statusLabel(row.status) }}</span>
            </template>
            <template #versionNumber="{ row }">
              <span class="ver-num">{{ row.versionNumber }}</span>
              <span v-if="row.isCurrent" class="ver-current-tag">当前</span>
            </template>
            <template #versionReason="{ row }">
              <span v-if="row.versionReason" class="cell-reason">{{ row.versionReason }}</span>
              <span v-else class="no-changes">-</span>
            </template>
            <template #createdAt="{ row }">
              <div class="cell-date">
                <span class="date-line">{{ formatCreatedAt(row.createdAt).date }}</span>
                <span class="time-line">{{ formatCreatedAt(row.createdAt).time }}</span>
              </div>
            </template>
            <template #changes="{ row }">
              <div class="cell-changes">
                <template v-if="row.changes?.length">
                  <t-space :size="4" wrap>
                    <t-tooltip v-for="(c, ci) in row.changes" :key="ci"
                      :content="`${changeTypeLabel(c.changeType)} ${c.fieldLabel}${c.oldValue !== null ? '：' + c.oldValue : ''}${c.oldValue !== null && c.newValue !== null ? ' → ' : ''}${c.newValue !== null ? c.newValue : ''}`">
                      <t-tag size="small" :theme="changeTypeTheme(c.changeType)" variant="light-outline"
                        class="change-tag">
                        <template #icon>
                          <t-icon :name="changeTypeIcon(c.changeType)" size="14px" />
                        </template>
                        {{ changeTypeLabel(c.changeType) }} {{ c.fieldLabel }}
                      </t-tag>
                    </t-tooltip>
                  </t-space>
                </template>
                <span v-else class="no-changes">-</span>
              </div>
            </template>
            <template #operation="{ row }">
              <div class="op-btns">
                <button class="op-icon-btn" @click="handleViewSnapshot(row)" title="查看快照">
                  <t-icon name="browse" />
                </button>
                <t-popconfirm v-if="row.status === 'draft'" content="确定要发布该版本吗？发布后将替换当前版本。"
                  @confirm="handlePublish(row)">
                  <button class="op-icon-btn op-publish" title="发布版本">
                    <t-icon name="send" />
                  </button>
                </t-popconfirm>
              </div>
            </template>
          </t-table>
        </div>
      </main>
    </template>

    <t-dialog v-model:visible="createVersionVisible" header="创建新版本" :confirm-btn="{ content: '创建', theme: 'primary' }"
      @confirm="confirmCreateVersion">
      <t-form-item label="升版原因" style="margin-bottom: 0;">
        <t-textarea v-model="createVersionReason" placeholder="请输入升版原因（必填）" :autosize="{ minRows: 2, maxRows: 4 }" />
      </t-form-item>
    </t-dialog>

    <t-drawer v-model:visible="snapshotVisible" :footer="false" size="600px" placement="right" :show-overlay="true"
      :close-on-overlay-click="true" :close-btn="true" class="snap-drawer">
      <template #header>
        <div class="snap-header">
          <div class="snap-header-text">
            <h3 class="snap-title">{{ currentSnapshot?.versionName || '版本快照详情' }}<span
                v-if="currentSnapshot?.versionNumber" class="snap-version-num"> {{ currentSnapshot.versionNumber
                }}</span></h3>
            <p class="snap-subtitle">配方数据备份记录</p>
          </div>
        </div>
      </template>
      <div v-if="currentSnapshot" class="snap-body">
        <div class="snap-info-grid">
          <div class="snap-info-card">
            <label class="snap-info-label">配方编码</label>
            <p class="snap-info-value">{{ currentSnapshot.snapshot?.formulaCode || '--' }}</p>
          </div>
          <div class="snap-info-card">
            <label class="snap-info-label">发布状态</label>
            <p class="snap-info-value"><span :class="'status-tag status-' + currentSnapshot.status">{{
              statusLabel(currentSnapshot.status) }}</span></p>
          </div>
        </div>

        <div class="snap-ingredients-section">
          <h4 class="snap-section-label">原料组成快照</h4>
          <div v-if="currentSnapshot.snapshot?.materials?.length" class="snap-ingredient-list">
            <div v-for="(m, i) in currentSnapshot.snapshot.materials" :key="i" class="snap-ingredient-item">
              <div class="snap-ing-left">
                <span class="snap-ing-name">{{ m.materialName || '--' }}</span>
                <span v-if="getMaterialType(m) === 'supplement'" class="snap-ing-tag snap-tag-supplement">辅料</span>
                <span v-else-if="getMaterialType(m) === 'herb'" class="snap-ing-tag snap-tag-herb">主料</span>
              </div>
              <span class="snap-ing-qty">{{ calcActualWeight(m).toFixed(1) }}g / {{ (m.quantity || 0).toFixed(2)
              }}%</span>
            </div>
          </div>
          <p v-else class="snap-empty">暂无原料数据</p>
        </div>
      </div>
    </t-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useVersionStore } from '@/stores/version';
import { useFormulaStore } from '@/stores/formula';
import { useMaterialStore } from '@/stores/material';
import { MessagePlugin } from 'tdesign-vue-next';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';

const router = useRouter();
const route = useRoute();
const versionStore = useVersionStore();
const formulaStore = useFormulaStore();
const materialStore = useMaterialStore();

const initialized = ref(false);

const formulaId = route.params.formulaId as string;
const formulaName = ref('');
const statusFilter = ref('');
const snapshotVisible = ref(false);
const currentSnapshot = ref<any>(null);
const selectedForCompare = ref<string[]>([]);

const columns = [
  { colKey: 'row-select', title: '选择对比', width: 90 },
  { colKey: 'versionNumber', title: '版本号', width: 125 },
  { colKey: 'versionName', title: '版本名称', width: 220 },
  { colKey: 'versionReason', title: '升版原因', width: 240 },
  { colKey: 'status', title: '状态', width: 70, align: 'center' },
  { colKey: 'createdAt', title: '创建日期', width: 130 },
  { colKey: 'operation', title: '操作', width: 100, align: 'right' }
];

const statusLabel = (s: string) => s === 'published' ? '已发布' : s === 'draft' ? '草稿' : '已归档';
const changeTypeTheme = (t: string) => t === 'add' ? 'success' : t === 'delete' ? 'danger' : 'warning';
const changeTypeLabel = (t: string) => t === 'add' ? '新增' : t === 'delete' ? '删除' : '修改';
const changeTypeIcon = (t: string) => t === 'add' ? 'add' : t === 'delete' ? 'remove' : 'edit';

const formatCreatedAt = (val: string | undefined) => {
  if (!val) return { date: '--', time: '' };
  const d = new Date(val);
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return { date: `${y}-${m}-${day}`, time: `${h}:${min}:${s}` };
};

const toggleSelect = (id: string) => {
  const idx = selectedForCompare.value.indexOf(id);
  if (idx >= 0) {
    selectedForCompare.value.splice(idx, 1);
  } else {
    if (selectedForCompare.value.length >= 3) {
      MessagePlugin.warning('最多选择3个版本进行对比');
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
  const result = await versionStore.createVersion(formulaId, { versionReason: createVersionReason.value.trim(), status: 'draft' });
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
    MessagePlugin.success(result.message || '发布成功，配方数据已同步');
    fetchVersions();
    const formula = await formulaStore.getFormula(formulaId);
    if (formula) formulaName.value = formula.name;
  } else {
    MessagePlugin.error(result.message || '发布失败');
  }
};

const handleCompare = () => router.push(`/versions/compare/${formulaId}`);

const handleViewSnapshot = (row: any) => {
  currentSnapshot.value = row;
  snapshotVisible.value = true;
};

const getMaterialType = (material: any): string => {
  if (!material || !material.materialId) return '';
  const mat = materialStore.allMaterials?.find((m: any) => m.id === material.materialId);
  return mat?.materialType || '';
};

const calcActualWeight = (material: any): number => {
  const finishedWeight = currentSnapshot.value?.snapshot?.finishedWeight || currentSnapshot.value?.snapshot?.finished_weight || 0;
  const quantity = material.quantity || 0;
  return (quantity / 100) * finishedWeight;
};

onMounted(async () => {
  await Promise.all([
    versionStore.fetchVersions(formulaId, statusFilter.value ? { status: statusFilter.value } : undefined),
    (async () => {
      const formula = await formulaStore.getFormula(formulaId);
      if (formula) formulaName.value = formula.name;
    })(),
    materialStore.fetchMaterials()
  ]);
  initialized.value = true;
});
</script>

<style scoped lang="scss">
.version-list {
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
    background-color: rgba(255, 255, 255, 0.80);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #f1f5f9;
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
        color: #94a3b8;
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
        gap: 6px;

        .header-breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          line-height: 1;

          .breadcrumb-link {
            color: #94a3b8;
            cursor: pointer;
            transition: color 0.15s;
            text-decoration: none;

            &:hover {
              color: $brand-primary;
            }
          }

          .breadcrumb-sep {
            font-size: 12px;
            color: #94a3b8;
          }

          .breadcrumb-current {
            color: #475569;
          }
        }

        .page-main-title {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.35;
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
        padding: 10px 24px;
        background-color: #10b981;
        color: #ffffff;
        border: none;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 700;
        box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.2);
        cursor: pointer;
        transition: all $transition-fast;
        white-space: nowrap;

        .btn-icon {
          font-size: 18px;
        }

        &:hover {
          background-color: #059669;
          transform: translateY(-1px);
          box-shadow: 0 14px 20px -3px rgba(16, 185, 129, 0.3);
        }

        &:active {
          transform: translateY(0);
          background-color: #047857;
        }

        &.compare-btn {
          opacity: 0.5;

          &.has-selection {
            opacity: 1;
          }
        }
      }

      :deep(.t-radio-group) {
        background: #f0fdf4;
        border-radius: 10px;
        padding: 3px;

        .t-radio-button {
          border-radius: 8px;
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;

          &.t-is-checked {
            background: #dcfce7;
            color: #16a34a;
            box-shadow: none;
          }
        }
      }
    }
  }

  .detail-main {
    margin-top: 24px;
    animation: fadeInUp 0.35s ease both;
    animation-delay: 0.1s;

    .version-table-card {
      background: #fff;
      border-radius: $radius-2xl;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      border: 1px solid #f8fafc;
      overflow: hidden;

      :deep(.t-table) {
        .t-table__header {
          th {
            background: rgba(248, 250, 252, 0.5) !important;
            padding: 20px 28px !important;
            font-size: 10px !important;
            font-weight: 900 !important;
            color: #94a3b8 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.1em !important;
            border-bottom: 1px solid rgba(248, 250, 252, 0.8) !important;
          }
        }

        .t-table__body {
          tr {
            transition: background-color 0.15s;

            &:hover td {
              background: rgba(248, 250, 252, 0.5) !important;
            }

            td {
              padding: 20px 28px !important;
              border-bottom: 1px solid #f8fafc !important;
              vertical-align: middle;
              font-size: 14px;
              color: #334155;
            }
          }
        }

        .t-table__empty-row td {
          padding: 48px 24px !important;
        }
      }

      .select-checkbox-wrap {
        display: flex;
        align-items: center;
        justify-content: center;

        .custom-checkbox {
          appearance: none;
          width: 20px;
          height: 20px;
          border: 2px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          position: relative;
          transition: all $transition-fast;

          &:checked {
            background: #10b981;
            border-color: #10b981;

            &::after {
              content: '';
              position: absolute;
              top: 2px;
              left: 6px;
              width: 5px;
              height: 10px;
              border: solid #fff;
              border-width: 0 2px 2px 0;
              transform: rotate(45deg);
            }
          }

          &:hover {
            border-color: #d1fae5;
          }
        }
      }

      .ver-num {
        font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
        font-size: 13px;
        font-weight: 700;
        color: #059669;
      }

      .ver-current-tag {
        display: inline-block;
        margin-left: 8px;
        padding: 2px 10px;
        background: #d1fae5;
        color: #059669;
        font-size: 10px;
        font-weight: 800;
        border-radius: 999px;
        letter-spacing: 0.04em;
      }

      .status-pill {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        white-space: nowrap;

        &.status-draft {
          background: #fef3c7;
          color: #d97706;
        }

        &.status-published {
          background: #d1fae5;
          color: #059669;
        }

        &.status-archived {
          background: #e2e8f0;
          color: #94a3b8;
        }
      }

      .cell-date {
        display: flex;
        flex-direction: column;
        line-height: 1.4;

        .date-line {
          font-size: 13px;
          font-weight: 600;
          color: #334155;
        }

        .time-line {
          font-size: 12px;
          color: #94a3b8;
        }
      }

      .cell-reason {
        font-size: 14px;
        color: #334155;
        line-height: 1.5;
        word-break: break-word;
      }

      .cell-changes {
        .change-tag {
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .no-changes {
          color: #cbd5e1;
        }
      }

      .no-changes {
        color: #cbd5e1;
      }

      .op-btns {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 4px;

        .op-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          transition: all $transition-fast;
          font-size: 16px;

          &:hover {
            color: #10b981;
            background: #ecfdf5;
          }

          &.op-publish:hover {
            color: #3b82f6;
            background: #eff6ff;
          }
        }
      }
    }
  }

  :deep(.t-drawer) {
    border-radius: 0;
    overflow: hidden;
    box-shadow: -10px 0 40px rgba(0, 0, 0, 0.15);

    .t-drawer__header {
      padding: 0;
      border-bottom: none;
    }

    .t-drawer__body {
      padding: 0;
      overflow-y: auto;
    }

    .t-drawer__close-btn {
      position: absolute;
      top: 24px;
      right: 24px;
      z-index: 10;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: transparent;
      color: #94a3b8;
      transition: all 0.15s ease;

      &:hover {
        background-color: #f1f5f9;
        color: #64748b;
      }
    }
  }

  :deep(.t-drawer__mask) {
    backdrop-filter: blur(8px);
    background-color: rgba(15, 23, 42, 0.4) !important;
  }

  .snap-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 32px 32px 24px;
    border-bottom: 1px solid rgba(248, 250, 252, 0.8);
    position: relative;

    .snap-header-text {
      flex: 1;

      .snap-title {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
        color: #1e293b;

        .snap-version-num {
          color: #10b981;
          font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
          font-size: 12px;
          font-weight: 600;
          margin-left: 8px;
        }
      }

      .snap-subtitle {
        margin: 4px 0 0;
        font-size: 14px;
        color: #94a3b8;
      }
    }
  }

  .snap-body {
    padding: 32px;

    .snap-info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      margin-bottom: 32px;
    }

    .snap-info-card {
      padding: 16px;
      background-color: #f8fafc;
      border-radius: 16px;

      .snap-info-label {
        display: block;
        font-size: 10px;
        font-weight: 900;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 4px;
      }

      .snap-info-value {
        margin: 0;
        font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
        font-size: 14px;
        font-weight: 700;
        color: #334155;

        .status-tag {
          display: inline-block;
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 6px;

          &.status-published {
            background-color: #d1fae5;
            color: #059669;
          }

          &.status-draft {
            background-color: #fef3c7;
            color: #d97706;
          }

          &.status-archived {
            background-color: #f1f5f9;
            color: #64748b;
          }
        }
      }
    }

    .snap-ingredients-section {
      .snap-section-label {
        font-size: 10px;
        font-weight: 900;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        margin: 0 0 16px;
      }
    }

    .snap-ingredient-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .snap-ingredient-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: rgba(248, 250, 252, 0.5);
      border-radius: 12px;
      border: 1px solid rgba(248, 250, 252, 0.8);

      .snap-ing-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .snap-ing-name {
        font-size: 14px;
        font-weight: 500;
        color: #334155;
      }

      .snap-ing-tag {
        display: inline-block;
        padding: 2px 8px;
        font-size: 10px;
        font-weight: 700;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.05em;

        &.snap-tag-supplement {
          background-color: #fef3c7;
          color: #d97706;
        }

        &.snap-tag-herb {
          background-color: #d1fae5;
          color: #059669;
        }
      }

      .snap-ing-qty {
        font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
        font-size: 14px;
        font-weight: 700;
        color: #10b981;
      }
    }

    .snap-empty {
      text-align: center;
      color: #cbd5e1;
      font-size: 13px;
      padding: 24px 0;
      margin: 0;
    }
  }
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

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
