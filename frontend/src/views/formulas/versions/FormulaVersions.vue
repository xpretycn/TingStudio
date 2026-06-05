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
            <h3 class="page-title">
              {{ formulaName || '配方' }}
              <span class="formula-id-tag">{{ formulaId.slice(-6) }}</span>
              <span v-if="currentVersionNumber" class="version-tag">{{ currentVersionNumber }}</span>
            </h3>
          </div>
        </div>
        <div class="header-actions">
          <!-- 状态筛选 -->
          <div class="status-filter-group">
            <button v-for="opt in statusOptions" :key="opt.value" class="status-filter-btn"
              :class="{ active: statusFilter === opt.value }" @click="statusFilter = opt.value; fetchVersions()">{{
                opt.label }}</button>
          </div>
        </div>
      </header>

      <!-- ─── Two‑Column Content ─── -->
      <div class="content-layout">
        <!-- ── Left: Timeline ── -->
        <div class="timeline-section">
          <div class="section-head">
            <div class="section-head-left">
              <h3 class="section-title">版本时间线</h3>
              <span class="section-count">{{ filteredVersions.length }}</span>
            </div>
            <div class="section-head-right">
              <button class="section-compare-btn" :class="{ 'has-selection': selectedForCompare.length >= 2 }"
                :disabled="selectedForCompare.length < 2" @click="handleCompare">
                <t-icon name="swap" size="14px" />
                <span>版本对比</span>
                <span v-if="selectedForCompare.length" class="compare-badge">{{ selectedForCompare.length }}</span>
              </button>
              <button v-if="selectedForCompare.length" class="clear-compare-btn"
                @click="clearCompareSelection">清除选择</button>
            </div>
          </div>
          <div class="section-toolbar">
            <t-input v-model="searchKeyword" placeholder="搜索版本号/操作人" size="small" clearable class="version-search">
              <template #prefix-icon>
                <t-icon name="search" />
              </template>
            </t-input>
            <div class="filter-tabs">
              <button class="filter-tab" :class="{ active: filterType === 'all' }"
                @click="filterType = 'all'">全部</button>
              <button class="filter-tab" :class="{ active: filterType === 'latest' }"
                @click="filterType = 'latest'">最新</button>
              <button class="filter-tab" :class="{ active: filterType === 'history' }"
                @click="filterType = 'history'">历史</button>
            </div>
          </div>

          <div v-if="versionStore.versions.length === 0" class="empty-state">
            <div class="empty-icon"><t-icon name="bulletpoint" size="40px" /></div>
            <p class="empty-text">暂无版本数据</p>
            <p class="empty-hint">编辑配方后系统会自动创建新版本</p>
            <t-button theme="primary" @click="router.push(`/formulas/${formulaId}/edit`)">
              <template #icon><t-icon name="edit" /></template>编辑配方
            </t-button>
          </div>

          <div v-else-if="filteredVersions.length === 0" class="empty-state">
            <div class="empty-icon"><t-icon name="search" size="40px" /></div>
            <p class="empty-text">未找到匹配的版本</p>
            <p class="empty-hint">尝试调整搜索关键词或筛选条件</p>
          </div>

          <div v-else class="timeline">
            <div v-for="(ver, index) in filteredVersions" :key="ver.versionId" class="timeline-item" :class="{
              active: selectedVersionId === ver.versionId,
              'item-current': ver.isCurrent,
            }">
              <!-- Timeline visual connector -->
              <div class="timeline-connector">
                <div class="tl-dot" :class="{ 'dot-current': ver.isCurrent }">
                  <div v-if="ver.isCurrent" class="dot-pulse"></div>
                </div>
                <div v-if="index < filteredVersions.length - 1" class="tl-line"></div>
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
                  <span v-for="(c, ci) in ver.changes.slice(0, 4)" :key="ci" class="tl-change-chip"
                    :class="'chip-' + c.changeType">
                    <t-icon :name="changeTypeIcon(String(c.changeType))" size="12px" />
                    {{ changeTypeLabel(String(c.changeType)) }}
                  </span>
                  <span v-if="ver.changes.length > 4" class="tl-change-more">+{{ ver.changes.length - 4 }}</span>
                </div>

                <!-- Bottom row: compare checkbox + compare button -->
                <div class="tl-card-footer">
                  <label class="tl-compare-label" @click.stop>
                    <input type="checkbox" class="tl-checkbox" :checked="selectedForCompare.includes(ver.versionId)"
                      @change="toggleSelect(ver.versionId)" />
                    <span class="tl-checkbox-text">加入对比</span>
                  </label>
                  <div class="tl-card-actions">
                    <button v-if="ver.status === 'draft'" class="tl-edit-btn"
                      @click.stop="router.push(`/formulas/${formulaId}/edit`)">
                      <t-icon name="edit" size="12px" />
                      编辑
                    </button>
                    <t-popconfirm v-if="ver.status === 'draft'"
                      :content="isAdmin ? '确定要直接发布该版本吗？发布后将替换当前配方。' : '确定要提交审批吗？提交后需等待管理员审核。'"
                      @confirm="handlePublish(ver)">
                      <button class="tl-publish-btn" @click.stop>
                        <t-icon name="send" size="12px" />
                        {{ isAdmin ? '发布' : '提交审批' }}
                      </button>
                    </t-popconfirm>
                    <template v-if="ver.status === 'pending_review' && isAdmin">
                      <t-popconfirm content="确定要批准该版本吗？批准后将替换当前配方。" @confirm="handlePublish(ver)">
                        <button class="tl-publish-btn" @click.stop>
                          <t-icon name="check" size="12px" />
                          批准
                        </button>
                      </t-popconfirm>
                      <button class="tl-reject-btn" @click.stop="handleReject(ver)">
                        <t-icon name="close" size="12px" />
                        驳回
                      </button>
                    </template>
                    <span v-if="ver.status === 'pending_review' && !isAdmin" class="tl-status-hint">
                      <t-icon name="time" size="12px" />
                      审批中
                    </span>
                    <span v-if="ver.status === 'published'" class="tl-status-hint tl-status-published">
                      <t-icon name="check-circle" size="12px" />
                      已发布
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Right: Detail Panel ── -->
        <div class="detail-section">
          <!-- 版本快照 -->
          <div class="section-head">
            <h3 class="section-title">版本快照</h3>
            <button v-if="selectedVersion" class="section-close-btn" @click="selectedVersionId = null" title="关闭详情">
              <t-icon name="close" />
            </button>
          </div>
          <!-- Empty state -->
          <div v-if="!selectedVersion" class="detail-empty">
            <div class="detail-empty-visual">
              <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                <rect x="8" y="12" width="56" height="48" rx="6" stroke="currentColor" stroke-width="2" fill="none"
                  opacity="0.2" />
                <rect x="16" y="40" width="40" height="2" rx="1" fill="currentColor" opacity="0.12" />
                <rect x="16" y="46" width="28" height="2" rx="1" fill="currentColor" opacity="0.08" />
                <circle cx="36" cy="28" r="8" stroke="currentColor" stroke-width="2" fill="none" opacity="0.2"
                  stroke-dasharray="2 2" />
                <line x1="42" y1="34" x2="48" y2="40" stroke="currentColor" stroke-width="2" opacity="0.2" />
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
                <span class="identity-status" :class="'st-' + selectedVersion.status">{{
                  statusLabel(selectedVersion.status)
                }}</span>
                <span v-if="selectedVersion.isCurrent" class="identity-current">当前版本</span>
                <span class="identity-time">{{ splitDateTime(selectedVersion.createdAt).date }} {{
                  splitDateTime(selectedVersion.createdAt).time }}</span>
              </div>
            </div>

            <!-- Changes summary -->
            <div v-if="selectedVersion.changes?.length" class="detail-card detail-changes">
              <h4 class="detail-card-title">变更摘要</h4>
              <div class="changes-list">
                <div v-for="(c, ci) in selectedVersion.changes" :key="ci" class="change-row"
                  :class="'cr-' + String(c.changeType)">
                  <span class="change-type-icon">
                    <t-icon :name="changeTypeIcon(String(c.changeType))" />
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
                  <t-icon name="user" class="sn-field-icon" />
                  <span class="sn-field-label">业务员</span>
                  <span class="sn-field-value">{{ snapshot?.salesmanName || formulaSalesmanName || '--' }}</span>
                </div>
                <div class="snapshot-field">
                  <t-icon name="measurement" class="sn-field-icon" />
                  <span class="sn-field-label">成品重量</span>
                  <span class="sn-field-value">{{ snapshot?.finishedWeight || snapshot?.finished_weight || '--'
                  }}g</span>
                </div>
                <div class="snapshot-field">
                  <t-icon name="chart" class="sn-field-icon" />
                  <span class="sn-field-label">主料系数</span>
                  <span class="sn-field-value">{{ formatRatioFactor(_resolveSnapshotValue('ratioFactor', null))
                  }}</span>
                </div>
                <div class="snapshot-field">
                  <t-icon name="chart-bar" class="sn-field-icon" />
                  <span class="sn-field-label">辅料系数</span>
                  <span class="sn-field-value">{{ formatRatioFactor(_resolveSnapshotValue('supplementRatioFactor',
                    null))
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Materials composition -->
            <div class="detail-card detail-materials">
              <div class="detail-card-title-row">
                <h4 class="detail-card-title">原料组成</h4>
                <span v-if="snapshot?.materials?.length" class="material-total">
                  <t-tag size="small" variant="light" theme="primary">{{ snapshot.materials.length }} 项</t-tag>
                </span>
              </div>
              <div v-if="snapshot?.materials?.length" class="material-list">
                <div class="material-header-row">
                  <span class="mh-index">#</span>
                  <span class="mh-name">原料</span>
                  <span class="mh-weight">用量(g)</span>
                  <span class="mh-pct">含量比(%)</span>
                  <span class="mh-nutrient">能量</span>
                  <span class="mh-nutrient">蛋白质</span>
                  <span class="mh-nutrient">脂肪</span>
                  <span class="mh-nutrient">碳水</span>
                  <span class="mh-nutrient">钠</span>
                  <span class="mh-version">版本</span>
                </div>
                <div v-for="(m, i) in snapshot.materials" :key="i" class="material-row">
                  <span class="material-index">{{ Number(i) + 1 }}</span>
                  <span class="material-name-cell">
                    <span class="material-name-text">{{ m.materialName || m.name || '--' }}</span>
                    <span v-if="getMaterialType(m) === 'supplement'" class="material-tag tag-supplement">辅料</span>
                    <span v-else-if="getMaterialType(m) === 'herb'" class="material-tag tag-herb">主料</span>
                  </span>
                  <span class="material-weight">{{ calcActualWeight(m).toFixed(1) }}</span>
                  <span class="material-pct">{{ (calcRatio(m) * 100).toFixed(2) }}</span>
                  <span class="material-nutrient">{{ calcNutrientValue(m, 'energy').toFixed(1) || '--' }}</span>
                  <span class="material-nutrient">{{ calcNutrientValue(m, 'protein').toFixed(2) || '--' }}</span>
                  <span class="material-nutrient">{{ calcNutrientValue(m, 'fat').toFixed(2) || '--' }}</span>
                  <span class="material-nutrient">{{ calcNutrientValue(m, 'carbohydrate').toFixed(2) || '--' }}</span>
                  <span class="material-nutrient">{{ calcNutrientValue(m, 'sodium').toFixed(2) || '--' }}</span>
                  <span class="material-version">{{ getMaterialVersion(m) }}</span>
                </div>
              </div>
              <p v-else class="material-empty">暂无原料数据</p>
            </div>

            <!-- Nutrition summary -->
            <div v-if="snapshot?.materials?.length" class="detail-card detail-nutrition">
              <div class="detail-card-title-row">
                <h4 class="detail-card-title">营养数据汇总</h4>
              </div>
              <div class="nutrition-summary-zone">
                <div class="nsz-row nsz-row--header">
                  <span class="nsz-col nsz-col--label">营养成分</span>
                  <span class="nsz-col nsz-col--qty">总重(g)</span>
                  <span class="nsz-col nsz-col--pct">含量比(%)</span>
                  <span class="nsz-col nsz-col--nutrient">能量(kJ)</span>
                  <span class="nsz-col nsz-col--nutrient">蛋白质(g)</span>
                  <span class="nsz-col nsz-col--nutrient">脂肪(g)</span>
                  <span class="nsz-col nsz-col--nutrient">碳水(g)</span>
                  <span class="nsz-col nsz-col--nutrient">钠(mg)</span>
                </div>
                <div class="nsz-row nsz-row--total">
                  <span class="nsz-col nsz-col--label nsz-total-label">合计</span>
                  <span class="nsz-col nsz-col--qty">{{ totalQuantity }} g</span>
                  <span class="nsz-col nsz-col--pct">{{ ratioValidation.totalRatioDisplay }}</span>
                  <span class="nsz-col nsz-col--nutrient nsz-nutrient--total">{{ nutritionSummary.energy }}</span>
                  <span class="nsz-col nsz-col--nutrient nsz-nutrient--total">{{ nutritionSummary.protein }}</span>
                  <span class="nsz-col nsz-col--nutrient nsz-nutrient--total">{{ nutritionSummary.fat }}</span>
                  <span class="nsz-col nsz-col--nutrient nsz-nutrient--total">{{ nutritionSummary.carbohydrate }}</span>
                  <span class="nsz-col nsz-col--nutrient nsz-nutrient--total">{{ nutritionSummary.sodium }}</span>
                </div>
                <div class="nsz-row nsz-row--nrv">
                  <span class="nsz-col nsz-col--label nsz-nrv-label">NRV</span>
                  <span class="nsz-col nsz-col--qty"></span>
                  <span class="nsz-col nsz-col--pct"></span>
                  <span class="nsz-col nsz-col--nutrient nsz-nutrient--nrv">{{ NRV_REFERENCE.energy }}</span>
                  <span class="nsz-col nsz-col--nutrient nsz-nutrient--nrv">{{ NRV_REFERENCE.protein }}</span>
                  <span class="nsz-col nsz-col--nutrient nsz-nutrient--nrv">{{ NRV_REFERENCE.fat }}</span>
                  <span class="nsz-col nsz-col--nutrient nsz-nutrient--nrv">{{ NRV_REFERENCE.carbohydrate }}</span>
                  <span class="nsz-col nsz-col--nutrient nsz-nutrient--nrv">{{ NRV_REFERENCE.sodium }}</span>
                </div>
                <div class="nsz-row nsz-row--nrv-pct">
                  <span class="nsz-col nsz-col--label nsz-nrv-pct-label">NRV%</span>
                  <span class="nsz-col nsz-col--qty"></span>
                  <span class="nsz-col nsz-col--pct"></span>
                  <span class="nsz-col nsz-col--nutrient nsz-nutrient--nrv-pct">{{ nutritionNrvPercent.energy }}</span>
                  <span class="nsz-col nsz-col--nutrient nsz-nutrient--nrv-pct">{{ nutritionNrvPercent.protein }}</span>
                  <span class="nsz-col nsz-col--nutrient nsz-nutrient--nrv-pct">{{ nutritionNrvPercent.fat }}</span>
                  <span class="nsz-col nsz-col--nutrient nsz-nutrient--nrv-pct">{{ nutritionNrvPercent.carbohydrate
                  }}</span>
                  <span class="nsz-col nsz-col--nutrient nsz-nutrient--nrv-pct">{{ nutritionNrvPercent.sodium }}</span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="detail-actions">
              <t-popconfirm v-if="selectedVersion.status === 'draft' && isAdmin" content="确定要直接发布该版本吗？发布后将替换当前配方。"
                @confirm="handlePublish(selectedVersion)">
                <button class="action-btn action-publish">
                  <t-icon name="send" /> 直接发布
                </button>
              </t-popconfirm>
              <t-popconfirm v-if="selectedVersion.status === 'draft' && !isAdmin" content="确定要提交审批吗？提交后需等待管理员审核。"
                @confirm="handlePublish(selectedVersion)">
                <button class="action-btn action-submit">
                  <t-icon name="send" /> 提交审批
                </button>
              </t-popconfirm>
              <t-popconfirm v-if="selectedVersion.status === 'pending_review' && isAdmin"
                content="确定要批准该版本吗？批准后将替换当前配方。" @confirm="handleApprove(selectedVersion)">
                <button class="action-btn action-publish">
                  <t-icon name="check" /> 批准发布
                </button>
              </t-popconfirm>
              <button v-if="selectedVersion.status === 'pending_review' && isAdmin" class="action-btn action-reject"
                @click="handleReject(selectedVersion)">
                <t-icon name="close" /> 驳回
              </button>
              <span v-if="selectedVersion.status === 'pending_review' && !isAdmin" class="pending-hint">
                <t-icon name="time" /> 等待管理员审核中…
              </span>
              <button class="action-btn action-secondary" @click="handleCompare">
                <t-icon name="book" /> 对比版本
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Reject Version Dialog ─── -->
      <t-dialog v-model:visible="rejectDialogVisible" header="驳回版本" :confirm-btn="{ content: '确认驳回', theme: 'danger' }"
        @confirm="confirmReject" :class="'version-create-dialog'">
        <div class="create-form">
          <label class="create-label">驳回意见 <span class="required">*</span></label>
          <textarea v-model="rejectComment" class="create-textarea" placeholder="请说明驳回原因，便于修改者了解问题" rows="3"></textarea>
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
import { useAuthStore } from '@/stores/auth';
import type { FormulaVersion } from '@/api/version';
import type { Material } from '@/api/material';
import { MessagePlugin } from 'tdesign-vue-next';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';
import { splitDateTime } from '@/utils/timeFormat';

interface SnapshotMaterial {
  materialId?: string;
  id?: string;
  quantity?: number;
  materialName?: string;
  name?: string;
  [key: string]: unknown;
}

const router = useRouter();
const route = useRoute();
const versionStore = useVersionStore();
const formulaStore = useFormulaStore();
const materialStore = useMaterialStore();
const authStore = useAuthStore();

const isAdmin = computed(() => authStore.user?.role === 'admin');

const initialized = ref(false);

const formulaId = route.params.formulaId as string;
const formulaName = ref('');
const formulaSalesmanName = ref('');
const statusFilter = ref('');
const searchKeyword = ref('');
const filterType = ref<"all" | "latest" | "history">("all");
const selectedForCompare = ref<string[]>([]);
const selectedVersionId = ref<string | null>(null);

const statusOptions = [
  { value: '', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'pending_review', label: '待审批' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已归档' },
];

interface VersionSnapshot {
  materials?: SnapshotMaterial[];
  finishedWeight?: number;
  finished_weight?: number;
  formulaData?: Record<string, unknown>;
  ratioFactor?: number;
  supplementRatioFactor?: number;
  salesmanName?: string;
  [key: string]: unknown;
}

const snapshot = computed(() => (selectedVersion.value?.snapshot || null) as VersionSnapshot | null);
const currentVersionNumber = computed(() => {
  const current = versionStore.versions.find((v: FormulaVersion) => v.isCurrent);
  return current?.versionNumber || '';
});
const selectedVersion = computed(() => {
  if (!selectedVersionId.value) return null;
  return versionStore.versions.find((v: FormulaVersion) => v.versionId === selectedVersionId.value) || null;
});

const filteredVersions = computed(() => {
  let result = versionStore.versions;
  if (filterType.value === "latest") {
    result = result.filter((v: FormulaVersion) => v.isCurrent);
  } else if (filterType.value === "history") {
    result = result.filter((v: FormulaVersion) => !v.isCurrent);
  }
  if (searchKeyword.value.trim()) {
    const kw = searchKeyword.value.trim().toLowerCase();
    result = result.filter((v: FormulaVersion) =>
      String(v.versionNumber).toLowerCase().includes(kw) ||
      (v.createdByName || '').toLowerCase().includes(kw)
    );
  }
  return result;
});

const selectVersion = (ver: FormulaVersion) => {
  selectedVersionId.value = ver.versionId;
};

const statusLabel = (s: string) =>
  s === 'published' ? '已发布' : s === 'pending_review' ? '待审批' : s === 'draft' ? '草稿' : '已归档';

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

const handlePublish = async (row: FormulaVersion) => {
  if (isAdmin.value) {
    const result = await versionStore.publishVersion(row.versionId);
    if (result.success) {
      MessagePlugin.success('发布成功，配方数据已同步');
      fetchVersions();
      const formula = await formulaStore.getFormula(formulaId);
      if (formula) {
        formulaName.value = formula.name;
        formulaSalesmanName.value = formula.salesmanName || '';
      }
    } else {
      MessagePlugin.error(result.message || '发布失败');
    }
  } else {
    const result = await versionStore.submitVersion(row.versionId);
    if (result.success) {
      MessagePlugin.success('已提交审批，请等待管理员审核');
      fetchVersions();
    } else {
      MessagePlugin.error(result.message || '提交审批失败');
    }
  }
};

const handleApprove = async (row: FormulaVersion) => {
  const result = await versionStore.approveVersion(row.versionId);
  if (result.success) {
    MessagePlugin.success('已批准发布，配方数据已同步');
    fetchVersions();
    const formula = await formulaStore.getFormula(formulaId);
    if (formula) {
      formulaName.value = formula.name;
      formulaSalesmanName.value = formula.salesmanName || '';
    }
  } else {
    MessagePlugin.error(result.message || '批准失败');
  }
};

const rejectComment = ref('');
const rejectVersionId = ref<string | null>(null);
const rejectDialogVisible = ref(false);

const handleReject = (row: FormulaVersion) => {
  rejectVersionId.value = row.versionId;
  rejectComment.value = '';
  rejectDialogVisible.value = true;
};

const confirmReject = async () => {
  if (!rejectComment.value?.trim()) {
    MessagePlugin.warning('请填写驳回意见');
    return;
  }
  if (!rejectVersionId.value) return;
  const result = await versionStore.rejectVersion(rejectVersionId.value, rejectComment.value.trim());
  if (result.success) {
    MessagePlugin.success('已驳回，版本已回退为草稿');
    rejectDialogVisible.value = false;
    fetchVersions();
  } else {
    MessagePlugin.error(result.message || '驳回失败');
  }
};

const clearCompareSelection = () => {
  selectedForCompare.value = [];
  localStorage.removeItem('compare_versions');
};

const handleCompare = () => router.push(`/versions/compare/${formulaId}`);

const getMaterialVersion = (material: SnapshotMaterial): string => {
  if (!material || (!material.materialId && !material.id)) return '--';
  const mat = materialStore.allMaterials?.find((m: Material) => m.id === (material.materialId || material.id));
  if (mat?.version != null) return `v${mat.version}`;
  return '--';
};

const getMaterialType = (material: SnapshotMaterial): string => {
  if (!material || (!material.materialId && !material.id)) return '';
  const mat = materialStore.allMaterials?.find((m: Material) => m.id === (material.materialId || material.id));
  return mat?.materialType || '';
};

const _resolveSnapshotValue = <T>(key: string, fallback: T): T => {
  const s: Record<string, unknown> = snapshot.value || {};
  if (s[key] != null && s[key] !== '') return s[key] as T;
  const fd = (s as Record<string, unknown>).formulaData || {};
  const camelKey = key.replace(/_./g, (x) => x[1].toUpperCase());
  if ((fd as Record<string, unknown>)[key] != null && (fd as Record<string, unknown>)[key] !== '') return (fd as Record<string, unknown>)[key] as T;
  if ((fd as Record<string, unknown>)[camelKey] != null && (fd as Record<string, unknown>)[camelKey] !== '') return (fd as Record<string, unknown>)[camelKey] as T;
  return fallback;
};

const formatRatioFactor = (val: unknown): string => {
  if (val == null || val === '') return '--';
  const num = Number(val);
  if (isNaN(num)) return '--';
  return num.toFixed(2);
};

const calcActualWeight = (material: SnapshotMaterial): number => {
  // quantity 在数据库中已存储为实际克重，无需再乘以成品重量
  return material.quantity || 0;
};

const calcRatio = (material: SnapshotMaterial): number => {
  const finishedWeight = _resolveSnapshotValue<number>('finishedWeight', 0)
    || _resolveSnapshotValue<number>('finished_weight', 0);
  const quantity = material.quantity || 0;
  if (!finishedWeight) return 0;
  const materialType = getMaterialType(material);
  const ratioFactor = materialType === 'supplement'
    ? (_resolveSnapshotValue<number>('supplementRatioFactor', 1.0) || 1.0)
    : (_resolveSnapshotValue<number>('ratioFactor', 0.18) || 0.18);
  return (quantity / finishedWeight) * ratioFactor;
};

const getMaterialNutrition = (material: SnapshotMaterial): Record<string, number> => {
  if (!material || (!material.materialId && !material.id)) return {};
  const mat = materialStore.allMaterials?.find((m: Material) => m.id === (material.materialId || material.id));
  return mat?.nutrition || {};
};

const calcNutrientValue = (material: SnapshotMaterial, nutrientKey: string): number => {
  const per100g = getMaterialNutrition(material);
  const value = per100g[nutrientKey];
  if (value == null) return 0;
  const ratio = calcRatio(material);
  return value * ratio;
};

const ZERO_THRESHOLDS: Record<string, number> = {
  energy: 17,
  protein: 0.5,
  fat: 0.5,
  carbohydrate: 0.5,
  sodium: 5,
};

const NRV_REFERENCE: Record<string, number> = {
  energy: 8400,
  protein: 60,
  fat: 60,
  carbohydrate: 300,
  sodium: 2000,
};

const nutritionSummary = computed(() => {
  const materials = snapshot.value?.materials;
  if (!materials || !materials.length) {
    return { energy: "--", protein: "--", fat: "--", carbohydrate: "--", sodium: "--" };
  }
  const finishedWeight = _resolveSnapshotValue<number>("finishedWeight", 0)
    || _resolveSnapshotValue<number>("finished_weight", 0);
  if (!finishedWeight || finishedWeight <= 0) {
    return { energy: "--", protein: "--", fat: "--", carbohydrate: "--", sodium: "--" };
  }

  let protein = 0, fat = 0, carbohydrate = 0, sodium = 0;
  let hasAny = false;

  for (let i = 0; i < materials.length; i++) {
    const m = materials[i];
    const materialId = m.materialId || m.id;
    const quantity = Number(m.quantity || 0);
    if (!materialId || quantity <= 0) continue;
    const per100g = getMaterialNutrition(m);
    if (!per100g || !Object.keys(per100g).length) continue;
    hasAny = true;
    const ratio = calcRatio(m);
    if (per100g.protein != null) protein += per100g.protein * ratio;
    if (per100g.fat != null) fat += per100g.fat * ratio;
    if (per100g.carbohydrate != null) carbohydrate += per100g.carbohydrate * ratio;
    if (per100g.sodium != null) sodium += per100g.sodium * ratio;
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

const nutritionNrvPercent = computed(() => {
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

const totalQuantity = computed(() => {
  const materials = snapshot.value?.materials;
  if (!materials) return 0;
  return materials.reduce((sum: number, m: SnapshotMaterial) => sum + Number(m.quantity || 0), 0);
});

const ratioValidation = computed(() => {
  const materials = snapshot.value?.materials;
  const finishedWeight = _resolveSnapshotValue<number>("finishedWeight", 0)
    || _resolveSnapshotValue<number>("finished_weight", 0);
  if (!materials || !materials.length || !finishedWeight || finishedWeight <= 0) {
    return { totalRatioDisplay: "—" };
  }

  let totalRatio = 0;
  for (let i = 0; i < materials.length; i++) {
    const m = materials[i];
    const quantity = Number(m.quantity || 0);
    if (quantity <= 0) continue;
    totalRatio += calcRatio(m);
  }
  totalRatio = Math.round(totalRatio * 100000) / 100000;

  return {
    totalRatioDisplay: (totalRatio * 100).toFixed(3) + "%",
  };
});

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
      if (formula) {
        formulaName.value = formula.name;
        formulaSalesmanName.value = formula.salesmanName || '';
      }
    })(),
    materialStore.fetchAllForSelect(),
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
    gap: var(--space-4);
    align-items: flex-start;
    margin-top: 24px;
    animation: fadeIn 0.4s ease both;
  }

  .timeline-section,
  .detail-section {
    background: var(--color-bg-container);
    border-radius: $radius-2xl;
    border: 1px solid var(--color-border);
    box-shadow: $shadow-elevation-1;
  }

  .timeline-section {
    flex: 0 0 485px;
    max-width: 485px;
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 84px;
    height: calc(100vh - 84px - 16px);
    overflow: hidden;

    .section-head,
    .section-toolbar {
      flex-shrink: 0;
    }

    .timeline,
    .empty-state {
      flex: 1;
      min-height: 0;
      overflow-y: auto;

      &::-webkit-scrollbar {
        width: 4px;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--color-border);
        border-radius: 4px;
      }
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
    border-bottom: 1px solid var(--color-border-light);

    .section-head-left {
      display: flex;
      align-items: center;
      gap: var(--space-2-5);
    }

    .section-title {
      margin: 0;
      font-size: $font-size-h4;
      font-weight: $font-weight-semibold;
      color: var(--color-text-primary);
      line-height: 1.3;
    }

    .section-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 22px;
      padding: 0 var(--space-2);
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
      color: var(--color-text-tertiary);
      cursor: pointer;
      transition: all $transition-fast;

      &:hover {
        color: var(--color-text-regular);
        background: var(--overlay-brand-08);
      }
    }

    .section-head-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-compare-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border: 1px solid var(--color-border);
      border-radius: $radius-pill;
      background: transparent;
      color: var(--color-text-tertiary);
      font-size: $font-size-caption;
      font-weight: $font-weight-medium;
      cursor: pointer;
      transition: all $transition-fast;

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
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        background: var(--color-primary);
        color: #fff;
        font-size: 10px;
        font-weight: $font-weight-bold;
        border-radius: $radius-pill;
        line-height: 1;
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

  .section-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 24px 12px;

    .version-search {
      width: 180px;
    }

    .filter-tabs {
      display: flex;
      gap: 2px;
      background: var(--color-bg-container);
      border-radius: $radius-md;
      padding: 2px;
    }

    .filter-tab {
      padding: 3px 10px;
      border: none;
      border-radius: $radius-md;
      background: transparent;
      color: var(--color-text-tertiary);
      font-size: $font-size-caption;
      font-weight: $font-weight-semibold;
      cursor: pointer;
      transition: all $transition-fast;
      white-space: nowrap;

      &:hover {
        color: var(--color-text-secondary);
      }

      &.active {
        background: var(--color-bg-container);
        color: var(--color-primary);
        box-shadow: $shadow-xs;
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
    padding: 8px 32px;
    background: var(--color-bg-container);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--color-border-light);
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
        color: var(--color-text-tertiary);
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
          gap: var(--space-1-5);
          font-size: 12px;
          line-height: 1;
          color: var(--color-text-tertiary);

          .breadcrumb-link {
            color: var(--color-text-tertiary);
            cursor: pointer;
            transition: color 0.15s;
            text-decoration: none;

            &:hover {
              color: var(--color-primary);
            }
          }

          .breadcrumb-sep {
            color: var(--color-text-placeholder);
          }

          .breadcrumb-current {
            color: var(--color-text-secondary);
          }
        }

        .page-title {
          margin: 0;
          font-size: $font-size-h2;
          font-weight: $font-weight-bold;
          color: var(--color-text-primary);
          line-height: 1.35;
          display: flex;
          align-items: center;
          gap: 8px;

          .formula-id-tag {
            display: inline-flex;
            align-items: center;
            padding: 1px 8px;
            background: rgba(255, 255, 255, 0.08);
            color: var(--color-text-secondary, rgba(255, 255, 255, 0.55));
            font-size: 12px;
            border-radius: $radius-sm;
            font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
          }

          .version-tag {
            display: inline-flex;
            align-items: center;
            padding: 2px 10px;
            background: var(--color-primary-bg);
            color: var(--color-primary);
            font-size: 12px;
            font-weight: $font-weight-bold;
            border-radius: $radius-pill;
            font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
            letter-spacing: 0.02em;
          }
        }
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;

      .status-filter-group {
        display: flex;
        gap: var(--space-0-5);
        padding: var(--space-1);
        background: var(--color-primary-bg);
        border-radius: $radius-lg;
      }

      .status-filter-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-1-5) var(--space-3-5);
        border: none;
        border-radius: 8px;
        background: transparent;
        color: var(--color-text-tertiary);
        font-size: $font-size-caption;
        font-weight: $font-weight-medium;
        cursor: pointer;
        transition: all $transition-fast;
        white-space: nowrap;

        &.active {
          background: var(--color-bg-container);
          color: var(--color-primary);
          font-weight: $font-weight-semibold;
          box-shadow: $shadow-xs;
        }

        &:hover:not(.active) {
          color: var(--color-text-regular);
        }
      }
    }
  }

  // ─── Action Buttons ────────────────────────────────────────
  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1-5);
    padding: 8px var(--space-4-5);
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

    &.action-publish {
      background: var(--gradient-btn);
      color: $text-white;
      box-shadow: var(--shadow-brand-sm);

      &:hover {
        box-shadow: var(--shadow-brand-md);
        transform: translateY(-1px);
      }
    }

    &.action-submit {
      background: $gradient-blue-btn;
      color: $text-white;
      box-shadow: 0 2px 8px $overlay-blue-25;

      &:hover {
        box-shadow: 0 4px 12px $overlay-blue-35;
        transform: translateY(-1px);
      }
    }

    &.action-reject {
      background: transparent;
      color: $color-danger;
      border: 1px solid $color-danger;

      &:hover {
        background: $color-danger-bg;
      }
    }

    &.action-secondary {
      background: transparent;
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border);

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
    padding: var(--space-16) 24px;

    .empty-icon {
      color: var(--color-text-placeholder);
      margin-bottom: 12px;
    }

    .empty-text {
      margin: 0 0 16px;
      font-size: $font-size-body;
      color: var(--color-text-tertiary);
    }

    .empty-hint {
      margin: -8px 0 16px;
      font-size: $font-size-caption;
      color: var(--color-text-placeholder);
    }
  }

  // ─── Timeline ──────────────────────────────────────────────
  .timeline {
    padding: 16px 20px 20px;
  }

  .timeline-item {
    display: flex;
    gap: var(--space-3-5);
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
      background: var(--color-border);
      margin-top: var(--space-3-5);
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
      background: linear-gradient(to bottom, var(--color-border), transparent);
    }
  }

  .tl-card {
    flex: 1;
    background: var(--color-bg-container);
    border: 1px solid var(--color-border-light);
    border-radius: $radius-xl;
    padding: var(--space-3-5) 16px;
    margin-bottom: var(--space-3-5);
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

    &.chip-pending_review {
      background: $color-info-bg;
      color: $color-info;
    }

    &.chip-published {
      background: $color-success-bg;
      color: $color-success;
    }

    &.chip-archived {
      background: var(--color-bg-cool-gray);
      color: var(--color-text-tertiary);
    }
  }

  .tl-date {
    font-size: $font-size-caption;
    color: var(--color-text-tertiary);
    white-space: nowrap;
    flex-shrink: 0;
    margin-top: var(--space-1);
  }

  .tl-reason {
    margin: var(--space-1-5) 0 0;
    font-size: $font-size-body-sm;
    color: var(--color-text-regular);
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
    gap: var(--space-1);
    padding: var(--space-0-5) 8px;
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
    padding: var(--space-0-5) 8px;
    font-size: 10px;
    font-weight: $font-weight-medium;
    color: var(--color-text-tertiary);
    background: var(--color-bg-cool-gray);
    border-radius: $radius-pill;
  }

  .tl-card-footer {
    margin-top: var(--space-2-5);
    padding-top: 8px;
    border-top: 1px solid var(--color-border-light);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .tl-card-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .tl-compare-label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1-5);
    cursor: pointer;
    user-select: none;

    .tl-checkbox {
      appearance: none;
      width: 16px;
      height: 16px;
      border: 1.5px solid var(--color-border);
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
      color: var(--color-text-tertiary);
      transition: color $transition-fast;
    }

    &:hover .tl-checkbox-text {
      color: var(--color-text-secondary);
    }
  }

  .tl-edit-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border: 1px solid var(--color-border);
    border-radius: $radius-pill;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 11px;
    font-weight: $font-weight-medium;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      border-color: var(--color-primary-lighter);
      color: var(--color-primary);
      background: var(--color-primary-bg);
    }
  }

  .tl-publish-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border: 1px solid var(--color-primary-lighter);
    border-radius: $radius-pill;
    background: var(--color-primary-bg);
    color: var(--color-primary);
    font-size: 11px;
    font-weight: $font-weight-medium;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: var(--color-primary);
      color: $text-white;
      border-color: var(--color-primary);
    }
  }

  .tl-reject-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border: 1px solid $color-danger;
    border-radius: $radius-pill;
    background: transparent;
    color: $color-danger;
    font-size: 11px;
    font-weight: $font-weight-medium;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: $color-danger-bg;
    }
  }

  .tl-status-hint {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: $radius-pill;
    font-size: 11px;
    font-weight: $font-weight-medium;
    color: var(--color-text-tertiary);
    background: var(--color-bg-cool-gray);
  }

  .tl-status-published {
    color: $color-success;
    background: $color-success-bg;
  }

  // ─── Detail Panel ───────────────────────────────────────────
  .detail-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-16) 24px;
    text-align: center;

    .detail-empty-visual {
      color: var(--color-text-placeholder);
      margin-bottom: 16px;
    }

    .detail-empty-text {
      margin: 0;
      font-size: $font-size-body;
      color: var(--color-text-tertiary);
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
    border-bottom: 1px solid var(--color-border-light);

    .identity-main {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 8px;
    }

    .identity-version {
      font-size: 28px;
      font-weight: $font-weight-bold;
      color: var(--color-text-primary);
      font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
      line-height: 1.2;
    }

    .identity-name {
      font-size: $font-size-h4;
      color: var(--color-text-secondary);
      font-weight: $font-weight-medium;
    }

    .identity-meta {
      display: flex;
      align-items: center;
      gap: var(--space-2-5);
      flex-wrap: wrap;
    }

    .identity-status {
      display: inline-flex;
      align-items: center;
      padding: var(--space-1) var(--space-2-5);
      font-size: $font-size-caption;
      font-weight: $font-weight-semibold;
      border-radius: $radius-pill;

      &.st-draft {
        background: $color-warning-bg;
        color: $color-warning;
      }

      &.st-pending_review {
        background: $color-info-bg;
        color: $color-info;
      }

      &.st-published {
        background: $color-success-bg;
        color: $color-success;
      }

      &.st-archived {
        background: var(--color-bg-cool-gray);
        color: var(--color-text-tertiary);
      }
    }

    .identity-current {
      display: inline-flex;
      align-items: center;
      padding: var(--space-1) var(--space-2-5);
      background: var(--overlay-brand-08);
      color: var(--color-primary);
      font-size: $font-size-caption;
      font-weight: $font-weight-semibold;
      border-radius: $radius-pill;
    }

    .identity-time {
      font-size: $font-size-caption;
      color: var(--color-text-tertiary);
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
      color: var(--color-text-secondary);
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
        color: var(--color-text-tertiary);
        font-weight: $font-weight-medium;
      }
    }
  }

  // ── Changes ──
  .detail-changes {
    .changes-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-1-5);
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

        .change-type-icon {
          color: $color-success;
        }
      }

      &.cr-delete {
        background: $color-danger-light;

        .change-type-icon {
          color: $color-danger;
        }
      }

      &.cr-modify {
        background: $color-info-light;

        .change-type-icon {
          color: $color-info;
        }
      }
    }

    .change-type-icon {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
      font-size: 14px;
    }

    .change-field {
      color: var(--color-text-regular);
      font-weight: $font-weight-medium;
      min-width: 60px;
    }

    .change-values {
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--color-text-secondary);
    }

    .change-old {
      text-decoration: line-through;
      color: $color-danger;
      opacity: 0.7;
    }

    .change-new {
      color: var(--color-text-primary);
      font-weight: $font-weight-medium;
    }

    .change-arrow {
      color: var(--color-text-placeholder);
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
      gap: var(--space-0-5);
      padding: 12px var(--space-3-5);
      background: var(--overlay-brand-05);
      border-radius: $radius-md;
      position: relative;

      .sn-field-icon {
        position: absolute;
        top: 8px;
        right: 8px;
        font-size: 14px;
        color: var(--color-primary-light);
        opacity: 0.5;
      }

      .sn-field-label {
        font-size: $font-size-micro;
        font-weight: $font-weight-semibold;
        color: var(--color-text-tertiary);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .sn-field-value {
        font-size: $font-size-h4;
        font-weight: $font-weight-semibold;
        color: var(--color-text-primary);
      }
    }
  }

  // ── Materials List ──
  .detail-materials {
    .material-list {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .material-header-row {
      display: grid;
      grid-template-columns: 28px 2fr 60px 64px repeat(5, 52px) 52px;
      gap: 4px;
      padding: 8px 12px;
      font-size: 10px;
      font-weight: $font-weight-semibold;
      color: var(--color-text-tertiary);
      text-transform: none;
      letter-spacing: 0.03em;
      border-bottom: 1px solid var(--color-border-light);
      text-align: center;
      align-items: center;

      .mh-index,
      .mh-weight,
      .mh-pct,
      .mh-nutrient,
      .mh-version {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .mh-name {
        display: flex;
        align-items: center;
        justify-content: flex-start;
      }
    }

    .material-row {
      display: grid;
      grid-template-columns: 28px 2fr 60px 64px repeat(5, 52px) 52px;
      gap: 4px;
      align-items: center;
      padding: 8px 12px;
      border-radius: $radius-md;
      transition: background $transition-fast;
      text-align: center;

      &:hover {
        background: var(--color-primary-bg);
      }
    }

    .material-index {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: var(--color-bg-container);
      border: 1px solid var(--color-border-light);
      border-radius: $radius-xs;
      font-size: 10px;
      font-weight: $font-weight-bold;
      color: var(--color-text-tertiary);
      flex-shrink: 0;
    }

    .material-name-cell {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      overflow: hidden;
    }

    .material-name-text {
      font-size: $font-size-body-sm;
      font-weight: $font-weight-medium;
      color: var(--color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .material-tag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 var(--space-1);
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

    .material-weight {
      font-size: $font-size-caption;
      font-weight: $font-weight-semibold;
      color: var(--color-primary);
      font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
      text-align: center;
    }

    .material-pct {
      font-size: $font-size-caption;
      color: var(--color-text-secondary);
      font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
      text-align: center;
    }

    .material-nutrient {
      font-size: $font-size-caption;
      color: var(--color-text-regular);
      font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
      text-align: center;
    }

    .material-version {
      font-size: $font-size-caption;
      color: var(--color-text-tertiary);
      font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
      text-align: center;
    }

    .material-empty {
      text-align: center;
      color: var(--color-text-tertiary);
      font-size: $font-size-body-sm;
      padding: 24px 0;
      margin: 0;
    }
  }

  .detail-nutrition {
    .nutrition-summary-zone {
      display: flex;
      flex-direction: column;
      gap: 0;
      border: 1px solid var(--color-border-light);
      border-radius: $radius-md;
      overflow: hidden;
    }

    .nsz-row {
      display: grid;
      grid-template-columns: 80px 70px 72px repeat(5, 1fr);
      gap: 0;
      align-items: center;
      font-size: $font-size-caption;
    }

    .nsz-col {
      padding: 8px 10px;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nsz-col--label {
      text-align: left;
      font-weight: $font-weight-semibold;
    }

    .nsz-row--header {
      background: var(--color-bg-cool-gray);

      .nsz-col {
        font-weight: $font-weight-semibold;
        color: var(--color-text-tertiary);
        font-size: 10px;
        letter-spacing: 0.03em;
        padding: 6px 10px;
      }
    }

    .nsz-row--total {
      background: var(--color-bg-container);
      border-top: 1px solid var(--color-border-light);

      .nsz-total-label {
        color: var(--color-text-primary);
        font-weight: $font-weight-bold;
      }

      .nsz-nutrient--total {
        color: var(--color-primary);
        font-weight: $font-weight-semibold;
      }
    }

    .nsz-row--nrv {
      background: rgba(var(--color-primary-rgb, 0, 112, 240), 0.03);
      border-top: 1px solid var(--color-border-light);

      .nsz-nrv-label {
        color: var(--color-text-secondary);
        font-weight: $font-weight-medium;
      }

      .nsz-nutrient--nrv {
        color: var(--color-text-secondary);
        font-size: 10px;
      }
    }

    .nsz-row--nrv-pct {
      background: rgba(var(--color-primary-rgb, 0, 112, 240), 0.06);
      border-top: 1px solid var(--color-border-light);

      .nsz-nrv-pct-label {
        color: var(--color-primary);
        font-weight: $font-weight-bold;
      }

      .nsz-nutrient--nrv-pct {
        color: var(--color-primary);
        font-weight: $font-weight-semibold;
      }
    }
  }

  // ── Detail Actions ──
  .detail-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2-5);
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--color-border-light);

    .pending-hint {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1-5);
      padding: 8px var(--space-4);
      background: $color-info-bg;
      color: $color-info;
      font-size: $font-size-body-sm;
      font-weight: $font-weight-medium;
      border-radius: $radius-lg;

      .t-icon {
        animation: spin 2s linear infinite;
      }
    }
  }

  // ─── Create Dialog ─────────────────────────────────────────
  :deep(.t-dialog) {
    border-radius: $radius-3xl;
    overflow: hidden;
  }

  :deep(.t-dialog__header) {
    font-size: $font-size-h3;
    font-weight: $font-weight-semibold;
    color: var(--color-text-primary);
  }

  :deep(.t-dialog__body) {
    padding-bottom: 8px;
  }

  :deep(.t-dialog__footer) {
    padding-top: 8px;
  }

  .create-form {
    .create-label {
      display: block;
      margin-bottom: 8px;
      font-size: $font-size-body-sm;
      font-weight: $font-weight-medium;
      color: var(--color-text-primary);

      .required {
        color: $color-danger;
      }
    }

    .create-textarea {
      display: block;
      width: 100%;
      padding: var(--space-2-5) 12px;
      border: 1px solid var(--color-border);
      border-radius: $radius-md;
      font-size: $font-size-body-sm;
      font-family: inherit;
      color: var(--color-text-primary);
      background: var(--color-bg-container);
      resize: vertical;
      transition: border-color $transition-fast;
      outline: none;
      box-sizing: border-box;

      &::placeholder {
        color: var(--color-text-placeholder);
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
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
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

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>

<style lang="scss">
.t-dialog.version-create-dialog {
  .t-dialog__footer .t-btn--theme-primary {
    background: $gradient-emerald-btn !important;
    border: none;
    box-shadow: 0 2px 8px $overlay-emerald-25;

    &:hover {
      background: $gradient-emerald-btn-hover !important;
      box-shadow: 0 4px 12px $overlay-emerald-35;
    }
  }
}
</style>
