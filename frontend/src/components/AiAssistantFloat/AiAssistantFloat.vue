<template>
  <Teleport to="body">
    <FloatBubble v-show="isVisible && !isOpen" :position="config.position" :show-pulse="config.showPulse"
      tooltip="AI 表单助手" :badge-count="store.badgeCount" :health-status="store.agentHealthStatus" @click="toggleOpen"
      @command="handleQuickCommand" />

    <FloatDrawer :visible="isOpen" :fullscreen="isFullscreen" :position="config.position" :width="config.drawerWidth"
      :title="store.dynamicTitle" @close="setOpen(false)" @fullscreen="toggleFullscreen">

      <ChatMessages :messages="messages" :loading="loading" :field-label-map="currentFieldLabelMap"
        @fill="handleFill" />

      <ChatInput :disabled="loading" placeholder="描述你要填写的内容…" @send="sendMessage" />

    </FloatDrawer>

    <Transition name="fade">
      <div v-if="fillFeedback" class="fill-feedback-overlay" @click="fillFeedback = null">
        <div class="fill-feedback-card" @click.stop>
          <div class="feedback-header">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path d="M2 4l4 4-4 4M8 12h6" stroke="var(--color-success)" stroke-width="1.5" stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
            <span>表单回填结果</span>
          </div>
          <div class="feedback-body">
            <div v-for="item in fillFeedback" :key="item.key" class="feedback-row"
              :class="{ 'feedback-row--fail': !item.success }">
              <span class="feedback-key">{{ item.label }}</span>
              <span class="feedback-val">{{ item.value }}</span>
              <span class="feedback-status">{{ item.success ? '✓' : '✗' }}</span>
            </div>
          </div>
          <button class="feedback-close-btn" @click="fillFeedback = null">知道了</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { useFloatAgentStore } from "@/stores/floatAgent";
import { useAuthStore } from "@/stores/auth";
import FloatBubble from "./FloatBubble.vue";
import FloatDrawer from "./FloatDrawer.vue";
import ChatMessages from "./ChatMessages.vue";
import ChatInput from "./ChatInput.vue";
import { fillFormFields, type FillResult } from "./formFillAdapter";

const store = useFloatAgentStore();
const authStore = useAuthStore();
const route = useRoute();

const isOpen = computed(() => store.isOpen);
const isFullscreen = computed(() => store.isFullscreen);
const loading = computed(() => store.loading);
const messages = computed(() => store.messages);
const config = computed(() => store.config);
const isVisible = computed(() => store.isVisible);

const fillFeedback = ref<Array<{ key: string; label: string; value: unknown; success: boolean; }> | null>(null);

const ROUTE_PAGE_MAP: Record<string, string> = {
  "FormulaNew": "formula-add",
  "FormulaEdit": "formula-edit",
  "MaterialNew": "material-add",
  "MaterialEdit": "material-edit",
  "SalesmanNew": "salesman-add",
  "SalesmanEdit": "salesman-edit",
};

const REQUIRED_FIELDS: Record<string, string[]> = {
  "formula-add": ["name", "finished_weight", "salesman_name"],
  "formula-edit": ["name", "finished_weight", "salesman_name"],
  "material-add": ["name", "material_type", "unit"],
  "material-edit": ["name", "material_type", "unit"],
  "salesman-add": ["name", "phone"],
  "salesman-edit": ["name", "phone"],
};

function checkMissingFieldsLocal(): { missingFields: string[]; count: number; } {
  const pageId = store.currentPageId;
  const required = REQUIRED_FIELDS[pageId];
  if (!required) return { missingFields: [], count: 0 };

  const missing: string[] = [];
  for (const field of required) {
    const container = document.querySelector(`[data-field="${field}"]`);
    let hasValue = false;

    if (container) {
      const isSelect = container.classList.contains("t-select") || container.querySelector(".t-select") !== null;
      if (isSelect) {
        const selectedLabel = container.querySelector(".t-select__single-label") || container.querySelector(".t-tag");
        hasValue = !!selectedLabel && selectedLabel.textContent !== null && selectedLabel.textContent.trim() !== "";
        if (!hasValue) {
          const hiddenInput = container.querySelector<HTMLInputElement>("input[type=\"hidden\"]");
          if (hiddenInput && hiddenInput.value) hasValue = true;
        }
      } else {
        const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement>("input.t-input__inner, input.t-input-number__input, textarea.t-textarea__inner");
        if (input && input.value && input.value.trim() !== "") hasValue = true;
      }
    }

    if (!hasValue) {
      missing.push(field);
    }
  }
  return { missingFields: missing, count: missing.length };
}

const FIELD_LABEL_MAPS: Record<string, Record<string, string>> = {
  "formula-add": {
    name: "配方名称", finished_weight: "成品重量", ratio_factor: "系数",
    salesman_name: "业务员", description: "描述", materials: "原料列表",
  },
  "formula-edit": {
    name: "配方名称", finished_weight: "成品重量", ratio_factor: "系数",
    salesman_name: "业务员", description: "描述", materials: "原料列表",
  },
  "material-add": {
    name: "原料名称", code: "编码", material_type: "原料类型",
    unit: "单位", stock: "库存", unit_price: "单价", description: "描述",
  },
  "material-edit": {
    name: "原料名称", code: "编码", material_type: "原料类型",
    unit: "单位", stock: "库存", unit_price: "单价", description: "描述",
  },
  "salesman-add": {
    name: "姓名", phone: "手机号", region: "区域",
    department: "部门", email: "邮箱", code: "工号",
  },
  "salesman-edit": {
    name: "姓名", phone: "手机号", region: "区域",
    department: "部门", email: "邮箱", code: "工号",
  },
};

const currentFieldLabelMap = computed(() => {
  return FIELD_LABEL_MAPS[store.currentPageId] || {};
});

watch(
  () => route.name,
  (name) => {
    const pageId = ROUTE_PAGE_MAP[String(name)] || "";
    store.setPageId(pageId);
    if (pageId && !store.configLoaded && authStore.isAuthenticated) {
      store.loadConfig();
    }
  },
  { immediate: true },
);

function refreshLocalFieldHints() {
  const result = checkMissingFieldsLocal();
  store.updateFieldHintsLocal(result.missingFields, result.count);
  return result;
}

async function toggleOpen() {
  store.toggleOpen();
  if (store.isOpen) {
    await store.fetchFieldHints();
    const local = refreshLocalFieldHints();
    if (local.count > 0 && store.messages.length === 0) {
      store.showMissingFieldsHint();
    }
  }
}

async function setOpen(val: boolean) {
  store.setOpen(val);
  if (val) {
    await store.fetchFieldHints();
    const local = refreshLocalFieldHints();
    if (local.count > 0 && store.messages.length === 0) {
      store.showMissingFieldsHint();
    }
  }
}

function toggleFullscreen() {
  store.toggleFullscreen();
}

function sendMessage(text: string) {
  store.sendMessage(text);
}

function handleFill(fields: Record<string, unknown>) {
  const labelMap = currentFieldLabelMap.value;
  const results = fillFormFields(fields);
  fillFeedback.value = results.map((r: FillResult) => ({
    key: r.key,
    label: labelMap[r.key] || r.key,
    value: r.value,
    success: r.success,
  }));
  setTimeout(() => refreshLocalFieldHints(), 500);
}

function handleQuickCommand(command: string) {
  store.sendQuickCommand(command);
}

let fieldHintsTimer: ReturnType<typeof setInterval> | null = null;
let healthTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  if (!authStore.isAuthenticated) return;
  store.fetchHealth();
  healthTimer = setInterval(() => {
    if (authStore.isAuthenticated) store.fetchHealth();
  }, 60000);
  fieldHintsTimer = setInterval(() => {
    if (authStore.isAuthenticated && store.currentPageId) refreshLocalFieldHints();
  }, 3000);
});

watch(
  () => store.currentPageId,
  (pageId) => {
    if (pageId) {
      store.fetchFieldHints();
      refreshLocalFieldHints();
    }
  },
  { immediate: true },
);

watch(
  () => store.isVisible,
  (visible) => {
    if (visible && store.currentPageId) store.fetchFieldHints();
  },
);

onUnmounted(() => {
  if (healthTimer) clearInterval(healthTimer);
  if (fieldHintsTimer) clearInterval(fieldHintsTimer);
});
</script>

<style scoped lang="scss">
.fill-feedback-overlay {
  position: fixed;
  inset: 0;
  z-index: 10001;
  background: rgba(93, 78, 96, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.fill-feedback-card {
  background: var(--color-bg-container);
  border-radius: 16px;
  padding: 20px;
  width: 320px;
  max-height: 60vh;
  overflow-y: auto;
  box-shadow: 0 16px 48px rgba(93, 78, 96, 0.2);
}

.feedback-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: $font-size-h3;
  font-weight: $font-weight-semibold;
  color: var(--color-text-primary);
  margin-bottom: 12px;
}

.feedback-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1-5);
}

.feedback-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: var(--space-1-5) var(--space-2-5);
  border-radius: 8px;
  background: var(--color-bg-page);
  font-size: $font-size-body-sm;

  &--fail {
    background: rgba(227, 77, 89, 0.06);
  }

  .feedback-key {
    color: var(--color-text-secondary);
    min-width: 60px;
  }

  .feedback-val {
    flex: 1;
    color: var(--color-text-primary);
    font-weight: $font-weight-medium;
  }

  .feedback-status {
    font-size: $font-size-caption;
  }
}

.feedback-close-btn {
  margin-top: 16px;
  width: 100%;
  padding: 8px;
  border-radius: 10px;
  border: none;
  background: var(--gradient-btn);
  color: $text-white;
  font-size: $font-size-body-sm;
  font-weight: $font-weight-medium;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--gradient-btn-hover);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
