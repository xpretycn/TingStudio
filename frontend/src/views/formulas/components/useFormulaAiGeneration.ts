import { ref } from "vue";
import { MessagePlugin } from "tdesign-vue-next";
import { agentApi } from "@/api/agent";

interface AiGenerateOptions {
  formulaName: string;
  materials: Array<{ name?: string; quantity: number; type: string }>;
  finishedWeight?: number;
  revisionReason?: string;
  existingDescription?: string;
  type: "description" | "preparation" | "version_reason";
}

export function useFormulaAiGeneration() {
  const aiLoadingDescription = ref(false);
  const aiLoadingPreparation = ref(false);
  const aiLoadingVersionReason = ref(false);

  async function handleAiGenerate(options: AiGenerateOptions, onSuccess: (content: string) => void) {
    const { formulaName, materials, finishedWeight, revisionReason, existingDescription, type } = options;

    const loadingMap: Record<string, ReturnType<typeof ref<boolean>>> = {
      description: aiLoadingDescription,
      preparation: aiLoadingPreparation,
      version_reason: aiLoadingVersionReason,
    };

    const loadingRef = loadingMap[type];
    if (!loadingRef) return;
    if (loadingRef.value) return;

    loadingRef.value = true;
    try {
      const res = await agentApi.generateDescription({
        formulaName,
        materials,
        finishedWeight: finishedWeight || undefined,
        revisionReason,
        existingDescription,
        type,
      });
      if (res?.content) {
        onSuccess(res.content);
        const messages: Record<string, string> = {
          description: "配方描述已智能生成",
          preparation: "制法已智能生成",
          version_reason: "升版原因已智能生成",
        };
        MessagePlugin.success(messages[type] || "已智能生成");
      }
    } catch {
      MessagePlugin.error("生成失败");
    } finally {
      loadingRef.value = false;
    }
  }

  return {
    aiLoadingDescription,
    aiLoadingPreparation,
    aiLoadingVersionReason,
    handleAiGenerate,
  };
}
