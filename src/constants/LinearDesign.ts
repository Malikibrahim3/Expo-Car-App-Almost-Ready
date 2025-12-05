/**
 * LinearDesign - Premium Theme System
 * 
 * Supports both Dark and Light modes
 * Inspired by Linear.app aesthetic
 */

import { Dimensions, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// DARK MODE COLORS
// ============================================
export const DarkColors = {
  // Core Backgrounds
  background: '#08090a',
  backgroundSecondary: '#141516',
  backgroundTertiary: '#1a1b1c',
  backgroundElevated: '#202122',
  
  // Surfaces (cards, modals)
  surface: '#141516',
  surfaceHover: '#1a1b1c',
  surfaceActive: '#202122',
  
  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderSubtle: 'rgba(255, 255, 255, 0.05)',
  borderStrong: 'rgba(255, 255, 255, 0.12)',
  borderAccent: 'rgba(249, 115, 22, 0.3)',
  
  // Text
  text: '#f7f8f8',
  textSecondary: '#8a8f98',
  textTertiary: '#6c6f75',
  textQuaternary: '#4e5155',
  textInverse: '#000000',
  
  // Brand - Orange
  brand: '#f97316',
  brandLight: '#fb923c',
  brandDark: '#ea580c',
  brandGlow: 'rgba(249, 115, 22, 0.4)',
  brandSubtle: 'rgba(249, 115, 22, 0.15)',
  
  // Semantic Colors
  positive: '#22c55e',
  positiveLight: '#4ade80',
  positiveDark: '#16a34a',
  positiveBg: 'rgba(34, 197, 94, 0.15)',
  positiveGlow: 'rgba(34, 197, 94, 0.4)',
  
  negative: '#ef4444',
  negativeLight: '#f87171',
  negativeDark: '#dc2626',
  negativeBg: 'rgba(239, 68, 68, 0.15)',
  
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  
  info: '#3b82f6',
  infoBg: 'rgba(59, 130, 246, 0.15)',
  
  // Accent colors
  purple: '#5E6AD2',
  blue: '#4EA8DE',
  cyan: '#5CCFE6',
  pink: '#F2A4B5',
  teal: '#5CCFE6',
  
  // Gradients
  gradientBrand: ['#f97316', '#ea580c'] as const,
  gradientHero: ['#1a1b1c', '#08090a'] as const,
  gradientCard: ['#202122', '#141516'] as const,
  gradientPositive: ['#22c55e', '#16a34a'] as const,
  gradientSurface: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'] as const,
  
  // Status bar
  statusBarStyle: 'light' as const,
};

// ============================================
// LIGHT MODE COLORS
// ============================================
export const LightColors = {
  // Core Backgrounds
  background: '#ffffff',
  backgroundSecondary: '#f8f9fa',
  backgroundTertiary: '#f1f3f5',
  backgroundElevated: '#ffffff',
  
  // Surfaces (cards, modals)
  surface: '#ffffff',
  surfaceHover: '#f8f9fa',
  surfaceActive: '#f1f3f5',
  
  // Borders
  border: 'rgba(0, 0, 0, 0.08)',
  borderSubtle: 'rgba(0, 0, 0, 0.05)',
  borderStrong: 'rgba(0, 0, 0, 0.12)',
  borderAccent: 'rgba(249, 115, 22, 0.3)',
  
  // Text - Improved contrast for accessibility
  text: '#1a1a1a',
  textSecondary: '#4b5563',    // Darker for better readability
  textTertiary: '#6b7280',     // Darker for WCAG AA compliance
  textQuaternary: '#9ca3af',   // Darker, still subtle but readable
  textInverse: '#ffffff',
  
  // Brand - Orange (same)
  brand: '#f97316',
  brandLight: '#fb923c',
  brandDark: '#ea580c',
  brandGlow: 'rgba(249, 115, 22, 0.3)',
  brandSubtle: 'rgba(249, 115, 22, 0.1)',
  
  // Semantic Colors
  positive: '#16a34a',
  positiveLight: '#22c55e',
  positiveDark: '#15803d',
  positiveBg: 'rgba(34, 197, 94, 0.1)',
  positiveGlow: 'rgba(34, 197, 94, 0.3)',
  
  negative: '#dc2626',
  negativeLight: '#ef4444',
  negativeDark: '#b91c1c',
  negativeBg: 'rgba(239, 68, 68, 0.1)',
  
  warning: '#d97706',
  warningBg: 'rgba(245, 158, 11, 0.1)',
  
  info: '#2563eb',
  infoBg: 'rgba(59, 130, 246, 0.1)',
  
  // Accent colors
  purple: '#5E6AD2',
  blue: '#4EA8DE',
  cyan: '#5CCFE6',
  pink: '#F2A4B5',
  teal: '#5CCFE6',
  
  // Gradients
  gradientBrand: ['#f97316', '#ea580c'] as const,
  gradientHero: ['#f8f9fa', '#ffffff'] as const,
  gradientCard: ['#ffffff', '#f8f9fa'] as const,
  gradientPositive: ['#22c55e', '#16a34a'] as const,
  gradientSurface: ['rgba(0,0,0,0.03)', 'rgba(0,0,0,0.01)'] as const,
  
  // Status bar
  statusBarStyle: 'dark' as const,
};

// Default to light mode - will be overridden by theme context
export let Colors = { ...LightColors };

// Function to switch themes
export const setThemeColors = (isDark: boolean) => {
  Object.assign(Colors, isDark ? DarkColors : LightColors);
};



// ============================================
// TYPOGRAPHY - iOS SF Pro style (system font)
// ============================================
export const Typography = {
  // Display - iOS Large Title style
  hero: {
    fontSize: 48,
    fontWeight: '700' as const,
    letterSpacing: 0,
    lineHeight: 56,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: 0.37,
    lineHeight: 41,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: 0.36,
    lineHeight: 34,
  },
  title2: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: 0.35,
    lineHeight: 28,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: 0.38,
    lineHeight: 25,
  },
  
  // Body - iOS standard weights
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: -0.32,
    lineHeight: 21,
  },
  subheadline: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: -0.24,
    lineHeight: 20,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: -0.08,
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 16,
  },
  caption2: {
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: 0.07,
    lineHeight: 13,
  },
  
  // Numbers - use system font (not monospace) for iOS feel
  mono: {
    fontSize: 15,
    fontWeight: '500' as const,
    letterSpacing: 0,
  },
  monoLarge: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: 0,
  },
};

// ============================================
// SPACING
// ============================================
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  massive: 64,
};

// ============================================
// RADIUS - iOS-style larger, softer corners
// ============================================
export const Radius = {
  none: 0,
  xs: 6,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 22,
  xxxl: 26,
  full: 9999,
};

// ============================================
// SHADOWS - iOS-style subtle shadows (no colored glows)
// ============================================
export const Shadows = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  // Keep brand shadow subtle - iOS style
  brandGlow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  positiveGlow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  cardGlow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// ============================================
// ICON SIZES
// ============================================
export const IconSizes = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
  hero: 48,
};

// ============================================
// ANIMATION DURATIONS
// ============================================
export const Durations = {
  fast: 150,
  normal: 250,
  slow: 400,
};

// ============================================
// HAPTICS
// ============================================
export const haptic = {
  light: () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },
  medium: () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  },
  heavy: () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  },
  success: () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },
  error: () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  },
};

// ============================================
// SCREEN METRICS
// ============================================
export const Screen = {
  width: SCREEN_WIDTH,
  isSmall: SCREEN_WIDTH < 375,
  isMedium: SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414,
  isLarge: SCREEN_WIDTH >= 414,
};

// ============================================
// COMMON STYLES
// ============================================
export const CommonStyles = {
  // Card base style
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHover: {
    borderColor: Colors.borderStrong,
  },
  cardAccent: {
    borderColor: Colors.borderAccent,
    backgroundColor: Colors.brandSubtle,
  },
  
  // Input base style
  input: {
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    color: Colors.text,
    fontSize: 16,
  },
  
  // Button base styles
  buttonPrimary: {
    backgroundColor: Colors.brand,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
};

export default {
  Colors,
  Typography,
  Spacing,
  Radius,
  Shadows,
  IconSizes,
  Durations,
  haptic,
  Screen,
  CommonStyles,
};
