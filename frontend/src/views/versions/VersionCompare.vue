<template>
  <div class="version-compare">
    <header class="detail-header">
      <div class="header-left">
        <button class="header-back-btn" @click="handleBack" title="返回版本管理">
          <t-icon name="arrow-left" />
        </button>
        <div class="header-title-group">
          <nav class="header-breadcrumb">
            <a class="breadcrumb-link" @click="handleBack">版本管理</a>
            <t-icon name="chevron-right" class="breadcrumb-sep" />
            <span class="breadcrumb-current">版本差异对比</span>
          </nav>
          <h2 class="page-main-title">版本多维对比视图</h2>
        </div>
      </div>
      <div class="header-actions">
        <span class="compare-count">
          当前对比版本数: <strong>{{ compareVersions.length }}</strong>/3
        </span>
        <t-popconfirm content="确定要清除所有对比项吗？" @confirm="onConfirmReset">
          <button class="reset-btn" title="重置对比">重置对比</button>
        </t-popconfirm>
      </div>
    </header>

    <main class="detail-main">
      <div v-if="compareVersions.length === 0" class="empty-state">
        <t-icon name="view-module" class="empty-icon" />
        <p class="empty-text">暂无选中的版本，请先从版本管理页面添加</p>
        <button class="back-select-btn" @click="handleBack">返回选择</button>
      </div>

      <div v-else class="compare-grid">
        <div v-for="(ver, idx) in compareVersions" :key="ver.versionId" class="compare-card"
          :class="{ 'is-base-card': idx === 0 }" :style="{ animationDelay: `${idx * 0.1}s` }">
          <div class="card-header">
            <div class="card-header-top">
              <span class="version-tag-pill" :class="{ 'base-pill': idx === 0 }">
                {{ ver.versionNumber }}<template v-if="idx === 0"> · 基准</template>
              </span>
              <div class="card-actions-right">
                <button v-if="idx !== 0" class="pin-btn" @click="handleSetBase(idx)" title="设为基准版本">
                  <t-icon name="pin" />
                </button>
                <button class="remove-btn" @click="handleRemove(ver.versionId)" title="移除对比">
                  <t-icon name="delete" />
                </button>
              </div>
            </div>
            <h3 class="card-title">{{ ver.versionName || '--' }}</h3>
            <p class="card-meta">
              <t-icon name="calendar" /> {{ formatDate(ver.createdAt) }} · {{ ver.createdBy || '--' }}
            </p>
          </div>

          <div class="card-body">
            <h4 class="section-label">原料构成</h4>
            <div class="ingredients-list">
              <template v-for="ing in getIngredients(ver, idx)" :key="ing.name">
                <div v-if="ing.missing" class="ingredient-item diff-missing">
                  <div class="ing-top">
                    <span class="ing-name">{{ ing.name }}</span>
                    <span class="ing-value">--</span>
                  </div>
                  <div class="ing-bar-track">
                    <div class="ing-bar-fill missing-bar"></div>
                  </div>
                </div>
                <div v-else class="ingredient-item" :class="getDiffClass(ing, ver, idx)">
                  <div class="ing-top">
                    <span class="ing-name">{{ ing.name }}</span>
                    <span class="ing-value">{{ ing.value.toFixed(2) }}%</span>
                  </div>
                  <div class="ing-bar-track">
                    <div class="ing-bar-fill" :style="{ width: ing.value + '%' }"></div>
                  </div>
                </div>
              </template>
            </div>

            <div class="summary-section">
              <h4 class="section-label">版本摘要</h4>
              <div class="summary-box">
                "{{ getSummaryText(ver.status) }}"
              </div>
            </div>
          </div>
        </div>

        <div v-if="compareVersions.length < 3" class="compare-card add-placeholder-card"
          :style="{ animationDelay: `${compareVersions.length * 0.1}s` }">
          <div class="card-header">
            <div class="card-header-top">
              <span class="version-tag-pill placeholder-tag">待选择</span>
            </div>
            <h3 class="card-title placeholder-title">添加对比版本</h3>
            <p class="card-meta">
              还可添加 <strong>{{ 3 - compareVersions.length }}</strong> 个版本
            </p>
          </div>

          <div class="card-body">
            <h4 class="section-label">可选版本</h4>
            <div class="available-list" v-if="availableList.length > 0">
              <div v-for="item in availableList" :key="item.versionId" class="available-item"
                @click="handleAddVersion(item.versionId)">
                <div class="avail-top">
                  <span class="avail-ver-num">{{ item.versionNumber }}</span>
                  <t-icon name="chevron-right" class="avail-arrow" />
                </div>
                <p class="avail-name">{{ item.versionName || '未命名' }}</p>
                <p class="avail-date">{{ formatDate(item.createdAt) }}</p>
              </div>
            </div>
            <div v-else class="no-available">
              <t-icon name="info-circle" />
              <span>暂无更多可对比版本</span>
            </div>
          </div>
        </div>
      </div>
    </main>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useVersionStore } from '@/stores/version'

const router = useRouter()
const route = useRoute()
const versionStore = useVersionStore()

const formulaId = route.params.formulaId as string
const compareVersions = ref<any[]>([])

const handleBack = () => router.push(`/versions/formula/${formulaId}`)

const handleRemove = (id: string) => {
  compareVersions.value = compareVersions.value.filter(v => v.versionId !== id)
  syncLocalStorage()
}

const handleSetBase = (idx: number) => {
  if (idx <= 0) return
  const [target] = compareVersions.value.splice(idx, 1)
  compareVersions.value.unshift(target)
  syncLocalStorage()
}

const onConfirmReset = () => {
  compareVersions.value = []
  localStorage.removeItem('compare_versions')
}

const availableList = computed(() => {
  const currentIds = new Set(compareVersions.value.map(v => v.versionId))
  return (versionStore.versions || []).filter((v: any) => !currentIds.has(v.versionId))
})

const handleAddVersion = (versionId: string) => {
  const ver = versionStore.versions.find((v: any) => v.versionId === versionId)
  if (ver && !compareVersions.value.find(v => v.versionId === versionId)) {
    compareVersions.value.push(ver)
    syncLocalStorage()
  }
}

const syncLocalStorage = () => {
  const ids = compareVersions.value.map(v => v.versionId)
  localStorage.setItem('compare_versions', JSON.stringify(ids))
}

const formatDate = (val: string | undefined) => {
  if (!val) return '--'
  const d = new Date(val)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const getIngredients = (ver: any, idx: number) => {
  const materials = ver.snapshot?.materials || []
  if (idx === 0) {
    return materials.map((m: any) => ({ name: m.materialName || '--', value: m.quantity || 0 }))
  }
  const baseVer = compareVersions.value[0]
  const baseIngs = baseVer?.snapshot?.materials || []
  const currentMap = new Map(materials.map((m: any) => [m.materialName, m.quantity || 0]))
  const aligned: any[] = []
  baseIngs.forEach((b: any) => {
    const name = b.materialName || '--'
    if (currentMap.has(name)) {
      aligned.push({ name, value: currentMap.get(name), missing: false })
      currentMap.delete(name)
    } else {
      aligned.push({ name, value: 0, missing: true })
    }
  })
  currentMap.forEach((value, name) => {
    aligned.push({ name, value, missing: false })
  })
  return aligned
}

const getDiffClass = (ing: any, _ver: any, idx: number) => {
  if (idx === 0) return ''
  const baseVer = compareVersions.value[0]
  if (!baseVer) return ''
  const baseIngs = baseVer.snapshot?.materials || []
  const match = baseIngs.find((oi: any) => oi.materialName === ing.name)
  if (!match) return 'diff-added'
  if ((match.quantity || 0) !== ing.value) return 'diff-changed'
  return ''
}

const getSummaryText = (status: string) => {
  if (status === 'published') return '正式投产版本，平衡了口感与成本的最佳方案。'
  if (status === 'draft') return '实验性调整，大幅增加了蛋白质占比以验证风味。'
  return '历史存档，数据仅供参考。'
}

onMounted(async () => {
  await versionStore.fetchVersions(formulaId)
  const ids = localStorage.getItem('compare_versions')
  if (ids) {
    const parsed = JSON.parse(ids)
    compareVersions.value = versionStore.versions.filter((v: any) => parsed.includes(v.versionId)).slice(0, 3)
  }
})
</script>

<style scoped lang="scss">
$radius-2xl: 2rem;

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.version-compare {
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
    backdrop-filter: blur(10px);
    border-bottom: 1px solid #f1f5f9;
    animation: fadeInDown 0.35s ease both;

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
        gap: 4px;

        .header-breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;

          .breadcrumb-link {
            color: #94a3b8;
            cursor: pointer;
            text-decoration: none;
            transition: color 0.15s;

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

        .page-main-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
        }
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;

      .compare-count {
        font-size: 12px;
        color: #94a3b8;
        font-weight: 500;

        strong {
          color: #10b981;
          font-weight: 700;
        }
      }

      .reset-btn {
        padding: 8px 20px;
        background: transparent;
        color: #f43f5e;
        border: none;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all $transition-fast;

        &:hover {
          background: #fff1f2;
        }
      }
    }
  }

  .detail-main {
    padding: 32px 0;
    animation: fadeInDown 0.35s ease both;
    animation-delay: 0.05s;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 24px;
    gap: 16px;

    .empty-icon {
      font-size: 64px;
      color: #94a3b8;
      opacity: 0.2;
    }

    .empty-text {
      font-size: 14px;
      color: #94a3b8;
    }

    .back-select-btn {
      padding: 10px 28px;
      background: #10b981;
      color: #ffffff;
      border: none;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.2);
      transition: all $transition-fast;

      &:hover {
        background: #059669;
        transform: translateY(-1px);
        box-shadow: 0 14px 20px -3px rgba(16, 185, 129, 0.3);
      }
    }
  }

  .compare-grid {
    display: flex;
    gap: 24px;
    overflow-x: auto;
    padding-bottom: 24px;

    &::-webkit-scrollbar {
      height: 8px;
    }

    &::-webkit-scrollbar-thumb {
      background: #d1fae5;
      border-radius: 10px;
    }
  }

  .compare-card {
    min-width: 400px;
    max-width: 420px;
    flex-shrink: 0;
    background: #ffffff;
    border-radius: $radius-2xl;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    border: 1px solid #f8fafc;
    overflow: hidden;
    animation: slideIn 0.5s ease-out both;

    &.is-base-card {
      border-color: #bbf7d0;
      box-shadow: 0 1px 3px rgba(16, 185, 129, 0.08);

      .card-header {
        background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
        border-bottom-color: #d1fae5;
      }
    }

    .card-header {
      padding: 24px;
      border-bottom: 1px solid #f8fafc;
      background: rgba(248, 250, 252, 0.30);
      position: relative;

      .card-header-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
      }

      .version-tag-pill {
        display: inline-block;
        padding: 4px 10px;
        background: #d1fae5;
        color: #059669;
        font-size: 10px;
        font-weight: 900;
        border-radius: 6px;
        font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;

        &.base-pill {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #ffffff;
          letter-spacing: 0.05em;
        }
      }

      .card-actions-right {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .pin-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: #94a3b8;
        cursor: pointer;
        transition: all $transition-fast;
        font-size: 15px;

        &:hover {
          color: #10b981;
          background-color: #ecfdf5;
          transform: rotate(-30deg);
        }
      }

      .remove-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: #cbd5e1;
        cursor: pointer;
        transition: color 0.2s;
        font-size: 16px;

        &:hover {
          color: #f43f5e;
        }
      }

      .card-title {
        margin: 0 0 6px;
        font-size: 18px;
        font-weight: 700;
        color: #1e293b;
      }

      .card-meta {
        display: flex;
        align-items: center;
        gap: 4px;
        margin: 0;
        font-size: 12px;
        color: #94a3b8;
      }
    }

    .card-body {
      padding: 24px;

      .section-label {
        font-size: 10px;
        font-weight: 900;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin: 0 0 16px;
      }

      .ingredients-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 32px;
      }

      .ingredient-item {
        padding: 14px 16px;
        margin-bottom: 10px;
        border-radius: 16px;
        border: 1px solid #f8fafc;
        transition: all $transition-fast;
        background: rgba(248, 250, 252, 0.50);

        &.diff-added {
          background: #ecfdf5;
          color: #059669;
          font-weight: 700;
        }

        &.diff-removed {
          background: #fef2f2;
          color: #dc2626;
          text-decoration: line-through;
          opacity: 0.6;
        }

        &.diff-changed {
          background: #fffbeb;
          color: #d97706;
          font-weight: 700;
        }

        &.diff-missing {
          border-style: dashed;
          border-color: #fca5a5;
          background: #fef2f2;

          .ing-name {
            color: #ef4444 !important;
            text-decoration: line-through;
            font-weight: 700;
          }

          .ing-value {
            color: #f87171 !important;
            font-weight: 900;
          }

          .missing-bar {
            width: 0 !important;
            background: transparent;
          }
        }

        .ing-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;

          .ing-name {
            font-size: 14px;
            font-weight: 700;
            color: inherit;
          }

          .ing-value {
            font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
            font-size: 14px;
            font-weight: 900;
            color: inherit;
          }
        }

        .ing-bar-track {
          width: 100%;
          height: 6px;
          background: rgba(226, 232, 240, 0.30);
          border-radius: 999px;
          overflow: hidden;

          .ing-bar-fill {
            height: 100%;
            background: #10b981;
            border-radius: 999px;
            transition: width 0.4s ease;
          }
        }
      }

      .summary-section {
        margin-top: 32px;
        padding-top: 24px;
        border-top: 1px solid #f8fafc;

        .summary-box {
          font-size: 12px;
          color: #64748b;
          line-height: 1.7;
          font-style: italic;
          padding: 16px;
          background: rgba(209, 250, 229, 0.50);
          border-radius: 16px;
          border: 1px solid rgba(209, 250, 229, 0.30);
        }
      }
    }
  }

  .add-placeholder-card {
    border: 2px dashed #e2e8f0;
    background: #fafbfc;
    overflow: visible;

    .placeholder-tag {
      background: #f1f5f9;
      color: #94a3b8;
    }

    .placeholder-title {
      color: #94a3b8;
    }

    .card-header {
      background: transparent;
      border-bottom: 1px dashed #e2e8f0;

      .card-meta strong {
        color: #10b981;
        font-weight: 700;
      }
    }

    .card-body {
      .available-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .available-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 14px 16px;
        border-radius: 12px;
        border: 1px solid #f1f5f9;
        background: #ffffff;
        cursor: pointer;
        transition: all $transition-fast;

        &:hover {
          border-color: #10b981;
          background: #ecfdf5;
          box-shadow: 0 1px 3px rgba(16, 185, 129, 0.08);

          .avail-ver-num {
            color: #10b981;
          }

          .avail-arrow {
            color: #10b981;
            transform: translateX(3px);
          }

          .avail-name {
            color: #059669;
          }
        }

        &:active {
          transform: scale(0.98);
        }

        .avail-top {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .avail-ver-num {
            font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
            font-size: 13px;
            font-weight: 900;
            color: #475569;
            transition: color 0.2s;
          }

          .avail-arrow {
            font-size: 16px;
            color: #cbd5e1;
            transition: all $transition-fast;
          }
        }

        .avail-name {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #334155;
          transition: color 0.2s;
        }

        .avail-date {
          margin: 0;
          font-size: 11px;
          color: #94a3b8;
        }
      }

      .no-available {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 32px 16px;
        font-size: 13px;
        color: #94a3b8;

        .t-icon {
          font-size: 18px;
        }
      }
    }
  }
}
</style>

