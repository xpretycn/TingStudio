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
        <button class="reset-btn" @click="handleClearCompare">重置对比</button>
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
          :style="{ animationDelay: `${idx * 0.1}s` }">
          <div class="card-header">
            <div class="card-header-top">
              <span class="version-tag-pill">{{ ver.versionNumber }}</span>
              <button class="remove-btn" @click="handleRemove(ver.versionId)" title="移除对比">
                <t-icon name="delete" />
              </button>
            </div>
            <h3 class="card-title">{{ ver.versionName || '--' }}</h3>
            <p class="card-meta">
              <t-icon name="calendar" /> {{ formatDate(ver.createdAt) }} · {{ ver.createdBy || '--' }}
            </p>
          </div>

          <div class="card-body">
            <h4 class="section-label">原料构成</h4>
            <div class="ingredients-list">
              <div v-for="ing in getIngredients(ver)" :key="ing.name" class="ingredient-item"
                :class="getDiffClass(ing, ver, idx)">
                <div class="ing-top">
                  <span class="ing-name">{{ ing.name }}</span>
                  <span class="ing-value">{{ ing.value.toFixed(2) }}%</span>
                </div>
                <div class="ing-bar-track">
                  <div class="ing-bar-fill" :style="{ width: ing.value + '%' }"></div>
                </div>
              </div>
            </div>

            <div class="summary-section">
              <h4 class="section-label">版本摘要</h4>
              <div class="summary-box">
                "{{ getSummaryText(ver.status) }}"
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <t-dialog v-model:visible="resetDialogVisible" header="清除对比" :confirm-btn="{ content: '确定清除', theme: 'warning' }"
      cancel-btn="取消" @confirm="onConfirmReset">
      <p style="color: #64748b; font-size: 14px;">确定要清除所有对比项吗？</p>
    </t-dialog>
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
const resetDialogVisible = ref(false)

const handleBack = () => router.push(`/versions/formula/${formulaId}`)

const handleRemove = (id: string) => {
  compareVersions.value = compareVersions.value.filter(v => v.versionId !== id)
}

const handleClearCompare = () => {
  resetDialogVisible.value = true
}

const onConfirmReset = () => {
  compareVersions.value = []
  localStorage.removeItem('compare_versions')
  resetDialogVisible.value = false
}

const formatDate = (val: string | undefined) => {
  if (!val) return '--'
  const d = new Date(val)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const getIngredients = (ver: any) => {
  const materials = ver.snapshot?.materials || []
  return materials.map((m: any) => ({ name: m.materialName || '--', value: m.quantity || 0 }))
}

const getDiffClass = (ing: any, _ver: any, idx: number) => {
  const others = compareVersions.value.filter((_, i) => i !== idx)
  const isShared = others.some(o => {
    const oIngs = o.snapshot?.materials || []
    return oIngs.some((oi: any) => oi.materialName === ing.name)
  })
  if (!isShared) return 'diff-added'
  const hasDiff = others.some(o => {
    const match = (o.snapshot?.materials || []).find((oi: any) => oi.materialName === ing.name)
    return match && (match.quantity || 0) !== ing.value
  })
  if (hasDiff) return 'diff-changed'
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
        transition: all 0.2s ease;
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
        transition: all 0.2s ease;

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
      transition: all 0.2s ease;

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
        transition: all 0.2s;
        background: rgba(248, 250, 252, 0.50);

        &.diff-added {
          background: #f0fdf4;
          color: #16a34a;
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
}
</style>
