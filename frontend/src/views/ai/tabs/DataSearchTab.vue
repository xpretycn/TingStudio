<template>
  <div class="smart-search-tab">
    <div class="search-scope-banner">
      <div class="scope-icon">
        <t-icon name="layers" size="16px" />
      </div>
      <div class="scope-text">
        <span class="scope-title">可检索数据范围：</span>
        <span class="scope-item"><t-icon name="file" size="12px" /> 配方</span>
        <span class="scope-item"><t-icon name="app" size="12px" /> 原料</span>
        <span class="scope-item"><t-icon name="user" size="12px" /> 业务员</span>
        <span class="scope-item"><t-icon name="chart-bar" size="12px" /> 配方销量</span>
      </div>
    </div>

    <div class="search-input-area">
      <t-textarea
        v-model="searchQuery"
        placeholder="用自然语言描述你的查询需求，例如：查找含有黄芪的配方、按业务员统计配方数量、库存不足50的原料"
        :autosize="{ minRows: 2, maxRows: 5 }"
      />
      <div class="search-actions">
        <button class="search-btn" :disabled="!searchQuery.trim() || searchLoading" @click="handleSearch">
          <t-icon name="search" size="16px" />
          <span>{{ searchLoading ? '查询中...' : '智能查询' }}</span>
        </button>
        <button v-if="searchResult" class="export-btn" @click="handleExport">
          <t-icon name="download" size="16px" />
          <span>导出CSV</span>
        </button>
      </div>
    </div>

    <div class="quick-tags">
      <span class="quick-tags-label">快速示例：</span>
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
      <span>AI 正在理解你的查询需求，请稍候...</span>
    </div>

    <div v-if="searchError" class="search-error">
      <div class="error-header">
        <t-icon name="error-circle" size="16px" />
        <span class="error-title">查询出错</span>
      </div>
      <div class="error-body">
        <p>{{ searchError }}</p>
        <p v-if="isSqlError" class="error-hint">建议：请尝试用更简洁的方式描述查询需求，或参考上面的快速示例。</p>
        <p v-if="isAiError" class="error-hint">建议：AI 服务暂时不可用，请稍后重试或切换到其他 AI 模型。</p>
      </div>
    </div>

    <div v-if="searchResult" class="search-result">
      <div class="sql-card">
        <div class="sql-header" @click="sqlExpanded = !sqlExpanded">
          <div class="sql-header-left">
            <svg class="sql-toggle-icon" :class="{ expanded: sqlExpanded }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span class="sql-label">生成的 SQL 查询</span>
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <span>共找到 <strong>{{ searchResult.rowCount }}</strong> 条结果</span>
        </div>
        <div class="summary-right">
          <span v-if="searchResult.model" class="model-tag">{{ searchResult.model }}</span>
        </div>
      </div>

      <div v-if="searchResult.rows.length > 0" class="result-table-wrapper">
        <div class="result-table-container">
          <table class="result-table">
            <thead>
              <tr>
                <th v-for="key in resultColumns" :key="key">{{ key }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIdx) in searchResult.rows" :key="rowIdx">
                <td v-for="key in resultColumns" :key="key">
                  <span :class="{ 'null-value': row[key] === null || row[key] === undefined }">
                    {{ formatCellValue(row[key]) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="searchResult.rows.length === 0" class="no-results">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
        <span>未找到匹配的数据</span>
        <span class="no-results-hint">换个查询条件试试看</span>
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
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAiStore } from "@/stores/ai";
import { MessagePlugin } from "tdesign-vue-next";
import type { SearchResult } from "@/api/ai";

const aiStore = useAiStore();

const searchQuery = ref("");
const searchLoading = ref(false);
const searchResult = ref<SearchResult | null>(null);
const searchError = ref("");
const searchHistory = ref<string[]>([]);
const sqlExpanded = ref(false);

const quickTags = [
  "所有配方列表",
  "所有原料列表",
  "按业务员统计配方数量",
  "库存小于50的原料",
  "含黄芪的配方有哪些",
  "最近创建的10个配方",
  "按月统计配方创建趋势",
  "各业务员的销量汇总",
];

const isSqlError = computed(() => searchError.value.includes("SQL 执行失败") || searchError.value.includes("SQL_EXECUTION_ERROR"));
const isAiError = computed(() => searchError.value.includes("AI 服务") || searchError.value.includes("AI_SERVICE_ERROR"));

const resultColumns = computed(() => {
  if (!searchResult.value?.rows?.length) return [];
  return Object.keys(searchResult.value.rows[0]);
});

const queryTypeLabel = computed(() => {
  const queryType = searchResult.value?.queryType;
  if (!queryType) return "";
  const labels: Record<string, string> = {
    simple: "简单查询",
    join: "跨表查询",
    aggregate: "聚合分析",
  };
  return labels[queryType] || queryType;
});

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "number") {
    if (Number.isInteger(val)) return val.toLocaleString();
    return val.toFixed(2);
  }
  return String(val);
}

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
    searchResult.value = res ?? null;

    const history = [searchQuery.value.trim(), ...searchHistory.value.filter((h) => h !== searchQuery.value.trim())];
    searchHistory.value = history.slice(0, 10);
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string; code?: string } }; message?: string };
    searchError.value = err?.response?.data?.message || err.message || "查询失败";
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

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && e.ctrlKey) {
    e.preventDefault();
    handleSearch();
  }
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
});
</script>

<style scoped lang="scss">
.smart-search-tab {
  padding: 16px;
  height: 100%;
  overflow-y: auto;

  .search-scope-banner {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    margin-bottom: 12px;
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
    border: 1px solid var(--color-primary-lightest);
    border-radius: 8px;
    font-size: 12px;

    .scope-icon {
      color: var(--color-primary);
      flex-shrink: 0;
    }

    .scope-text {
      display: flex;
      align-items: center;
      gap: var(--space-1-5);
      flex-wrap: wrap;

      .scope-title {
        font-weight: 600;
        color: var(--color-text-primary);
      }

      .scope-item {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 1px 6px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 4px;
        color: var(--color-text-secondary);
        font-size: 11px;
      }
    }
  }

  .search-input-area {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;

    :deep(.t-textarea__inner) {
      font-size: 14px;
    }

    .search-actions {
      display: flex;
      flex-direction: column;
      gap: var(--space-1-5);

      .search-btn,
      .export-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: var(--space-1-5) var(--space-3-5);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        background: white;
        cursor: pointer;
        font-size: 13px;
        color: var(--color-text-secondary);
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
        background: var(--color-primary);
        color: white;
        border-color: var(--color-primary);

        &:hover:not(:disabled) {
          background: var(--color-primary-dark);
          border-color: var(--color-primary-dark);
        }
      }
    }
  }

  .quick-tags {
    display: flex;
    align-items: center;
    gap: var(--space-1-5);
    margin-bottom: 16px;
    flex-wrap: wrap;

    .quick-tags-label {
      font-size: 12px;
      color: var(--color-text-placeholder);
    }
  }

  .search-loading {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px;
    font-size: 14px;
    color: var(--color-text-secondary);
  }

  .search-error {
    padding: 16px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;

    .error-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
      color: var(--color-danger);

      .error-title {
        font-weight: 600;
        font-size: 13px;
      }
    }

    .error-body {
      font-size: 13px;
      color: var(--color-text-secondary);
      line-height: 1.6;

      p {
        margin: 0;
      }

      .error-hint {
        margin-top: 8px;
        padding: 8px 10px;
        background: white;
        border-radius: 4px;
        font-size: 12px;
        color: var(--color-text-secondary);
      }
    }
  }

  .search-result {
    .sql-card {
      border: 1px solid var(--color-border);
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 16px;
      background: #fff;

      .sql-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-2-5) var(--space-3-5);
        background: var(--color-bg-page);
        border-bottom: 1px solid var(--color-border);
        cursor: pointer;
        transition: background 0.15s;

        &:hover {
          background: #f1f5f9;
        }

        .sql-header-left {
          display: flex;
          align-items: center;
          gap: var(--space-1-5);
        }

        .sql-toggle-icon {
          transition: transform 0.2s ease;
          color: var(--color-text-placeholder);

          &.expanded {
            transform: rotate(90deg);
          }
        }

        .sql-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .query-type-badge {
          font-size: 11px;
          padding: var(--space-0-5) 8px;
          border-radius: 10px;
          font-weight: 500;

          &.simple {
            background: #ecfdf5;
            color: var(--color-primary-dark);
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
        padding: 12px var(--space-3-5);
        margin: 0;
        font-size: 12px;
        font-family: "Fira Code", "Monaco", "Consolas", monospace;
        color: var(--color-text-primary);
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
      color: var(--color-text-secondary);
      margin-bottom: 12px;
      padding: 0 var(--space-0-5);

      .summary-left {
        display: flex;
        align-items: center;
        gap: var(--space-1-5);

        strong {
          color: var(--color-text-primary);
          font-weight: 700;
        }
      }

      .summary-right {
        .model-tag {
          font-size: 11px;
          padding: var(--space-0-5) 8px;
          border-radius: 6px;
          background: #f1f5f9;
          color: var(--color-text-secondary);
          font-weight: 500;
        }
      }
    }

    .result-table-wrapper {
      border: 1px solid var(--color-border);
      border-radius: 10px;
      overflow: hidden;
      background: #fff;
    }

    .result-table-container {
      overflow-x: auto;
      max-height: 500px;
      overflow-y: auto;
    }

    .result-table {
      width: 100%;
      min-width: 100%;
      border-collapse: collapse;
      font-size: 13px;

      thead {
        position: sticky;
        top: 0;
        z-index: 1;
        background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);

        th {
          padding: var(--space-2-5) var(--space-3);
          text-align: left;
          font-weight: 600;
          color: #065f46;
          font-size: 12px;
          letter-spacing: 0.3px;
          border-bottom: 2px solid var(--color-primary-lightest);
          white-space: nowrap;
        }
      }

      tbody {
        tr {
          transition: background 0.15s;

          &:nth-child(even) {
            background: var(--color-bg-page);
          }

          &:hover {
            background: #ecfdf5;
          }

          td {
            padding: var(--space-2) var(--space-3);
            border-bottom: 1px solid #f1f5f9;
            color: var(--color-text-primary);
            line-height: 1.5;
            max-width: 320px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;

            .null-value {
              color: var(--color-text-placeholder);
              font-style: italic;
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
      color: var(--color-text-placeholder);
      font-size: 14px;
      background: var(--color-bg-page);
      border-radius: 10px;
      border: 1px dashed var(--color-border);

      .no-results-hint {
        font-size: 12px;
        color: #94a3b8;
      }
    }
  }

  .search-history {
    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 13px;
      color: var(--color-text-secondary);

      .clear-history-btn {
        border: none;
        background: none;
        color: var(--color-text-placeholder);
        cursor: pointer;
        font-size: 12px;

        &:hover {
          color: var(--color-text-secondary);
        }
      }
    }

    .history-tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1-5);
    }
  }
}
</style>