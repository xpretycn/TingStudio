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
            <div class="materials-section">
              <h4>原料清单</h4>
              <t-table
                :data="row.materials"
                :columns="materialColumns"
                size="small"
                bordered
              />
            </div>
            <div v-if="row.description" class="description-section">
              <h4>配方描述</h4>
              <p>{{ row.description }}</p>
            </div>
          </div>
        </template>

        <template #customerName="{ row }">
          <t-tag theme="primary" variant="light">
            {{ row.customerName }}
          </t-tag>
        </template>

        <template #materialCount="{ row }">
          <t-tag theme="success" variant="light">
            {{ row.materials.length }} 种原料
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
          <t-space>
            <t-link theme="primary" @click="handleView(row)">查看</t-link>
            <t-link theme="default" @click="handleEdit(row)">编辑</t-link>
          </t-space>
        </template>
      </t-table>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFormulaStore } from '@/stores/formula'
import type { Formula } from '@/types/formula'

const router = useRouter()
const formulaStore = useFormulaStore()

const columns = [
  { colKey: 'name', title: '配方名称', width: 200 },
  { colKey: 'customerName', title: '所属客户', width: 150 },
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
  router.push(`/formulas/${row.id}/edit`)
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
