<template>
  <div class="smart-tools" :aria-busy="!initialized">
    <Transition name="content-fade" mode="out-in">
      <PageSkeleton v-if="!initialized" type="cards" :rows="3" />
      <t-card v-else class="content-card" bordered>
        <div class="data-center-toolbar">
          <div class="toolbar-left-section">
            <h3 class="toolbar-title">
              <t-icon name="ai-tool" size="22px" class="toolbar-title-icon" />
              智能工具
            </h3>
            <div class="toolbar-tabs">
              <button v-for="tab in tabs" :key="tab.value" type="button" class="toolbar-tab"
                :class="{ active: activeTab === tab.value }" @click="activeTab = tab.value">
                <svg class="toolbar-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round" v-html="tab.iconPath"></svg>
                <span>{{ tab.label }}</span>
              </button>
            </div>
          </div>
          <div class="toolbar-right-section">
            <div class="model-select-inline">
              <template v-if="modelGroups.length > 0">
                <t-select
                  v-model="selectedModelKey"
                  placeholder="选择 AI 模型"
                  size="medium"
                  style="min-width: 280px;"
                  @change="handleModelChange"
                >
                  <template v-if="currentModelInfo" #prefixIcon>
                    <img
                      :src="currentModelInfo.logo"
                      :alt="currentModelInfo.name"
                      style="width: 16px; height: 16px; object-fit: contain; margin-right: 6px;"
                      @error="(e: Event) => { (e.target as HTMLImageElement).style.display = 'none'; }"
                    />
                    <span style="font-size: 11px; padding: 1px 6px; background: var(--color-bg-container-alt); border-radius: 6px; color: var(--color-text-secondary); line-height: 14px; margin-right: 4px;">文本</span>
                    <span v-if="currentModelInfo.supportsVision" style="font-size: 11px; padding: 1px 6px; background: var(--color-emerald-100); border-radius: 6px; color: var(--color-emerald-600); line-height: 14px;">图片</span>
                  </template>
                  <t-option-group v-for="group in modelGroups" :key="group.provider" :label="group.name">
                    <t-option
                      v-for="v in group.versions"
                      :key="group.provider + '|' + v.value"
                      :value="group.provider + '|' + v.value"
                      :label="v.label"
                    >
                      <span style="display: inline-flex; align-items: center; gap: 8px; width: 100%;">
                        <img
                          :src="getModelLogo(group.provider)"
                          :alt="group.name"
                          style="width: 16px; height: 16px; object-fit: contain; flex-shrink: 0;"
                          @error="(e: Event) => handleLogoError(e)"
                        />
                        <span style="font-size: 12px; line-height: 16px; flex-shrink: 0;">{{ v.label }}</span>
                        <span style="font-size: 11px; padding: 1px 6px; background: var(--color-bg-container-alt); border-radius: 6px; color: var(--color-text-secondary); line-height: 14px; flex-shrink: 0;">文本</span>
                        <span v-if="getModelSupportsVision(group.provider)" style="font-size: 11px; padding: 1px 6px; background: var(--color-emerald-100); border-radius: 6px; color: var(--color-emerald-600); line-height: 14px; flex-shrink: 0;">图片</span>
                        <svg
                          v-if="selectedModelKey === group.provider + '|' + v.value"
                          style="width: 14px; height: 14px; flex-shrink: 0; margin-left: auto;"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--color-primary)"
                          stroke-width="2.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    </t-option>
                  </t-option-group>
                </t-select>
              </template>
              <div v-else class="no-models-inline">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-placeholder)" stroke-width="2"
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
        <!-- 内容区域 -->
        <div class="ai-content">
          <div v-show="activeTab === 'smart-form'" class="tab-panel">
            <FormulaParseTab @activity-add="addActivity" />
          </div>

          <div v-show="activeTab === 'smart-import'" class="tab-panel">
            <MaterialImportTab @activity-add="addActivity" />
          </div>

          <div v-show="activeTab === 'smart-search'" class="tab-panel">
            <DataSearchTab />
          </div>

          <div v-show="activeTab === 'smart-history'" class="tab-panel">
            <ParseHistoryTab />
          </div>
        </div>
      </t-card>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAiStore } from '@/stores/ai';
import { MessagePlugin } from 'tdesign-vue-next';
import { modelApi } from '@/api/model';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';
import FormulaParseTab from './tabs/FormulaParseTab.vue';
import MaterialImportTab from './tabs/MaterialImportTab.vue';
import DataSearchTab from './tabs/DataSearchTab.vue';
import ParseHistoryTab from './tabs/ParseHistoryTab.vue';

interface ModelVersion {
  value: string;
  label: string;
}

interface ModelGroup {
  provider: string;
  name: string;
  versions: ModelVersion[];
}

const aiStore = useAiStore();
const route = useRoute();

const initialized = ref(false);

const tabs = [
  {
    value: 'smart-form',
    label: '智能填单',
    iconPath: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  },
  {
    value: 'smart-import',
    label: '智能导入',
    iconPath: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  },
  {
    value: 'smart-search',
    label: '智能查询',
    iconPath: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  },
  {
    value: 'smart-history',
    label: '解析历史',
    iconPath: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  },
];
const activeTab = ref('smart-form');

const addActivity = (_item: { type: string; title: string; desc: string; time: string; }) => { };

const modelGroups = ref<ModelGroup[]>([]);
const selectedModelKey = ref('');

async function loadModelGroups() {
  const groups: ModelGroup[] = [];
  for (const m of aiStore.models) {
    try {
      const res = await modelApi.getVersionsByProvider(m.provider);
      const versions = res.versions || [];
      if (versions.length > 0) {
        groups.push({ provider: m.provider, name: m.name, versions });
      }
    } catch {
      // skip
    }
  }
  modelGroups.value = groups;
}

const currentModelInfo = computed(() => {
  if (!selectedModelKey.value) return null;
  const [provider, modelName] = selectedModelKey.value.split('|');
  const model = aiStore.models.find((m) => m.provider === provider);
  return {
    provider,
    modelName,
    logo: getModelLogo(provider),
    name: model?.name || provider,
    supportsVision: model?.supportsVision || false
  };
});

async function handleModelChange(val: string) {
  if (!val) {
    aiStore.selectedModel = '';
    aiStore.selectedVersion = '';
    return;
  }
  const [provider, modelName] = val.split('|');
  aiStore.selectedModel = provider;
  aiStore.selectedVersion = modelName;
  try {
    await aiStore.switchVersion(modelName);
    const currentModel = aiStore.models.find(m => m.provider === provider);
    MessagePlugin.success(`已切换到 ${currentModel?.name || provider} ${modelName}`);
  } catch {
    MessagePlugin.error("版本切换失败");
  }
}

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
  dashscope: 'qwen',
  '通义千问': 'qwen',
  '通义': 'qwen',
  zhipu: 'zhipu',
  chatglm: 'zhipu',
  '智谱': 'zhipu',
  '智谱glm': 'zhipu',
  '智谱GLM': 'zhipu',
  glm: 'zhipu',
  baidu: 'baidu',
  wenxin: 'baidu',
  '文心': 'baidu',
  doubao: 'bytedance',
  '豆包': 'bytedance',
  bytedance: 'bytedance',
  moonshot: 'moonshot',
  kimi: 'moonshot',
  '月之暗面': 'moonshot',
  minimax: 'minimax',
  hunyuan: 'tencent',
  '腾讯': 'tencent',
  tencent: 'tencent',
};

const getModelLogo = (provider: string): string => {
  const key = (provider || '').toLowerCase();
  for (const [k, slug] of Object.entries(MODEL_LOGO_MAP)) {
    if (key.includes(k)) {
      return `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/${slug}.svg`;
    }
  }
  return `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/openai.svg`;
};

const getModelSupportsVision = (provider: string): boolean => {
  const model = aiStore.models.find(m => m.provider === provider);
  return model?.supportsVision || false;
};

const handleLogoError = (e: Event) => {
  const img = e.target as HTMLImageElement;
  img.style.display = 'none';
};

onMounted(async () => {
  // 从路由查询参数恢复 tab 和高亮记录
  const tabParam = route.query.tab as string | undefined;
  if (tabParam && tabs.some(t => t.value === tabParam)) {
    activeTab.value = tabParam;
  }
  const highlightParam = route.query.highlight as string | undefined;
  if (highlightParam) {
    aiStore.parseHistoryHighlight = highlightParam;
  }

  try {
    await aiStore.fetchModels();
    await loadModelGroups();
    if (aiStore.selectedModel && aiStore.selectedVersion) {
      selectedModelKey.value = `${aiStore.selectedModel}|${aiStore.selectedVersion}`;
    } else {
      const qwenGroup = modelGroups.value.find(g =>
        g.provider === 'qwen' || g.provider === 'dashscope' || g.provider === 'tongyi'
      );
      if (qwenGroup) {
        const maxVersion = qwenGroup.versions.find(v =>
          v.value?.toLowerCase().includes('max')
        );
        const targetVersion = maxVersion || qwenGroup.versions[0];
        if (targetVersion) {
          selectedModelKey.value = `${qwenGroup.provider}|${targetVersion.value}`;
          aiStore.selectedModel = qwenGroup.provider;
          aiStore.selectedVersion = targetVersion.value;
        }
      } else if (modelGroups.value.length > 0) {
        const firstVersion = modelGroups.value[0].versions[0];
        if (firstVersion) {
          selectedModelKey.value = `${modelGroups.value[0].provider}|${firstVersion.value}`;
          aiStore.selectedModel = modelGroups.value[0].provider;
          aiStore.selectedVersion = firstVersion.value;
        }
      }
    }
  } catch (e) {
    console.error('[SmartTools] 初始化失败:', e);
  } finally {
    initialized.value = true;
  }
});
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.smart-tools {
  padding-bottom: 24px;

  .content-card {
    min-height: 500px;
    border-radius: var(--radius-4xl) !important;
    overflow: hidden;
    border: none;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);

    :deep(.t-card__body) {
      padding: 0;
    }
  }

  .data-center-toolbar {
    padding: 20px 32px;
    border-bottom: 1px solid var(--color-border-light);
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 16px;

    .toolbar-left-section {
      display: flex;
      align-items: center;
      gap: 24px;
      flex: 1;
      min-width: 0;

      .toolbar-title {
        font-size: 20px;
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
        flex-shrink: 0;

        .toolbar-title-icon {
          color: var(--color-primary);
          flex-shrink: 0;
        }
      }

      .toolbar-tabs {
        display: flex;
        gap: var(--space-1-5);

        .toolbar-tab {
          display: inline-flex;
          align-items: center;
          gap: var(--space-1-5);
          padding: 8px var(--space-4-5);
          border-radius: 14px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--color-text-secondary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all $transition-normal;
          white-space: nowrap;

          .toolbar-tab-icon {
            width: 16px;
            height: 16px;
            flex-shrink: 0;
          }

          &:hover {
            background: var(--color-primary-bg);
            color: var(--color-text-primary);
          }

          &.active {
            background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
            color: var(--color-text-white);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            font-weight: 600;
          }
        }
      }
    }

    .toolbar-right-section {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;

      .model-select-inline {
        :deep(.t-select) {
          .t-input {
            border-radius: 12px;
          }
        }

        :deep(.t-select__single) {
          .t-select__placeholder,
          .t-select__value {
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
        }

        :deep(.t-select__wrapper) {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        :deep(.t-select__selected-single) {
          display: inline-flex !important;
          align-items: center;
          gap: 8px;
          font-size: 12px !important;

          .t-select__placeholder,
          .t-select__value-text {
            display: inline-flex !important;
            align-items: center;
            gap: var(--space-1-5);
            font-size: 12px !important;
            color: var(--color-text-primary);

            &::after {
              content: '';
            }
          }
        }

        :deep(.t-select__wrap) {
          .t-select__input {
            display: none !important;
          }
        }

        :deep(.t-select__placeholder) {
          display: none !important;
        }

        :deep(.t-input--focus) {
          .t-tag-v2 {
            display: none;
          }
        }

        .no-models-inline {
          display: flex;
          align-items: center;
          gap: var(--space-1-5);
          padding: 8px var(--space-3-5);
          font-size: 12px;
          color: var(--color-text-placeholder);
        }
      }
    }
  }

  .ai-content {
    padding: 24px var(--space-7);
    min-height: 480px;
  }

  .tab-panel {
    animation: fadeInUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
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

  // 暗色模式下模型 logo 亮度修正，确保可见
  :deep(.t-select__selected-single img),
  :deep(.t-option img) {
    transition: filter 0.2s ease;
    filter: var(--img-brightness, none);
  }
}
</style>
