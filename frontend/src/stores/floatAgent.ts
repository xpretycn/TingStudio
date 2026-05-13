import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { agentApi, type AgentFloatConfig, type ParseFormRequest } from "@/api/agent";

export interface FloatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  fields?: Record<string, any>;
  missingFields?: string[];
  timestamp: number;
}

const DEFAULT_CONFIG: AgentFloatConfig = {
  id: "",
  userId: "",
  enabled: true,
  model: "deepseek",
  modelName: "",
  fallbackModel: "",
  fallbackModelName: "",
  position: "right",
  drawerWidth: 400,
  themeColor: "",
  showPulse: true,
  enabledPages: [],
  maxRounds: 10,
  fillStrategy: "overwrite",
  contextMode: "page",
  updatedAt: "",
  createdAt: "",
};

const FORM_PAGE_IDS = [
  "formula-add",
  "formula-edit",
  "material-add",
  "material-edit",
  "salesman-add",
  "salesman-edit",
];

export const useFloatAgentStore = defineStore("floatAgent", () => {
  const isOpen = ref(false);
  const isFullscreen = ref(false);
  const loading = ref(false);
  const messages = ref<FloatMessage[]>([]);
  const currentPageId = ref<string>("");
  const sessionId = ref<string | null>(null);
  const config = ref<AgentFloatConfig>({ ...DEFAULT_CONFIG });
  const configLoaded = ref(false);

  const isVisible = computed(() => {
    if (!config.value.enabled) return false;
    if (config.value.enabledPages.length === 0) return FORM_PAGE_IDS.includes(currentPageId.value);
    return config.value.enabledPages.includes(currentPageId.value);
  });

  async function loadConfig() {
    try {
      const data = await agentApi.getFloatConfig();
      if (data) {
        config.value = data;
      }
      configLoaded.value = true;
    } catch (error) {
      console.error("[FloatAgent] 加载配置失败:", error);
      configLoaded.value = true;
    }
  }

  async function saveConfig(partial: Partial<AgentFloatConfig>) {
    try {
      const data = await agentApi.updateFloatConfig(partial);
      if (data) {
        config.value = data;
      }
      return true;
    } catch (error) {
      console.error("[FloatAgent] 保存配置失败:", error);
      return false;
    }
  }

  function setPageId(pageId: string) {
    if (currentPageId.value !== pageId) {
      currentPageId.value = pageId;
      if (config.value.contextMode === "page") {
        messages.value = [];
        sessionId.value = null;
      }
    }
  }

  function toggleOpen() {
    isOpen.value = !isOpen.value;
  }

  function setOpen(val: boolean) {
    isOpen.value = val;
  }

  function toggleFullscreen() {
    isFullscreen.value = !isFullscreen.value;
  }

  function clearMessages() {
    messages.value = [];
    sessionId.value = null;
  }

  async function sendMessage(utterance: string) {
    if (!utterance.trim() || !currentPageId.value) return;

    const userMsg: FloatMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: utterance,
      timestamp: Date.now(),
    };
    messages.value.push(userMsg);

    loading.value = true;
    try {
      const context = messages.value
        .slice(-6)
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({ role: m.role, content: m.content }));

      const params: ParseFormRequest = {
        pageId: currentPageId.value,
        utterance,
        context,
        sessionId: sessionId.value || undefined,
      };

      const res = await agentApi.parseForm(params);

      if (res.code === 0 && res.data) {
        sessionId.value = res.data.sessionId;
        const aiMsg: FloatMessage = {
          id: `msg_${Date.now()}_ai`,
          role: "assistant",
          content: res.data.message,
          fields: res.data.fields,
          missingFields: res.data.missingFields,
          timestamp: Date.now(),
        };
        messages.value.push(aiMsg);
      } else {
        const aiMsg: FloatMessage = {
          id: `msg_${Date.now()}_ai`,
          role: "assistant",
          content: res.error || "解析失败，请重新描述",
          timestamp: Date.now(),
        };
        messages.value.push(aiMsg);
      }
    } catch (error) {
      const aiMsg: FloatMessage = {
        id: `msg_${Date.now()}_ai`,
        role: "assistant",
        content: "网络异常，请稍后重试",
        timestamp: Date.now(),
      };
      messages.value.push(aiMsg);
    } finally {
      loading.value = false;
    }
  }

  return {
    isOpen,
    isFullscreen,
    loading,
    messages,
    currentPageId,
    sessionId,
    config,
    configLoaded,
    isVisible,
    FORM_PAGE_IDS,
    loadConfig,
    saveConfig,
    setPageId,
    toggleOpen,
    setOpen,
    toggleFullscreen,
    clearMessages,
    sendMessage,
  };
});
