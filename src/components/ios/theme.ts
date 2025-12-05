/**
 * iOS Design System Constants - Apple HIG compliant
 */

export const BRAND = "#f97316"; // Orange brand color
export const BRAND_DARK = "#ea580c";

export const IOS_COLORS = {
  brand: BRAND,
  brandDark: BRAND_DARK,
  white: "#f7f8f8",
  black: "#000000",
  label: "#f7f8f8",
  labelSecondary: "#8a8f98",
  labelTertiary: "#6c6f75",
  labelQuaternary: "#4e5155",
  separator: "rgba(255, 255, 255, 0.08)",
  systemBackground: "#000000",
  secondarySystemBackground: "#1C1C1E",
  tertiarySystemBackground: "#2C2C2E",
  positive: "#22c55e",
  negative: "#ef4444",
  warning: "#f59e0b",
};

// iOS-style subtle shadows - no colored glows
export const IOS_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.15,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 4,
};

export const IOS_SHADOW_BRAND = {
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
};

export const IOS_RADIUS = 14; // iOS standard card radius
export const IOS_PADDING = 16;
export const IOS_MIN_TAP = 44;
export const IOS_SPACING = 12;
