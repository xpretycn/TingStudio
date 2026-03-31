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
        :expanded-row-keys="expandedRowKeys"
        @expand-change="onExpandChange"
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
            <div class="version-section">
              <h4>版本记录 <t-tag size="small" variant="light" theme="primary">{{ row.versions?.length || 0 }} 个版本</t-tag></h4>
              <div v-if="row.versions && row.versions.length" class="version-list">
                <div
                  v-for="ver in row.versions"
                  :key="ver.versionId"
                  class="version-item"
                  :class="{ 'is-current': ver.isCurrent }"
                >
                  <div class="version-left">
                    <span class="version-number">{{ ver.versionNumber }}</span>
                    <t-tag
                      v-if="ver.isCurrent"
                      size="small"
                      theme="success"
                      variant="dark"
                      class="current-tag"
                    >当前</t-tag>
                    <t-tag
                      v-else
                      :theme="ver.status === 'published' ? 'primary' : ver.status === 'draft' ? 'warning' : 'default'"
                      size="small"
                      variant="light"
                    >{{ ver.status === 'published' ? '已发布' : ver.status === 'draft' ? '草稿' : '已归档' }}</t-tag>
                  </div>
                  <div class="version-center">
                    <span class="version-name">{{ ver.versionName }}</span>
                    <span v-if="ver.versionReason" class="version-reason">原因: {{ ver.versionReason }}</span>
                    <span class="version-time">{{ ver.createdAt }}</span>
                  </div>
                  <div v-if="ver.changesJson && parseChanges(ver.changesJson).length" class="version-changes">
                    <div class="changes-detail">
                      <div class="changes-list">
                        <div
                          v-for="(change, ci) in parseChanges(ver.changesJson)"
                          :key="ci"
                          class="change-row"
                        >
                          <t-tag
                            size="small"
                            :theme="change.changeType === 'add' ? 'success' : change.changeType === 'delete' ? 'danger' : 'warning'"
                            variant="light"
                            class="change-type-tag"
                          >{{ change.changeType === 'add' ? '新增' : change.changeType === 'delete' ? '删除' : '修改' }}</t-tag>
                          <span class="change-label">{{ change.fieldLabel }}</span>
                          <span class="change-values">
                            <span v-if="change.oldValue !== null" class="change-old">{{ change.oldValue }}</span>
                            <span v-if="change.oldValue !== null && change.newValue !== null" class="change-arrow">→</span>
                            <span v-if="change.newValue !== null" class="change-new">{{ change.newValue }}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="empty-versions">暂无版本记录</div>
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
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue'

const router = useRouter()
const formulaStore = useFormulaStore()

const initialized = ref(false)

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
  { colKey: 'operation', title: '操作', width: 150 }
]

const expandedRowKeys = ref<(string | number)[]>([])

const onExpandChange = (keys: Array<string | number>) => {
  expandedRowKeys.value = keys
}

const parseChanges = (changesJson: string): any[] => {
  try {
    const arr = JSON.parse(changesJson)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

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
  initialized.value = true
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

    .version-section {
      margin-bottom: 16px;

      h4 {
        margin: 0 0 12px 0;
        font-size: 15px;
        font-weight: 600;
        color: #5D4E60;
        display: flex;
        align-items: center;
        gap: 8px;

        &::before {
          content: '';
          display: inline-block;
          width: 4px;
          height: 16px;
          background: linear-gradient(135deg, #FF8FAB, #FF6B8A);
          border-radius: 2px;
        }
      }
    }

    .version-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .version-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 16px;
      background: white;
      border-radius: 8px;
      border: 1px solid #F0F0F0;
      transition: all 0.2s;

      &:hover {
        border-color: #FFD6E0;
        background: #FFFDFC;
      }

      &.is-current {
        border-color: #D9F7BE;
        background: #F6FFED;
      }
    }

    .version-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      min-width: 160px;
    }

    .version-number {
      font-size: 14px;
      font-weight: 600;
      color: #5D4E60;
    }

    .current-tag {
      font-size: 11px;
    }

    .version-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .version-name {
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }

    .version-reason {
      font-size: 12px;
      color: #FF6B8A;
      background: #FFF0F3;
      padding: 1px 8px;
      border-radius: 4px;
    }

    .version-time {
      font-size: 12px;
      color: #9B8FA0;
    }

    .version-changes {
      flex-shrink: 0;

      .changes-detail {
        margin-top: 8px;
        padding: 10px 14px;
        background: #FAFAFA;
        border-radius: 6px;
        border: 1px solid #F0F0F0;
      }

      .changes-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .change-row {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        padding: 4px 0;
      }

      .change-type-tag {
        flex-shrink: 0;
      }

      .change-label {
        color: #5D4E60;
        font-weight: 500;
        flex-shrink: 0;
      }

      .change-values {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .change-old {
        color: #E34D59;
        text-decoration: line-through;
        background: #FEF0EF;
        padding: 1px 8px;
        border-radius: 4px;
      }

      .change-arrow {
        color: #9B8FA0;
        font-weight: 600;
      }

      .change-new {
        color: #2BA471;
        background: #E8F8F2;
        padding: 1px 8px;
        border-radius: 4px;
        font-weight: 600;
      }
    }

    .empty-versions {
      text-align: center;
      padding: 24px;
      color: #9B8FA0;
      font-size: 14px;
    }

    .description-section {
      margin-bottom: 16px;

      h4 {
        margin: 0 0 12px 0;
        font-size: 15px;
        font-weight: 600;
        color: #5D4E60;
        display: flex;
        align-items: center;
        gap: 6px;

        &::before {
          content: '';
          display: inline-block;
          width: 4px;
          height: 16px;
          background: linear-gradient(135deg, #FF8FAB, #FF6B8A);
          border-radius: 2px;
        }
      }

      .desc-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      p {
        margin: 0;
        font-size: 14px;
        color: #9B8FA0;
        line-height: 1.6;
        padding: 12px;
        background: white;
        border-radius: 8px;
        border-left: 3px solid #FFD6E0;
      }
    }
  }
}
</style>
