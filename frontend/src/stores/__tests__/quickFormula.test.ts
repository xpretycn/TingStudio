import { describe, it, expect, beforeEach, vi } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { useQuickFormulaStore } from "@/stores/quickFormula"
import type { QuickFormulaMaterial } from "@/types/quickFormula"

function makeHerb(overrides: Partial<QuickFormulaMaterial> = {}): QuickFormulaMaterial {
  return {
    materialId: "h1",
    materialName: "当归",
    quantity: 500,
    materialType: "herb",
    unitPrice: 100,
    nutrition: { protein: 10, fat: 5, carbohydrate: 20, sodium: 30 },
    ...overrides,
  }
}

function makeSupplement(overrides: Partial<QuickFormulaMaterial> = {}): QuickFormulaMaterial {
  return {
    materialId: "s1",
    materialName: "维生素C",
    quantity: 100,
    materialType: "supplement",
    unitPrice: 50,
    nutrition: { protein: 0, fat: 0, carbohydrate: 80, sodium: 10 },
    ...overrides,
  }
}

describe("useQuickFormulaStore", () => {
  let store: ReturnType<typeof useQuickFormulaStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useQuickFormulaStore()
  })

  describe("totalRatio computed", () => {
    it("Q01: Returns 0 when finishedWeight <= 0", () => {
      store.formulaData.finishedWeight = 0
      store.formulaData.materials.push(makeHerb())
      expect(store.totalRatio).toBe(0)
    })

    it("Q01b: Returns 0 when finishedWeight is negative", () => {
      store.formulaData.finishedWeight = -100
      store.formulaData.materials.push(makeHerb())
      expect(store.totalRatio).toBe(0)
    })

    it("Q02: Correct ratio for single herb material", () => {
      store.formulaData.finishedWeight = 900
      store.formulaData.ratioFactor = 0.18
      store.formulaData.materials.push(makeHerb({ quantity: 500 }))
      // (500 / 900) * 0.18 = 0.1
      expect(store.totalRatio).toBe(0.1)
    })

    it("Q03: Correct ratio for single supplement material", () => {
      store.formulaData.finishedWeight = 900
      store.formulaData.supplementRatioFactor = 1.0
      store.formulaData.materials.push(makeSupplement({ quantity: 100 }))
      // (100 / 900) * 1.0 ≈ 0.11111
      expect(store.totalRatio).toBeCloseTo(0.11111, 5)
    })

    it("Q04: Correct ratio for mixed materials (herb + supplement)", () => {
      store.formulaData.finishedWeight = 900
      store.formulaData.ratioFactor = 0.18
      store.formulaData.supplementRatioFactor = 1.0
      store.formulaData.materials.push(makeHerb({ quantity: 500 }))
      store.formulaData.materials.push(makeSupplement({ quantity: 100 }))
      // herb: (500/900)*0.18 = 0.1
      // supplement: (100/900)*1.0 ≈ 0.11111
      // total ≈ 0.21111
      expect(store.totalRatio).toBeCloseTo(0.21111, 5)
    })

    it("Q05: Rounds to 5 decimal places", () => {
      store.formulaData.finishedWeight = 7
      store.formulaData.ratioFactor = 0.18
      store.formulaData.materials.push(makeHerb({ quantity: 1 }))
      // (1/7)*0.18 ≈ 0.02571428...
      // roundRatio: Math.round(2571.428...) / 100000 = 2571 / 100000 = 0.02571
      expect(store.totalRatio).toBe(0.02571)
    })

    it("Q06: Handles empty materials array", () => {
      store.formulaData.finishedWeight = 900
      store.formulaData.materials = []
      expect(store.totalRatio).toBe(0)
    })
  })

  describe("nutritionSummary computed", () => {
    it("Q10: Returns zeros when finishedWeight <= 0", () => {
      store.formulaData.finishedWeight = 0
      store.formulaData.materials.push(
        makeHerb({ nutrition: { protein: 100, fat: 50, carbohydrate: 200, sodium: 100 } }),
      )
      expect(store.nutritionSummary).toEqual({
        energy: 0,
        protein: 0,
        fat: 0,
        carbohydrate: 0,
        sodium: 0,
      })
    })

    it("Q11: Correctly sums nutrition from multiple materials", () => {
      store.formulaData.finishedWeight = 1000
      store.formulaData.ratioFactor = 0.18
      store.formulaData.supplementRatioFactor = 1.0

      store.formulaData.materials.push(
        makeHerb({
          quantity: 180,
          nutrition: { protein: 50, fat: 10, carbohydrate: 80, sodium: 200 },
        }),
      )
      store.formulaData.materials.push(
        makeSupplement({
          quantity: 100,
          nutrition: { protein: 30, fat: 5, carbohydrate: 60, sodium: 100 },
        }),
      )

      // herb ratio: (180/1000)*0.18 = 0.0324
      // supplement ratio: (100/1000)*1.0 = 0.1
      // protein: 50*0.0324 + 30*0.1 = 1.62 + 3 = 4.62
      // fat: 10*0.0324 + 5*0.1 = 0.324 + 0.5 = 0.824
      // carbohydrate: 80*0.0324 + 60*0.1 = 2.592 + 6 = 8.592
      // sodium: 200*0.0324 + 100*0.1 = 6.48 + 10 = 16.48
      // energy = 4.62*17 + 0.824*37 + 8.592*17 = 78.54 + 30.488 + 146.064 = 255.092

      const s = store.nutritionSummary
      expect(s.protein).toBeCloseTo(4.62, 2)
      expect(s.fat).toBeCloseTo(0.824, 3)
      expect(s.carbohydrate).toBeCloseTo(8.592, 3)
      expect(s.sodium).toBeCloseTo(16.48, 2)
      expect(s.energy).toBeCloseTo(255.092, 2)
    })

    it("Q12: Applies 0-boundary zeroing (protein <= 0.5, fat <= 0.5, etc.)", () => {
      store.formulaData.finishedWeight = 1000
      store.formulaData.supplementRatioFactor = 1.0
      store.formulaData.materials.push(
        makeSupplement({
          quantity: 10,
          nutrition: { protein: 10, fat: 10, carbohydrate: 10, sodium: 10 },
        }),
      )

      // ratio = (10/1000)*1.0 = 0.01
      // protein: 10*0.01 = 0.1 → ≤ 0.5 → 0
      // fat: 10*0.01 = 0.1 → ≤ 0.5 → 0
      // carbohydrate: 10*0.01 = 0.1 → ≤ 0.5 → 0
      // sodium: 10*0.01 = 0.1 → ≤ 5 → 0
      // energy before: 0.1*17 + 0.1*37 + 0.1*17 = 7.1 → ≤ 17 → 0

      expect(store.nutritionSummary).toEqual({
        energy: 0,
        protein: 0,
        fat: 0,
        carbohydrate: 0,
        sodium: 0,
      })
    })

    it("Q13: Recalculates energy after zeroing (fat zeroed, energy stays)", () => {
      store.formulaData.finishedWeight = 1000
      store.formulaData.supplementRatioFactor = 1.0
      store.formulaData.materials.push(
        makeSupplement({
          quantity: 100,
          nutrition: { protein: 100, fat: 0.1, carbohydrate: 100, sodium: 10 },
        }),
      )

      // ratio = 0.1
      // protein: 100*0.1 = 10 → > 0.5 ✓
      // fat: 0.1*0.1 = 0.01 → ≤ 0.5 → 0
      // carbohydrate: 100*0.1 = 10 → > 0.5 ✓
      // sodium: 10*0.1 = 1 → ≤ 5 → 0
      // energy = 10*17 + 0*37 + 10*17 = 340 → > 17 ✓

      const s = store.nutritionSummary
      expect(s.protein).toBe(10)
      expect(s.fat).toBe(0)
      expect(s.carbohydrate).toBe(10)
      expect(s.sodium).toBe(0)
      expect(s.energy).toBe(340)
    })
  })

  describe("costSummary (materialCost / costSubtotal / totalPrice)", () => {
    it("Q20: Calculates material cost correctly", () => {
      store.formulaData.materials.push(
        makeHerb({ quantity: 500, unitPrice: 100 }),
      )
      store.formulaData.materials.push(
        makeSupplement({ quantity: 200, unitPrice: 50 }),
      )
      // (500/1000)*100 + (200/1000)*50 = 50 + 10 = 60
      expect(store.materialCost).toBe(60)
    })

    it("Q21: Includes packaging and other costs in costSubtotal", () => {
      store.formulaData.packagingPrice = 2
      store.formulaData.otherPrice = 3
      store.formulaData.materials.push(
        makeHerb({ quantity: 500, unitPrice: 100 }),
      )
      // materialCost = 50, costSubtotal = 50 + 2 + 3 = 55
      expect(store.costSubtotal).toBe(55)
    })

    it("Q22: Applies profit margin correctly in totalPrice", () => {
      store.formulaData.packagingPrice = 2
      store.formulaData.otherPrice = 3
      store.formulaData.profitMargin = 30
      store.formulaData.materials.push(
        makeHerb({ quantity: 500, unitPrice: 100 }),
      )
      // costSubtotal = 55, totalPrice = 55 * (1 + 30/100) = 55 * 1.3 = 71.5
      expect(store.totalPrice).toBe(71.5)
    })
  })

  describe("addMaterial", () => {
    it("Q30: Adds material to the list", () => {
      const mat = makeHerb()
      store.addMaterial(mat)
      expect(store.formulaData.materials).toHaveLength(1)
      expect(store.formulaData.materials[0].materialId).toBe("h1")
    })

    it("Q31: Sets baseUnitPrice and isPriceAdjusted defaults", () => {
      const mat = makeHerb({ unitPrice: 80 })
      store.addMaterial(mat)
      const added = store.formulaData.materials[0] as QuickFormulaMaterial & {
        baseUnitPrice: number | null
        isPriceAdjusted: boolean
      }
      expect(added.baseUnitPrice).toBe(80)
      expect(added.isPriceAdjusted).toBe(false)
      expect(store.hasUnsavedChanges).toBe(true)
    })

    it("Q31b: Sets baseUnitPrice to null when unitPrice is undefined", () => {
      const mat = makeHerb({ unitPrice: undefined })
      store.addMaterial(mat)
      const added = store.formulaData.materials[0] as QuickFormulaMaterial & {
        baseUnitPrice: number | null
      }
      expect(added.baseUnitPrice).toBeNull()
    })
  })

  describe("removeMaterial", () => {
    it("Q32: Removes material by materialId", () => {
      store.formulaData.materials.push(makeHerb({ materialId: "h1" }))
      store.formulaData.materials.push(makeSupplement({ materialId: "s1" }))
      expect(store.formulaData.materials).toHaveLength(2)

      store.removeMaterial("h1")
      expect(store.formulaData.materials).toHaveLength(1)
      expect(store.formulaData.materials[0].materialId).toBe("s1")
      expect(store.hasUnsavedChanges).toBe(true)
    })

    it("Q32b: Silently ignores non-existent materialId", () => {
      store.formulaData.materials.push(makeHerb({ materialId: "h1" }))
      store.removeMaterial("nonexistent")
      expect(store.formulaData.materials).toHaveLength(1)
    })
  })

  describe("calculateMaterialRatio", () => {
    it("Q40: Returns '0.00%' when finishedWeight <= 0", () => {
      store.formulaData.finishedWeight = 0
      const mat = makeHerb({ quantity: 100 })
      expect(store.calculateMaterialRatio(mat)).toBe("0.00%")
    })

    it("Q41: Returns '0.00%' when quantity <= 0", () => {
      store.formulaData.finishedWeight = 900
      const mat = makeHerb({ quantity: 0 })
      expect(store.calculateMaterialRatio(mat)).toBe("0.00%")
    })

    it("Q41b: Returns '0.00%' when quantity is negative", () => {
      store.formulaData.finishedWeight = 900
      const mat = makeHerb({ quantity: -50 })
      expect(store.calculateMaterialRatio(mat)).toBe("0.00%")
    })

    it("Q42: Correct percentage for herb material", () => {
      store.formulaData.finishedWeight = 900
      store.formulaData.ratioFactor = 0.18
      const mat = makeHerb({ quantity: 500 })
      // (500/900)*0.18 = 0.1 → 10.00%
      expect(store.calculateMaterialRatio(mat)).toBe("10.00%")
    })

    it("Q43: Correct percentage for supplement material", () => {
      store.formulaData.finishedWeight = 900
      store.formulaData.supplementRatioFactor = 1.0
      const mat = makeSupplement({ quantity: 90 })
      // (90/900)*1.0 = 0.1 → 10.00%
      expect(store.calculateMaterialRatio(mat)).toBe("10.00%")
    })
  })

  describe("validate", () => {
    it("Q50: Returns error when name is empty", () => {
      store.formulaName = ""
      store.formulaData.materials.push(makeHerb())
      store.formulaData.finishedWeight = 900
      const errors = store.validate()
      expect(errors).toContain("配方名称不能为空")
    })

    it("Q51: Returns error when no materials", () => {
      store.formulaName = "测试配方"
      store.formulaData.materials = []
      store.formulaData.finishedWeight = 900
      const errors = store.validate()
      expect(errors).toContain("至少需要添加一种原料")
    })

    it("Q52: Returns error when finishedWeight <= 0", () => {
      store.formulaName = "测试配方"
      store.formulaData.materials.push(makeHerb())
      store.formulaData.finishedWeight = 0
      const errors = store.validate()
      expect(errors).toContain("成品重量必须大于 0")
    })

    it("Q53: Returns success (empty array) when all fields valid", () => {
      store.formulaName = "测试配方"
      store.formulaData.materials.push(makeHerb())
      store.formulaData.finishedWeight = 900
      const errors = store.validate()
      expect(errors).toEqual([])
    })

    it("Q53b: Returns multiple errors when multiple fields invalid", () => {
      store.formulaName = ""
      store.formulaData.materials = []
      store.formulaData.finishedWeight = -1
      const errors = store.validate()
      expect(errors).toHaveLength(3)
      expect(errors).toContain("配方名称不能为空")
      expect(errors).toContain("至少需要添加一种原料")
      expect(errors).toContain("成品重量必须大于 0")
    })

    it("Q53c: Stores errors in validationErrors ref", () => {
      store.formulaName = ""
      store.validate()
      expect(store.validationErrors).toContain("配方名称不能为空")
    })
  })
})
