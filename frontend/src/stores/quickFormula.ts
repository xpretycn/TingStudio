import { defineStore } from "pinia"
import { ref, reactive, computed } from "vue"
import type { QuickFormulaData, QuickFormulaDraft, QuickFormulaMaterial } from "@/types/quickFormula"

const DRAFT_KEY = "quick_formula_draft"

const NRV_REF: Record<string, number> = {
  energy: 8400,
  protein: 60,
  fat: 60,
  carbohydrate: 300,
  sodium: 2000,
}

function createDefaultFormulaData(): QuickFormulaData {
  return {
    ratioFactor: 0.18,
    supplementRatioFactor: 1.0,
    finishedWeight: 3000,
    packagingPrice: 0,
    otherPrice: 0,
    profitMargin: 20,
    materials: [],
  }
}

export const useQuickFormulaStore = defineStore("quickFormula", () => {
  // --- State ---
  const phase = ref<"entry" | "editing">("entry")
  const formulaName = ref("")
  const formulaStatus = ref<"new" | "draft">("new")
  const isEditMode = ref(false)
  const hasUnsavedChanges = ref(false)
  const formulaData = reactive<QuickFormulaData>(createDefaultFormulaData())
  const poolFilter = reactive({
    keyword: "",
    type: "all" as "all" | "herb" | "supplement",
    appearance: [] as string[],
    taste: [] as string[],
    efficacy: [] as string[],
  })
  const validationErrors = ref<string[]>([])

  // --- Computed ---
  const herbMaterials = computed(() =>
    formulaData.materials.filter((m) => m.materialType === "herb")
  )

  const supplementMaterials = computed(() =>
    formulaData.materials.filter((m) => m.materialType === "supplement")
  )

  const totalRatio = computed(() => {
    const { finishedWeight, ratioFactor, supplementRatioFactor, materials } = formulaData
    if (finishedWeight <= 0) return 0
    return materials.reduce((sum, m) => {
      const factor = m.materialType === "herb" ? ratioFactor : supplementRatioFactor
      return sum + (m.quantity / finishedWeight) * factor
    }, 0)
  })

  const nutritionSummary = computed(() => {
    const { finishedWeight, ratioFactor, supplementRatioFactor, materials } = formulaData
    if (finishedWeight <= 0) {
      return { energy: 0, protein: 0, fat: 0, carbohydrate: 0, sodium: 0 }
    }

    let energy = 0
    let protein = 0
    let fat = 0
    let carbohydrate = 0
    let sodium = 0

    for (const m of materials) {
      const factor = m.materialType === "herb" ? ratioFactor : supplementRatioFactor
      const ratio = (m.quantity / finishedWeight) * factor
      const n = m.nutrition
      if (!n) continue
      protein += (n.protein ?? 0) * ratio
      fat += (n.fat ?? 0) * ratio
      carbohydrate += (n.carbohydrate ?? 0) * ratio
      sodium += (n.sodium ?? 0) * ratio
    }

    // 先计算能量
    energy = protein * 17 + fat * 37 + carbohydrate * 17

    // 0 界限归零
    if (energy <= 17) energy = 0
    if (protein <= 0.5) protein = 0
    if (fat <= 0.5) fat = 0
    if (carbohydrate <= 0.5) carbohydrate = 0
    if (sodium <= 5) sodium = 0

    // 归零后必须重新计算能量
    energy = protein * 17 + fat * 37 + carbohydrate * 17
    if (energy <= 17) energy = 0

    return { energy, protein, fat, carbohydrate, sodium }
  })

  const materialCost = computed(() =>
    formulaData.materials.reduce((sum, m) => {
      const price = m.unitPrice ?? 0
      return sum + (m.quantity / 1000) * price
    }, 0)
  )

  const costSubtotal = computed(() =>
    materialCost.value + formulaData.packagingPrice + formulaData.otherPrice
  )

  const totalPrice = computed(() =>
    costSubtotal.value * (1 + formulaData.profitMargin / 100)
  )

  const nrvPercent = computed(() => {
    const s = nutritionSummary.value
    return {
      energy: NRV_REF.energy > 0 ? (s.energy / NRV_REF.energy) * 100 : 0,
      protein: NRV_REF.protein > 0 ? (s.protein / NRV_REF.protein) * 100 : 0,
      fat: NRV_REF.fat > 0 ? (s.fat / NRV_REF.fat) * 100 : 0,
      carbohydrate: NRV_REF.carbohydrate > 0 ? (s.carbohydrate / NRV_REF.carbohydrate) * 100 : 0,
      sodium: NRV_REF.sodium > 0 ? (s.sodium / NRV_REF.sodium) * 100 : 0,
    }
  })

  // --- Methods ---
  function enterEditMode() {
    isEditMode.value = true
    phase.value = "entry"
  }

  function exitEditMode() {
    isEditMode.value = false
    phase.value = "entry"
    formulaName.value = ""
    formulaStatus.value = "new"
    hasUnsavedChanges.value = false
    validationErrors.value = []
    Object.assign(formulaData, createDefaultFormulaData())
    poolFilter.keyword = ""
    poolFilter.type = "all"
    poolFilter.appearance = []
    poolFilter.taste = []
    poolFilter.efficacy = []
  }

  function enterEditing(name: string) {
    formulaName.value = name
    phase.value = "editing"
    formulaStatus.value = "new"
  }

  function addMaterial(material: QuickFormulaMaterial) {
    formulaData.materials.push(material)
    hasUnsavedChanges.value = true
  }

  function removeMaterial(materialId: string) {
    const idx = formulaData.materials.findIndex((m) => m.materialId === materialId)
    if (idx !== -1) {
      formulaData.materials.splice(idx, 1)
      hasUnsavedChanges.value = true
    }
  }

  function updateMaterialQuantity(materialId: string, quantity: number) {
    const m = formulaData.materials.find((item) => item.materialId === materialId)
    if (m) {
      m.quantity = quantity
      hasUnsavedChanges.value = true
    }
  }

  function saveDraft() {
    const draft: QuickFormulaDraft = {
      formulaName: formulaName.value,
      formulaData: { ...formulaData, materials: [...formulaData.materials] },
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }

  function loadDraft(): QuickFormulaDraft | null {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as QuickFormulaDraft
    } catch {
      return null
    }
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY)
  }

  function restoreDraft(draft: QuickFormulaDraft) {
    formulaName.value = draft.formulaName
    Object.assign(formulaData, draft.formulaData)
    // 确保 materials 是新数组引用，避免 reactive 丢失
    formulaData.materials = [...draft.formulaData.materials]
    phase.value = "editing"
    formulaStatus.value = "draft"
  }

  function resetFormulaData() {
    Object.assign(formulaData, createDefaultFormulaData())
  }

  function validate(): string[] {
    const errors: string[] = []
    if (!formulaName.value.trim()) {
      errors.push("配方名称不能为空")
    }
    if (formulaData.materials.length === 0) {
      errors.push("至少需要添加一种原料")
    }
    if (formulaData.finishedWeight <= 0) {
      errors.push("成品重量必须大于 0")
    }
    validationErrors.value = errors
    return errors
  }

  return {
    // State
    phase,
    formulaName,
    formulaStatus,
    isEditMode,
    hasUnsavedChanges,
    formulaData,
    poolFilter,
    validationErrors,
    // Computed
    herbMaterials,
    supplementMaterials,
    totalRatio,
    nutritionSummary,
    materialCost,
    costSubtotal,
    totalPrice,
    nrvPercent,
    // Methods
    enterEditMode,
    exitEditMode,
    enterEditing,
    addMaterial,
    removeMaterial,
    updateMaterialQuantity,
    saveDraft,
    loadDraft,
    clearDraft,
    restoreDraft,
    resetFormulaData,
    validate,
  }
})
