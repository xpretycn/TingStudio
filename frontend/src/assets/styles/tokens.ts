/**
 * TingStudio Design Tokens — JS-exportable 常量
 * 供 <script> 中动态绑定的颜色值使用（SCSS 变量无法在 JS 中直接引用）
 * 与 theme-variables.scss CSS 变量保持同步
 */

import type { BrandColor } from "@/stores/theme";

// ─── 品牌色色板映射 ───
export const brandColorPalettes: Record<
  BrandColor,
  {
    primary: string;
    primaryLight: string;
    primaryLighter: string;
    primaryLightest: string;
    primaryBg: string;
    primaryDark: string;
  }
> = {
  pink: {
    primary: "#FF6B8A",
    primaryLight: "#FF8FAB",
    primaryLighter: "#FFB5C8",
    primaryLightest: "#FFD6E0",
    primaryBg: "#FFF0F3",
    primaryDark: "#E8A0B0",
  },
  yellow: {
    primary: "#F5A623",
    primaryLight: "#FFBE4F",
    primaryLighter: "#FFD68A",
    primaryLightest: "#FFF0CC",
    primaryBg: "#FFF8E8",
    primaryDark: "#D9901A",
  },
  blue: {
    primary: "#4A90D9",
    primaryLight: "#6BA8E8",
    primaryLighter: "#A3C8F0",
    primaryLightest: "#C8E0F8",
    primaryBg: "#EDF4FD",
    primaryDark: "#3570B0",
  },
  green: {
    primary: "#10B981",
    primaryLight: "#34D399",
    primaryLighter: "#6EE7B7",
    primaryLightest: "#A7F3D0",
    primaryBg: "#D1FAE5",
    primaryDark: "#059669",
  },
};

// 暗色模式下品牌色需要调亮
const darkBrandPalettes: Record<
  BrandColor,
  {
    primary: string;
    primaryLight: string;
    primaryLighter: string;
    primaryLightest: string;
    primaryBg: string;
    primaryDark: string;
  }
> = {
  pink: {
    primary: "#FF8FAB",
    primaryLight: "#FFB5C8",
    primaryLighter: "#FFD6E0",
    primaryLightest: "#FFE0EB",
    primaryBg: "#2D1525",
    primaryDark: "#FF6B8A",
  },
  yellow: {
    primary: "#FFBE4F",
    primaryLight: "#FFD68A",
    primaryLighter: "#FFE8B3",
    primaryLightest: "#FFF0CC",
    primaryBg: "#2D2510",
    primaryDark: "#F5A623",
  },
  blue: {
    primary: "#6BA8E8",
    primaryLight: "#A3C8F0",
    primaryLighter: "#C8E0F8",
    primaryLightest: "#DEEEFF",
    primaryBg: "#151E2D",
    primaryDark: "#4A90D9",
  },
  green: {
    primary: "#34D399",
    primaryLight: "#6EE7B7",
    primaryLighter: "#A7F3D0",
    primaryLightest: "#D1FAE5",
    primaryBg: "#064E3B",
    primaryDark: "#10B981",
  },
};

// ─── 向后兼容的默认品牌色常量（粉色亮色）───
export const brandPrimary = "#FF6B8A";
export const brandPrimaryLight = "#FF8FAB";
export const brandPrimaryLighter = "#FFB5C8";
export const brandPrimaryLightest = "#FFD6E0";
export const brandPrimaryBg = "#FFF0F3";
export const brandPrimaryDark = "#E8A0B0";

// ─── 背景色 ───
export const bgPage = "#FFF9F7";
export const bgContainer = "#FFFFFF";
export const bgContainerAlt = "#FFF9F7";
export const bgHover = "#FFF0F3";

const darkBg = {
  bgPage: "#1A1520",
  bgContainer: "#241E2B",
  bgContainerAlt: "#1F1925",
  bgHover: "#2D1525",
};

// ─── 文字色 ───
export const textPrimary = "#5D4E60";
export const textRegular = "#8B7E94";
export const textSecondary = "#7B7080";
export const textPlaceholder = "#D4C5D0";

const darkText = {
  textPrimary: "#E8DFE8",
  textRegular: "#B8AEC0",
  textSecondary: "#A99BB0",
  textPlaceholder: "#6B5F70",
};

// ─── 状态色 ───
export const colorSuccess = "#7BC67E";
export const colorWarning = "#F0A040";
export const colorDanger = "#E34D59";
export const colorInfo = "#1890FF";

const darkStates = {
  colorInfo: "#3DA1FF",
};

// ─── 图表色板（不随品牌色变化）───
export const chartEnergy = "#FFE066";
export const chartEnergyDeep = "#FFD700";
export const chartProtein = "#FF8FAB";
export const chartProteinDeep = "#FF6B8A";
export const chartFat = "#A8E6CF";
export const chartFatDeep = "#7BC96F";
export const chartCarb = "#B8D4E3";
export const chartCarbDeep = "#7EB6D9";
export const chartSodium = "#DDA0DD";
export const chartSodiumDeep = "#BA55D3";
export const chartProgressGood = "#52C41A";
export const chartProgressWarn = "#FAAD14";
export const chartProgressBad = "#FF4D4F";

// ─── 工具箱渐变色 ───
export const gradientToolPink = "linear-gradient(135deg, #FFB5C8, #FF8FAB)";
export const gradientToolPurple = "linear-gradient(135deg, #E8D5F5, #D4B8F0)";
export const gradientToolBlue = "linear-gradient(135deg, #B8D8F0, #9BC5F0)";
export const gradientToolOrange = "linear-gradient(135deg, #F5D8B8, #F0C5A0)";
export const gradientToolGreen = "linear-gradient(135deg, #D8F5D8, #C5F0C5)";
export const gradientToolGray = "linear-gradient(135deg, #F0F0F0, #E0E0E0)";

// ─── 图标渐变（核心营养素卡片）───
export const gradientEnergy = "linear-gradient(135deg, #FFE066, #FFD700)";
export const gradientProtein = "linear-gradient(135deg, #FF8FAB, #FF6B8A)";
export const gradientFat = "linear-gradient(135deg, #A8E6CF, #7BC96F)";
export const gradientCarb = "linear-gradient(135deg, #B8D4E3, #7EB6D9)";
export const gradientSodium = "linear-gradient(135deg, #DDA0DD, #BA55D3)";

// ═══════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════

/** 获取当前品牌色在指定明暗模式下的 token */
export function getThemeTokens(isDark: boolean, brand: BrandColor = "pink") {
  const palette = isDark ? darkBrandPalettes[brand] : brandColorPalettes[brand];
  const bg = isDark ? darkBg : { bgPage, bgContainer, bgContainerAlt, bgHover };
  const text = isDark ? darkText : { textPrimary, textRegular, textSecondary, textPlaceholder };
  const states = isDark
    ? { ...{ colorSuccess, colorWarning, colorDanger }, ...darkStates }
    : { colorSuccess, colorWarning, colorDanger, colorInfo };

  return {
    ...palette,
    ...bg,
    ...text,
    ...states,
  };
}

/** 获取 TDesign ConfigProvider 所需的品牌色 token
 * 注：TDesign v1.x 不支持通过 globalConfig 切换暗色 token，
 * 暗色适配由 theme-variables.scss 的 [data-theme="dark"] 覆盖 --td-* CSS 变量实现。
 */
export function getTDesignTokens(isDark: boolean, brand: BrandColor = "pink") {
  const palette = isDark ? darkBrandPalettes[brand] : brandColorPalettes[brand];
  return {
    brandColor: palette.primary,
    brandColorHover: palette.primaryLight,
    brandColorActive: palette.primaryDark,
    brandColorLight: palette.primaryBg,
  };
}

/** 品牌色显示名称 */
export const brandColorLabels: Record<BrandColor, string> = {
  pink: "樱花粉",
  yellow: "暖阳黄",
  blue: "天空蓝",
  green: "清新绿",
};

/** 品牌色小圆点色值（用于 UI 选择器预览） */
export const brandColorDots: Record<BrandColor, string> = {
  pink: "#FF6B8A",
  yellow: "#F5A623",
  blue: "#4A90D9",
  green: "#10B981",
};
