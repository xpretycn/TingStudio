import http from './http';

export interface RatioThresholdConfig {
  normalLow: number;
  normalHigh: number;
  warningLow: number;
  warningHigh: number;
  highWarningLow: number;
  highWarningHigh: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

export const ratioThresholdApi = {
  get() {
    return http.get<any, RatioThresholdConfig>('/ratio-thresholds');
  },

  update(data: {
    normalLow: number;
    normalHigh: number;
    warningLow: number;
    warningHigh: number;
    highWarningLow: number;
    highWarningHigh: number;
  }) {
    return http.put<any, RatioThresholdConfig>('/ratio-thresholds', data);
  },
};
