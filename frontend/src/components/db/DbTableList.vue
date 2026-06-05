<script setup lang="ts">
import { ref, computed, inject } from "vue"
import { MessagePlugin } from "tdesign-vue-next"
import type { TableInfo, ColumnInfo, IndexInfo } from "@/api/db"
import { getTableSchema } from "@/api/db"

const props = defineProps<{
  tables: TableInfo[]
}>()

const navigateToTable = inject<(name: string) => void>("navigateToTable", () => {})

const currentPage = ref(1)
const pageSize = ref(10)

const totalCount = computed(() => props.tables.length)
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value) || 1)

const pagedTables = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return props.tables.slice(start, start + pageSize.value)
})

const pageNumbers = computed<(number | string)[]>(() => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 3) return [1, 2, 3, '...', total]
  if (current >= total - 2) return [1, '...', total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
})

const setPage = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}

const drawerVisible = ref(false)
const drawerLoading = ref(false)
const currentTableName = ref("")
const currentColumns = ref<ColumnInfo[]>([])
const currentIndexes = ref<IndexInfo[]>([])

const tableColumns = [
  {
    colKey: "name",
    title: "表名",
    width: 200,
    cell: (_h: unknown, { row }: { row: TableInfo }) => {
      return row.name
    },
  },
  { colKey: "rowCount", title: "行数", width: 120 },
  { colKey: "columnCount", title: "字段数", width: 100 },
  { colKey: "indexCount", title: "索引数", width: 100 },
  {
    colKey: "actions",
    title: "操作",
    width: 120,
  },
]

function handleTableNameClick(tableName: string) {
  navigateToTable(tableName)
}

async function handleViewSchema(tableName: string) {
  currentTableName.value = tableName
  drawerVisible.value = true
  drawerLoading.value = true
  try {
    const schema = await getTableSchema(tableName)
    currentColumns.value = schema.columns
    currentIndexes.value = schema.indexes
  } catch {
    MessagePlugin.error("获取表结构失败")
  } finally {
    drawerLoading.value = false
  }
}

function formatRowCount(count: number): string {
  return count.toLocaleString()
}

const schemaColumns = [
  { colKey: "name", title: "字段名", width: 160 },
  { colKey: "type", title: "类型", width: 120 },
  {
    colKey: "pk",
    title: "主键",
    width: 80,
    cell: (_h: unknown, { row }: { row: ColumnInfo }) => {
      return row.pk === 1 ? "✓" : ""
    },
  },
  {
    colKey: "notnull",
    title: "非空",
    width: 80,
    cell: (_h: unknown, { row }: { row: ColumnInfo }) => {
      return row.notnull === 1 ? "✓" : ""
    },
  },
  {
    colKey: "dfltValue",
    title: "默认值",
    width: 160,
    cell: (_h: unknown, { row }: { row: ColumnInfo }) => {
      if (row.dfltValue === null || row.dfltValue === undefined) return "--"
      return String(row.dfltValue)
    },
  },
]

const indexColumns = [
  { colKey: "name", title: "索引名", width: 180 },
  {
    colKey: "unique",
    title: "唯一",
    width: 80,
    cell: (_h: unknown, { row }: { row: IndexInfo }) => {
      return row.unique ? "✓" : ""
    },
  },
  {
    colKey: "columns",
    title: "字段",
    cell: (_h: unknown, { row }: { row: IndexInfo }) => {
      return row.columns.join(", ") || "--"
    },
  },
]
</script>

<template>
  <div class="db-table-list">
    <div class="section-header">
      <h3 class="section-title">
        <span class="section-icon">📋</span>
        数据表列表
      </h3>
      <t-tag variant="light" size="small">
        {{ totalCount }} 张表
      </t-tag>
    </div>

    <t-table
      :data="pagedTables"
      :columns="tableColumns"
      row-key="name"
      table-layout="auto"
      hover
      stripe
      class="table-list-table"
    >
      <template #name="{ row }">
        <span class="table-name-link" @click="handleTableNameClick(row.name)">
          {{ row.name }}
        </span>
      </template>
      <template #rowCount="{ row }">
        {{ formatRowCount(row.rowCount) }}
      </template>
      <template #actions="{ row }">
        <t-button
          variant="text"
          size="small"
          theme="primary"
          @click="handleViewSchema(row.name)"
        >
          查看结构
        </t-button>
      </template>
    </t-table>

    <div v-if="totalCount > 0" class="table-pagination">
      <div class="pagination-info">
        显示第 {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, totalCount) }} 条，共 {{ totalCount }} 条数据
      </div>
      <div class="pagination-controls">
        <button class="pagination-btn" :class="{ 'pagination-btn--disabled': currentPage === 1 }"
          :disabled="currentPage === 1" @click="setPage(currentPage - 1)">上一页</button>
        <template v-for="page in pageNumbers" :key="page">
          <button v-if="page !== '...'" class="pagination-btn"
            :class="{ 'pagination-btn--active': page === currentPage }"
            @click="typeof page === 'number' && setPage(page)">{{ page }}</button>
          <span v-else class="pagination-ellipsis">...</span>
        </template>
        <button class="pagination-btn" :class="{ 'pagination-btn--disabled': currentPage === totalPages }"
          :disabled="currentPage === totalPages" @click="setPage(currentPage + 1)">下一页</button>
      </div>
    </div>

    <t-drawer
      v-model:visible="drawerVisible"
      :header="`表结构 - ${currentTableName}`"
      size="640"
      placement="right"
      :close-btn="true"
      class="schema-drawer"
    >
      <t-loading :loading="drawerLoading">
        <div class="schema-section">
          <h4 class="schema-section-title">字段列表</h4>
          <t-table
            :data="currentColumns"
            :columns="schemaColumns"
            row-key="cid"
            table-layout="auto"
            size="small"
            :max-height="320"
            hover
            stripe
          />
        </div>

        <div v-if="currentIndexes.length > 0" class="schema-section">
          <h4 class="schema-section-title">索引列表</h4>
          <t-table
            :data="currentIndexes"
            :columns="indexColumns"
            row-key="name"
            table-layout="auto"
            size="small"
            :max-height="240"
            hover
            stripe
          />
        </div>

        <t-empty
          v-if="!drawerLoading && currentColumns.length === 0"
          description="未获取到表结构数据"
        />
      </t-loading>
    </t-drawer>
  </div>
</template>

<style lang="scss" scoped>
.db-table-list {
  background: $overlay-white-80;
  backdrop-filter: blur(10px);
  border-radius: $radius-3xl;
  border: 2px solid var(--overlay-brand-lighter-15);
  box-shadow: $shadow-xs;
  padding: 20px;
}

// ─── 暗色模式适配 ───
[data-theme="dark"] {
  .db-table-list {
    background: var(--color-bg-container);
    border-color: var(--color-border);
    box-shadow: none;
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  .section-title {
    font-size: $font-size-body;
    font-weight: $font-weight-semibold;
    color: var(--color-text-primary);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;

    .section-icon {
      font-size: 16px;
    }
  }
}

.table-name-link {
  color: var(--color-primary);
  cursor: pointer;
  font-weight: $font-weight-medium;
  transition: all $transition-fast;

  &:hover {
    text-decoration: underline;
    color: var(--color-primary-dark);
  }
}

.table-list-table {
  :deep(.t-table) {
    border-radius: $radius-lg;
  }

  :deep(.t-table__header th) {
    background: var(--color-bg-container-alt);
    color: var(--color-text-secondary);
    font-weight: $font-weight-medium;
    font-size: $font-size-caption;
  }

  :deep(.t-table__body td) {
    font-size: $font-size-body-sm;
    color: var(--color-text-primary);
  }

  :deep(.t-table__row--hover td) {
    background: var(--color-bg-hover);
  }
}

.table-pagination {
  padding: 12px 16px 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-bg-container);
  border-top: 1px solid var(--color-bg-page);

  .pagination-info {
    font-size: 14px;
    color: var(--color-text-placeholder);
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
    padding: var(--space-1-5) 12px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md, 8px);
    background-color: transparent;
    color: var(--color-text-regular, #6e6178);
    font-size: 14px;
    cursor: pointer;
    transition: all var(--transition-fast, 0.15s);
    white-space: nowrap;
    user-select: none;

    &:hover:not(.pagination-btn--disabled):not(.pagination-btn--active) {
      background-color: var(--color-primary-bg, var(--color-primary-bg));
      border-color: var(--color-primary-lighter, var(--color-primary-lighter));
      color: var(--color-primary-dark, var(--color-primary-dark));
    }

    &.pagination-btn--disabled {
      opacity: 0.5;
      cursor: not-allowed !important;
      color: var(--color-text-placeholder, #d4c5d0);
      background-color: transparent;
      border-color: var(--color-border);
      pointer-events: none;
    }

    &.pagination-btn--active {
      background-color: var(--color-primary, var(--color-primary));
      color: var(--color-text-white);
      border-color: var(--color-primary, var(--color-primary));
      font-weight: 600;
      box-shadow: 0 1px 3px var(--overlay-brand-25, rgba(255, 107, 138, 0.25));
      pointer-events: none;
    }
  }

  .pagination-ellipsis {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 34px;
    color: var(--color-text-placeholder);
    font-size: 14px;
    user-select: none;
  }
}

.schema-section {
  margin-bottom: 24px;

  .schema-section-title {
    font-size: $font-size-body;
    font-weight: $font-weight-semibold;
    color: var(--color-text-primary);
    margin: 0 0 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--color-border-light);
  }
}

.schema-drawer {
  :deep(.t-drawer__body) {
    padding: 24px;
  }
}
</style>
