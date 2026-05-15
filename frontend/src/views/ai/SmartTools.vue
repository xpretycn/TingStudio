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
                    <div class="model-info-row">
                      <span class="model-btn-name">{{ model.name }}</span>
                      <span class="model-type-badge">文本</span>
                      <span v-if="model.supportsVision" class="model-type-badge model-type-badge--vision">图片</span>
                    </div>
                    <svg v-if="aiStore.selectedModel === model.provider" class="model-check-icon" width="16" height="16"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
                      stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
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
              <div v-if="modelVersions.length > 1 && aiStore.selectedModel" class="model-version-select">
                <t-select v-model="selectedVersion" size="small" :loading="loadingVersions"
                  style="width: 100%; min-width: 160px;" @change="handleVersionSelect">
                  <t-option v-for="ver in modelVersions" :key="ver.value" :value="ver.value" :label="ver.label" />
                </t-select>
              </div>
            </div>
          </div>
        </div>

        <div class="ai-content">
          <div v-show="activeTab === 'smart-form'" class="tab-panel">
            <SmartFormTab @activity-add="addActivity" />
          </div>

          <div v-show="activeTab === 'smart-import'" class="tab-panel">
            <SmartImportTab @activity-add="addActivity" />
          </div>

          <div v-show="activeTab === 'smart-search'" class="tab-panel">
            <SmartSearchTab />
          </div>

          <div v-show="activeTab === 'smart-history'" class="tab-panel">
            <SmartHistoryTab />
          </div>
        </div>
      </t-card>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAiStore } from '@/stores/ai';
import { MessagePlugin } from 'tdesign-vue-next';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';
import SmartFormTab from './tabs/SmartFormTab.vue';
import SmartImportTab from './tabs/SmartImportTab.vue';
import SmartSearchTab from './tabs/SmartSearchTab.vue';
import SmartHistoryTab from './tabs/SmartHistoryTab.vue';

const aiStore = useAiStore();

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

const addActivity = (_item: { type: string; title: string; desc: string; time: string; }) => {};

const selectModel = (model: string) => {
  aiStore.selectedModel = model;
  loadModelVersionsWithLoading(model);
};

const loadingVersions = ref(false);

const selectedVersion = computed({
  get: () => aiStore.selectedVersion,
  set: (val: string) => { aiStore.selectedVersion = val; },
});

const modelVersions = computed(() => aiStore.modelVersions);

const loadModelVersionsWithLoading = async (provider: string) => {
  try {
    loadingVersions.value = true;
    await aiStore.loadModelVersions(provider);
  } finally {
    loadingVersions.value = false;
  }
};

const handleVersionSelect = async (val: string | number) => {
  const version = String(val);
  selectedVersion.value = version;
  try {
    await aiStore.switchVersion(version);
    const currentModel = aiStore.models.find(m => m.provider === aiStore.selectedModel);
    MessagePlugin.success(`已切换 ${currentModel?.name || aiStore.selectedModel} 版本为 ${version}`);
  } catch {
    MessagePlugin.error("版本切换失败，请重试");
  }
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

onMounted(async () => {
  try {
    await aiStore.fetchModels();
    if (aiStore.selectedModel) {
      await loadModelVersionsWithLoading(aiStore.selectedModel);
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
    border-radius: 24px !important;
    overflow: hidden;
    border: none;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);

    :deep(.t-card__body) {
      padding: 0;
    }
  }

  .data-center-toolbar {
    padding: 20px 32px;
    border-bottom: 1px solid #f1f5f9;
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
        color: #1e293b;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
        flex-shrink: 0;

        .toolbar-title-icon {
          color: #10B981;
          flex-shrink: 0;
        }
      }

      .toolbar-tabs {
        display: flex;
        gap: 6px;

        .toolbar-tab {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          color: #64748b;
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
            background: #f1f5f9;
            color: #334155;
          }

          &.active {
            background: linear-gradient(135deg, #10B981, #059669);
            color: #fff;
            box-shadow: 0 4px 12px $overlay-emerald-25;
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

            .model-check-icon {
              width: 16px;
              height: 16px;
              flex-shrink: 0;
              margin-left: 4px;
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

            .model-info-row {
              display: inline-flex;
              align-items: center;
              gap: 4px;
            }

            .model-type-badge {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-size: 9px;
              padding: 2px 6px;
              line-height: 1;
              background: var(--gradient-brand, linear-gradient(135deg, var(--color-primary), var(--color-primary-dark)));
              color: #fff;
              border-radius: 8px;
              font-weight: 700;
              letter-spacing: 0.3px;
              opacity: 0.85;
            }

            .model-type-badge--vision {
              background: linear-gradient(135deg, #8b5cf6, #6d28d9);
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

        .model-version-select {
          margin-top: 8px;

          :deep(.t-select) {
            .t-input {
              border-radius: 10px;
              font-size: 12px;
              height: 32px;
            }
          }
        }
      }
    }
  }

  .ai-content {
    padding: 24px 28px;
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
}
</style>
