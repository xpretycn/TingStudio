<template>
  <div class="ai-assistant">
    <t-card bordered>
      <template #header>
        <div class="ai-header">
          <div class="ai-header-left">
            <div class="ai-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="var(--color-primary)" opacity="0.8" />
                <path d="M2 17L12 22L22 17" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div>
              <h3 class="ai-title">AI 助手</h3>
              <p class="ai-desc">智能配方解析与数据检索</p>
            </div>
          </div>
          <t-tag v-if="currentModelName" theme="primary" variant="light-outline" size="medium">
            <t-icon name="precise-monitor" size="14px" style="margin-right: 4px" />
            {{ currentModelName }}
          </t-tag>
        </div>
      </template>

      <div class="ai-body">
        <!-- 左侧 Tab 导航 -->
        <div class="ai-nav">
          <div
            v-for="tab in tabs"
            :key="tab.value"
            class="nav-tab"
            :class="{ active: activeTab === tab.value }"
            role="tab"
            tabindex="0"
            @click="activeTab = tab.value"
            @keydown.enter="activeTab = tab.value"
          >
            <t-icon :name="tab.icon" size="18px" />
            <span class="nav-tab-label">{{ tab.label }}</span>
          </div>
        </div>

        <!-- 右侧内容区 -->
        <div class="ai-content">
          <!-- ═══ 智能填单 Tab ═══ -->
          <div v-show="activeTab === 'smart-form'" class="tab-panel">
            <!-- 模型选择器 -->
            <div class="model-selector-row">
              <span class="selector-label">AI 模型</span>
              <t-select
                v-model="aiStore.selectedModel"
                :options="modelOptions"
                placeholder="选择 AI 模型"
                :popup-props="{ appendToBody: true }"
                style="width: 260px"
                size="medium"
              />
            </div>

            <!-- 上传区域 -->
            <div class="upload-section">
              <t-upload
                :auto-upload="false"
                :max="1"
                :accept="'.xlsx,.xls,.csv,.png,.jpg,.jpeg,.gif,.webp'"
                :size-limit="10485760"
                theme="file-input"
                :tips="'支持 Excel (.xlsx/.xls) 和图片 (.png/.jpg/.gif)，最大 10MB'"
                @change="handleFileChange"
              />
              <t-button
                v-if="selectedFile"
                theme="primary"
                :loading="aiStore.parseLoading"
                style="margin-top: 12px"
                @click="handleParse"
              >
                <template #icon><t-icon name="precise-monitor" /></template>
                AI 解析
              </t-button>
            </div>

            <!-- 解析中加载 -->
            <div v-if="aiStore.parseLoading" class="parse-loading">
              <t-loading size="large" text="AI 正在解析文件内容..." />
            </div>

            <!-- 解析错误 -->
            <t-alert
              v-if="aiStore.parseError"
              :message="aiStore.parseError"
              theme="error"
              closable
              style="margin-top: 12px"
            />

            <!-- 解析结果预览 -->
            <div v-if="aiStore.parseResult" class="parse-result">
              <div class="result-header">
                <h4 class="section-title">解析结果预览</h4>
                <t-space>
                  <t-button variant="text" theme="danger" size="small" @click="aiStore.clearParseResult()">
                    <template #icon><t-icon name="delete" /></template>清空
                  </t-button>
                  <t-button variant="outline" size="small" @click="handleReparse">
                    <template #icon><t-icon name="refresh" /></template>重新解析
                  </t-button>
                  <t-button theme="primary" size="small" @click="handleConfirmFormula">
                    <template #icon><t-icon name="check" /></template>确认填入配方
                  </t-button>
                </t-space>
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
                <div v-if="aiStore.parseResult.description" class="info-row">
                  <span class="label">备注</span>
                  <span class="value">{{ aiStore.parseResult.description }}</span>
                </div>
              </div>

              <t-table
                :data="aiStore.parseResult.materials"
                :columns="materialColumns"
                row-key="name"
                size="small"
                table-layout="auto"
                bordered
                stripe
              >
                <template #matched="{ row }">
                  <t-tag v-if="row.matched" theme="success" variant="light" size="small">已匹配</t-tag>
                  <t-tag v-else theme="warning" variant="light" size="small">未匹配</t-tag>
                </template>
              </t-table>

              <div v-if="aiStore.parseResult.usage" class="usage-info">
                Token 使用：{{ aiStore.parseResult.usage.totalTokens }}
              </div>
            </div>

            <!-- 未配置模型提示 -->
            <t-alert
              v-if="!aiStore.models.length && !aiStore.parseLoading"
              message="未配置 AI 模型"
              theme="warning"
            >
              <template #default>
                请在后端 .env 文件中配置至少一个 AI 模型的 API Key：
                <code>AI_DASHSCOPE_API_KEY</code>、
                <code>AI_ZHIPU_API_KEY</code> 或
                <code>AI_DEEPSEEK_API_KEY</code>
              </template>
            </t-alert>
          </div>

          <!-- ═══ 智能检索 Tab ═══ -->
          <div v-show="activeTab === 'smart-search'" class="tab-panel">
            <!-- 模型选择器 -->
            <div class="model-selector-row">
              <span class="selector-label">AI 模型</span>
              <t-select
                v-model="aiStore.selectedModel"
                :options="modelOptions"
                placeholder="选择 AI 模型"
                :popup-props="{ appendToBody: true }"
                style="width: 260px"
                size="medium"
              />
            </div>

            <!-- 输入区域 -->
            <div class="search-input-area">
              <t-textarea
                v-model="searchQuery"
                placeholder="试试输入：查找含有黄芪且成品重量大于100g的配方"
                :autosize="{ minRows: 3, maxRows: 6 }"
                @keydown.enter.ctrl="handleSearch"
              />
              <t-button
                theme="primary"
                shape="circle"
                :loading="aiStore.searchLoading"
                class="search-send-btn"
                @click="handleSearch"
              >
                <template #icon><t-icon name="send" /></template>
              </t-button>
            </div>

            <!-- 快捷提示标签 -->
            <div class="quick-tags">
              <span class="quick-tags-label">试试：</span>
              <t-tag
                v-for="tag in quickTags"
                :key="tag"
                size="medium"
                variant="outline"
                class="quick-tag"
                @click="fillAndSearch(tag)"
              >{{ tag }}</t-tag>
            </div>

            <!-- 搜索错误 -->
            <t-alert
              v-if="aiStore.searchError"
              :message="aiStore.searchError"
              theme="error"
              closable
              style="margin-top: 12px"
            />

            <!-- 搜索结果 -->
            <div v-if="aiStore.searchResult" class="search-result">
              <!-- SQL 预览 -->
              <div class="sql-card">
                <div class="sql-header">
                  <t-icon name="code" size="16px" style="color: var(--color-primary)" />
                  <span class="sql-label">生成的 SQL</span>
                  <t-tag theme="primary" variant="light" size="small" style="margin-left: auto">
                    {{ aiStore.searchResult.rowCount }} 条结果
                  </t-tag>
                </div>
                <pre class="sql-code">{{ aiStore.searchResult.sql }}</pre>
              </div>

              <!-- 查询结果表格 -->
              <div v-if="aiStore.searchResult.rows.length" class="result-table">
                <t-table
                  :data="aiStore.searchResult.rows"
                  :columns="searchResultColumns"
                  size="small"
                  table-layout="auto"
                  bordered
                  stripe
                  max-height="400"
                />
              </div>

              <!-- 无结果 -->
              <div v-else class="empty-result">
                <t-icon name="info-circle" size="32px" style="color: var(--color-primary-light)" />
                <span>未查询到匹配的数据</span>
              </div>

              <div v-if="aiStore.searchResult.usage" class="usage-info">
                Token 使用：{{ aiStore.searchResult.usage.totalTokens }}
              </div>
            </div>

            <!-- 搜索历史 -->
            <div v-if="aiStore.searchHistory.length && !aiStore.searchResult" class="search-history">
              <span class="history-label">搜索历史</span>
              <t-tag
                v-for="(h, idx) in aiStore.searchHistory"
                :key="idx"
                size="medium"
                variant="outline"
                class="history-tag"
                @click="fillAndSearch(h)"
              >{{ h }}</t-tag>
            </div>
          </div>
        </div>
      </div>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAiStore } from '@/stores/ai'
import { MessagePlugin } from 'tdesign-vue-next'

const router = useRouter()
const aiStore = useAiStore()

const tabs = [
  { value: 'smart-form', label: '智能填单', icon: 'upload' },
  { value: 'smart-search', label: '智能检索', icon: 'search' },
]
const activeTab = ref('smart-form')

// 模型选项
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']
const isImageFile = computed(() => {
  if (!selectedFile.value) return false
  const ext = '.' + selectedFile.value.name.split('.').pop()?.toLowerCase()
  return IMAGE_EXTS.includes(ext)
})

const modelOptions = computed(() =>
  aiStore.models.map(m => ({
    label: m.supportsVision ? m.name : `${m.name}（不支持图片）`,
    value: m.provider,
    disabled: isImageFile.value && !m.supportsVision,
  }))
)

// 当前模型名称
const currentModelName = computed(() => {
  const m = aiStore.models.find(m => m.provider === aiStore.selectedModel)
  return m?.name || ''
})

// ─── 智能填单 ───
const selectedFile = ref<File | null>(null)

const handleFileChange = (files: any[]) => {
  if (files && files.length > 0) {
    selectedFile.value = files[0].raw
    // 选择图片后，若当前模型不支持视觉，自动切到第一个支持视觉的模型
    const ext = '.' + files[0].raw.name.split('.').pop()?.toLowerCase()
    if (IMAGE_EXTS.includes(ext)) {
      const currentModel = aiStore.models.find(m => m.provider === aiStore.selectedModel)
      if (!currentModel?.supportsVision) {
        const visionModel = aiStore.models.find(m => m.supportsVision)
        if (visionModel) aiStore.selectedModel = visionModel.provider
      }
    }
  } else {
    selectedFile.value = null
  }
}

const handleParse = async () => {
  if (!selectedFile.value) {
    MessagePlugin.warning('请先选择要解析的文件')
    return
  }
  if (!aiStore.selectedModel) {
    MessagePlugin.warning('请先选择 AI 模型')
    return
  }
  await aiStore.parseFormula(selectedFile.value)
}

const handleReparse = () => {
  aiStore.clearParseResult()
  if (selectedFile.value) {
    handleParse()
  }
}

const handleConfirmFormula = () => {
  if (!aiStore.parseResult) return
  const data = aiStore.parseResult
  const params = new URLSearchParams({
    ai: 'true',
    name: data.name,
    materials: JSON.stringify(data.materials),
    ...(data.finishedWeight ? { finishedWeight: String(data.finishedWeight) } : {}),
    ...(data.salesmanName ? { salesmanName: data.salesmanName } : {}),
    ...(data.formulaDate ? { formulaDate: data.formulaDate } : {}),
    ...(data.description ? { description: data.description } : {}),
  })
  router.push(`/formulas/new?${params.toString()}`)
}

// 原料表格列
const materialColumns = [
  { colKey: 'name', title: '原料名称', width: 160 },
  { colKey: 'quantity', title: '用量', width: 100 },
  { colKey: 'unit', title: '单位', width: 80 },
  { colKey: 'matched', title: '匹配状态', width: 100, cell: 'matched' },
]

// ─── 智能检索 ───
const searchQuery = ref('')
const quickTags = [
  '含黄芪的配方有哪些',
  '最近创建的5个配方',
  '库存大于100的药材',
  '成品重量大于200g的配方',
]

const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    MessagePlugin.warning('请输入查询内容')
    return
  }
  if (!aiStore.selectedModel) {
    MessagePlugin.warning('请先选择 AI 模型')
    return
  }
  await aiStore.naturalSearch(searchQuery.value.trim())
}

const fillAndSearch = (text: string) => {
  searchQuery.value = text
  handleSearch()
}

// 动态生成搜索结果表格列
const searchResultColumns = computed(() => {
  if (!aiStore.searchResult?.rows?.length) return []
  const keys = Object.keys(aiStore.searchResult.rows[0])
  return keys.map(key => ({
    colKey: key,
    title: key,
    ellipsis: true,
    width: 150,
  }))
})

// ─── 初始化 ───
onMounted(() => {
  aiStore.fetchModels()
})
</script>

<style scoped lang="scss">
.ai-assistant {
  :deep(.t-card) {
    animation: fadeInUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
  }

  .ai-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .ai-header-left {
      display: flex;
      align-items: center;
      gap: $space-3;

      .ai-icon {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        background: linear-gradient(135deg, var(--color-primary-lighter), var(--color-primary-bg));
        box-shadow: var(--shadow-brand-sm);

        svg {
          width: 24px;
          height: 24px;
        }
      }

      .ai-title {
        font-size: $font-size-h3;
        font-weight: $font-weight-semibold;
        color: $text-primary;
        margin: 0 0 2px;
      }

      .ai-desc {
        font-size: $font-size-body;
        color: $text-secondary;
        margin: 0;
      }
    }
  }

  .ai-body {
    display: flex;
    gap: $space-5;
    min-height: 500px;
  }

  // 左侧导航
  .ai-nav {
    width: 180px;
    flex-shrink: 0;

    .nav-tab {
      display: flex;
      align-items: center;
      gap: $space-3;
      padding: $space-3 $space-4;
      border-radius: $radius-md;
      cursor: pointer;
      transition: all 0.2s;
      color: $text-secondary;
      font-size: $font-size-body;
      border: 1px solid transparent;
      margin-bottom: $space-1;

      &:hover {
        background: $bg-page;
        color: $text-primary;
        border-color: $border-color-light;
      }

      &.active {
        background: linear-gradient(135deg, var(--color-primary-light), var(--color-primary));
        color: white;
        box-shadow: var(--shadow-brand-sm);
        border-color: transparent;
        font-weight: $font-weight-medium;

        :deep(.t-icon) {
          color: white;
        }
      }

      .nav-tab-label {
        flex: 1;
      }
    }
  }

  // 右侧内容
  .ai-content {
    flex: 1;
    min-width: 0;
  }

  .section-title {
    font-size: $font-size-h4;
    font-weight: $font-weight-semibold;
    color: $text-primary;
    margin: 0 0 $space-4;
    padding-bottom: $space-3;
    border-bottom: 1px solid $border-color-light;

    &::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 18px;
      background: linear-gradient(180deg, var(--color-primary), var(--color-primary-light));
      border-radius: 2px;
      margin-right: $space-2;
      vertical-align: middle;
    }
  }

  // 模型选择器
  .model-selector-row {
    display: flex;
    align-items: center;
    gap: $space-3;
    margin-bottom: $space-4;

    .selector-label {
      font-size: $font-size-body;
      color: $text-secondary;
      flex-shrink: 0;
    }
  }

  // 上传区域
  .upload-section {
    margin-bottom: $space-4;
  }

  // 解析中加载
  .parse-loading {
    display: flex;
    justify-content: center;
    padding: $space-8 0;
  }

  // 解析结果
  .parse-result {
    .result-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: $space-4;

      .section-title {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
      }
    }

    .result-info {
      background: $bg-page;
      border-radius: $radius-lg;
      padding: $space-4;
      margin-bottom: $space-4;
      border: 1px solid $border-color-light;

      .info-row {
        display: flex;
        align-items: flex-start;
        padding: $space-2 0;

        &:not(:last-child) {
          border-bottom: 1px dashed $border-color-light;
        }

        .label {
          width: 80px;
          flex-shrink: 0;
          font-size: $font-size-body;
          color: $text-secondary;
        }

        .value {
          font-size: $font-size-body;
          color: $text-primary;

          &.highlight {
            color: var(--color-primary);
            font-weight: $font-weight-semibold;
            font-size: $font-size-h4;
          }
        }
      }
    }
  }

  // Token 使用信息
  .usage-info {
    margin-top: $space-3;
    font-size: $font-size-caption;
    color: $text-placeholder;
    text-align: right;
  }

  // 智能检索 - 输入区域
  .search-input-area {
    position: relative;
    margin-bottom: $space-3;

    .search-send-btn {
      position: absolute;
      right: 12px;
      bottom: 12px;
      z-index: 1;
    }
  }

  // 快捷标签
  .quick-tags {
    display: flex;
    align-items: center;
    gap: $space-2;
    margin-bottom: $space-5;
    flex-wrap: wrap;

    .quick-tags-label {
      font-size: $font-size-body;
      color: $text-secondary;
      flex-shrink: 0;
    }

    .quick-tag {
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        color: var(--color-primary);
        border-color: var(--color-primary-lighter);
        background: var(--color-primary-bg);
      }
    }
  }

  // SQL 预览卡片
  .sql-card {
    border-radius: $radius-lg;
    padding: $space-4;
    margin-bottom: $space-4;
    background: #1a1d23;
    border: 1px solid #2d3139;

    .sql-header {
      display: flex;
      align-items: center;
      gap: $space-2;
      margin-bottom: $space-3;

      .sql-label {
        font-size: $font-size-body;
        font-weight: $font-weight-medium;
        color: #e1e4e8;
      }
    }

    .sql-code {
      font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
      font-size: 13px;
      line-height: 1.6;
      color: #9ecbff;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
    }
  }

  // 无结果
  .empty-result {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-3;
    padding: $space-8 0;
    color: $text-placeholder;
    font-size: $font-size-body;
  }

  // 搜索历史
  .search-history {
    display: flex;
    align-items: center;
    gap: $space-2;
    flex-wrap: wrap;
    margin-top: $space-4;

    .history-label {
      font-size: $font-size-caption;
      color: $text-placeholder;
    }

    .history-tag {
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        color: var(--color-primary);
        border-color: var(--color-primary-lighter);
      }
    }
  }
}

// 响应式
@media screen and (max-width: 768px) {
  .ai-assistant {
    .ai-body {
      flex-direction: column;
    }

    .ai-nav {
      width: 100%;
      display: flex;
      gap: $space-2;

      .nav-tab {
        flex: 1;
        justify-content: center;
        margin-bottom: 0;
      }
    }
  }
}
</style>
