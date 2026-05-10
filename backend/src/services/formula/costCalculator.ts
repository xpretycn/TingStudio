interface MaterialCost {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface CostCalculationInput {
  materials: MaterialCost[];
  packaging_cost?: number;
  other_costs?: number;
  profit_margin_percent?: number;
}

interface CostCalculationResult {
  material_subtotal: number;
  packaging_cost: number;
  other_costs: number;
  cost_subtotal: number;
  profit_amount: number;
  total_price: number;
  breakdown: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    percentage_of_total: number;
  }>;
  summary: {
    total_materials: number;
    average_unit_price: number;
    profit_rate_applied: number;
  };
}

class CostCalculator {

  calculate(input: CostCalculationInput): CostCalculationResult {
    const packaging_cost = input.packaging_cost ?? 0;
    const other_costs = input.other_costs ?? 0;
    const profit_margin = input.profit_margin_percent ?? 0;

    const materialSubtotal = this.calculateMaterialSubtotal(input.materials);
    const costSubtotal = materialSubtotal + packaging_cost + other_costs;
    const profitAmount = (costSubtotal * profit_margin) / 100;
    const totalPrice = costSubtotal + profitAmount;

    return {
      material_subtotal: Math.round(materialSubtotal * 100) / 100,
      packaging_cost: Math.round(packaging_cost * 100) / 100,
      other_costs: Math.round(other_costs * 100) / 100,
      cost_subtotal: Math.round(costSubtotal * 100) / 100,
      profit_amount: Math.round(profitAmount * 100) / 100,
      total_price: Math.round(totalPrice * 100) / 100,
      breakdown: this.buildBreakdown(input.materials, totalPrice),
      summary: this.buildSummary(input.materials, materialSubtotal, profit_margin),
    };
  }

  private calculateMaterialSubtotal(materials: MaterialCost[]): number {
    let sum = 0;

    for (const m of materials) {
      sum += (m.quantity / 1000) * m.unitPrice;
    }

    return parseFloat(sum.toFixed(4));
  }

  private buildBreakdown(
    materials: MaterialCost[],
    totalPrice: number
  ): Array<{
    name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    percentage_of_total: number;
  }> {
    if (totalPrice === 0) return [];

    return materials.map(m => ({
      name: m.name,
      quantity: m.quantity,
      unit_price: m.unitPrice,
      subtotal: Math.round((m.quantity / 1000) * m.unitPrice * 100) / 100,
      percentage_of_total: Math.round(((m.quantity / 1000) * m.unitPrice / totalPrice) * 10000) / 100,
    }));
  }

  private buildSummary(
    materials: MaterialCost[],
    materialSubtotal: number,
    profitMargin: number
  ) {
    const totalQuantity = materials.reduce((sum, m) => sum + m.quantity, 0);
    const avgUnitPrice = totalQuantity > 0 ? materialSubtotal / (totalQuantity / 1000) : 0;

    return {
      total_materials: materials.length,
      average_unit_price: Math.round(avgUnitPrice * 100) / 100,
      profit_rate_applied: profitMargin,
    };
  }

  calculatePerUnit(
    result: CostCalculationResult,
    finishedWeight: number
  ): { per_kg_cost: number; per_100g_cost: number } {
    const factor = 1 / (finishedWeight / 1000);

    return {
      per_kg_cost: Math.round(result.cost_subtotal * factor * 100) / 100,
      per_100g_cost: Math.round(result.cost_subtotal * (factor / 10) * 100) / 100,
    };
  }
}

export const costCalculator = new CostCalculator();
export type { MaterialCost, CostCalculationInput, CostCalculationResult };
