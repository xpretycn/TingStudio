<template>
  <Teleport to="body">
    <FloatBubble v-show="isVisible && !isOpen" :position="config.position" :show-pulse="config.showPulse"
      tooltip="AI 表单助手" :badge-count="store.badgeCount" :health-status="store.agentHealthStatus" @click="toggleOpen"
      @command="handleQuickCommand" />

    <FloatDrawer :visible="isOpen" :fullscreen="isFullscreen" :position="config.position" :width="config.drawerWidth"
      :title="store.dynamicTitle" @close="setOpen(false)" @fullscreen="toggleFullscreen">

      <FieldDetectionPanel
        :required-missing="requiredMissingFields"
        :recommended-missing="recommendedMissingFields"
        @consult="handleFieldConsult" />

      <SubmitAnalysisPanel
        v-if="submitIssues.length"
        :issues="submitIssues" />

      <ChatMessages :messages="messages" :loading="loading" :field-label-map="currentFieldLabelMap" />

      <ChatInput :disabled="loading" placeholder="描述你要填写的内容…" @send="sendMessage" />

    </FloatDrawer>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import { useFloatAgentStore } from "@/stores/floatAgent";
import { useAuthStore } from "@/stores/auth";
import FloatBubble from "./FloatBubble.vue";
import FloatDrawer from "./FloatDrawer.vue";
import FieldDetectionPanel from "./FieldDetectionPanel.vue";
import SubmitAnalysisPanel from "./SubmitAnalysisPanel.vue";
import ChatMessages from "./ChatMessages.vue";
import ChatInput from "./ChatInput.vue";
import type { SubmitIssue } from "./SubmitAnalysisPanel.vue";

const store = useFloatAgentStore();
const authStore = useAuthStore();
const route = useRoute();

const domTick = ref(0);
let domObserver: MutationObserver | null = null;

const isOpen = computed(() => store.isOpen);
const isFullscreen = computed(() => store.isFullscreen);
const loading = computed(() => store.loading);
const messages = computed(() => store.messages);
const config = computed(() => store.config);
const isVisible = computed(() => store.isVisible);

const ROUTE_PAGE_MAP: Record<string, string> = {
  "FormulaNew": "formula-add",
  "FormulaEdit": "formula-edit",
  "MaterialNew": "material-add",
  "MaterialEdit": "material-edit",
  "SalesmanNew": "salesman-add",
  "SalesmanEdit": "salesman-edit",
};

interface FieldCheckConfig {
  key: string;
  level: "required" | "recommended";
}

const FIELD_CHECKS: Record<string, FieldCheckConfig[]> = {
  "formula-add": [
    { key: "name", level: "required" },
    { key: "finished_weight", level: "required" },
    { key: "salesman_name", level: "required" },
    { key: "ratio_factor", level: "required" },
    { key: "supplement_ratio_factor", level: "required" },
    { key: "description", level: "recommended" },
    { key: "preparation_method", level: "recommended" },
  ],
  "formula-edit": [
    { key: "name", level: "required" },
    { key: "finished_weight", level: "required" },
    { key: "salesman_name", level: "required" },
    { key: "ratio_factor", level: "required" },
    { key: "supplement_ratio_factor", level: "required" },
    { key: "version_reason", level: "required" },
    { key: "description", level: "recommended" },
    { key: "preparation_method", level: "recommended" },
  ],
  "material-add": [
    { key: "name", level: "required" },
    { key: "material_type", level: "required" },
    { key: "unit", level: "required" },
    { key: "stock", level: "required" },
    { key: "unit_price", level: "recommended" },
  ],
  "material-edit": [
    { key: "name", level: "required" },
    { key: "material_type", level: "required" },
    { key: "unit", level: "required" },
    { key: "stock", level: "required" },
    { key: "unit_price", level: "recommended" },
  ],
  "salesman-add": [
    { key: "name", level: "required" },
    { key: "phone", level: "required" },
  ],
  "salesman-edit": [
    { key: "name", level: "required" },
    { key: "phone", level: "required" },
  ],
};

const FIELD_LABEL_MAPS: Record<string, Record<string, string>> = {
  "formula-add": {
    name: "配方名称", finished_weight: "成品重量", ratio_factor: "主料系数",
    supplement_ratio_factor: "辅料系数", salesman_name: "业务员",
    description: "配方描述", preparation_method: "制法", version_reason: "升版原因",
    materials: "原料列表",
  },
  "formula-edit": {
    name: "配方名称", finished_weight: "成品重量", ratio_factor: "主料系数",
    supplement_ratio_factor: "辅料系数", salesman_name: "业务员",
    description: "配方描述", preparation_method: "制法", version_reason: "升版原因",
    materials: "原料列表",
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

// 统一的字段值检测（一次 DOM 查询，多处复用）
function inspectField(fieldKey: string): boolean {
  const container = document.querySelector(`[data-field="${fieldKey}"]`);
  if (!container) return false;

  const isSelect = container.classList.contains("t-select") || container.querySelector(".t-select") !== null;
  if (isSelect) {
    const selectedLabel = container.querySelector(".t-select__single-label") || container.querySelector(".t-tag");
    let hasValue = !!selectedLabel && selectedLabel.textContent !== null && selectedLabel.textContent.trim() !== "";
    if (!hasValue) {
      const hiddenInput = container.querySelector<HTMLInputElement>("input[type=\"hidden\"]");
      if (hiddenInput && hiddenInput.value) hasValue = true;
    }
    return hasValue;
  }

  const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    "input.t-input__inner, input.t-input-number__input, textarea.t-textarea__inner",
  );
  return !!(input && input.value && input.value.trim() !== "");
}

// 共享的字段检测结果：依赖 domTick 触发重算
const detectedMissing = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  domTick.value;
  const pageId = store.currentPageId;
  const checks = FIELD_CHECKS[pageId];
  if (!checks) return { required: [] as string[], recommended: [] as string[] };

  const required: string[] = [];
  const recommended: string[] = [];
  for (const check of checks) {
    if (inspectField(check.key)) continue;
    if (check.level === "required") required.push(check.key);
    else recommended.push(check.key);
  }
  return { required, recommended };
});

const requiredMissingFields = computed(() => {
  const pageId = store.currentPageId;
  const labels = FIELD_LABEL_MAPS[pageId] || {};
  return detectedMissing.value.required.map(key => ({
    key,
    label: labels[key] || key,
    level: "required" as const,
  }));
});

const recommendedMissingFields = computed(() => {
  const pageId = store.currentPageId;
  const labels = FIELD_LABEL_MAPS[pageId] || {};
  return detectedMissing.value.recommended.map(key => ({
    key,
    label: labels[key] || key,
    level: "recommended" as const,
  }));
});

const submitIssues = computed(() => {
  const pageId = store.currentPageId;
  const issues: SubmitIssue[] = [];
  const presentKeys = new Set(detectedMissing.value.required);

  if (pageId === "formula-add" || pageId === "formula-edit") {
    if (presentKeys.has("name")) {
      issues.push({ type: "error", message: "配方名称不能为空", suggestion: '请填写配方名称，例如"红枣枸杞膏"' });
    }
    if (presentKeys.has("salesman_name")) {
      issues.push({ type: "error", message: "请选择所属业务员", suggestion: "从下拉列表中选择负责该配方的业务员" });
    }
    if (presentKeys.has("finished_weight")) {
      issues.push({ type: "error", message: "成品重量必须大于 0", suggestion: "请输入配方的最终成品重量，单位克(g)" });
    }
    if (pageId === "formula-edit" && presentKeys.has("version_reason")) {
      issues.push({ type: "error", message: "编辑模式需填写升版原因", suggestion: '请说明本次修改的原因，例如"调整原料配比"' });
    }
  }

  if (pageId === "material-add" || pageId === "material-edit") {
    if (presentKeys.has("name")) {
      issues.push({ type: "error", message: "原料名称不能为空", suggestion: '请填写原料名称，例如"黄芪"' });
    }
    if (presentKeys.has("material_type")) {
      issues.push({ type: "error", message: "请选择原料类型", suggestion: "药材(herb)或辅料(supplement)" });
    }
    if (presentKeys.has("unit")) {
      issues.push({ type: "error", message: "请选择单位", suggestion: "从下拉列表中选择合适的计量单位" });
    }
    if (presentKeys.has("stock")) {
      issues.push({ type: "error", message: "请输入库存数量", suggestion: "填写当前原料的库存数量" });
    }
    if (presentKeys.has("unit_price")) {
      issues.push({ type: "warning", message: "建议录入单价", suggestion: "录入单价后可进行成本计算和报价分析" });
    }
  }

  return issues;
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
  domTick.value++;
  const required = detectedMissing.value.required;
  const recommended = detectedMissing.value.recommended;
  const allMissing = [...required, ...recommended];
  store.updateFieldHintsLocal(allMissing, required.length);
  return { count: required.length, missingFields: allMissing };
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

function handleQuickCommand(command: string) {
  store.sendQuickCommand(command);
}

function handleFieldConsult(fieldKey: string) {
  const label = FIELD_LABEL_MAPS[store.currentPageId]?.[fieldKey] || fieldKey;
  store.sendMessage(`请解释 '${label}' 字段的填写要求`);
}

let fieldHintsTimer: ReturnType<typeof setInterval> | null = null;
let healthTimer: ReturnType<typeof setInterval> | null = null;

function startFieldHintsPolling() {
  if (fieldHintsTimer || !authStore.isAuthenticated || !store.currentPageId) return;
  fieldHintsTimer = setInterval(refreshLocalFieldHints, 3000);
}

function stopFieldHintsPolling() {
  if (fieldHintsTimer) {
    clearInterval(fieldHintsTimer);
    fieldHintsTimer = null;
  }
}

function startDomObserver() {
  if (domObserver) return;
  const formArea = document.querySelector('.t-form') || document.querySelector('form') || document.body;
  domObserver = new MutationObserver(() => {
    nextTick(refreshLocalFieldHints);
  });
  domObserver.observe(formArea, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['value', 'class'],
  });
  formArea.addEventListener('input', refreshLocalFieldHints, true);
  formArea.addEventListener('change', refreshLocalFieldHints, true);
}

function stopDomObserver() {
  if (domObserver) {
    domObserver.disconnect();
    domObserver = null;
  }
  const formArea = document.querySelector('.t-form') || document.querySelector('form') || document.body;
  formArea.removeEventListener('input', refreshLocalFieldHints, true);
  formArea.removeEventListener('change', refreshLocalFieldHints, true);
}

onMounted(() => {
  if (!authStore.isAuthenticated) return;
  store.fetchHealth();
  healthTimer = setInterval(() => {
    if (authStore.isAuthenticated) store.fetchHealth();
  }, 60000);
  if (store.isOpen) startFieldHintsPolling();
  startDomObserver();
});

onUnmounted(() => {
  if (healthTimer) clearInterval(healthTimer);
  stopFieldHintsPolling();
  stopDomObserver();
});

watch(
  () => store.currentPageId,
  (pageId) => {
    if (pageId) {
      store.fetchFieldHints();
      refreshLocalFieldHints();
      if (store.isOpen) startFieldHintsPolling();
    }
  },
  { immediate: true },
);

watch(
  () => store.isOpen,
  (open) => {
    if (open) {
      startFieldHintsPolling();
    } else {
      stopFieldHintsPolling();
    }
  },
);

watch(
  () => store.isVisible,
  (visible) => {
    if (visible && store.currentPageId) store.fetchFieldHints();
  },
);
</script>
