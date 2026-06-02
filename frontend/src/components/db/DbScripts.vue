<template>
<div class="db-scripts">
    <div class="scripts-toolbar">
      <t-input
        v-model="searchKeyword"
        placeholder="搜索脚本名称或描述..."
        clearable
        class="search-input"
        @clear="handleClearSearch"
      >
        <template #prefix-icon>
          <t-icon name="search" />
        </template>
      </t-input>
      <t-select
        v-model="filterCategory"
        placeholder="全部分类"
        clearable
        class="category-filter"
        :options="categoryOptions"
      />
      <t-select
        v-model="filterDanger"
        placeholder="全部风险"
        clearable
        class="danger-filter"
        :options="[
          { label: '低风险', value: 'low' },
          { label: '中风险', value: 'medium' },
          { label: '高风险', value: 'high' },
        ]"
      />
      <t-button theme="default" variant="outline" size="small" @click="fetchScriptList">
        <template #icon><t-icon name="refresh" /></template>
        刷新
      </t-button>
    </div>

<t-loading :loading="loading && categories.length === 0">
      <t-collapse v-model="activePanels" borderless class="scripts-collapse">
        <t-collapse-panel
          v-for="cat in filteredCategories"
          :key="cat.key"
          :value="cat.key"
          :header="cat.name"
        >
          <template #header>
            <div class="cat-header">
              <span class="cat-icon">{{ cat.icon }}</span>
              <span class="cat-name">{{ cat.name }}</span>
              <span v-if="cat.scripts.length" class="cat-count">{{ cat.scripts.length }}</span>
            </div>
          </template>

          <div class="script-list">
            <div
              v-for="script in cat.scripts"
              :key="script.id"
              class="script-card"
              :class="{ 'script-card--executing': executingScriptId === script.id }"
            >
              <div class="card-header-row">
                <span class="script-name">{{ script.name }}</span>
                <t-tag
                  :theme="dangerTheme(script.dangerLevel)"
                  variant="light"
                  size="small"
                  class="danger-tag"
                >
                  {{ dangerLabel(script.dangerLevel) }}
                </t-tag>
              </div>

              <p class="script-desc">{{ script.description }}</p>

              <div class="script-meta">
                <span class="meta-item">
                  <t-icon name="time" size="14px" />
                  预计耗时: {{ script.estimatedTime }}
                </span>
                <span v-if="script.lastExecutedAt" class="meta-item">
                  <t-icon name="history" size="14px" />
                  最近执行: {{ formatTime(script.lastExecutedAt) }}
                </span>
                <span v-if="script.lastStatus" class="meta-item">
                  <t-tag
                    :theme="script.lastStatus === 'completed' ? 'success' : 'danger'"
                    variant="light"
                    size="small"
                  >
                    {{ script.lastStatus === 'completed' ? '成功' : '失败' }}
                  </t-tag>
                </span>
              </div>

              <div class="card-actions">
                <t-button
                  theme="primary"
                  size="small"
                  :loading="executingScriptId === script.id"
                  :disabled="executingScriptId !== null && executingScriptId !== script.id"
                  @click="handleClickExecute(script)"
                >
                  <template #icon><t-icon name="play" /></template>
                  执行
                </t-button>
                <t-button
                  theme="default"
                  variant="outline"
                  size="small"
                  :disabled="executingScriptId === script.id"
                  @click="openPreview(script)"
                >
                  <template #icon><t-icon name="file-paste" /></template>
                  预览
                </t-button>
                <t-button
                  theme="default"
                  variant="outline"
                  size="small"
                  :disabled="executingScriptId === script.id"
                  @click="openDetail(script)"
                >
                  <template #icon><t-icon name="info-circle" /></template>
                  详情
                </t-button>
                <t-button
                  theme="default"
                  variant="outline"
                  size="small"
                  :disabled="executingScriptId === script.id"
                  @click="openHistory(script)"
                >
                  <template #icon><t-icon name="history" /></template>
                  历史
                </t-button>
                <t-button
                  theme="default"
                  variant="outline"
                  size="small"
                  :disabled="executingScriptId === script.id"
                  @click="openVersions(script)"
                >
                  <template #icon><t-icon name="rollback" /></template>
                  版本
                </t-button>
              </div>

              <template v-if="executingScriptId === script.id">
                <div class="log-area" ref="logContainerRef">
                  <div
                    v-for="(line, idx) in executionLog"
                    :key="idx"
                    class="log-line"
                    :class="logLineClass(line)"
                  >{{ logText(line) }}</div>
                  <div v-if="!executionResult && executionLog.length > 0" class="log-line log-line--info log-cursor">|</div>
                </div>

                <div v-if="executionResult" class="result-bar">
                  <t-icon
                    :name="executionResult.success ? 'check-circle' : 'close-circle'"
                    :class="executionResult.success ? 'result-icon--ok' : 'result-icon--err'"
                    size="18px"
                  />
                  <span class="result-text">{{ executionResult.success ? '成功' : '失败' }}</span>
                  <span class="result-duration">
                    <t-icon name="time" size="12px" />
                    {{ formatDuration(executionResult.duration) }}
                  </span>
                  <t-button
                    theme="default"
                    variant="text"
                    size="small"
                    @click="copyLogs"
                  >
                    复制日志
                  </t-button>
                </div>
              </template>
            </div>
          </div>

          <t-empty v-if="!cat.scripts.length" description="暂无脚本" />
        </t-collapse-panel>
      </t-collapse>

      <t-empty v-if="!loading && filteredCategories.length === 0" description="暂无可用脚本" />
    </t-loading>

<t-dialog v-model:visible="confirmDialogVisible" header="脚本执行确认" :confirm-btn="{ content: '确认执行', theme: 'warning' }"
    cancel-btn="取消" @confirm="confirmExecution">
      <div class="confirm-body">
        <div class="confirm-warning">
          <t-icon name="error-circle" size="20px" color="#F0A040" />
          <span>即将执行脚本：{{ confirmScript?.name }}</span>
        </div>
        <p class="confirm-desc">{{ confirmScript?.description }}</p>
        <p class="confirm-meta">预计耗时：{{ confirmScript?.estimatedTime }}</p>
        <t-alert theme="warning" message="请确认已做好数据备份！" />
      </div>
    </t-dialog>

<t-popconfirm v-model:visible="highDangerPopVisible" :content="getHighDangerContent()" theme="danger"
    @confirm="directExecute(pendingHighScript!)">
      <template #reference>
        <div />
      </template>
    </t-popconfirm>

<t-drawer v-model:visible="detailDrawerVisible" :header="detailScript?.name || '脚本详情'" size="480px" :footer="false">
      <template v-if="detailScript">
        <div class="drawer-section">
          <div class="section-item">
            <span class="section-label">
              <t-icon name="file" size="16px" /> 脚本路径
            </span>
            <span class="section-value mono">{{ detailScript.scriptPath }}</span>
          </div>
          <div class="section-item">
            <span class="section-label">
              <t-icon name="edit" size="16px" /> 描述
            </span>
            <span class="section-value">{{ detailScript.description }}</span>
          </div>
          <div class="section-item">
            <span class="section-label">
              <t-icon name="error-circle" size="16px" /> 危险等级
            </span>
            <t-tag
              :theme="dangerTheme(detailScript.dangerLevel)"
              variant="light"
              size="small"
            >
              {{ dangerLabel(detailScript.dangerLevel) }}
            </t-tag>
          </div>
        </div>

        <div v-if="detailScript.details && detailScript.details.length" class="drawer-section">
          <h4 class="section-title">
            <t-icon name="book" size="16px" /> 详细说明
          </h4>
          <ol class="detail-list">
            <li v-for="(item, i) in detailScript.details" :key="i">{{ item }}</li>
          </ol>
        </div>

        <div v-if="detailScript.lastExecutedAt" class="drawer-section">
          <h4 class="section-title">
            <t-icon name="history" size="16px" /> 最近执行记录
          </h4>
          <div class="last-exec-info">
            <span>执行时间：{{ formatTime(detailScript.lastExecutedAt) }}</span>
            <t-tag
              :theme="detailScript.lastStatus === 'success' || detailScript.lastStatus === 'completed' ? 'success' : 'danger'"
              variant="light"
              size="small"
            >
              {{ detailScript.lastStatus === 'success' || detailScript.lastStatus === 'completed' ? '成功' : '失败' }}
            </t-tag>
          </div>
        </div>
      </template>
    </t-drawer>

<t-drawer v-model:visible="previewDrawerVisible" :header="previewScript?.name || '脚本预览'" size="720px">
      <template v-if="previewScript">
        <div class="preview-toolbar">
          <t-tag :theme="dangerTheme(previewScript.dangerLevel)" variant="light" size="small">
            {{ dangerLabel(previewScript.dangerLevel) }}
          </t-tag>
          <span class="preview-path">{{ previewScript.scriptPath }}</span>
          <t-button
            theme="primary"
            size="small"
            :loading="savingContent"
            @click="savePreviewContent"
          >
            <template #icon><t-icon name="save" /></template>
            保存
          </t-button>
          <t-button
            theme="default"
            variant="outline"
            size="small"
            @click="isEditing = !isEditing"
          >
            {{ isEditing ? '退出编辑' : '编辑' }}
          </t-button>
        </div>
        <div v-if="isEditing" class="change-summary-input">
          <t-input
            v-model="changeSummary"
            placeholder="简要描述本次修改内容（可选）..."
            size="small"
            clearable
          />
        </div>
        <div class="preview-content">
          <t-textarea
            v-if="isEditing"
            v-model="previewContent"
            :autosize="{ minRows: 20, maxRows: 40 }"
            class="script-editor"
          />
          <pre v-else class="script-preview"><code>{{ previewContent }}</code></pre>
        </div>
      </template>
    </t-drawer>

<t-drawer v-model:visible="historyDrawerVisible" :header="historyScript?.name ? `${historyScript.name} - 执行历史` : '执行历史'"
    size="640px" :footer="false">
      <template v-if="historyScript">
        <div class="history-list">
          <div
            v-for="log in historyList"
            :key="log.id"
            class="history-item"
          >
            <div class="history-header">
              <t-tag
                :theme="log.status === 'completed' ? 'success' : log.status === 'running' ? 'warning' : 'danger'"
                variant="light"
                size="small"
              >
                {{ log.status === 'completed' ? '成功' : log.status === 'running' ? '执行中' : '失败' }}
              </t-tag>
              <span class="history-time">{{ formatTime(log.startedAt) }}</span>
              <span v-if="log.durationMs" class="history-duration">
                <t-icon name="time" size="12px" />
                {{ formatDuration(log.durationMs) }}
              </span>
            </div>
            <div v-if="log.resultSummary" class="history-summary">
              <pre>{{ log.resultSummary }}</pre>
            </div>
            <div v-if="log.errorMessage" class="history-error">
              <t-alert theme="error" :message="log.errorMessage" size="small" />
            </div>
            <div class="history-trigger">
              执行人: {{ log.triggeredBy }}
            </div>
          </div>
          <t-empty v-if="!historyLoading && historyList.length === 0" description="暂无执行记录" />
        </div>
      </template>
    </t-drawer>

<t-drawer v-model:visible="versionDrawerVisible" :header="versionScript?.name ? `${versionScript.name} - 版本历史` : '版本历史'"
    size="680px" :footer="false">
      <template v-if="versionScript">
        <t-loading :loading="versionLoading">
          <div class="version-list">
            <div
              v-for="(ver, idx) in versionList"
              :key="ver.id"
              class="version-item"
            >
              <div class="version-header">
                <div class="version-badge">
                  <span class="version-number">v{{ versionList.length - idx }}</span>
                  <t-tag v-if="idx === 0" theme="primary" variant="light" size="small">当前</t-tag>
                </div>
                <span class="version-time">{{ formatTime(ver.savedAt) }}</span>
              </div>
              <div v-if="ver.changeSummary" class="version-summary">
                <t-icon name="edit" size="14px" />
                {{ ver.changeSummary }}
              </div>
              <div class="version-meta">
                <span>保存人: {{ ver.savedBy }}</span>
              </div>
              <div class="version-actions">
                <t-button
                  theme="default"
                  variant="outline"
                  size="small"
                  @click="previewVersion(ver)"
                >
                  <template #icon><t-icon name="file-paste" /></template>
                  查看
                </t-button>
                <t-button
                  theme="primary"
                  size="small"
                  :loading="restoringVersion"
                  @click="handleRestoreVersion(ver)"
                >
                  <template #icon><t-icon name="rollback" /></template>
                  恢复此版本
                </t-button>
              </div>
            </div>
            <t-empty v-if="!versionLoading && versionList.length === 0" description="暂无版本记录，编辑并保存脚本后将自动生成版本" />
          </div>
        </t-loading>
      </template>
    </t-drawer>

<t-dialog v-model:visible="versionPreviewVisible" :header="versionPreviewTitle" width="800px" :footer="false">
      <pre class="version-preview-content"><code>{{ versionPreviewContent }}</code></pre>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from "vue";
import { MessagePlugin } from "tdesign-vue-next";
import http from "@/api/http";
import { getScriptContent, updateScriptContent, getScriptVersions, restoreScriptVersion } from "@/api/db";
import type { ScriptVersion } from "@/api/db";
import { formatTimestamp } from "@/utils/timeFormat";

export interface ScriptDefinition {
    id: string;
    name: string;
    description: string;
    category: string;
    dangerLevel: "low" | "medium" | "high";
    estimatedTime: string;
    scriptPath: string;
    details?: string[];
    lastExecutedAt?: string | null;
    lastStatus?: string | null;
}

export interface ScriptCategory {
    key: string;
    icon: string;
    name: string;
    scripts: ScriptDefinition[];
}

export interface ScriptExecutionResult {
    success: boolean;
    duration: number;
    message?: string;
}

export interface ScriptLogRow {
    id: string;
    scriptId: string;
    scriptName: string;
    triggeredBy: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    durationMs: number | null;
    resultSummary: string | null;
    errorMessage: string | null;
}

const CATEGORY_MAP: Record<string, { icon: string; name: string; }> = {
    fix: { icon: "\u{1F527}", name: "数据修复" },
    seed: { icon: "\u{1F331}", name: "种子数据" },
    import: { icon: "\u{1F4E5}", name: "数据导入" },
    clean: { icon: "\u{1F9F9}", name: "数据清理" },
    verify: { icon: "\u{2705}", name: "数据验证" },
    migrate: { icon: "\u{1F504}", name: "迁移" },
    init: { icon: "\u{1F3DB}\uFE0F", name: "初始化" },
    mysql: { icon: "\u{1F418}", name: "MySQL" },
    nutrition: { icon: "\u{1F9C0}", name: "营养数据" },
    report: { icon: "\u{1F4CA}", name: "报表检查" },
    export: { icon: "\u{1F4BE}", name: "导出恢复" },
    admin: { icon: "\u{1F510}", name: "管理员" },
    other: { icon: "\u{1F4C1}", name: "其他" },
};

const categories = ref<ScriptCategory[]>([]);
const loading = ref(false);
const executingScriptId = ref<string | null>(null);
const executionLog = ref<string[]>([]);
const executionResult = ref<ScriptExecutionResult | null>(null);
const detailDrawerVisible = ref(false);
const detailScript = ref<ScriptDefinition | null>(null);
const confirmDialogVisible = ref(false);
const confirmScript = ref<ScriptDefinition | null>(null);
const highDangerPopVisible = ref(false);
const pendingHighScript = ref<ScriptDefinition | null>(null);
const logContainerRef = ref<HTMLElement | null>(null);
const activePanels = ref<string[]>([]);

const searchKeyword = ref("");
const filterCategory = ref("");
const filterDanger = ref("");

const previewDrawerVisible = ref(false);
const previewScript = ref<ScriptDefinition | null>(null);
const previewContent = ref("");
const isEditing = ref(false);
const savingContent = ref(false);
const changeSummary = ref("");

const historyDrawerVisible = ref(false);
const historyScript = ref<ScriptDefinition | null>(null);
const historyList = ref<ScriptLogRow[]>([]);
const historyLoading = ref(false);

const versionDrawerVisible = ref(false);
const versionScript = ref<ScriptDefinition | null>(null);
const versionList = ref<ScriptVersion[]>([]);
const versionLoading = ref(false);
const versionPreviewVisible = ref(false);
const versionPreviewContent = ref("");
const versionPreviewTitle = ref("");
const restoringVersion = ref(false);

const categoryOptions = computed(() => {
    return categories.value.map((c) => ({ label: `${c.icon} ${c.name}`, value: c.key }));
});

const filteredCategories = computed(() => {
    let result = categories.value;
    if (filterCategory.value) {
        result = result.filter((c) => c.key === filterCategory.value);
    }
    if (filterDanger.value) {
        result = result.map((c) => ({
            ...c,
            scripts: c.scripts.filter((s) => s.dangerLevel === filterDanger.value),
        })).filter((c) => c.scripts.length > 0);
    }
    if (searchKeyword.value.trim()) {
        const kw = searchKeyword.value.trim().toLowerCase();
        result = result.map((c) => ({
            ...c,
            scripts: c.scripts.filter(
                (s) =>
                    s.name.toLowerCase().includes(kw) ||
                    s.description.toLowerCase().includes(kw) ||
                    s.scriptPath.toLowerCase().includes(kw)
            ),
        })).filter((c) => c.scripts.length > 0);
    }
    return result;
});

function dangerTheme(level: string): "success" | "warning" | "danger" {
    const map: Record<string, "success" | "warning" | "danger"> = {
        low: "success",
        medium: "warning",
        high: "danger",
    };
    return map[level] ?? "success";
}

function dangerLabel(level: string): string {
    const map: Record<string, string> = {
        low: "低风险",
        medium: "中风险",
        high: "高风险",
    };
    return map[level] ?? level;
}

function getHighDangerContent(): string {
    if (!pendingHighScript.value) return "";
    return `\u{1F534} 高危操作警告！\n\n此脚本将修改或删除数据，且不可撤销。\n脚本：${pendingHighScript.value.name}\n请输入 "${pendingHighScript.value.id}" 确认执行`;
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(iso: string): string {
    return formatTimestamp(iso);
}

function handleClearSearch() {
    searchKeyword.value = "";
}

async function fetchScriptList() {
    loading.value = true;
    try {
        const res = await http.get<unknown, { categories: string[]; scripts: ScriptDefinition[]; total: number; }>("/db/scripts");
        const grouped = new Map<string, ScriptDefinition[]>();
        for (const s of res.scripts) {
            const list = grouped.get(s.category) ?? [];
            list.push(s);
            grouped.set(s.category, list);
        }
        const cats: ScriptCategory[] = [];
        for (const [key, cfg] of Object.entries(CATEGORY_MAP)) {
            const scripts = grouped.get(key) ?? [];
            if (scripts.length > 0 || res.categories.includes(key)) {
                cats.push({
                    key,
                    icon: cfg.icon,
                    name: cfg.name,
                    scripts: scripts.sort((a, b) => a.name.localeCompare(b.name)),
                });
            }
        }
        categories.value = cats;
        activePanels.value = cats.filter((c) => c.scripts.length).map((c) => c.key);
    } catch {
        // interceptor handles error
    } finally {
        loading.value = false;
    }
}

function handleClickExecute(script: ScriptDefinition) {
    if (script.dangerLevel === "low") {
        directExecute(script);
    } else if (script.dangerLevel === "medium") {
        showConfirmDialog(script);
    } else {
        pendingHighScript.value = script;
        highDangerPopVisible.value = true;
    }
}

function directExecute(script: ScriptDefinition) {
    executeScript(script.id);
}

function showConfirmDialog(script: ScriptDefinition) {
    confirmScript.value = script;
    confirmDialogVisible.value = true;
}

function confirmExecution() {
    if (confirmScript.value) {
        executeScript(confirmScript.value.id);
    }
}

async function executeScript(scriptId: string) {
    executingScriptId.value = scriptId;
    executionLog.value = [];
    executionResult.value = null;
    confirmDialogVisible.value = false;
    highDangerPopVisible.value = false;
    appendLog(`[INFO] 开始执行脚本: ${scriptId}`);
    appendLog("[INFO] 正在连接服务器...");

    try {
        const startTime = Date.now();
        appendLog("[INFO] 发送执行请求...");

        const response = await http.post<unknown, { logs: string[]; success: boolean; duration?: number; message?: string; }>(
            `/db/scripts/${encodeURIComponent(scriptId)}/execute`,
            {},
            { timeout: 300000, _silent: true },
        );

        if (response.logs && response.logs.length) {
            for (const line of response.logs) {
                appendLog(line);
            }
        }

        const elapsed = Date.now() - startTime;
        executionResult.value = {
            success: response.success,
            duration: response.duration ?? elapsed,
            message: response.message,
        };

        if (response.success) {
            appendLog(`[SUCCESS] 脚本执行完成，耗时 ${formatDuration(elapsed)}`);
            MessagePlugin.success("脚本执行成功");
        } else {
            appendLog(`[ERROR] 脚本执行失败: ${response.message ?? "未知错误"}`);
            MessagePlugin.error(response.message ?? "脚本执行失败");
        }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        executionResult.value = { success: false, duration: 0, message: msg };
        appendLog(`[ERROR] 执行异常: ${msg}`);
        MessagePlugin.error(msg);
    } finally {
        executingScriptId.value = null;
        fetchScriptList();
    }
}

function appendLog(line: string) {
    executionLog.value.push(line);
    nextTick(() => {
        if (logContainerRef.value) {
            logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
        }
    });
}

function logLineClass(line: string): string {
    if (line.startsWith("[SUCCESS]") || line.startsWith("✅")) return "log-line--success";
    if (line.startsWith("[ERROR]") || line.startsWith("❌") || line.startsWith("Error")) return "log-line--error";
    if (line.startsWith("[WARN]") || line.startsWith("⚠️")) return "log-line--warn";
    return "log-line--info";
}

function logText(line: string): string {
    return line;
}

function copyLogs() {
    const text = executionLog.value.join("\n");
    navigator.clipboard.writeText(text).then(() => {
        MessagePlugin.success("日志已复制到剪贴板");
    }).catch(() => {
        MessagePlugin.error("复制失败");
    });
}

function openDetail(script: ScriptDefinition) {
    detailScript.value = script;
    detailDrawerVisible.value = true;
}

async function openPreview(script: ScriptDefinition) {
    previewScript.value = script;
    previewDrawerVisible.value = true;
    isEditing.value = false;
    previewContent.value = "";
    try {
        const res = await getScriptContent(script.id);
        previewContent.value = res.content;
    } catch {
        previewContent.value = "// 无法加载脚本内容";
    }
}

async function savePreviewContent() {
    if (!previewScript.value) return;
    savingContent.value = true;
    try {
        const summary = changeSummary.value.trim() || undefined;
        await updateScriptContent(previewScript.value.id, previewContent.value, summary);
        MessagePlugin.success("脚本保存成功");
        isEditing.value = false;
        changeSummary.value = "";
    } catch {
        // interceptor handles error
    } finally {
        savingContent.value = false;
    }
}

async function openHistory(script: ScriptDefinition) {
    historyScript.value = script;
    historyDrawerVisible.value = true;
    historyLoading.value = true;
    historyList.value = [];
    try {
        const res = await http.get<unknown, ScriptLogRow[]>(`/db/scripts/${encodeURIComponent(script.id)}/history?limit=20`, { _silent: true });
        historyList.value = res;
    } catch {
        // interceptor handles error
    } finally {
        historyLoading.value = false;
    }
}

async function openVersions(script: ScriptDefinition) {
    versionScript.value = script;
    versionDrawerVisible.value = true;
    versionLoading.value = true;
    versionList.value = [];
    try {
        const res = await getScriptVersions(script.id, 20);
        versionList.value = res;
    } catch {
        // interceptor handles error
    } finally {
        versionLoading.value = false;
    }
}

function previewVersion(ver: ScriptVersion) {
    versionPreviewTitle.value = `${versionScript.value?.name || "脚本"} - 版本 ${formatTime(ver.savedAt)}`;
    versionPreviewContent.value = ver.content;
    versionPreviewVisible.value = true;
}

async function handleRestoreVersion(ver: ScriptVersion) {
    if (!versionScript.value) return;
    restoringVersion.value = true;
    try {
        await restoreScriptVersion(versionScript.value.id, ver.id);
        MessagePlugin.success("版本恢复成功");
        // Refresh version list after restore
        await openVersions(versionScript.value);
        // If preview drawer is open for this script and not in editing mode, refresh its content
        if (previewDrawerVisible.value && previewScript.value?.id === versionScript.value.id && !isEditing.value) {
            const res = await getScriptContent(versionScript.value.id);
            previewContent.value = res.content;
        }
    } catch {
        // interceptor handles error
    } finally {
        restoringVersion.value = false;
    }
}

onMounted(fetchScriptList);

defineExpose({ refresh: fetchScriptList });
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables.scss' as *;

.db-scripts {
    padding: $space-4 0;
}

.scripts-toolbar {
    display: flex;
    align-items: center;
    gap: $space-3;
    margin-bottom: $space-4;

    .search-input {
        flex: 1;
        max-width: 320px;
    }

    .category-filter {
        width: 160px;
    }

    .danger-filter {
        width: 130px;
    }
}

.scripts-collapse {
    :deep(.t-collapse-panel__header) {
        padding: $space-3 $space-4;
        background: $overlay-white-80;
        backdrop-filter: blur(10px);
        border-radius: $radius-lg;
        margin-bottom: $space-2;
        border: 1px solid var(--color-primary-lighter);
        transition: all 0.2s ease;

        &:hover {
            border-color: var(--color-primary-light);
            box-shadow: $shadow-xs;
        }
    }

    :deep(.t-collapse-panel__content) {
        padding: 0 $space-2 $space-2;
    }

    :deep(.t-collapse-panel__wrapper) {
        border: none;
        background: transparent;
    }
}

.cat-header {
    display: flex;
    align-items: center;
    gap: $space-2;

    .cat-icon {
        font-size: 18px;
        line-height: 1;
    }

    .cat-name {
        font-size: $font-size-h4;
        font-weight: $font-weight-semibold;
        color: $text-primary;
    }

    .cat-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        border-radius: $radius-pill;
        background: var(--color-primary-bg);
        color: var(--color-primary);
        font-size: $font-size-micro;
        font-weight: $font-weight-bold;
        line-height: 20px;
    }
}

.script-list {
    display: flex;
    flex-direction: column;
    gap: $space-3;
}

.script-card {
    padding: $space-4;
    background: $bg-container;
    border: 1px solid $border-color-light;
    border-radius: $radius-lg;
    transition: all 0.2s ease;

    &:hover {
        box-shadow: $shadow-xs;
        border-color: var(--color-primary-lightest);
    }

    &--executing {
        border-color: var(--color-warning-border, #f0a040);
        background: #fffbeb;
    }
}

.card-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-2;
    margin-bottom: $space-1-5;
}

.script-name {
    font-size: $font-size-body;
    font-weight: $font-weight-semibold;
    color: $text-primary;
}

.danger-tag {
    flex-shrink: 0;
}

.script-desc {
    font-size: $font-size-body-sm;
    color: $text-secondary;
    margin: 0 0 $space-2;
    line-height: $line-height-relaxed;
}

.script-meta {
    display: flex;
    align-items: center;
    gap: $space-4;
    margin-bottom: $space-3;
    flex-wrap: wrap;
}

.meta-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: $font-size-caption;
    color: $text-tertiary;
}

.card-actions {
    display: flex;
    align-items: center;
    gap: $space-2;
    flex-wrap: wrap;
}

.log-area {
    margin-top: $space-3;
    background: #1e1e1e;
    border-radius: $radius-md;
    padding: $space-3;
    max-height: 300px;
    overflow-y: auto;
    font-family: "Consolas", "Menlo", "Monaco", "Courier New", monospace;
    font-size: $font-size-caption;
    line-height: 1.7;
    color: #d4d4d4;

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 3px;
    }
}

.log-line {
    white-space: pre-wrap;
    word-break: break-all;

    &--success {
        color: #7bc67e;
    }

    &--error {
        color: #e34d59;
    }

    &--warn {
        color: #f0a040;
    }

    &--info {
        color: #8b8b8b;
    }
}

.log-cursor {
    animation: blink 1s step-end infinite;
}

@keyframes blink {
    50% {
        opacity: 0;
    }
}

.result-bar {
    display: inline-flex;
    align-items: center;
    gap: $space-2;
    margin-top: $space-3;
    padding: $space-2 $space-3;
    background: $bg-container-alt;
    border-radius: $radius-md;
    font-size: $font-size-caption;
}

.result-icon--ok {
    color: $color-success;
}

.result-icon--err {
    color: $color-danger;
}

.result-text {
    font-weight: $font-weight-medium;
    color: $text-primary;
}

.result-duration {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    color: $text-tertiary;
    margin-left: auto;
}

.confirm-body {
    .confirm-warning {
        display: flex;
        align-items: center;
        gap: $space-2;
        font-weight: $font-weight-semibold;
        color: $text-primary;
        margin-bottom: $space-3;
    }

    .confirm-desc {
        font-size: $font-size-body-sm;
        color: $text-secondary;
        margin: 0 0 $space-2;
        line-height: $line-height-relaxed;
    }

    .confirm-meta {
        font-size: $font-size-caption;
        color: $text-tertiary;
        margin: 0 0 $space-3;
    }
}

.drawer-section {
    margin-bottom: $space-5;

    .section-item {
        display: flex;
        flex-direction: column;
        gap: $space-1;
        padding: $space-3 0;
        border-bottom: 1px solid $border-color-light;

        &:last-child {
            border-bottom: none;
        }
    }

    .section-label {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: $font-size-caption;
        color: $text-secondary;
        font-weight: $font-weight-medium;
    }

    .section-value {
        font-size: $font-size-body-sm;
        color: $text-primary;

        &.mono {
            font-family: "Consolas", "Menlo", monospace;
            font-size: $font-size-micro;
            background: $bg-container-alt;
            padding: $space-1 $space-2;
            border-radius: $radius-sm;
            word-break: break-all;
        }
    }

    .section-title {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: $font-size-body-sm;
        font-weight: $font-weight-semibold;
        color: $text-primary;
        margin: 0 0 $space-2;
    }

    .detail-list {
        padding-left: $space-5;
        margin: 0;
        color: $text-secondary;
        font-size: $font-size-body-sm;
        line-height: $line-height-relaxed;

        li {
            margin-bottom: $space-1;
        }
    }

    .last-exec-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: $space-3;
        background: $bg-container-alt;
        border-radius: $radius-md;
        font-size: $font-size-body-sm;
        color: $text-secondary;
    }
}

.preview-toolbar {
    display: flex;
    align-items: center;
    gap: $space-3;
    margin-bottom: $space-2;
    flex-wrap: wrap;

    .preview-path {
        font-size: $font-size-caption;
        color: $text-tertiary;
        font-family: "Consolas", "Menlo", monospace;
        flex: 1;
        word-break: break-all;
    }
}

.change-summary-input {
    margin-bottom: $space-3;
}

.preview-content {
    .script-editor {
        :deep(.t-textarea__inner) {
            font-family: "Consolas", "Menlo", "Monaco", "Courier New", monospace;
            font-size: $font-size-caption;
            line-height: 1.7;
        }
    }

    .script-preview {
        margin: 0;
        padding: $space-3;
        background: #1e1e1e;
        border-radius: $radius-md;
        font-family: "Consolas", "Menlo", "Monaco", "Courier New", monospace;
        font-size: $font-size-caption;
        line-height: 1.7;
        color: #d4d4d4;
        overflow-x: auto;
        white-space: pre;
        word-break: normal;
        max-height: 600px;
        overflow-y: auto;

        &::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }

        &::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 3px;
        }
    }
}

.history-list {
    display: flex;
    flex-direction: column;
    gap: $space-3;
}

.history-item {
    padding: $space-3;
    background: $bg-container;
    border: 1px solid $border-color-light;
    border-radius: $radius-lg;

    .history-header {
        display: flex;
        align-items: center;
        gap: $space-2;
        margin-bottom: $space-2;

        .history-time {
            font-size: $font-size-caption;
            color: $text-tertiary;
        }

        .history-duration {
            display: inline-flex;
            align-items: center;
            gap: 2px;
            font-size: $font-size-caption;
            color: $text-tertiary;
            margin-left: auto;
        }
    }

    .history-summary {
        margin-bottom: $space-2;

        pre {
            margin: 0;
            padding: $space-2;
            background: $bg-container-alt;
            border-radius: $radius-md;
            font-family: "Consolas", "Menlo", monospace;
            font-size: $font-size-micro;
            color: $text-secondary;
            white-space: pre-wrap;
            word-break: break-all;
            max-height: 200px;
            overflow-y: auto;
        }
    }

    .history-error {
        margin-bottom: $space-2;
    }

    .history-trigger {
        font-size: $font-size-caption;
        color: $text-tertiary;
    }
}

.version-list {
    display: flex;
    flex-direction: column;
    gap: $space-3;
}

.version-item {
    padding: $space-3;
    background: $bg-container;
    border: 1px solid $border-color-light;
    border-radius: $radius-lg;

    .version-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: $space-2;

        .version-badge {
            display: flex;
            align-items: center;
            gap: $space-2;

            .version-number {
                font-size: $font-size-body;
                font-weight: $font-weight-bold;
                color: var(--color-primary);
            }
        }

        .version-time {
            font-size: $font-size-caption;
            color: $text-tertiary;
        }
    }

    .version-summary {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: $font-size-body-sm;
        color: $text-secondary;
        margin-bottom: $space-2;
        padding: $space-2;
        background: $bg-container-alt;
        border-radius: $radius-md;
    }

    .version-meta {
        font-size: $font-size-caption;
        color: $text-tertiary;
        margin-bottom: $space-2;
    }

    .version-actions {
        display: flex;
        align-items: center;
        gap: $space-2;
    }
}

.version-preview-content {
    margin: 0;
    padding: $space-3;
    background: #1e1e1e;
    border-radius: $radius-md;
    font-family: "Consolas", "Menlo", "Monaco", "Courier New", monospace;
    font-size: $font-size-caption;
    line-height: 1.7;
    color: #d4d4d4;
    overflow-x: auto;
    white-space: pre;
    word-break: normal;
    max-height: 500px;
    overflow-y: auto;

    &::-webkit-scrollbar {
        width: 6px;
        height: 6px;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 3px;
    }
}

@media screen and (max-width: 768px) {
    .scripts-toolbar {
        flex-wrap: wrap;

        .search-input {
            max-width: 100%;
            width: 100%;
        }

        .category-filter,
        .danger-filter {
            flex: 1;
        }
    }

    .card-actions {
        .t-button {
            flex: 1;
        }
    }
}
</style>
