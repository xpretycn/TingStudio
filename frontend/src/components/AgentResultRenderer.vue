<template>
  <div class="agent-result-renderer">
    <template v-if="displayType === 'nl2sql'">
      <div class="nl2sql-result">
        <div class="sql-card">
          <div class="sql-header">
            <div class="sql-header-left">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <span class="sql-label">生成的 SQL</span>
            </div>
            <div class="sql-header-right">
              <t-tag v-if="nl2sqlData.queryType" theme="primary" variant="light" size="small">
                {{ queryTypeLabel }}
              </t-tag>
              <t-tag theme="success" variant="light" size="small">
                {{ nl2sqlData.rowCount ?? 0 }} 条结果
              </t-tag>
              <button class="sql-copy-btn" @click="copySQL" title="复制SQL">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </button>
            </div>
          </div>
          <pre class="sql-code">{{ nl2sqlData.sql }}</pre>
        </div>

        <div v-if="nl2sqlTableData.length" class="nl2sql-table-wrapper">
          <t-table
            :data="nl2sqlTableData"
            :columns="nl2sqlColumns"
            :max-height="400"
            size="small"
            stripe
            bordered
            table-layout="auto"
          />
          <div class="nl2sql-table-footer">
            <span class="result-count">共 {{ nl2sqlData.rowCount ?? nl2sqlTableData.length }} 条记录</span>
            <button class="export-btn" @click="exportCSV" title="导出CSV">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>导出 CSV</span>
            </button>
          </div>
        </div>

        <div v-else class="nl2sql-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-placeholder)" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>未查询到匹配的数据</span>
        </div>
      </div>
    </template>

    <template v-else-if="displayType === 'table'">
      <div class="result-table-wrapper">
        <t-table
          :data="tableData"
          :columns="tableColumns"
          :max-height="300"
          size="small"
          stripe
          bordered
        />
        <div v-if="tableData.length > 0" class="result-meta">
          共 {{ tableData.length }} 条记录
        </div>
      </div>
    </template>

    <template v-else-if="displayType === 'card'">
      <div class="result-cards">
        <div v-for="(item, index) in cardItems" :key="index" class="result-card">
          <div class="card-label">{{ item.label }}</div>
          <div class="card-value">{{ item.value }}</div>
        </div>
      </div>
    </template>

    <template v-else-if="displayType === 'toast'">
      <div class="result-toast" :class="{ success: isSuccess, error: !isSuccess }">
        <t-icon :name="isSuccess ? 'check-circle' : 'close-circle'" size="20px" />
        <span>{{ isSuccess ? '操作成功' : '操作失败' }}</span>
      </div>
    </template>

    <template v-else>
      <div class="result-default">
        <pre v-if="typeof data === 'object'">{{ JSON.stringify(data, null, 2) }}</pre>
        <span v-else>{{ data }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { MessagePlugin } from "tdesign-vue-next";

interface Nl2sqlResultData {
  sql: string;
  rows: Record<string, unknown>[];
  rowCount: number;
  queryType: string;
  query: string;
}

const props = defineProps<{
  displayType: string;
  data: unknown;
  isSuccess?: boolean;
}>();

const nl2sqlData = computed<Nl2sqlResultData>(() => {
  if (props.displayType !== "nl2sql") return { sql: "", rows: [], rowCount: 0, queryType: "", query: "" };
  const d = (props.data as Record<string, unknown>) || {};
  const rows = Array.isArray(d.rows) ? (d.rows as Record<string, unknown>[]) : [];
  return {
    sql: typeof d.sql === "string" ? d.sql : "",
    rows,
    rowCount: typeof d.rowCount === "number" ? d.rowCount : rows.length,
    queryType: typeof d.queryType === "string" ? d.queryType : "simple",
    query: typeof d.query === "string" ? d.query : "",
  };
});

const nl2sqlTableData = computed<Record<string, unknown>[]>(() => nl2sqlData.value.rows);

const nl2sqlColumns = computed(() => {
  const first = nl2sqlTableData.value[0];
  if (!first || typeof first !== "object") return [];
  return Object.keys(first).map((key) => ({
    colKey: key,
    title: key,
    ellipsis: true,
    width: 150,
  }));
});

const queryTypeLabel = computed(() => {
  const map: Record<string, string> = {
    aggregate: "聚合统计",
    join: "跨表关联",
    simple: "简单查询",
  };
  return map[nl2sqlData.value.queryType] || "查询";
});

const copySQL = () => {
  navigator.clipboard.writeText(nl2sqlData.value.sql).then(() => {
    MessagePlugin.success("SQL 已复制到剪贴板");
  }).catch(() => {
    MessagePlugin.error("复制失败");
  });
};

const exportCSV = () => {
  const rows = nl2sqlTableData.value;
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const header = keys.join(",");
  const body = rows.map((row) =>
    keys.map((k) => {
      const val = row[k] ?? "";
      const str = String(val);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(",")
  );
  const csv = "\uFEFF" + header + "\n" + body.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `query_result_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const tableData = computed<Record<string, unknown>[]>(() => {
  if (Array.isArray(props.data)) return props.data as Record<string, unknown>[];
  if (props.data && typeof props.data === "object" && !Array.isArray(props.data)) {
    const obj = props.data as Record<string, unknown>;
    if (obj.rows && Array.isArray(obj.rows)) return obj.rows as Record<string, unknown>[];
    if (obj.data && Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
  }
  return [];
});

const tableColumns = computed(() => {
  const first = tableData.value[0];
  if (!first || typeof first !== "object") return [];
  return Object.keys(first).map((key) => ({
    colKey: key,
    title: key,
    ellipsis: true,
    width: 150,
  }));
});

const cardItems = computed(() => {
  if (!props.data || typeof props.data !== "object") return [];
  if (Array.isArray(props.data)) {
    return (props.data as Record<string, unknown>[]).map((item, i) => ({
      label: (item.label as string) || (item.name as string) || `项目 ${i + 1}`,
      value: item.value ?? item.amount ?? JSON.stringify(item),
    }));
  }
  return Object.entries(props.data as Record<string, unknown>).map(([key, value]) => ({
    label: key,
    value: typeof value === "object" ? JSON.stringify(value) : String(value),
  }));
});
</script>

<style scoped lang="scss">
.agent-result-renderer {
  margin: 8px 0;

  .nl2sql-result {
    .sql-card {
      border: 1px solid #dbeafe;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 12px;

      .sql-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-2-5) var(--space-3-5);
        background: #eff6ff;

        .sql-header-left {
          display: flex;
          align-items: center;
          gap: 8px;

          .sql-label {
            font-size: 13px;
            font-weight: 600;
            color: #1e40af;
          }
        }

        .sql-header-right {
          display: flex;
          align-items: center;
          gap: 8px;

          .sql-copy-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            background: #fff;
            color: #3b82f6;
            cursor: pointer;
            transition: all 0.2s;

            &:hover {
              background: #dbeafe;
              border-color: #93c5fd;
            }
          }
        }
      }

      .sql-code {
        margin: 0;
        padding: 12px var(--space-3-5);
        font-size: 12px;
        font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
        color: var(--color-text-primary);
        background: var(--color-bg-page);
        white-space: pre-wrap;
        word-break: break-all;
        line-height: 1.6;
      }
    }

    .nl2sql-table-wrapper {
      border: 1px solid var(--color-border);
      border-radius: 10px;
      overflow: hidden;

      .nl2sql-table-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px var(--space-3-5);
        background: var(--color-bg-page);
        border-top: 1px solid var(--color-border);

        .result-count {
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .export-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--space-1-25);
          padding: var(--space-1-25) 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #fff;
          color: #374151;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            background: #f3f4f6;
            border-color: #9ca3af;
          }
        }
      }
    }

    .nl2sql-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 24px;
      color: var(--color-text-placeholder);
      font-size: 14px;
    }
  }

  .result-table-wrapper {
    border: 1px solid var(--color-border);
    border-radius: 8px;
    overflow: hidden;

    .result-meta {
      padding: var(--space-1-5) 12px;
      background: var(--color-bg-page);
      font-size: 12px;
      color: var(--color-text-secondary);
      border-top: 1px solid var(--color-border);
    }
  }

  .result-cards {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    .result-card {
      padding: var(--space-2-5) 16px;
      background: var(--color-bg-page);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      min-width: 120px;

      .card-label {
        font-size: 12px;
        color: var(--color-text-secondary);
        margin-bottom: 4px;
      }

      .card-value {
        font-size: 16px;
        font-weight: 600;
        color: var(--color-text-primary);
      }
    }
  }

  .result-toast {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1-5);
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;

    &.success {
      background: #ecfdf5;
      color: var(--color-primary-dark);
    }

    &.error {
      background: #fef2f2;
      color: var(--color-danger);
    }
  }

  .result-default {
    padding: 8px 12px;
    background: var(--color-bg-page);
    border-radius: 8px;
    font-size: 13px;
    color: var(--color-text-secondary);

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
      font-size: 12px;
    }
  }
}
</style>
