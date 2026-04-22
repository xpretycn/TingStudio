<template>
  <div class="ai-assistant" :aria-busy="!initialized">
    <section class="dashboard-grid">
      <div v-for="(card, idx) in dashboardCards" :key="card.label" class="stat-card"
        :style="{ animationDelay: `${(idx + 1) * 0.1}s` }">
        <div class="stat-card-top">
          <div class="stat-icon" :style="{ background: card.iconBg, color: card.iconColor }">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" v-html="card.iconPath"></svg>
          </div>
          <span class="stat-badge" :style="{ color: card.badgeColor, background: card.badgeBg }">{{ card.badge }}</span>
        </div>
        <p class="stat-label">{{ card.label }}</p>
        <p class="stat-value">{{ card.value }} <small class="stat-unit">{{ card.unit }}</small></p>
      </div>
    </section>

    <Transition name="content-fade" mode="out-in">
      <PageSkeleton v-if="!initialized" type="cards" :rows="3" />
      <t-card v-else class="content-card" bordered>
        <div class="data-center-toolbar">
          <div class="toolbar-left-section">
            <div class="toolbar-title-section">
              <h3 class="toolbar-title">AI 智能助手</h3>
              <p class="toolbar-subtitle">智能配方解析、数据检索与营养分析</p>
            </div>
          </div>
          <div class="toolbar-right-section">
            <div class="model-select-inline">
              <div class="model-grid">
                <template v-if="aiStore.models.length > 0">
                  <button v-for="model in aiStore.models" :key="model.provider" type="button" class="model-btn"
                    :class="{ active: aiStore.selectedModel === model.provider }" @click="selectModel(model.provider)">
                    <div class="model-logo-wrap">
                      <img loading="lazy" :src="getModelLogo(model)" :alt="model.name" class="model-logo"
                        @error="(e: Event) => handleLogoError(e)" />
                      <span class="model-fallback" :style="{ color: getFallbackColor(model) }">
                        {{ getFallbackLetter(model) }}
                      </span>
                    </div>
                    <span class="model-btn-name">{{ model.name }}</span>
                  </button>
                </template>
                <div v-else class="no-models-inline">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>暂无模型</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="ai-body">
          <div class="ai-nav">
            <div v-for="tab in tabs" :key="tab.value" class="nav-tab" :class="{ active: activeTab === tab.value }"
              role="tab" tabindex="0" @click="activeTab = tab.value" @keydown.enter="activeTab = tab.value">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" v-html="tab.iconPath"></svg>
              <span class="nav-tab-label">{{ tab.label }}</span>
            </div>
          </div>

          <div class="ai-content">
            <div v-show="activeTab === 'smart-form'" class="tab-panel">
              <div class="upload-section">
                <div class="upload-area" :class="{ 'upload-area--active': selectedFile }" @click="triggerFileUpload"
                  @dragover.prevent @drop.prevent="handleDrop">
                  <input type="file" ref="fileInput" accept=".xlsx,.xls,.csv,.png,.jpg,.jpeg,.gif,.webp"
                    @change="handleFileInputChange" style="display:none" />
                  <div class="upload-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p class="upload-text">{{ selectedFile ? selectedFile.name : '点击或拖拽上传文件' }}</p>
                    <p class="upload-hint">支持 Excel (.xlsx/.xls) 和图片 (.png/.jpg)，最大 10MB</p>
                  </div>
                </div>
                <div v-if="selectedFile" class="file-selected-row">
                  <div class="file-info">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span>{{ selectedFile.name }}</span>
                    <span class="file-size">{{ (selectedFile.size / 1024).toFixed(1) }}KB</span>
                  </div>
                  <div class="file-actions">
                    <button class="parse-btn" :disabled="!aiStore.selectedModel || aiStore.parseLoading"
                      @click="handleParse">
                      <svg v-if="!aiStore.parseLoading" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                        <path d="M2 17L12 22L22 17" stroke-linecap="round" stroke-linejoin="round" />
                        <path d="M2 12L12 17L22 12" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                      {{ aiStore.parseLoading ? '解析中...' : 'AI 解析' }}
                    </button>
                    <button class="clear-file-btn" @click="clearSelectedFile">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div v-if="aiStore.parseLoading" class="parse-loading">
                <t-loading size="large" text="AI 正在解析文件内容..." />
              </div>

              <t-alert v-if="aiStore.parseError" :message="aiStore.parseError" theme="error" closable
                style="margin-top: 16px; border-radius: 12px;" />

              <div v-if="aiStore.parseResult" class="parse-result">
                <div class="result-header">
                  <h4 class="result-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    解析结果预览
                  </h4>
                  <div class="result-actions">
                    <button class="table-action-btn table-action-btn--danger" @click="aiStore.clearParseResult()">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>清空
                    </button>
                    <button class="table-action-btn table-action-btn--primary" @click="handleReparse">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                      </svg>重新解析
                    </button>
                    <button class="add-formula-btn add-formula-btn--sm" @click="handleConfirmFormula">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>确认填入配方
                    </button>
                  </div>
                </div>

                <div class="result-info">
                  <div class="info-row">
                    <span class="label">配方名称</span>
                    <span class="value highlight">{{ aiStore.parseResult.name }}</span>
                  </div>
                  <div v-if="aiStore.parseResult.salesmanName" class="info-row">
                    <span class="label">业务员</span>
                    <span class="value">{{ aiStore.parseResult.salesmanName }}</span>
                  </div>
                  <div v-if="aiStore.parseResult.formulaDate" class="info-row">
                    <span class="label">配方时间</span>
                    <span class="value">{{ aiStore.parseResult.formulaDate }}</span>
                  </div>
                  <div v-if="aiStore.parseResult.finishedWeight" class="info-row">
                    <span class="label">成品重量</span>
                    <span class="value">{{ aiStore.parseResult.finishedWeight }}g</span>
                  </div>
                  <div v-if="aiStore.parseResult.usage" class="info-row">
                    <span class="label">Token 用量</span>
                    <span class="value token-value">{{ aiStore.parseResult.usage.totalTokens }}</span>
                  </div>
                  <div v-if="aiStore.parseResult.description" class="info-row">
                    <span class="label">备注</span>
                    <span class="value">{{ aiStore.parseResult.description }}</span>
                  </div>
                </div>

                <t-table :data="aiStore.parseResult.materials" :columns="materialColumns" row-key="name" size="small"
                  table-layout="auto" bordered stripe>
                  <template #matched="{ row }">
                    <t-tag v-if="row.matched" theme="success" variant="light" size="small">已匹配</t-tag>
                    <t-tag v-else theme="warning" variant="light" size="small">未匹配</t-tag>
                  </template>
                </t-table>
              </div>

              <t-alert v-if="!aiStore.models.length && !aiStore.parseLoading" message="未配置 AI 模型" theme="warning"
                style="border-radius: 12px; margin-top: 16px;">
                <template #default>
                  请在后端 .env 文件中配置至少一个 AI 模型的 API Key：
                  <code>AI_DASHSCOPE_API_KEY</code>、
                  <code>AI_ZHIPU_API_KEY</code> 或
                  <code>AI_DEEPSEEK_API_KEY</code>
                </template>
              </t-alert>
            </div>

            <div v-show="activeTab === 'smart-search'" class="tab-panel">
              <div class="search-input-area">
                <t-textarea v-model="searchQuery" placeholder="试试输入：查找含有黄芪且成品重量大于100g的配方"
                  :autosize="{ minRows: 3, maxRows: 6 }" @keydown.enter.ctrl="handleSearch" />
                <button class="search-send-btn" :disabled="!searchQuery.trim() || !aiStore.selectedModel"
                  :class="{ 'search-send-btn--loading': aiStore.searchLoading }" @click="handleSearch">
                  <svg v-if="!aiStore.searchLoading" width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <t-loading v-else size="small" />
                </button>
              </div>

              <div class="quick-tags">
                <span class="quick-tags-label">试试：</span>
                <t-tag v-for="tag in quickTags" :key="tag" size="medium" variant="outline" class="quick-tag"
                  @click="fillAndSearch(tag)">{{ tag }}</t-tag>
              </div>

              <t-alert v-if="aiStore.searchError" :message="aiStore.searchError" theme="error" closable
                style="margin-top: 16px; border-radius: 12px;" />

              <div v-if="aiStore.searchResult" class="search-result">
                <div class="sql-card">
                  <div class="sql-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    <span class="sql-label">生成的 SQL</span>
                    <t-tag theme="primary" variant="light" size="small" style="margin-left: auto">
                      {{ aiStore.searchResult.rowCount }} 条结果
                    </t-tag>
                  </div>
                  <pre class="sql-code">{{ aiStore.searchResult.sql }}</pre>
                </div>

                <div v-if="aiStore.searchResult.rows.length" class="result-table">
                  <t-table :data="aiStore.searchResult.rows" :columns="searchResultColumns" size="small"
                    table-layout="auto" bordered stripe max-height="400" />
                </div>

                <div v-else class="empty-result">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>未查询到匹配的数据</span>
                </div>
              </div>

              <div v-if="aiStore.searchHistory.length && !aiStore.searchResult" class="search-history">
                <span class="history-label">搜索历史</span>
                <t-tag v-for="(h, idx) in aiStore.searchHistory" :key="idx" size="medium" variant="outline"
                  class="history-tag" @click="fillAndSearch(h)">{{ h }}</t-tag>
              </div>
            </div>
          </div>
        </div>
      </t-card>
    </Transition>

    <section class="activity-section">
      <div class="activity-card activity-card--timeline">
        <div class="activity-header">
          <h4 class="activity-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            近期操作动态
          </h4>
          <div class="activity-nav">
            <button class="activity-nav-btn" :disabled="activityPage <= 1" @click="activityPrev" title="上一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span class="activity-nav-page">{{ activityPage }} / {{ activityTotalPages }}</span>
            <button class="activity-nav-btn" :disabled="activityPage >= activityTotalPages" @click="activityNext"
              title="下一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
        <div class="timeline-list">
          <div v-for="(item, index) in pagedActivityItems" :key="index" class="timeline-item"
            :class="{ 'timeline-item--last': index === pagedActivityItems.length - 1 }">
            <div class="timeline-dot" :class="'timeline-dot--' + item.type">
              <span class="timeline-dot-inner"></span>
            </div>
            <div class="timeline-content">
              <p class="timeline-title">{{ item.title }}</p>
              <p class="timeline-desc" v-html="item.desc"></p>
              <span class="timeline-time">{{ item.time }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="activity-card activity-card--assistant">
        <div class="assistant-content">
          <h4 class="assistant-title">AI 助手中心</h4>
          <p class="assistant-desc">{{ assistantMessage }}</p>
          <button class="assistant-btn" @click="activeTab = 'smart-form'">
            {{ activeTab === 'smart-form' ? '切换到智能检索' : '开始智能填单' }}
          </button>
          <div class="assistant-footer">
            <div class="assistant-avatar-group">
              <span class="assistant-avatar">AI</span>
              <span class="assistant-avatar">智</span>
              <span class="assistant-avatar">能</span>
            </div>
            <span class="assistant-hint">{{ aiStore.models.length }} 个模型可用</span>
          </div>
        </div>
        <svg class="assistant-bg-icon" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" />
          <path d="M2 17L12 22L22 17" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M2 12L12 17L22 12" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAiStore } from '@/stores/ai';
import { MessagePlugin } from 'tdesign-vue-next';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';

const router = useRouter();
const aiStore = useAiStore();

const initialized = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const tabs = [
  {
    value: 'smart-form',
    label: '智能填单',
    iconPath: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  },
  {
    value: 'smart-search',
    label: '智能检索',
    iconPath: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  },
];
const activeTab = ref('smart-form');

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];

const selectModel = (model: string) => {
  aiStore.selectedModel = model;
};

const MODEL_LOGO_MAP: Record<string, string> = {
  openai: 'openai',
  gpt: 'openai',
  chatgpt: 'openai',
  anthropic: 'claude',
  claude: 'claude',
  google: 'google',
  gemini: 'google',
  deepseek: 'deepseek',
  qwen: 'qwen',
  tongyi: 'qwen',
  '通义千问': 'qwen',
  zhipu: 'zhipu',
  chatglm: 'zhipu',
  智谱: 'zhipu',
  glm: 'zhipu',
  baidu: 'baidu',
  wenxin: 'baidu',
  文心: 'baidu',
  doubao: 'bytedance',
  豆包: 'bytedance',
  bytedance: 'bytedance',
  moonshot: 'moonshot',
  kimi: 'moonshot',
  月之暗面: 'moonshot',
  minimax: 'minimax',
  hunyuan: 'tencent',
  腾讯: 'tencent',
};

const FALLBACK_ICONS: Record<string, { letter: string; color: string; }> = {
  openai: { letter: 'O', color: '#10a37f' },
  claude: { letter: 'C', color: '#d97757' },
  google: { letter: 'G', color: '#4285f4' },
  deepseek: { letter: 'D', color: '#4b6bfb' },
  qwen: { letter: 'Q', color: '#6366f1' },
  alibabacloud: { letter: 'Q', color: '#ff6a00' },
  zhipu: { letter: 'Z', color: '#4268fa' },
  baidu: { letter: 'B', color: '#2932e1' },
  bytedance: { letter: 'D', color: '#25f4ee' },
  moonshot: { letter: 'M', color: '#000' },
  minimax: { letter: 'M', color: '#615ced' },
  tencent: { letter: 'T', color: '#0052d9' },
};

const getModelSlug = (model: any): string => {
  const provider = (model.provider || '').toLowerCase();
  const name = (model.name || '').toLowerCase();
  for (const [key, slug] of Object.entries(MODEL_LOGO_MAP)) {
    if (provider.includes(key) || name.includes(key)) {
      if ((slug as string).startsWith('http')) return key;
      return slug;
    }
  }
  return 'openai';
};

const getModelLogo = (model: any): string => {
  const provider = (model.provider || '').toLowerCase();
  const name = (model.name || '').toLowerCase();
  for (const [key, slug] of Object.entries(MODEL_LOGO_MAP)) {
    if (provider.includes(key) || name.includes(key)) {
      return (slug as string).startsWith('http') ? slug : `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/${slug}.svg`;
    }
  }
  return `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/openai.svg`;
};

const getFallbackLetter = (model: any): string => {
  return FALLBACK_ICONS[getModelSlug(model)]?.letter || '?';
};

const getFallbackColor = (model: any): string => {
  return FALLBACK_ICONS[getModelSlug(model)]?.color || '#94a3b8';
};

const handleLogoError = (e: Event) => {
  const img = e.target as HTMLImageElement;
  img.style.display = 'none';
  const wrap = img.parentElement;
  if (wrap) {
    const fallback = wrap.querySelector('.model-fallback');
    if (fallback) (fallback as HTMLElement).style.display = 'flex';
  }
};

const selectedFile = ref<File | null>(null);

const handleDrop = (e: DragEvent) => {
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    processFile(files[0]);
  }
};

const triggerFileUpload = () => {
  fileInput.value?.click();
};

const handleFileInputChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    processFile(input.files[0]);
  }
};

const processFile = (file: File) => {
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    MessagePlugin.warning('文件大小不能超过 10MB');
    return;
  }
  selectedFile.value = file;
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (IMAGE_EXTS.includes(ext)) {
    const currentModel = aiStore.models.find(m => m.provider === aiStore.selectedModel);
    if (!currentModel?.supportsVision) {
      const visionModel = aiStore.models.find(m => m.supportsVision);
      if (visionModel) aiStore.selectedModel = visionModel.provider;
    }
  }
};

const clearSelectedFile = () => {
  selectedFile.value = null;
  if (fileInput.value) fileInput.value.value = '';
};

const handleParse = async () => {
  if (!selectedFile.value) {
    MessagePlugin.warning('请先选择要解析的文件');
    return;
  }
  if (!aiStore.selectedModel) {
    MessagePlugin.warning('请先选择 AI 模型');
    return;
  }
  await aiStore.parseFormula(selectedFile.value);
};

const handleReparse = () => {
  aiStore.clearParseResult();
  if (selectedFile.value) {
    handleParse();
  }
};

const handleConfirmFormula = () => {
  if (!aiStore.parseResult) return;
  const data = aiStore.parseResult;
  const params = new URLSearchParams({
    ai: 'true',
    name: data.name,
    materials: JSON.stringify(data.materials),
    ...(data.finishedWeight ? { finishedWeight: String(data.finishedWeight) } : {}),
    ...(data.salesmanName ? { salesmanName: data.salesmanName } : {}),
    ...(data.formulaDate ? { formulaDate: data.formulaDate } : {}),
    ...(data.description ? { description: data.description } : {}),
  });
  router.push(`/formulas/new?${params.toString()}`);
};

const materialColumns = [
  { colKey: 'name', title: '原料名称', width: 160 },
  { colKey: 'quantity', title: '用量', width: 100 },
  { colKey: 'unit', title: '单位', width: 80 },
  { colKey: 'matched', title: '匹配状态', width: 100, cell: 'matched' },
];

const searchQuery = ref('');
const quickTags = [
  '含黄芪的配方有哪些',
  '最近创建的5个配方',
  '库存大于100的药材',
  '成品重量大于200g的配方',
];

const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    MessagePlugin.warning('请输入查询内容');
    return;
  }
  if (!aiStore.selectedModel) {
    MessagePlugin.warning('请先选择 AI 模型');
    return;
  }
  await aiStore.naturalSearch(searchQuery.value.trim());
};

const fillAndSearch = (text: string) => {
  searchQuery.value = text;
  handleSearch();
};

const searchResultColumns = computed(() => {
  if (!aiStore.searchResult?.rows?.length) return [];
  const keys = Object.keys(aiStore.searchResult.rows[0]);
  return keys.map(key => ({
    colKey: key,
    title: key,
    ellipsis: true,
    width: 150,
  }));
});

const dashboardCards = computed(() => {
  const models = aiStore.models.length;
  const hasResult = !!aiStore.parseResult;
  const hasSearch = !!aiStore.searchResult;
  const totalTokens = (aiStore.parseResult?.usage?.totalTokens || 0) +
    (aiStore.searchResult?.usage?.totalTokens || 0);
  return [
    {
      label: '可用模型',
      value: models.toString(),
      unit: '个',
      badge: models > 0 ? `${models} 个就绪` : '未配置',
      badgeColor: models > 0 ? '#10B981' : '#EF4444',
      badgeBg: models > 0 ? '#ECFDF5' : '#FEF2F2',
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      iconPath: '<path d="M12 2L2 7L12 12L22 7L12 2Z"/><path d="M2 17L12 22L22 17" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12L12 17L22 12" stroke-linecap="round" stroke-linejoin="round"/>',
    },
    {
      label: '解析状态',
      value: hasResult ? '已完成' : '待解析',
      unit: '',
      badge: aiStore.parseLoading ? '解析中...' : hasResult ? '成功' : '等待',
      badgeColor: aiStore.parseLoading ? '#F59E0B' : hasResult ? '#10B981' : '#94A3B8',
      badgeBg: aiStore.parseLoading ? '#FFFBEB' : hasResult ? '#ECFDF5' : '#F1F5F9',
      iconBg: hasResult ? '#ECFDF5' : '#EFF6FF',
      iconColor: hasResult ? '#10B981' : '#3B82F6',
      iconPath: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    },
    {
      label: '检索状态',
      value: hasSearch ? '已完成' : '待检索',
      unit: '',
      badge: aiStore.searchLoading ? '查询中...' : hasSearch ? '完成' : '空闲',
      badgeColor: aiStore.searchLoading ? '#F59E0B' : hasSearch ? '#10B981' : '#94A3B8',
      badgeBg: aiStore.searchLoading ? '#FFFBEB' : hasSearch ? '#ECFDF5' : '#F1F5F9',
      iconBg: hasSearch ? '#ECFDF5' : '#FAF5FF',
      iconColor: hasSearch ? '#A855F7' : '#A855F7',
      iconPath: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    },
    {
      label: 'Token 用量',
      value: totalTokens > 0 ? totalTokens.toLocaleString() : '—',
      unit: '',
      badge: totalTokens > 0 ? `已消耗 ${totalTokens}` : '暂无',
      badgeColor: totalTokens > 0 ? '#F59E0B' : '#94A3B8',
      badgeBg: totalTokens > 0 ? '#FFFBEB' : '#F1F5F9',
      iconBg: '#FFFBEB',
      iconColor: '#F59E0B',
      iconPath: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>',
    },
  ];
});

interface ActivityItem { type: 'success' | 'info' | 'warning'; title: string; desc: string; time: string; }
const ACTIVITY_PAGE_SIZE = 4;
const activityPage = ref(1);
const activityHistory = ref<ActivityItem[]>([]);

const addActivity = (item: ActivityItem) => {
  activityHistory.value.unshift(item);
  if (activityHistory.value.length > 50) activityHistory.value = activityHistory.value.slice(0, 50);
  activityPage.value = 1;
};

const allActivityItems = computed<ActivityItem[]>(() => {
  if (activityHistory.value.length > 0) return activityHistory.value;
  return [{
    type: 'info',
    title: '等待操作',
    desc: '选择 AI 模型后，可以开始智能填单或智能检索功能',
    time: '',
  }];
});

const activityTotalPages = computed(() => Math.max(1, Math.ceil(allActivityItems.value.length / ACTIVITY_PAGE_SIZE)));
const pagedActivityItems = computed(() => {
  const start = (activityPage.value - 1) * ACTIVITY_PAGE_SIZE;
  return allActivityItems.value.slice(start, start + ACTIVITY_PAGE_SIZE);
});
const activityPrev = () => { if (activityPage.value > 1) activityPage.value--; };
const activityNext = () => { if (activityPage.value < activityTotalPages.value) activityPage.value++; };

const assistantMessage = computed(() => {
  const models = aiStore.models.length;
  if (models === 0) return '尚未配置 AI 模型，请在工具栏选择或联系管理员配置。';
  if (!aiStore.selectedModel) return `已配置 ${models} 个 AI 模型，请在上方选择一个模型开始使用。`;
  if (activeTab.value === 'smart-form') {
    if (!selectedFile.value) return '上传配方图片或 Excel 文件，AI 将自动识别原料信息并填入表单。';
    if (aiStore.parseLoading) return '正在解析文件内容，请稍候...';
    if (aiStore.parseResult) return '解析完成！点击「确认填入配方」将结果导入到新配方表单。';
    return '已选择文件，点击「AI 解析」按钮开始智能识别。';
  }
  if (!searchQuery.value) return '输入自然语言描述，AI 将自动生成 SQL 并查询数据库。';
  if (aiStore.searchLoading) return '正在执行智能检索，请稍候...';
  if (aiStore.searchResult) return '检索完成！您可以查看生成的 SQL 和查询结果。';
  return '输入查询条件后，按 Ctrl+Enter 或点击发送按钮进行检索。';
});

watch(() => aiStore.parseResult, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    addActivity({
      type: 'success',
      title: '配方解析完成',
      desc: `配方 <strong>${newVal.name}</strong> 已解析，包含 <strong>${newVal.materials?.length || 0}</strong> 种原料`,
      time: new Date().toLocaleString('zh-CN'),
    });
  }
});

watch(() => aiStore.searchResult, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    addActivity({
      type: 'success',
      title: '智能检索完成',
      desc: `查询返回 <strong>${newVal.rowCount}</strong> 条结果${newVal.usage ? `，消耗 ${newVal.usage.totalTokens} Token` : ''}`,
      time: new Date().toLocaleString('zh-CN'),
    });
  }
});

watch(() => aiStore.parseError, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    addActivity({
      type: 'warning',
      title: '解析异常',
      desc: `配方解析遇到错误：${newVal}`,
      time: new Date().toLocaleString('zh-CN'),
    });
  }
});

watch(() => aiStore.searchError, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    addActivity({
      type: 'warning',
      title: '检索异常',
      desc: `智能检索遇到错误：${newVal}`,
      time: new Date().toLocaleString('zh-CN'),
    });
  }
});

onMounted(async () => {
  await aiStore.fetchModels();
  initialized.value = true;
});
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.ai-assistant {
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    margin-bottom: 30px;

    .stat-card {
      background: #fff;
      padding: 24px;
      border-radius: 24px;
      border: 1px solid #fff;
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
      transition: all $transition-slow;
      animation: dashboard-fade-in 0.5s ease forwards;
      opacity: 0;

      &:hover {
        border-color: #DBEAFE;
        transform: translateY(-2px);
        box-shadow: 0 14px 36px -6px rgba(0, 0, 0, 0.08);
      }

      .stat-card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
      }

      .stat-icon {
        width: 48px;
        height: 48px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .stat-badge {
        font-size: 12px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 8px;
        white-space: nowrap;
      }

      .stat-label {
        font-size: 14px;
        color: #94A3B8;
        margin-bottom: 4px;
      }

      .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: #0F172A;
        line-height: 1.2;

        .stat-unit {
          font-size: 14px;
          font-weight: 400;
          color: #94A3B8;
        }
      }
    }
  }

  .content-card {
    min-height: 500px;
    border-radius: 24px !important;
    overflow: hidden;
    border: none;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);

    :deep(.t-card__body) {
      padding: 0;
    }
  }

  .data-center-toolbar {
    padding: 28px 32px;
    border-bottom: 1px solid #f8fafc;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    position: relative;
    min-height: 80px;

    .toolbar-left-section {
      flex: 1;
      min-width: 240px;

      .toolbar-title-section {
        .toolbar-title {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 4px 0;
        }

        .toolbar-subtitle {
          font-size: 14px;
          color: #94a3b8;
          margin: 0;
        }
      }
    }

    .toolbar-right-section {
      display: flex;
      align-items: center;
      gap: 12px;

      .model-select-inline {
        .model-grid {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;

          .model-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 14px;
            background: $overlay-emerald-04;
            border: 1px solid rgba(148, 163, 184, 0.18);
            border-radius: 14px;
            color: #64748b;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all $transition-normal;
            opacity: 0.8;
            white-space: nowrap;

            &:hover {
              opacity: 1;
              background: $overlay-emerald-08;
              border-color: $overlay-emerald-25;
              transform: translateY(-1px);
            }

            &.active {
              background: linear-gradient(135deg, $overlay-emerald-12 0%, rgba(45, 212, 191, 0.08) 100%);
              border-color: $overlay-emerald-35;
              opacity: 1;
              color: #059669;
              box-shadow: 0 4px 12px -2px $overlay-emerald-12;
            }

            .model-logo-wrap {
              position: relative;
              width: 26px;
              height: 26px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }

            .model-logo {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }

            .model-fallback {
              display: none;
              position: absolute;
              inset: 0;
              align-items: center;
              justify-content: center;
              font-size: 13px;
              font-weight: 700;
              background: $overlay-emerald-08;
              border-radius: 6px;
            }

            .model-btn-name {
              line-height: 1.2;
            }
          }

          .no-models-inline {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            font-size: 12px;
            color: #94a3b8;
          }
        }
      }
    }
  }

  .ai-body {
    display: flex;
    gap: 0;
    min-height: 480px;
  }

  .ai-nav {
    width: 140px;
    flex-shrink: 0;
    padding: 24px 12px;

    .nav-tab {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 12px;
      cursor: pointer;
      transition: all $transition-normal;
      color: #64748b;
      font-size: 14px;
      font-weight: 500;
      border: 1px solid transparent;
      margin-bottom: 8px;

      &:hover {
        background: #f1f5f9;
        color: #334155;
      }

      &.active {
        background: linear-gradient(135deg, #10B981, #059669);
        color: white;
        box-shadow: 0 4px 12px $overlay-emerald-25;
        border-color: transparent;
        font-weight: 600;
      }

      .nav-tab-label {
        flex: 1;
      }
    }
  }

  .ai-content {
    flex: 1;
    min-width: 0;
    padding: 24px 28px;
  }

  .tab-panel {
    animation: fadeInUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
  }

  .upload-section {
    margin-bottom: 24px;
  }

  .upload-area {
    border: 2px dashed #e2e8f0;
    border-radius: 16px;
    padding: 40px 24px;
    text-align: center;
    cursor: pointer;
    transition: all $transition-slow;
    background: #fafbfc;

    &:hover {
      border-color: #10B981;
      background: #f0fdf4;
    }

    &--active {
      border-color: #10B981;
      border-style: solid;
      background: #ecfdf5;
    }

    .upload-placeholder {
      .upload-text {
        font-size: 15px;
        font-weight: 600;
        color: #334155;
        margin: 12px 0 4px;
      }

      .upload-hint {
        font-size: 13px;
        color: #94a3b8;
        margin: 0;
      }
    }
  }

  .file-selected-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 16px;
    padding: 14px 18px;
    background: linear-gradient(135deg, #ecfdf5, #f0fdf4);
    border: 1px solid #bbf7d0;
    border-radius: 12px;

    .file-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #334155;
      font-weight: 500;

      .file-size {
        color: #94a3b8;
        font-size: 12px;
        font-weight: 400;
      }
    }

    .file-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .parse-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border-radius: 10px;
    background: linear-gradient(135deg, #10b981, #059669);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition: all $transition-normal;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px $overlay-emerald-35;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .clear-file-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    background: #fff;
    color: #94a3b8;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: #fef2f2;
      color: #ef4444;
    }
  }

  .add-formula-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    border-radius: 12px;
    background: linear-gradient(135deg, #374151, #1f2937);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition: all $transition-normal;
    white-space: nowrap;
    margin-left: 12px;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(55, 65, 81, 0.35);
    }

    &:active {
      transform: translateY(0);
    }

    &--sm {
      padding: 8px 16px;
      font-size: 12px;
      margin-left: 0;
      background: linear-gradient(135deg, #10b981, #059669);

      &:hover {
        box-shadow: 0 6px 20px $overlay-emerald-35;
      }
    }
  }

  .parse-loading {
    display: flex;
    justify-content: center;
    padding: 32px 0;
  }

  .parse-result {
    margin-top: 20px;

    .result-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;

      .result-title {
        font-size: 16px;
        font-weight: 700;
        color: #1e293b;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .result-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    .result-info {
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      border-radius: 16px;
      padding: 20px 24px;
      margin-bottom: 20px;
      border: 1px solid #f1f5f9;

      .info-row {
        display: flex;
        align-items: flex-start;
        padding: 10px 0;

        &:not(:last-child) {
          border-bottom: 1px dashed #e2e8f0;
        }

        .label {
          width: 80px;
          flex-shrink: 0;
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }

        .value {
          font-size: 14px;
          color: #1e293b;
          font-weight: 500;

          &.highlight {
            color: #10B981;
            font-weight: 700;
            font-size: 16px;
          }

          &.token-value {
            color: #F59E0B;
            font-weight: 700;
          }
        }
      }
    }
  }

  .table-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all $transition-fast;
    background: transparent;

    &--primary {
      color: #3b82f6;

      &:hover {
        background: #eff6ff;
      }
    }

    &--success {
      color: #10b981;

      &:hover {
        background: #ecfdf5;
      }
    }

    &--danger {
      color: #ef4444;

      &:hover {
        background: #fef2f2;
      }
    }
  }

  .search-input-area {
    position: relative;
    margin-bottom: 16px;

    .search-send-btn {
      position: absolute;
      right: 12px;
      bottom: 12px;
      z-index: 1;
      width: 38px;
      height: 38px;
      border-radius: 10px;
      border: none;
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all $transition-normal;
      box-shadow: 0 4px 12px $overlay-emerald-25;

      &:hover:not(:disabled) {
        transform: scale(1.05);
        box-shadow: 0 6px 16px $overlay-emerald-35;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      &--loading {
        background: #e2e8f0;
        box-shadow: none;
      }
    }
  }

  .quick-tags {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
    flex-wrap: wrap;

    .quick-tags-label {
      font-size: 13px;
      color: #64748b;
      flex-shrink: 0;
      font-weight: 500;
    }

    .quick-tag {
      cursor: pointer;
      transition: all $transition-fast;
      border-radius: 8px;

      &:hover {
        color: #10B981;
        border-color: #86efac;
        background: #ecfdf5;
      }
    }
  }

  .sql-card {
    border-radius: 16px;
    padding: 20px 24px;
    margin-bottom: 20px;
    background: #1e293b;
    border: 1px solid #334155;

    .sql-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;

      .sql-label {
        font-size: 14px;
        font-weight: 600;
        color: #e2e8f0;
      }
    }

    .sql-code {
      font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
      font-size: 13px;
      line-height: 1.7;
      color: #93c5fd;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
    }
  }

  .empty-result {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 48px 0;
    color: #94a3b8;
    font-size: 14px;
  }

  .search-history {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 20px;
    padding: 16px 20px;
    background: #f8fafc;
    border-radius: 12px;

    .history-label {
      font-size: 12px;
      color: #94a3b8;
      font-weight: 500;
    }

    .history-tag {
      cursor: pointer;
      transition: all $transition-fast;
      border-radius: 8px;

      &:hover {
        color: #10B981;
        border-color: #86efac;
        background: #ecfdf5;
      }
    }
  }

  .activity-section {
    margin-top: 40px;
    padding-bottom: 32px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 32px;

    @media (min-width: 1024px) {
      grid-template-columns: 2fr 1fr;
    }
  }

  .activity-card {
    background-color: #fff;
    border-radius: 24px;
    padding: 32px;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
    border: 1px solid #f8fafc;

    &--assistant {
      background: linear-gradient(135deg, #10B981, #059669);
      border: none;
      color: #fff;
      position: relative;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px $overlay-emerald-15, 0 10px 10px -5px $overlay-emerald-04;
    }
  }

  .activity-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .activity-title {
    font-size: 17px;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .activity-nav {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .activity-nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: none;
    background: #f1f5f9;
    color: #64748b;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover:not(:disabled) {
      background: #e2e8f0;
      color: #334155;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .activity-nav-page {
    font-size: 13px;
    font-weight: 600;
    color: #94a3b8;
    min-width: 40px;
    text-align: center;
  }

  .timeline-list {
    position: relative;

    &::before {
      content: '';
      position: absolute;
      left: 11px;
      top: 8px;
      bottom: 8px;
      width: 2px;
      background: #e2e8f0;
      border-radius: 1px;
    }
  }

  .timeline-item {
    display: flex;
    gap: 16px;
    position: relative;
    padding-bottom: 20px;

    &:last-child {
      padding-bottom: 0;
    }
  }

  .timeline-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    z-index: 1;
    background: #fff;
    border: 2px solid #e2e8f0;

    &--success {
      border-color: #10b981;

      .timeline-dot-inner {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
      }
    }

    &--info {
      border-color: #3b82f6;

      .timeline-dot-inner {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #3b82f6;
      }
    }

    &--warning {
      border-color: #f59e0b;

      .timeline-dot-inner {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #f59e0b;
      }
    }
  }

  .timeline-content {
    flex: 1;
    min-width: 0;
  }

  .timeline-title {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 4px 0;
  }

  .timeline-desc {
    font-size: 13px;
    color: #64748b;
    line-height: 1.5;
    margin: 0 0 4px 0;

    strong {
      color: #334155;
      font-weight: 600;
    }
  }

  .timeline-time {
    font-size: 12px;
    color: #94a3b8;
  }

  .assistant-content {
    position: relative;
    z-index: 1;
  }

  .assistant-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 8px 0;
  }

  .assistant-desc {
    font-size: 14px;
    opacity: 0.9;
    line-height: 1.6;
    margin: 0 0 20px 0;
    min-height: 42px;
  }

  .assistant-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 24px;
    border-radius: 12px;
    background: $overlay-white-20;
    backdrop-filter: blur(10px);
    border: 1px solid $overlay-white-30;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all $transition-normal;

    &:hover {
      background: $overlay-white-30;
      transform: translateY(-2px);
    }
  }

  .assistant-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid $overlay-white-15;
  }

  .assistant-avatar-group {
    display: flex;
    gap: 6px;
  }

  .assistant-avatar {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: $overlay-white-20;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    backdrop-filter: blur(4px);
  }

  .assistant-hint {
    font-size: 12px;
    opacity: 0.75;
  }

  .assistant-bg-icon {
    position: absolute;
    right: -10px;
    bottom: -10px;
    opacity: 0.08;
    transform: rotate(-15deg);
  }

  @keyframes dashboard-fade-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(16px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes rowFadeIn {
    from {
      opacity: 0;
      transform: translateX(-8px);
    }

    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
}
</style>
