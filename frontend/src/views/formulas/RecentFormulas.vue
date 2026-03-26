<template>
  <div class="recent-formulas">
    <t-card class="content-card" bordered>
      <template #title>
        <div class="title-section">
          <t-icon name="time" class="title-icon" />
          <span>最近配方</span>
        </div>
      </template>

      <t-table
        :data="recentFormulas"
        :columns="columns"
        :loading="formulaStore.loading"
        row-key="id"
        hover
        stripe
        :expandable="true"
      >
        <template #expandedRow="{ row }">
          <div class="expanded-content">
            <div class="description-section" v-if="getFormulaDesc(row.description)">
              <h4>配方信息</h4>
              <div class="desc-tags">
                <t-tag v-if="getFormulaDesc(row.description).productType" theme="primary" variant="light" size="medium">
                  {{ getFormulaDesc(row.description).productType }}
                </t-tag>
                <t-tag v-if="getFormulaDesc(row.description).dosage" theme="warning" variant="light" size="medium">
                  {{ getFormulaDesc(row.description).dosage }}
                </t-tag>
                <t-tag v-if="getFormulaDesc(row.description).efficacy" theme="success" variant="light" size="medium">
                  {{ getFormulaDesc(row.description).efficacy }}
                </t-tag>
                <t-tag v-if="getFormulaDesc(row.description).totalQuote != null" theme="danger" variant="light" size="medium">
                  报价: ¥{{ getFormulaDesc(row.description).totalQuote.toFixed(4) }}
                </t-tag>
              </div>
            </div>
            <div class="materials-section">
              <h4>原料清单</h4>
              <t-table
                :data="row.materials || []"
                :columns="materialColumns"
                size="small"
                bordered
              />
            </div>
          </div>
        </template>

        <template #salesmanName="{ row }">
          <t-tag theme="primary" variant="light">
            {{ row.salesmanName }}
          </t-tag>
        </template>

        <template #materialCount="{ row }">
          <t-tag theme="success" variant="light">
            {{ (row.materials || []).length }} 种原料
          </t-tag>
        </template>

        <template #empty>
          <t-empty description="暂无最近配方数据">
            <template #action>
              <t-button theme="primary" @click="goToFormulas">
                创建配方
              </t-button>
            </template>
          </t-empty>
        </template>

        <template #operation="{ row }">
          <t-space :size="6">
            <t-button variant="outline" theme="default" size="small" @click="handleView(row)">
              <template #icon><t-icon name="browse" /></template>
              查看
            </t-button>
            <t-button variant="outline" theme="primary" size="small" class="btn-edit" @click.stop="handleEdit(row)">
              <template #icon>
                <t-icon name="edit" />
              </template>
              编辑
            </t-button>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <t-dialog
      v-model:visible="detailVisible"
      :header="''"
      :footer="false"
      :close-btn="true"
      :close-on-overlay-click="true"
      width="560px"
      class="formula-detail-dialog"
    >
      <div class="detail-content">
        <div class="detail-header">
          <div class="detail-icon">
            <t-icon name="file-text" />
          </div>
          <div class="detail-title-group">
            <h2 class="detail-name">{{ detailData?.name }}</h2>
            <t-tag v-if="detailData?.salesmanName" theme="primary" variant="light" size="small">
              {{ detailData.salesmanName }}
            </t-tag>
          </div>
          <t-button
            class="detail-close-btn"
            shape="circle"
            variant="outline"
            @click="detailVisible = false"
          >
            <template #icon>
              <t-icon name="close" />
            </template>
          </t-button>
        </div>

        <div class="detail-meta">
          <div class="meta-item">
            <t-icon name="time" />
            <span>创建：{{ detailData?.createdAt }}</span>
          </div>
          <div v-if="detailData?.updatedAt" class="meta-item">
            <t-icon name="refresh" />
            <span>更新：{{ detailData.updatedAt }}</span>
          </div>
        </div>

        <div class="detail-section">
          <h4>
            <span class="section-dot"></span>
            原料清单
            <t-tag size="small" variant="light" theme="success" class="section-tag">
              {{ detailData?.materials?.length || 0 }} 种
            </t-tag>
          </h4>
          <div class="materials-list">
            <div
              v-for="(item, index) in detailData?.materials"
              :key="index"
              class="material-item"
            >
              <span class="material-index">{{ index + 1 }}</span>
              <span class="material-name">{{ item.materialName }}</span>
              <span class="material-quantity">{{ item.quantity }}</span>
            </div>
            <div v-if="!detailData?.materials?.length" class="empty-materials">
              暂无原料信息
            </div>
          </div>
        </div>

        <div v-if="getFormulaDesc(detailData?.description)" class="detail-section">
          <h4><span class="section-dot"></span>配方信息</h4>
          <div class="detail-desc-tags">
            <t-tag v-if="getFormulaDesc(detailData?.description)?.productType" theme="primary" variant="light" size="medium">
              {{ getFormulaDesc(detailData?.description)?.productType }}
            </t-tag>
            <t-tag v-if="getFormulaDesc(detailData?.description)?.dosage" theme="warning" variant="light" size="medium">
              {{ getFormulaDesc(detailData?.description)?.dosage }}
            </t-tag>
            <t-tag v-if="getFormulaDesc(detailData?.description)?.efficacy" theme="success" variant="light" size="medium">
              {{ getFormulaDesc(detailData?.description)?.efficacy }}
            </t-tag>
            <t-tag v-if="getFormulaDesc(detailData?.description)?.totalQuote != null" theme="danger" variant="light" size="medium">
              报价: ¥{{ getFormulaDesc(detailData?.description)?.totalQuote.toFixed(4) }}
            </t-tag>
          </div>
        </div>

        <div class="detail-footer">
          <t-button theme="primary" @click="handleEditFromDialog">
            <template #icon>
              <t-icon name="edit" />
            </template>
            编辑配方
          </t-button>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFormulaStore } from '@/stores/formula'
import type { Formula } from '@/api/formula'

const router = useRouter()
const formulaStore = useFormulaStore()

const detailVisible = ref(false)
const detailData = ref<Formula | null>(null)

const getFormulaDesc = (description: string | null | undefined) => {
  if (!description || typeof description !== 'string') return null
  try {
    const obj = JSON.parse(description)
    return typeof obj === 'object' && obj !== null ? obj : null
  } catch {
    return null
  }
}

const columns = [
  { colKey: 'name', title: '配方名称', width: 200 },
  { colKey: 'salesmanName', title: '所属业务员', width: 150 },
  { colKey: 'materialCount', title: '原料数量', width: 120 },
  { colKey: 'createdAt', title: '创建时间', width: 180 },
  { colKey: 'updatedAt', title: '更新时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 150, fixed: 'right' }
]

const materialColumns = [
  { colKey: 'materialName', title: '原料名称', width: 200 },
  { colKey: 'quantity', title: '数量', width: 120 }
]

const recentFormulas = computed(() => {
  const allFormulas = [...formulaStore.formulas]
  return allFormulas
    .sort((a, b) => {
      const dateA = new Date(b.updatedAt || b.createdAt).getTime()
      const dateB = new Date(a.updatedAt || a.createdAt).getTime()
      return dateA - dateB
    })
    .slice(0, 10)
})

const handleView = (row: Formula) => {
  detailData.value = row
  detailVisible.value = true
}

const handleEditFromDialog = () => {
  if (detailData.value) {
    router.push(`/formulas/${detailData.value.id}/edit`)
  }
}

const handleEdit = (row: Formula) => {
  router.push(`/formulas/${row.id}/edit`)
}

const goToFormulas = () => {
  router.push('/formulas/new')
}

onMounted(async () => {
  await formulaStore.fetchFormulas()
})
</script>

<style scoped lang="scss">
.recent-formulas {
  .content-card {
    min-height: 400px;
  }

  .title-section {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: #5D4E60;

    .title-icon {
      font-size: 20px;
      color: #FF6B8A;
    }
  }

  :deep(.t-button) {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
    border-radius: 12px !important;
    font-weight: 600 !important;

    &.t-button--theme-primary {
      background: linear-gradient(135deg, #FF8FAB, #FF6B8A) !important;
      border: none !important;
      color: #fff !important;
      box-shadow: 0 4px 16px rgba(255, 107, 138, 0.3) !important;

      :deep(.t-button__text) {
        color: #fff !important;
      }

      :deep(.t-button__icon) {
        color: #fff !important;
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(255, 107, 138, 0.4) !important;
        background: linear-gradient(135deg, #FFB5C8, #FF8FAB) !important;
      }

      &:active {
        transform: translateY(1px) scale(0.98);
      }
    }
  }

  :deep(.btn-view) { display: none; }

  :deep(.btn-edit) {
    color: #2952CC !important;
    border-color: #C5D1F8 !important;
    background: #EDF2FF !important;

    :deep(.t-button__icon) { color: #2952CC !important; }

    &:hover { color: #0052D9 !important; border-color: #0052D9 !important; background: #ECF3FF !important; }
  }

  .expanded-content {
    padding: 16px 24px;
    background-color: #FFF9F7;
    border-radius: 10px;
    border: 1px solid #FFF0F3;

    .materials-section {
      margin-bottom: 16px;

      h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
        color: #5D4E60;

        &::before {
          content: '';
          display: inline-block;
          width: 4px;
          height: 14px;
          background: linear-gradient(135deg, #FF8FAB, #FF6B8A);
          border-radius: 2px;
          margin-right: 8px;
          vertical-align: middle;
        }
      }
    }

    .description-section {
      h4 {
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: 600;
        color: #5D4E60;

        &::before {
          content: '';
          display: inline-block;
          width: 4px;
          height: 14px;
          background: linear-gradient(135deg, #FF8FAB, #FF6B8A);
          border-radius: 2px;
          margin-right: 8px;
          vertical-align: middle;
        }
      }

      p {
        margin: 0;
        font-size: 14px;
        color: #9B8FA0;
        line-height: 1.6;
      }
    }
  }
  .detail-content {
    .detail-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #FFF0F3;

      .detail-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: linear-gradient(135deg, #FF8FAB, #FF6B8A);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 24px;
        flex-shrink: 0;
      }

      .detail-title-group {
        flex: 1;
        min-width: 0;

        .detail-name {
          margin: 0 0 4px 0;
          font-size: 20px;
          font-weight: 700;
          color: #5D4E60;
        }
      }

      .detail-close-btn {
        flex-shrink: 0;
        border-color: #FFD6E0 !important;
        color: #FF6B8A !important;
        width: 36px;
        height: 36px;

        &:hover {
          background: #FFF0F3 !important;
          border-color: #FF6B8A !important;
        }
      }
    }

    .detail-meta {
      display: flex;
      gap: 24px;
      margin-bottom: 20px;
      padding: 12px 16px;
      background: #FFF9F7;
      border-radius: 8px;

      .meta-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: #9B8FA0;

        .t-icon {
          color: #FF8FAB;
        }
      }
    }

    .detail-section {
      margin-bottom: 20px;

      h4 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 12px 0;
        font-size: 15px;
        font-weight: 600;
        color: #5D4E60;

        .section-dot {
          width: 4px;
          height: 16px;
          background: linear-gradient(135deg, #FF8FAB, #FF6B8A);
          border-radius: 2px;
        }

        .section-tag {
          margin-left: auto;
        }
      }
    }

    .materials-list {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .material-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        background: #FAFBFC;
        border-radius: 8px;
        border: 1px solid #F0F0F0;
        transition: all 0.2s;

        &:hover {
          background: #FFF9F7;
          border-color: #FFD6E0;
        }

        .material-index {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #A78BFA, #7C3AED);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .material-name {
          flex: 1;
          font-size: 14px;
          color: #333;
          font-weight: 500;
        }

        .material-quantity {
          font-size: 14px;
          color: #7C3AED;
          font-weight: 600;
        }
      }

      .empty-materials {
        text-align: center;
        padding: 24px;
        color: #9B8FA0;
        font-size: 14px;
      }
    }

    .detail-description {
      margin: 0;
      padding: 14px 16px;
      background: #FFF9F7;
      border-radius: 8px;
      border-left: 3px solid #FFD6E0;
      font-size: 14px;
      color: #5D4E60;
      line-height: 1.7;
    }

    .detail-desc-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .detail-footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #FFF0F3;
      display: flex;
      justify-content: flex-end;

      .t-button {
        border-radius: 12px !important;
        padding: 8px 24px;
      }
    }
  }
}
</style>
