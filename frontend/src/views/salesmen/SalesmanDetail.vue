<template>
  <div class="salesman-detail" :aria-busy="!salesman">
    <PageSkeleton v-if="!salesman" type="detail" />
    <template v-else>
      <!-- 顶部 Header -->
      <header class="detail-header">
        <div class="header-left">
          <button class="header-back-btn" @click="handleBack" title="返回列表">
            <t-icon name="arrow-left" />
          </button>
          <div class="header-title-group">
            <nav class="header-breadcrumb">
              <a class="breadcrumb-link" @click="handleBack">业务员管理</a>
              <t-icon name="chevron-right" class="breadcrumb-sep" />
              <span class="breadcrumb-current">业务员详情</span>
            </nav>
            <h2 class="detail-title">
              <span class="title-avatar">
                {{ salesman.name?.charAt(0)?.toUpperCase() || 'U' }}
              </span>
              {{ salesman.name }}
              <t-tag :theme="salesman.status === 'active' ? 'success' : 'default'" variant="light" size="small"
                shape="round" class="status-tag">{{ salesman.status === 'active' ? '活跃' : '停用' }}</t-tag>
            </h2>
          </div>
        </div>
        <div class="header-actions">
          <button class="header-action-btn secondary" @click="handleBack">
            <t-icon name="close" class="btn-icon" />
            返回
          </button>
          <button class="header-action-btn" @click="router.push(`/salesmen/${route.params.id}/edit`)">
            <t-icon name="edit" class="btn-icon" />
            编辑
          </button>
        </div>
      </header>

      <!-- 主内容区域：左右两栏网格 -->
      <main class="detail-main">

        <!-- 左侧栏：业务员概况 + 变更记录 -->
        <div class="detail-left-col">

          <!-- 业务员概况卡片 -->
          <section class="info-card">
            <h3 class="card-label">
              <t-icon name="user-circle" class="label-icon" />
              业务员概况
            </h3>
            <div class="card-fields">
              <div class="field-item">
                <label><t-icon name="user" size="12px" /> 姓名</label>
                <p>{{ salesman.name }}</p>
              </div>
              <div class="field-grid-2">
                <div class="field-item">
                  <label><t-icon name="barcode" size="12px" /> 工号</label>
                  <p>{{ salesman.code }}</p>
                </div>
                <div class="field-item">
                  <label><t-icon name="root-list" size="12px" /> 部门</label>
                  <p>{{ salesman.department || '--' }}</p>
                </div>
              </div>
              <div class="field-grid-2">
                <div class="field-item">
                  <label><t-icon name="call" size="12px" /> 电话</label>
                  <p>{{ salesman.phone || '--' }}</p>
                </div>
                <div class="field-item field-item--email">
                  <label><t-icon name="mail" size="12px" /> 邮箱</label>
                  <p>{{ salesman.email || '--' }}</p>
                </div>
              </div>
              <div class="field-grid-2">
                <div class="field-item">
                  <label><t-icon name="check-circle" size="12px" /> 状态</label>
                  <p
                    :class="{ 'status-warn': salesman.status !== 'active', 'status-ok': salesman.status === 'active' }">
                    {{ salesman.status === 'active' ? '活跃' : '停用' }}
                  </p>
                </div>
                <div class="field-item">
                  <label><t-icon name="file-paste" size="12px" /> 配方数量</label>
                  <p :class="{ 'status-warn': formulaTotal === 0, 'status-ok': formulaTotal > 0 }">
                    {{ formulaTotal }} 个
                  </p>
                </div>
              </div>
              <div class="field-grid-2">
                <div class="field-item">
                  <label><t-icon name="time" size="12px" /> 创建时间</label>
                  <p class="time-split">
                    <span class="time-date">{{ formatTimeDate(salesman.createdAt) }}</span>
                    <span class="time-clock">{{ formatTimeClock(salesman.createdAt) }}</span>
                  </p>
                </div>
                <div class="field-item">
                  <label><t-icon name="edit-1" size="12px" /> 更新时间</label>
                  <p class="time-split">
                    <span class="time-date">{{ formatTimeDate(salesman.updatedAt) }}</span>
                    <span class="time-clock">{{ formatTimeClock(salesman.updatedAt) }}</span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          <!-- 变更记录时间线 -->
          <section class="info-card">
            <div class="timeline-header">
              <h3 class="card-label" style="margin-bottom: 0;">
                <t-icon name="history" class="label-icon" />
                变更记录
              </h3>
            </div>
            <div class="timeline-list">
              <div class="timeline-item current">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                  <p class="timeline-ver">{{ salesman.updatedAt && salesman.updatedAt !== salesman.createdAt ? '最近更新' :
                    '初始录入' }}</p>
                  <p class="timeline-time">{{ formatDate(salesman.updatedAt || salesman.createdAt) }}</p>
                </div>
              </div>
              <div v-if="salesman.createdAt !== salesman.updatedAt" class="timeline-item past">
                <div class="timeline-dot past"></div>
                <div class="timeline-content">
                  <p class="timeline-ver past">初始创建</p>
                  <p class="timeline-time past">{{ formatDate(salesman.createdAt) }}</p>
                </div>
              </div>
            </div>
          </section>

        </div>

        <!-- 右侧栏：该业务员的配方列表 -->
        <div class="detail-right-col">

          <section class="formula-section">
            <div class="formula-header">
              <div>
                <h3 class="formula-title">
                  <t-icon name="file-paste" size="20px" style="color: #10b981; margin-right: 6px;" />
                  关联配方列表
                </h3>
                <p class="formula-subtitle">该业务员名下共 <t-tag variant="light" theme="success" size="small" shape="round">{{
                  formulaTotal }}</t-tag> 个配方</p>
              </div>
            </div>

            <div v-if="formulasLoading" class="formula-loading">
              <t-loading />
            </div>

            <Transition name="fade" mode="out-in">
              <div v-if="!formulasLoading && formulaList.length" class="formula-list">
                <div v-for="(item, idx) in formulaList" :key="item.id" class="formula-item"
                  @click="router.push(`/formulas/${item.id}`)">
                  <div class="formula-item-top">
                    <div class="formula-item-name-row">
                      <span class="formula-item-index">{{ idx + 1 }}</span>
                      <span class="formula-item-name">{{ item.name }}</span>
                    </div>
                    <t-tag variant="light" theme="primary" size="small" shape="round">
                      <template #icon><t-icon name="layers" size="12px" /></template>
                      {{ item.materials?.length || 0 }} 种原料
                    </t-tag>
                  </div>
                  <div class="formula-item-meta">
                    <span class="meta-item">
                      <t-icon name="measurement" size="14px" />
                      {{ item.finishedWeight || 0 }}g
                    </span>
                    <span class="meta-item">
                      <t-icon name="time" size="14px" />
                      {{ formatDate(item.updatedAt || item.createdAt) }}
                    </span>
                  </div>
                  <p v-if="item.description" class="formula-item-desc">
                    <t-icon name="chat-bubble" size="12px" />
                    {{ item.description }}
                  </p>
                </div>
              </div>

              <div v-else-if="!formulasLoading" class="formula-empty">
                <t-empty description="该业务员暂无关联配方" role="status">
                  <template #image>
                    <div style="text-align: center;">
                      <div
                        style="width: 80px; height: 80px; border-radius: 24px; background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(45,212,191,0.12)); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                        <t-icon name="file-paste" size="36px" color="#94a3b8" />
                      </div>
                    </div>
                  </template>
                  <template #default>
                    <t-button theme="success" @click="router.push('/formulas?new=1')">
                      <template #icon><t-icon name="add" /></template>
                      创建配方
                    </t-button>
                  </template>
                </t-empty>
              </div>
            </Transition>

            <!-- 分页 -->
            <div v-if="formulaTotal > 0" class="table-pagination">
              <div class="pagination-info">
                显示第 {{ (formulaPage - 1) * FORMULA_PAGE_SIZE + 1 }}-{{ Math.min(formulaPage * FORMULA_PAGE_SIZE,
                  formulaTotal) }} 条，共 {{ formulaTotal }} 条数据
              </div>
              <div class="pagination-controls">
                <button class="pagination-btn" :class="{ 'pagination-btn--disabled': formulaPage === 1 }"
                  :disabled="formulaPage === 1" @click="goToFormulaPage(formulaPage - 1)">上一页</button>
                <template v-for="page in formulaPageNumbers" :key="page">
                  <button v-if="page !== '...'" class="pagination-btn"
                    :class="{ 'pagination-btn--active': page === formulaPage }"
                    @click="typeof page === 'number' && goToFormulaPage(page)">{{ page }}</button>
                  <span v-else class="pagination-ellipsis">...</span>
                </template>
                <button class="pagination-btn"
                  :class="{ 'pagination-btn--disabled': formulaPage === formulaTotalPages }"
                  :disabled="formulaPage === formulaTotalPages" @click="goToFormulaPage(formulaPage + 1)">下一页</button>
              </div>
            </div>
          </section>

        </div>

      </main>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useSalesmanStore } from '@/stores/salesman';
import { formulaApi } from '@/api/formula';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';

const router = useRouter();
const route = useRoute();
const salesmanStore = useSalesmanStore();

const salesman = ref<any>(null);
const formulaList = ref<any[]>([]);
const formulasLoading = ref(false);
const formulaTotal = ref(0);
const formulaPage = ref(1);
const FORMULA_PAGE_SIZE = 10;

const handleBack = () => {
  router.push({
    path: '/salesmen',
    query: route.query
  });
};

const formatDate = (dateStr: string | Date): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateTime = (raw: string | null | undefined): string => {
  if (!raw) return '--';
  const s = raw.replace('T', ' ').replace('Z', '');
  return s.substring(0, 19);
};

const formatTimeDate = (raw: string | null | undefined): string => {
  if (!raw) return '--';
  const d = new Date(raw.replace('T', ' ').replace('Z', ''));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatTimeClock = (raw: string | null | undefined): string => {
  if (!raw) return '--';
  const d = new Date(raw.replace('T', ' ').replace('Z', ''));
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${min}:${sec}`;
};

const formulaTotalPages = computed(() => Math.ceil(formulaTotal.value / FORMULA_PAGE_SIZE) || 1);
const formulaPageNumbers = computed<(number | string)[]>(() => {
  const total = formulaTotalPages.value;
  const current = formulaPage.value;
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, '...', total];
  if (current >= total - 2) return [1, '...', total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
});

const loadFormulas = async () => {
  const id = route.params.id as string;
  formulasLoading.value = true;
  try {
    const res = await formulaApi.getList({ salesmanId: id, page: formulaPage.value, pageSize: FORMULA_PAGE_SIZE });
    if (res?.list) {
      formulaList.value = res.list.map((f: any) => ({
        ...f,
        materials: f.materialsJson ? (() => {
          try { const p = JSON.parse(f.materialsJson); return typeof p === 'string' ? JSON.parse(p) : Array.isArray(p) ? p : []; } catch { return []; }
        })() : [],
        description: (() => {
          if (!f.description) return '';
          try { const obj = JSON.parse(f.description); if (typeof obj === 'object') { const parts: string[] = []; if (obj.productType) parts.push(obj.productType); if (obj.dosage) parts.push(obj.dosage); if (obj.efficacy) parts.push(obj.efficacy); return parts.length ? parts.join(' | ') : f.description; } return f.description; } catch { return f.description; }
        })(),
      }));
      formulaTotal.value = res.pagination?.total || 0;
    }
  } catch (e) {
    console.error('获取业务员配方失败:', e);
  } finally {
    formulasLoading.value = false;
  }
};

const goToFormulaPage = (page: number) => {
  formulaPage.value = page;
  loadFormulas();
};

const loadData = async () => {
  const id = route.params.id as string;
  salesman.value = await salesmanStore.getSalesman(id);
  formulaPage.value = 1;
  await loadFormulas();
};

onMounted(() => { loadData(); });
</script>

<style scoped lang="scss">
.salesman-detail {

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
          color: #10b981;
          background-color: #ecfdf5;
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
              color: #10b981;
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

        .detail-title {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.35;

          .title-avatar {
            width: 36px;
            height: 36px;
            border-radius: 12px;
            background: linear-gradient(135deg, #10b981, #2dd4bf);
            color: #fff;
            font-size: 16px;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            box-shadow: 0 4px 10px rgba(16, 185, 129, 0.25);
          }

          .status-tag {
            font-size: 11px !important;
            font-weight: 600 !important;
            letter-spacing: 0.02em;
          }
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
        padding: 8px 16px;
        background-color: #10b981;
        color: #ffffff;
        border: none;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 700;
        box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.25);
        cursor: pointer;
        transition: all $transition-fast;

        .btn-icon {
          font-size: 18px;
        }

        &:hover {
          background-color: #059669;
          transform: translateY(-1px);
          box-shadow: 0 14px 20px -3px rgba(16, 185, 129, 0.35);
        }

        &:active {
          transform: translateY(0);
          background-color: #047857;
        }

        &.secondary {
          background-color: #f1f5f9;
          color: #64748b;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

          &:hover {
            background-color: #e2e8f0;
            color: #475569;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }

          &:active {
            background-color: #cbd5e1;
          }
        }
      }
    }
  }

  .detail-main {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 24px;
    margin-top: 24px;
    margin-bottom: 24px;
    padding-bottom: 24px;

    .detail-left-col {
      grid-column: span 12;

      @media (min-width: 1024px) {
        grid-column: span 3;
      }

      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .detail-right-col {
      grid-column: span 12;

      @media (min-width: 1024px) {
        grid-column: span 9;
      }

      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .info-card {
      background: #fff;
      padding: 24px;
      border-radius: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      border: 1px solid #f8fafc;
      animation: fadeInUp 0.35s ease both;

      .card-label {
        font-size: 14px;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 24px;
        display: flex;
        align-items: center;
        gap: 8px;

        .label-icon {
          font-size: 16px;
          color: #10b981;
          opacity: 0.7;
        }
      }
    }

    .card-fields {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .field-item {
        padding: 12px;
        background: #f8fafc;
        border-radius: 16px;
        border: 1px solid #f1f5f9;

        label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          margin-bottom: 4px;

          .t-icon {
            color: #10b981;
            opacity: 0.55;
            flex-shrink: 0;
          }
        }

        p {
          font-size: 12px;
          font-weight: 600;
          color: #334155;
          margin: 0;
          line-height: 1.5;
        }

        &--email p {
          word-break: break-all;
          overflow-wrap: anywhere;
          font-size: 13px;
          line-height: 1.5;
        }

        .time-split {
          display: flex;
          flex-direction: column;
          gap: 2px;

          .time-date {
            font-size: 12px;
            font-weight: 600;
            color: #334155;
            letter-spacing: 0.02em;
          }

          .time-clock {
            font-size: 12px;
            font-weight: 600;
            color: #94a3b8;
            font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
          }
        }
      }

      .field-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;

        .field-item p {
          font-family: inherit;
        }

        .status-warn {
          color: #f59e0b;
        }

        .status-ok {
          color: #10b981;
        }
      }
    }

    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px !important;
    }

    .timeline-list {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .timeline-item {
      display: flex;
      gap: 12px;
      position: relative;

      &:not(:last-child)::after {
        content: '';
        position: absolute;
        left: 11px;
        top: 28px;
        bottom: -24px;
        width: 2px;
        background: #f1f5f9;
      }

      .timeline-dot {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #10b981;
        border: 4px solid #d1fae5;
        z-index: 1;
        flex-shrink: 0;

        &.past {
          background: #cbd5e1;
          border-color: #f1f5f9;
        }
      }

      .timeline-content {
        .timeline-ver {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 2px;

          &.past {
            color: #475569;
          }
        }

        .timeline-time {
          font-size: 12px;
          color: #94a3b8;
          margin: 0 0 6px;

          &.past {
            color: #94a3b8;
          }
        }

        .timeline-note {
          margin-top: 8px;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 8px;
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.5;
        }
      }
    }

    .formula-section {
      background: #fff;
      border-radius: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      border: 1px solid #f8fafc;
      overflow: hidden;
      animation: fadeInUp 0.4s ease both;

      .formula-header {
        padding: 20px 24px;
        border-bottom: 1px solid #f8fafc;
        background: rgba(248, 250, 252, 0.5);

        .formula-title {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .formula-subtitle {
          font-size: 13px;
          color: #94a3b8;
          margin: 4px 0 0;
        }
      }

      .formula-loading {
        padding: 60px 24px;
        display: flex;
        justify-content: center;
      }

      .formula-list {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .formula-item {
        padding: 20px;
        background: #f8fafc;
        border-radius: 16px;
        border: 1px solid #f1f5f9;
        cursor: pointer;
        transition: all $transition-normal;

        &:hover {
          background: #fff;
          border-color: #10b981;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.08);
          transform: translateY(-1px);
        }

        .formula-item-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;

          .formula-item-name-row {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .formula-item-index {
            width: 26px;
            height: 26px;
            border-radius: 8px;
            background: linear-gradient(135deg, #10b981, #2dd4bf);
            color: #fff;
            font-size: 12px;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .formula-item-name {
            font-size: 15px;
            font-weight: 700;
            color: #1e293b;
          }
        }

        .formula-item-meta {
          display: flex;
          gap: 16px;
          margin-bottom: 8px;

          .meta-item {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: #64748b;
          }
        }

        .formula-item-desc {
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.5;
          margin: 4px 0 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;

          .t-icon {
            color: #cbd5e1;
            flex-shrink: 0;
          }
        }
      }

      .formula-empty {
        padding: 60px 24px;
      }

      .table-pagination {
        padding: 20px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid #f8fafc;

        .pagination-info {
          font-size: 14px;
          color: #94a3b8;
          font-weight: 400;
          white-space: nowrap;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .pagination-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background-color: transparent;
          color: #64748b;
          font-size: 14px;
          cursor: pointer;
          transition: all $transition-fast;
          white-space: nowrap;
          user-select: none;

          &:hover:not(.pagination-btn--disabled):not(.pagination-btn--active) {
            background-color: #f8fafc;
            border-color: #cbd5e1;
            color: #334155;
          }

          &.pagination-btn--disabled {
            opacity: 0.5;
            cursor: not-allowed !important;
            color: #94a3b8;
            pointer-events: none;
          }

          &.pagination-btn--active {
            background-color: #10b981;
            color: #fff;
            border-color: #10b981;
            font-weight: 600;
            box-shadow: 0 1px 3px rgba(16, 185, 129, 0.25);
            pointer-events: none;
          }
        }

        .pagination-ellipsis {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 34px;
          color: #94a3b8;
          font-size: 14px;
          user-select: none;
        }
      }
    }
  }

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

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.25s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
}
</style>
