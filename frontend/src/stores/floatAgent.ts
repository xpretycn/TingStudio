import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { agentApi, type AgentFloatConfig, type ParseFormRequest } from "@/api/agent";

export interface TokenUsage {
  total_tokens: number;
  prompt_tokens?: number;
  completion_tokens?: number;
}

export interface FloatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  fields?: Record<string, unknown>;
  missingFields?: string[];
  toolName?: string;
  displayType?: string;
  toolData?: Record<string, unknown>;
  metadata?: { model?: string; latency?: number; tokenUsage?: TokenUsage };
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

const FORM_PAGE_IDS = ["formula-add", "formula-edit", "material-add", "material-edit", "salesman-add", "salesman-edit"];

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "/api";

function classifyFloatIntent(utterance: string): "fill" | "agent" {
  const text = utterance.toLowerCase();
  if (/对比|比较|vs|区别|差异/.test(text)) return "agent";
  if (/替代|替换|代替|换掉|替补/.test(text)) return "agent";
  if (/报价|报价单|多少钱|售价|定价|价格/.test(text)) return "agent";
  if (/生成描述|生成制法|智能生成|写描述|写制法|帮我写/.test(text)) return "agent";
  if (/算|计算|校验|合规|营养|成本|含量比|系数/.test(text)) return "agent";
  if (/什么意思|合规吗|范围|规范|单位|标准|规则|是什么|怎么填|能不能|可以吗/.test(text)) return "agent";
  return "fill";
}

export const useFloatAgentStore = defineStore("floatAgent", () => {
  const isOpen = ref(false);
  const isFullscreen = ref(false);
  const loading = ref(false);
  const messages = ref<FloatMessage[]>([]);
  const currentPageId = ref<string>("");
  const sessionId = ref<string | null>(null);
  const config = ref<AgentFloatConfig>({ ...DEFAULT_CONFIG });
  const configLoaded = ref(false);
  const fieldHintsCount = ref(0);
  const missingFieldsList = ref<string[]>([]);
  const agentHealthStatus = ref<"online" | "loading" | "error">("online");

  const isVisible = computed(() => {
    if (!config.value.enabled) return false;
    if (config.value.enabledPages.length === 0) return FORM_PAGE_IDS.includes(currentPageId.value);
    return config.value.enabledPages.includes(currentPageId.value);
  });

  const badgeCount = computed(() => fieldHintsCount.value);

  const dynamicTitle = computed(() => {
    const titleMap: Record<string, string> = {
      "formula-add": "新增配方",
      "formula-edit": "编辑配方",
      "material-add": "新增原料",
      "material-edit": "编辑原料",
      "salesman-add": "新增业务员",
      "salesman-edit": "编辑业务员",
    };
    return titleMap[currentPageId.value] || "AI 助手";
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

  async function fetchFieldHints() {
    if (!currentPageId.value) return;
    try {
      const data = await agentApi.getFieldHints(currentPageId.value);
      if (data && typeof data.count === "number") {
        missingFieldsList.value = data.missingFields || [];
      }
    } catch {
      missingFieldsList.value = [];
    }
  }

  function updateFieldHintsLocal(missingFields: string[], count: number) {
    missingFieldsList.value = missingFields;
    fieldHintsCount.value = count;
  }

  function showMissingFieldsHint() {
    if (missingFieldsList.value.length === 0 || messages.value.length > 0) return;
    const aiMsg: FloatMessage = {
      id: `msg_${Date.now()}_ai`,
      role: "assistant",
      content: "检测到表单存在未填写的必填字段，请提供以下信息：",
      missingFields: missingFieldsList.value,
      timestamp: Date.now(),
    };
    messages.value.push(aiMsg);
  }

  async function fetchHealth() {
    try {
      const data = await agentApi.getHealth();
      if (data && data.status) {
        agentHealthStatus.value = data.status as "online" | "loading" | "error";
      }
    } catch {
      agentHealthStatus.value = "error";
    }
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

    const intent = classifyFloatIntent(utterance);

    if (intent === "fill") {
      await sendFillMessage(utterance);
    } else {
      await sendAgentMessage(utterance);
    }
  }

  async function sendFillMessage(utterance: string) {
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
      const data = await agentApi.parseForm(params);

      if (data && (data.fields || data.missingFields)) {
        sessionId.value = data.sessionId;
        const fieldCount = data.fields ? Object.keys(data.fields).length : 0;
        const aiMsg: FloatMessage = {
          id: `msg_${Date.now()}_ai`,
          role: "assistant",
          content: data.message || (fieldCount > 0 ? `已解析${fieldCount}个字段` : "请提供更多信息"),
          fields: data.fields || {},
          missingFields: data.missingFields || [],
          timestamp: Date.now(),
        };
        messages.value.push(aiMsg);
      } else {
        const aiMsg: FloatMessage = {
          id: `msg_${Date.now()}_ai`,
          role: "assistant",
          content: (data as Record<string, unknown>)?.message as string || "解析失败，请重新描述",
          timestamp: Date.now(),
        };
        messages.value.push(aiMsg);
      }
    } catch (error: unknown) {
      const aiMsg: FloatMessage = {
        id: `msg_${Date.now()}_ai`,
        role: "assistant",
        content: error instanceof Error ? error.message : "网络异常，请稍后重试",
        timestamp: Date.now(),
      };
      messages.value.push(aiMsg);
    } finally {
      loading.value = false;
    }
  }

  async function sendAgentMessage(utterance: string) {
    loading.value = true;

    const aiMsgId = `msg_${Date.now()}_ai`;
    const aiMsg: FloatMessage = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    messages.value.push(aiMsg);

    try {
      const context = messages.value
        .slice(-6)
        .filter(m => m.role === "user" || m.role === "assistant" && m.id !== aiMsgId)
        .map(m => ({ role: m.role, content: m.content }));

      const token = localStorage.getItem("tingstudio_token");
      const resp = await fetch(`${API_BASE}/agent/float-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          pageId: currentPageId.value,
          utterance,
          context,
          sessionId: sessionId.value || undefined,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        updateMessage(aiMsgId, { content: err.error || "请求失败" });
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) {
        updateMessage(aiMsgId, { content: "无法读取响应流" });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;

          try {
            const evt = JSON.parse(jsonStr);
            handleSSEEvent(evt, aiMsgId);
          } catch {
            // ignore parse error for SSE chunk
          }
        }
      }
    } catch {
      updateMessage(aiMsgId, { content: "网络异常，请稍后重试" });
    } finally {
      loading.value = false;
    }
  }

  function handleSSEEvent(evt: Record<string, unknown>, aiMsgId: string) {
    const type = evt.type as string;
    switch (type) {
      case "chunk":
        appendMessageContent(aiMsgId, (evt.content as string) || "");
        break;
      case "content_clear":
        updateMessage(aiMsgId, { content: "" });
        break;
      case "tool_calls":
        break;
      case "tool_result":
        updateMessage(aiMsgId, {
          toolName: evt.toolName as string | undefined,
          displayType: evt.displayType as string | undefined,
          toolData: evt.data as Record<string, unknown> | undefined,
        });
        break;
      case "write_guidance":
        updateMessage(aiMsgId, {
          content: (evt.message as string) || "此操作需要前往对应页面完成",
          toolName: evt.toolName as string | undefined,
        });
        break;
      case "done":
        if (evt.sessionId) sessionId.value = evt.sessionId as string;
        updateMessage(aiMsgId, {
          displayType: (evt.displayType as string) || undefined,
          metadata: {
            model: evt.model as string | undefined,
            latency: evt.latency as number | undefined,
            tokenUsage: evt.usage as TokenUsage | undefined,
          },
        });
        break;
      case "error":
        updateMessage(aiMsgId, { content: (evt.message as string) || "发生错误" });
        break;
    }
  }

  function updateMessage(id: string, patch: Partial<FloatMessage>) {
    const idx = messages.value.findIndex(m => m.id === id);
    if (idx >= 0) {
      messages.value[idx] = { ...messages.value[idx], ...patch };
    }
  }

  function appendMessageContent(id: string, chunk: string) {
    const idx = messages.value.findIndex(m => m.id === id);
    if (idx >= 0) {
      messages.value[idx] = { ...messages.value[idx], content: (messages.value[idx].content || "") + chunk };
    }
  }

  function deleteMessage(msgId: string) {
    const index = messages.value.findIndex(m => m.id === msgId);
    if (index !== -1) {
      messages.value.splice(index, 1);
    }
  }

  function retryMessage(msg: FloatMessage) {
    const msgIndex = messages.value.indexOf(msg);
    let retryContent = "";
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages.value[i].role === "user") {
        retryContent = messages.value[i].content;
        break;
      }
    }
    if (!retryContent) return;
    sendMessage(retryContent);
  }

  function sendQuickCommand(command: string) {
    sendMessage(command);
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
    fieldHintsCount,
    missingFieldsList,
    agentHealthStatus,
    badgeCount,
    dynamicTitle,
    FORM_PAGE_IDS,
    loadConfig,
    saveConfig,
    setPageId,
    toggleOpen,
    setOpen,
    toggleFullscreen,
    clearMessages,
    sendMessage,
    deleteMessage,
    retryMessage,
    sendQuickCommand,
    showMissingFieldsHint,
    updateFieldHintsLocal,
    fetchFieldHints,
    fetchHealth,
  };
});
