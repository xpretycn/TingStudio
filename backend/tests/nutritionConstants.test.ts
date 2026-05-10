import { describe, it, expect } from 'vitest';
import {
  NRV_REFERENCE,
  ATWATER_COEFFICIENTS,
  ZERO_THRESHOLD,
  DEFAULT_RATIO_FACTORS,
  RATIO_VALIDATION_THRESHOLDS,
} from '../src/config/nutritionConstants.js';

describe('Nutrition Constants', () => {
  describe('NRV_REFERENCE', () => {
    it('should contain all required NRV reference values', () => {
      expect(NRV_REFERENCE).toHaveProperty('energy', 8400);
      expect(NRV_REFERENCE).toHaveProperty('protein', 60);
      expect(NRV_REFERENCE).toHaveProperty('fat', 60);
      expect(NRV_REFERENCE).toHaveProperty('carbohydrate', 300);
      expect(NRV_REFERENCE).toHaveProperty('sodium', 2000);
    });

    it('should have positive values only', () => {
      Object.values(NRV_REFERENCE).forEach(value => {
        expect(value).toBeGreaterThan(0);
      });
    });
  });

  describe('ATWATER_COEFFICIENTS', () => {
    it('should contain Atwater energy conversion factors', () => {
      expect(ATWATER_COEFFICIENTS).toHaveProperty('protein_kJ_per_g', 17);
      expect(ATWATER_COEFFICIENTS).toHaveProperty('fat_kJ_per_g', 37);
      expect(ATWATER_COEFFICIENTS).toHaveProperty('carb_kJ_per_g', 17);
      expect(ATWATER_COEFFICIENTS).toHaveProperty('kJ_to_kcal', 0.239);
    });

    it('should have fat coefficient higher than protein and carb', () => {
      expect(ATWATER_COEFFICIENTS.fat_kJ_per_g)
        .toBeGreaterThan(ATWATER_COEFFICIENTS.protein_kJ_per_g);
      expect(ATWATER_COEFFICIENTS.fat_kJ_per_g)
        .toBeGreaterThan(ATWATER_COEFFICIENTS.carb_kJ_per_g);
    });
  });

  describe('ZERO_THRESHOLD', () => {
    it('should contain zero-label thresholds for all nutrients', () => {
      expect(ZERO_THRESHOLD).toHaveProperty('energy_kJ', 17);
      expect(ZERO_THRESHOLD).toHaveProperty('protein_g', 0.5);
      expect(ZERO_THRESHOLD).toHaveProperty('fat_g', 0.5);
      expect(ZERO_THRESHOLD).toHaveProperty('carbohydrate_g', 0.5);
      expect(ZERO_THRESHOLD).toHaveProperty('sodium_mg', 5);
    });

    it('should have reasonable threshold values', () => {
      expect(ZERO_THRESHOLD.energy_kJ).toBeLessThan(100);
      expect(ZERO_THRESHOLD.protein_g).toBeLessThan(1);
      expect(ZERO_THRESHOLD.fat_g).toBeLessThan(1);
      expect(ZERO_THRESHOLD.carbohydrate_g).toBeLessThan(1);
      expect(ZERO_THRESHOLD.sodium_mg).toBeLessThan(10);
    });
  });

  describe('DEFAULT_RATIO_FACTORS', () => {
    it('should contain default ratio factors for material types', () => {
      expect(DEFAULT_RATIO_FACTORS).toHaveProperty('herb', 0.18);
      expect(DEFAULT_RATIO_FACTORS).toHaveProperty('supplement', 1.0);
    });

    it('should have herb factor less than supplement', () => {
      expect(DEFAULT_RATIO_FACTORS.herb).toBeLessThan(DEFAULT_RATIO_FACTORS.supplement);
    });
  });

  describe('RATIO_VALIDATION_THRESHOLDS', () => {
    it('should contain validation thresholds for all levels', () => {
      expect(RATIO_VALIDATION_THRESHOLDS).toHaveProperty('normal');
      expect(RATIO_VALIDATION_THRESHOLDS).toHaveProperty('warning');
      expect(RATIO_VALIDATION_THRESHOLDS).toHaveProperty('highWarning');
    });

    it('should have normal range closest to 1.0', () => {
      const normal = RATIO_VALIDATION_THRESHOLDS.normal;
      expect(normal.low).toBeGreaterThan(0.9);
      expect(normal.high).toBeLessThan(1.1);
      expect(Math.abs(normal.low - 1)).toBeLessThan(Math.abs(RATIO_VALIDATION_THRESHOLDS.warning.low - 1));
    });

    it('should have warning range wider than normal', () => {
      const normalRange = RATIO_VALIDATION_THRESHOLDS.normal.high - RATIO_VALIDATION_THRESHOLDS.normal.low;
      const warningRange = RATIO_VALIDATION_THRESHOLDS.warning.high - RATIO_VALIDATION_THRESHOLDS.warning.low;

      expect(warningRange).toBeGreaterThan(normalRange);
    });
  });
});
