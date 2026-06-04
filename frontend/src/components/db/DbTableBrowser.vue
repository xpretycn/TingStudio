<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue"
import { MessagePlugin } from "tdesign-vue-next"
import { getTableList, getTableData } from "@/api/db"
import type { ColumnMeta, TableInfo } from "@/api/db"
import { formatTimestamp } from "@/utils/timeFormat"

const props = defineProps<{
  initialTable?: string
}>()

const selectedTable = ref<string>("")

const selectedTableName = ref<string>("")
const tableColumns = ref<ColumnMeta[]>([])
const tableRows = ref<Record<string, unknown>[]>([])
const pagination = ref({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
const search = ref<string>("")
const sortColumn = ref<string>("")
const loading = ref(false)
const jsonDialogContent = ref<string>("")
const jsonDialogVisible = ref(false)
const tableOptions = ref<Array<{ label: string; value: string }>>([])

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const sortColumnOptions = computed(() =>
  tableColumns.value.map((col) => ({ label: col.name, value: col.name }))
)

const dynamicColumns = computed(() =>
  tableColumns.value.map((col) => ({
    colKey: col.name,
    title: col.name,
    width: undefined,
    ellipsis: true,
    cell: (_h: unknown, { row }: { row: Record<string, unknown> }) => {
      const value = row[col.name]
      return formatCellValue(value, col)
    },
  }))
)

const DATETIME_KEYWORDS = ["date", "time", "datetime", "timestamp", "created_at", "updated_at"]

function isDatetimeColumn(col: ColumnMeta): boolean {
  const nameLower = col.name.toLowerCase()
  const typeLower = col.type.toLowerCase()
  return DATETIME_KEYWORDS.some(
    (kw) => nameLower.includes(kw) || typeLower.includes(kw)
  )
}

function isJsonValue(value: unknown): boolean {
  if (typeof value !== "string") return false
  const trimmed = value.trim()
  return (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
}

function formatCellValue(value: unknown, column: ColumnMeta): string {
  if (value === null || value === undefined || value === "") {
    return "--"
  }

  if (isDatetimeColumn(column) && typeof value === "string") {
    return formatTimestamp(value)
  }

  if (isJsonValue(value)) {
    return "[JSON]"
  }

  if (typeof value === "string" && value.length > 50) {
    return value.substring(0, 50) + "..."
  }

  return String(value)
}

function getCellDisplay(row: Record<string, unknown>, col: ColumnMeta): unknown {
  const value = row[col.name]
  if (value === null || value === undefined || value === "") return "--"
  if (isDatetimeColumn(col) && typeof value === "string") return formatTimestamp(value)
  return value
}

function isCellJson(row: Record<string, unknown>, col: ColumnMeta): boolean {
  const value = row[col.name]
  return isJsonValue(value)
}

function getCellTooltip(row: Record<string, unknown>, col: ColumnMeta): string {
  const value = row[col.name]
  if (value === null || value === undefined || value === "") return ""
  if (isJsonValue(value)) {
    try {
      return JSON.stringify(JSON.parse(value as string), null, 2)
    } catch {
      return String(value)
    }
  }
  if (typeof value === "string" && value.length > 50) return value
  return ""
}

async function loadTableList() {
  try {
    const data = await getTableList()
    tableOptions.value = (data as TableInfo[]).map((t) => ({
      label: `${t.name} (${t.rowCount})`,
      value: t.name,
    }))
  } catch {
    // interceptor handles error
  }
}

async function loadTableData() {
  if (!selectedTableName.value) return

  loading.value = true
  try {
    const data = await getTableData(selectedTableName.value, {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      search: search.value || undefined,
      sort: sortColumn.value || undefined,
    })

    tableColumns.value = (data.columns as ColumnMeta[]).map((col) => ({
      ...col,
      isJson: false,
    }))
    tableRows.value = data.rows as Record<string, unknown>[]
    pagination.value = {
      page: data.pagination.page,
      pageSize: data.pagination.pageSize,
      total: data.pagination.total,
      totalPages: data.pagination.totalPages,
    }
  } catch {
    // interceptor handles error
  } finally {
    loading.value = false
  }
}

function handleTableChange(value: string) {
  selectedTableName.value = value
  selectedTable.value = value
  pagination.value.page = 1
  search.value = ""
  sortColumn.value = ""
  loadTableData()
}

function handleSearch() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    pagination.value.page = 1
    loadTableData()
  }, 300)
}

function handleSortColumnChange() {
  pagination.value.page = 1
  loadTableData()
}

function handlePageChange({ current, pageSize }: { current: number; pageSize: number }) {
  pagination.value.page = current
  pagination.value.pageSize = pageSize
  loadTableData()
}

function openJsonViewer(value: unknown) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value
    jsonDialogContent.value = JSON.stringify(parsed, null, 2)
  } catch {
    jsonDialogContent.value = String(value)
  }
  jsonDialogVisible.value = true
}

function handleJsonClick(row: Record<string, unknown>, col: ColumnMeta) {
  const value = row[col.name]
  if (isJsonValue(value)) {
    openJsonViewer(value)
  }
}

async function copyJson() {
  try {
    await navigator.clipboard.writeText(jsonDialogContent.value)
    MessagePlugin.success("已复制到剪贴板")
  } catch {
    MessagePlugin.error("复制失败")
  }
}

watch(
  () => props.initialTable,
  (val) => {
    if (val && val !== selectedTableName.value) {
      selectedTableName.value = val
      selectedTable.value = val
      loadTableData()
    }
  }
)

watch(selectedTable, (val) => {
  if (val && val !== selectedTableName.value) {
    selectedTableName.value = val
    pagination.value.page = 1
    loadTableData()
  }
})

onMounted(() => {
  loadTableList()
  if (props.initialTable) {
    selectedTableName.value = props.initialTable
    selectedTable.value = props.initialTable
    loadTableData()
  }
})
</script>

<template>
  <div class="db-table-browser">
    <div class="browser-toolbar">
      <t-select
        v-model="selectedTableName"
        placeholder="选择数据表"
        :options="tableOptions"
        filterable
        clearable
        class="toolbar-select table-select"
        @change="handleTableChange"
      />

      <t-input
        v-model="search"
        placeholder="搜索关键词..."
        clearable
        class="toolbar-input"
        @input="handleSearch"
        @clear="handleSearch"
      >
        <template #prefix-icon>
          <t-icon name="search" />
        </template>
      </t-input>

      <t-select
        v-model="sortColumn"
        placeholder="排序字段"
        :options="sortColumnOptions"
        clearable
        class="toolbar-select sort-select"
        @change="handleSortColumnChange"
      />

    </div>

    <div class="browser-table-area">
      <t-loading :loading="loading">
        <t-table
          v-if="tableColumns.length > 0"
          :data="tableRows"
          :columns="dynamicColumns"
          table-layout="auto"
          row-key="id"
          :max-height="600"
          bordered
          size="small"
          class="data-table"
        >
          <template #cell="{ col, row }">
            <template v-if="isCellJson(row as Record<string, unknown>, col as ColumnMeta)">
              <t-tag
                theme="primary"
                variant="light"
                size="small"
                class="json-tag"
                @click="handleJsonClick(row as Record<string, unknown>, col as ColumnMeta)"
              >
                [JSON]
              </t-tag>
            </template>
            <template v-else>
              <t-tooltip
                v-if="getCellTooltip(row as Record<string, unknown>, col as ColumnMeta)"
                :content="getCellTooltip(row as Record<string, unknown>, col as ColumnMeta)"
              >
                <span class="cell-text">
                  {{ getCellDisplay(row as Record<string, unknown>, col as ColumnMeta) }}
                </span>
              </t-tooltip>
              <span v-else class="cell-text">
                {{ getCellDisplay(row as Record<string, unknown>, col as ColumnMeta) }}
              </span>
            </template>
          </template>
        </t-table>

        <div v-else-if="!loading" class="empty-hint">
          <t-icon name="server" size="48px" />
          <p>请选择一个数据表开始浏览</p>
        </div>
      </t-loading>
    </div>

    <div v-if="pagination.total > 0" class="browser-pagination">
      <t-pagination
        :current="pagination.page"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        :page-size-options="[10, 20, 50, 100]"
        show-jumper
        @change="handlePageChange"
      />
    </div>

    <t-dialog
      v-model:visible="jsonDialogVisible"
      header="JSON 查看器"
      :width="680"
      :footer="false"
      class="json-dialog"
    >
      <div class="json-viewer">
        <div class="json-toolbar">
          <t-button size="small" theme="primary" variant="outline" @click="copyJson">
            <template #icon><t-icon name="file-copy" /></template>
            复制
          </t-button>
        </div>
        <pre class="json-content"><code v-html="highlightJson(jsonDialogContent)"></code></pre>
      </div>
    </t-dialog>
  </div>
</template>

<script lang="ts">
function highlightJson(jsonStr: string): string {
  return jsonStr
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"([^"]+)"(\s*:)/g, '<span class="json-key">"$1"</span>$2')
    .replace(/:\s*"([^"]*)"/g, ': <span class="json-string">"$1"</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
    .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>')
}
</script>

<style lang="scss" scoped>
.db-table-browser {
  display: flex;
  flex-direction: column;
  gap: $space-4;
  padding: $space-4 0;
}

.browser-toolbar {
  display: flex;
  flex-wrap: nowrap;
  gap: $space-2;
  align-items: center;
  padding: $space-2 0;

  .toolbar-select {
    min-width: 100px;
  }

  .table-select {
    min-width: 200px;
  }

  .toolbar-input {
    min-width: 140px;
    flex: 1;
    max-width: 280px;
  }

  .sort-select {
    min-width: 130px;
  }
}

.browser-table-area {
  background: var(--color-bg-container);
  border-radius: $radius-2xl;
  border: 1.5px solid var(--color-border-light);
  box-shadow: $shadow-xs;
  overflow: hidden;

  .data-table {
    :deep(.t-table) {
      border-radius: $radius-2xl;
    }

    :deep(.t-table__header th) {
      background: var(--color-bg-container-alt);
      font-weight: $font-weight-semibold;
      color: var(--color-text-secondary);
      font-size: $font-size-caption;
    }

    :deep(.t-table__body td) {
      font-size: $font-size-body-sm;
      color: var(--color-text-primary);
    }

    :deep(.t-table__row:hover td) {
      background: var(--color-bg-hover);
    }
  }

  .cell-text {
    display: inline-block;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: bottom;
  }

  .json-tag {
    cursor: pointer;
    font-family: $font-family;
    font-size: $font-size-caption;
    transition: all $transition-fast;

    &:hover {
      transform: scale(1.05);
      box-shadow: $shadow-brand-xs;
    }
  }
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $space-16 0;
  color: var(--color-text-placeholder);
  gap: $space-4;

  p {
    font-size: $font-size-body;
    margin: 0;
  }
}

.browser-pagination {
  display: flex;
  justify-content: flex-end;
  padding: $space-2 $space-4;
}

.json-viewer {
  .json-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: $space-3;
  }

  .json-content {
    background: #1e1e2e;
    border-radius: $radius-lg;
    padding: $space-4;
    max-height: 480px;
    overflow: auto;
    margin: 0;
    font-family: "Fira Code", "Consolas", "Monaco", monospace;
    font-size: $font-size-body-sm;
    line-height: $line-height-relaxed;
    color: #cdd6f4;

    code {
      font-family: inherit;
    }

    :deep(.json-key) {
      color: #89b4fa;
    }

    :deep(.json-string) {
      color: #a6e3a1;
    }

    :deep(.json-number) {
      color: #fab387;
    }

    :deep(.json-boolean) {
      color: #cba6f7;
    }

    :deep(.json-null) {
      color: #f38ba8;
      font-style: italic;
    }
  }
}

@media screen and (max-width: 768px) {
  .browser-toolbar {
    flex-direction: column;
    align-items: stretch;

    .toolbar-select,
    .toolbar-input {
      max-width: none;
      min-width: 0;
      width: 100%;
    }
  }
}
</style>
