<template>
  <div class="smart-search-tab">
    <div class="search-input-area">
      <t-textarea
        v-model="searchQuery"
        placeholder="试试输入：查找含有黄芪且成品重量大于100g的配方、按业务员统计配方数量"
        :autosize="{ minRows: 2, maxRows: 5 }"
        @keydown.enter.ctrl="handleSearch"
      />
      <div class="search-actions">
        <button class="search-btn" :disabled="!searchQuery.trim() || searchLoading" @click="handleSearch">
          <t-icon name="search" size="16px" />
          <span>{{ searchLoading ? '搜索中...' : '搜索' }}</span>
        </button>
        <button v-if="searchResult" class="export-btn" @click="handleExport">
          <t-icon name="download" size="16px" />
          <span>导出CSV</span>
        </button>
      </div>
    </div>

    <div class="quick-tags">
      <span class="quick-tags-label">试试：</span>
      <t-tag
        v-for="tag in quickTags"
        :key="tag"
        variant="outline"
        size="small"
        style="cursor: pointer"
        @click="fillAndSearch(tag)"
      >
        {{ tag }}
      </t-tag>
    </div>

    <div v-if="searchLoading" class="search-loading">
      <t-loading size="small" />
      <span>正在生成查询...</span>
    </div>

    <div v-if="searchError" class="search-error">
      <t-icon name="error-circle" size="16px" />
      <span>{{ searchError }}</span>
    </div>

    <div v-if="searchResult" class="search-result">
      <div class="sql-card">
        <div class="sql-header" @click="sqlExpanded = !sqlExpanded">
          <div class="sql-header-left">
            <svg class="sql-toggle-icon" :class="{ expanded: sqlExpanded }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span class="sql-label">生成的 SQL</span>
          </div>
          <span class="query-type-badge" :class="searchResult.queryType">
            {{ queryTypeLabel }}
          </span>
        </div>
        <div v-show="sqlExpanded" class="sql-body">
          <pre class="sql-code">{{ searchResult.sql }}</pre>
        </div>
      </div>

      <div class="result-summary">
        <div class="summary-left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <span>查询结果：<strong>{{ searchResult.rowCount }}</strong> 条记录</span>
        </div>
        <div class="summary-right">
          <span v-if="searchResult.model" class="model-tag">{{ searchResult.model }}</span>
        </div>
      </div>

      <div v-if="searchResult.rows.length > 0" class="markdown-content" v-html="renderedMarkdown"></div>

      <div v-if="searchResult.rows.length === 0" class="no-results">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
        <span>未找到匹配的数据</span>
      </div>
    </div>

    <div v-if="searchHistory.length > 0 && !searchResult" class="search-history">
      <div class="history-header">
        <span>搜索历史</span>
        <button class="clear-history-btn" @click="searchHistory = []">清空</button>
      </div>
      <div class="history-tags">
        <t-tag
          v-for="(h, idx) in searchHistory"
          :key="idx"
          variant="light"
          size="small"
          style="cursor: pointer"
          @click="fillAndSearch(h)"
        >
          {{ h }}
        </t-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useAiStore } from "@/stores/ai";
import { MessagePlugin } from "tdesign-vue-next";
import { marked } from "marked";

const aiStore = useAiStore();

const searchQuery = ref("");
const searchLoading = ref(false);
const searchResult = ref<any>(null);
const searchError = ref("");
const searchHistory = ref<string[]>([]);
const sqlExpanded = ref(false);

const quickTags = [
  "含黄芪的配方有哪些",
  "按业务员统计配方数量",
  "最近创建的5个配方",
  "库存小于50的原料",
  "按月统计配方创建趋势",
];

const queryTypeLabel = computed(() => {
  if (!searchResult.value?.queryType) return "";
  const labels: Record<string, string> = {
    simple: "简单查询",
    join: "跨表查询",
    aggregate: "聚合分析",
  };
  return labels[searchResult.value.queryType] || searchResult.value.queryType;
});

const renderedMarkdown = computed(() => {
  if (!searchResult.value?.rows?.length) return "";
  const rows = searchResult.value.rows;
  const keys = Object.keys(rows[0]);
  const header = `| ${keys.join(" | ")} |`;
  const separator = `| ${keys.map(() => "---").join(" | ")} |`;
  const body = rows.map((row: any) => {
    const cells = keys.map((key) => {
      const val = row[key];
      if (val === null || val === undefined) return "—";
      if (typeof val === "number") return val.toLocaleString();
      return String(val);
    });
    return `| ${cells.join(" | ")} |`;
  });
  const md = [header, separator, ...body].join("\n");
  try {
    return marked(md) as string;
  } catch {
    return md;
  }
});

const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    MessagePlugin.warning("请输入查询内容");
    return;
  }
  if (!aiStore.selectedModel) {
    MessagePlugin.warning("请先选择 AI 模型");
    return;
  }

  searchLoading.value = true;
  searchResult.value = null;
  searchError.value = "";
  sqlExpanded.value = false;

  try {
    const res = await aiStore.naturalSearch(searchQuery.value.trim());
    searchResult.value = res;

    const history = [searchQuery.value.trim(), ...searchHistory.value.filter((h) => h !== searchQuery.value.trim())];
    searchHistory.value = history.slice(0, 10);
  } catch (error: any) {
    searchError.value = error?.response?.data?.message || error.message || "AI 检索失败";
  } finally {
    searchLoading.value = false;
  }
};

const fillAndSearch = (text: string) => {
  searchQuery.value = text;
  handleSearch();
};

const handleExport = async () => {
  if (!searchResult.value || !aiStore.selectedModel) return;

  try {
    const res = await aiStore.naturalSearch(searchQuery.value.trim());
    if (res?.exportUrl) {
      window.open(res.exportUrl, "_blank");
    } else {
      MessagePlugin.info("正在生成导出文件，请再次点击导出");
    }
  } catch {
    MessagePlugin.error("导出失败");
  }
};
</script>

<style scoped lang="scss">
.smart-search-tab {
  padding: 16px;
  height: 100%;
  overflow-y: auto;

  .search-input-area {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;

    .search-actions {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .search-btn,
      .export-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 14px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        background: white;
        cursor: pointer;
        font-size: 13px;
        color: #475569;
        white-space: nowrap;
        transition: all 0.2s;

        &:hover:not(:disabled) {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .search-btn {
        background: #10b981;
        color: white;
        border-color: #10b981;

        &:hover:not(:disabled) {
          background: #059669;
          border-color: #059669;
        }
      }
    }
  }

  .quick-tags {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 16px;
    flex-wrap: wrap;

    .quick-tags-label {
      font-size: 12px;
      color: #94a3b8;
    }
  }

  .search-loading,
  .search-error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px;
    font-size: 14px;
    color: #64748b;
  }

  .search-error {
    color: #dc2626;
  }

  .search-result {
    .sql-card {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 16px;
      background: #fff;

      .sql-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 14px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        cursor: pointer;
        transition: background 0.15s;

        &:hover {
          background: #f1f5f9;
        }

        .sql-header-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sql-toggle-icon {
          transition: transform 0.2s ease;
          color: #94a3b8;

          &.expanded {
            transform: rotate(90deg);
          }
        }

        .sql-label {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
        }

        .query-type-badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 500;

          &.simple {
            background: #ecfdf5;
            color: #059669;
          }

          &.join {
            background: #eff6ff;
            color: #2563eb;
          }

          &.aggregate {
            background: #fef3c7;
            color: #d97706;
          }
        }
      }

      .sql-body {
        border-top: none;
      }

      .sql-code {
        padding: 12px 14px;
        margin: 0;
        font-size: 12px;
        font-family: "Fira Code", "Monaco", "Consolas", monospace;
        color: #1e293b;
        background: #fafbfc;
        white-space: pre-wrap;
        word-break: break-all;
        line-height: 1.5;
      }
    }

    .result-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      color: #64748b;
      margin-bottom: 12px;
      padding: 0 2px;

      .summary-left {
        display: flex;
        align-items: center;
        gap: 6px;

        strong {
          color: #1e293b;
          font-weight: 700;
        }
      }

      .summary-right {
        .model-tag {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 6px;
          background: #f1f5f9;
          color: #64748b;
          font-weight: 500;
        }
      }
    }

    .markdown-content {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      background: #fff;

      :deep(table) {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;

        thead {
          background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);

          th {
            padding: 10px 14px;
            text-align: left;
            font-weight: 600;
            color: #065f46;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            border-bottom: 2px solid #a7f3d0;
            white-space: nowrap;
          }
        }

        tbody {
          tr {
            transition: background 0.15s;

            &:nth-child(even) {
              background: #f8fafc;
            }

            &:hover {
              background: #ecfdf5;
            }

            td {
              padding: 9px 14px;
              border-bottom: 1px solid #f1f5f9;
              color: #334155;
              line-height: 1.5;
              max-width: 300px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
        }
      }
    }

    .no-results {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 48px 24px;
      color: #94a3b8;
      font-size: 14px;
      background: #f8fafc;
      border-radius: 10px;
      border: 1px dashed #e2e8f0;
    }
  }

  .search-history {
    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 13px;
      color: #64748b;

      .clear-history-btn {
        border: none;
        background: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 12px;

        &:hover {
          color: #64748b;
        }
      }
    }

    .history-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
  }
}
</style>
