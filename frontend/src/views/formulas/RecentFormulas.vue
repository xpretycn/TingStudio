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
        :data="sortedFormulas"
        :columns="columns"
        :loading="formulaStore.loading"
        row-key="id"
        hover
        table-layout="auto"
        :sort="tableSort"
        @sort-change="onSortChange"
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
            <template #icon>
              <t-icon name="user" />
            </template>
            {{ row.salesmanName }}
          </t-tag>
        </template>

        <template #formulaStatus="{ row }">
          <t-tag
            :theme="getFormulaStatus(row).theme"
            :variant="getFormulaStatus(row).variant"
            size="medium"
          >
            <template #icon>
              <t-icon :name="getFormulaStatus(row).icon" />
            </template>
            {{ getFormulaStatus(row).label }}
          </t-tag>
        </template>

        <template #materialCount="{ row }">
          <t-tag theme="success" variant="light">
            <template #icon>
              <t-icon name="layers" />
            </template>
            {{ (row.materials || []).length }} 种原料
          </t-tag>
        </template>

        <template #empty>
          <t-empty description="暂无最近配方数据" role="status">
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
  { colKey: 'name', title: '配方名称', width: 200, sorter: (a: any, b: any) => a.name.localeCompare(b.name, 'zh') },
  { colKey: 'salesmanName', title: '所属业务员', width: 150, sorter: (a: any, b: any) => (a.salesmanName || '').localeCompare(b.salesmanName || '', 'zh') },
  { colKey: 'formulaStatus', title: '状态', width: 100 },
  { colKey: 'materialCount', title: '原料数量', width: 120, sorter: (a: any, b: any) => (a.materials?.length || 0) - (b.materials?.length || 0) },
  { colKey: 'createdAt', title: '创建时间', width: 180, sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() },
  { colKey: 'operation', title: '操作', width: 150, align: 'center' }
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

const tableSort = ref<any>(undefined)
const sortedFormulas = ref<Formula[]>([])

const onSortChange = (sort: any) => {
  tableSort.value = sort
  if (!sort || !sort.sortBy) {
    sortedFormulas.value = [...recentFormulas.value]
    return
  }
  const { sortBy, descending } = sort
  const col = columns.find(c => c.colKey === sortBy)
  if (col?.sorter) {
    sortedFormulas.value = [...recentFormulas.value].sort((a, b) => {
      const result = (col.sorter as Function)(a, b)
      return descending ? -result : result
    })
  } else {
    sortedFormulas.value = [...recentFormulas.value]
  }
}

watch(recentFormulas, (val) => {
  if (tableSort.value?.sortBy) {
    onSortChange(tableSort.value)
  } else {
    sortedFormulas.value = [...val]
  }
}, { immediate: true })

const getFormulaStatus = (row: any) => {
  const currentVersion = (row.versions || []).find((v: any) => v.isCurrent)
  if (currentVersion && currentVersion.status === 'published') {
    return { label: '已发布', theme: 'success', variant: 'light' as const, icon: 'check-circle' }
  }
  if (currentVersion && currentVersion.status === 'draft') {
    return { label: '草稿', theme: 'warning', variant: 'light' as const, icon: 'edit' }
  }
  if (!row.versions || row.versions.length === 0) {
    return { label: '未发布', theme: 'default', variant: 'light' as const, icon: 'time' }
  }
  return { label: '已归档', theme: 'default', variant: 'light' as const, icon: 'folder' }
}

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
    box-shadow: $shadow-xs;
    transition: box-shadow $transition-normal;

    &:hover {
      box-shadow: $shadow-md;
    }

    // 表格行 stagger 入场动画
    :deep(.t-table__body .t-table__row) {
      animation: rowFadeIn 0.3s ease both;
      @include stagger-rows(20, 0.03s);
    }
  }

  .title-section {
    display: flex;
    align-items: center;
    gap: $space-2;
    font-size: $font-size-h3;
    font-weight: $font-weight-semibold;
    color: $text-primary;

    .title-icon {
      font-size: $font-size-h3;
      color: $brand-primary;
    }
  }

  .expanded-content {
    padding: $space-4 $space-6;
    background-color: $bg-page;
    border-radius: $radius-lg;
    border: 1px solid $border-color-light;
    animation: expandRowFadeIn 0.3s ease both;

    .version-section {
      margin-bottom: $space-4;

      h4 {
        margin: 0 0 $space-3 0;
        font-size: 15px;
        font-weight: $font-weight-semibold;
        color: $text-primary;
        display: flex;
        align-items: center;
        gap: $space-2;

        &::before {
          content: '';
          display: inline-block;
          width: $space-1;
          height: $font-size-h3;
          background: $gradient-btn;
          border-radius: $radius-xs;
        }
      }
    }

    .version-list {
      display: flex;
      flex-direction: column;
      gap: $space-2;
    }

    .version-item {
      display: flex;
      align-items: center;
      gap: $space-4;
      padding: 10px $space-4;
      background: $bg-container;
      border-radius: $radius-md;
      border: 1px solid $border-color;
      transition: $transition-fast;

      &:hover {
        border-color: $brand-primary-lightest;
        background: $bg-container-alt;
      }

      &.is-current {
        border-color: $color-success-strong;
        background: $color-success-light;
      }
    }

    .version-left {
      display: flex;
      align-items: center;
      gap: $space-2;
      flex-shrink: 0;
      min-width: 160px;
    }

    .version-number {
      font-size: $font-size-body;
      font-weight: $font-weight-semibold;
      color: $text-primary;
    }

    .current-tag {
      font-size: $font-size-micro;
    }

    .version-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .version-name {
      font-size: $font-size-body;
      color: $text-primary;
      font-weight: $font-weight-medium;
    }

    .version-reason {
      font-size: $font-size-caption;
      color: $brand-primary;
      background: $brand-primary-bg;
      padding: 1px $space-2;
      border-radius: $radius-xs;
    }

    .version-time {
      font-size: $font-size-caption;
      color: $text-secondary;
    }

    .version-changes {
      flex-shrink: 0;

      .changes-detail {
        margin-top: $space-2;
        padding: $space-2 $space-3;
        background: $bg-container-alt;
        border-radius: $radius-sm;
        border: 1px solid $border-color;
      }

      .changes-list {
        display: flex;
        flex-direction: column;
        gap: $space-1_5;
      }

      .change-row {
        display: flex;
        align-items: center;
        gap: $space-2;
        font-size: $font-size-body-sm;
        padding: $space-1 0;
      }

      .change-type-tag {
        flex-shrink: 0;
      }

      .change-label {
        color: $text-primary;
        font-weight: $font-weight-medium;
        flex-shrink: 0;
      }

      .change-values {
        display: flex;
        align-items: center;
        gap: $space-1_5;
      }

      .change-old {
        color: $color-danger;
        text-decoration: line-through;
        background: $color-danger-light;
        padding: 1px $space-2;
        border-radius: $radius-xs;
      }

      .change-arrow {
        color: $text-secondary;
        font-weight: $font-weight-semibold;
      }

      .change-new {
        color: $color-success;
        background: $color-success-medium;
        padding: 1px $space-2;
        border-radius: $radius-xs;
        font-weight: $font-weight-semibold;
      }
    }

    .empty-versions {
      text-align: center;
      padding: $space-6;
      color: $text-secondary;
      font-size: $font-size-body;
    }

    .description-section {
      margin-bottom: $space-4;

      h4 {
        margin: 0 0 $space-3 0;
        font-size: 15px;
        font-weight: $font-weight-semibold;
        color: $text-primary;
        display: flex;
        align-items: center;
        gap: $space-1_5;

        &::before {
          content: '';
          display: inline-block;
          width: $space-1;
          height: $font-size-h3;
          background: $gradient-btn;
          border-radius: $radius-xs;
        }
      }

      .desc-tags {
        display: flex;
        flex-wrap: wrap;
        gap: $space-2;
      }

      p {
        margin: 0;
        font-size: $font-size-body;
        color: $text-secondary;
        line-height: $line-height-normal;
        padding: $space-3;
        background: $bg-container;
        border-radius: $radius-md;
        border-left: 3px solid $brand-primary-lightest;
      }
    }
  }

  :deep(.t-table) {
    .t-table__expanded-row > td {
      border-bottom: none !important;
    }

    .t-table__expanded-row .t-table__row--expanded {
      animation: expandRowFadeIn 0.35s ease both;
    }
  }
}

@keyframes expandRowFadeIn {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
