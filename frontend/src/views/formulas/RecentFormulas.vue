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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFormulaStore } from '@/stores/formula'
import type { Formula } from '@/api/formula'

const router = useRouter()
const formulaStore = useFormulaStore()

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
  router.push(`/formulas/${row.id}`)
}

const handleEdit = (row: Formula) => {
  router.push(`/formulas/${row.id}/edit`)
}

const goToFormulas = () => {
  router.push('/formulas/new')
}

onMounted(async () => {
  window.addEventListener('global-search', handleGlobalSearch)
  await formulaStore.fetchFormulas()
})

const handleGlobalSearch = (e: Event) => {
  const keyword = (e as CustomEvent).detail || ''
  formulaStore.setKeyword(keyword)
  formulaStore.fetchFormulas()
}

onUnmounted(() => {
  window.removeEventListener('global-search', handleGlobalSearch)
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
}
</style>
