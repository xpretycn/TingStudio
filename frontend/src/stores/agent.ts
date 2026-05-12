import { defineStore } from "pinia";
import { ref } from "vue";
import { agentApi, type AgentSession, type AgentMessage } from "@/api/agent";

export const useAgentStore = defineStore("agent", () => {
  const sessions = ref<AgentSession[]>([]);
  const currentSessionId = ref<string | null>(null);
  const messages = ref<AgentMessage[]>([]);
  const loading = ref(false);

  async function loadSessions() {
    try {
      loading.value = true;
      const res = await agentApi.getSessions();
      if (res.success) {
        sessions.value = res.data;
      }
    } catch (error) {
      console.error("[AgentStore] loadSessions error:", error);
    } finally {
      loading.value = false;
    }
  }

  async function loadSessionMessages(sessionId: string) {
    try {
      loading.value = true;
      const res = await agentApi.getSessionMessages(sessionId);
      if (res.success) {
        currentSessionId.value = sessionId;
        messages.value = res.data.messages;
      }
    } catch (error) {
      console.error("[AgentStore] loadSessionMessages error:", error);
    } finally {
      loading.value = false;
    }
  }

  async function deleteSession(sessionId: string) {
    try {
      await agentApi.deleteSession(sessionId);
      sessions.value = sessions.value.filter((s) => s.id !== sessionId);
      if (currentSessionId.value === sessionId) {
        currentSessionId.value = null;
        messages.value = [];
      }
    } catch (error) {
      console.error("[AgentStore] deleteSession error:", error);
    }
  }

  function clearCurrentSession() {
    currentSessionId.value = null;
    messages.value = [];
  }

  return {
    sessions,
    currentSessionId,
    messages,
    loading,
    loadSessions,
    loadSessionMessages,
    deleteSession,
    clearCurrentSession,
  };
});
