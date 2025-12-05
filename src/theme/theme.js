/**
 * React Native Paper Theme Configuration
 * iOS Premium Theme with Maroon Primary
 */

import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import iosColors from './ios.colors';

// Configure fonts for iOS
const fontConfig = {
  web: {
    regular: {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontWeight: '700',
    },
  },
  ios: {
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'System',
      fontWeight: '700',
    },
  },
  default: {
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'System',
      fontWeight: '700',
    },
  },
};

export const lightTheme = {
  ...MD3LightTheme,
  dark: false,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: iosColors.maroon,
    primaryContainer: iosColors.maroonSubtle,
    secondary: iosColors.systemBlue,
    secondaryContainer: 'rgba(0, 122, 255, 0.12)',
    tertiary: iosColors.systemGreen,
    error: iosColors.systemRed,
    errorContainer: 'rgba(255, 59, 48, 0.12)',
    background: iosColors.background,
    surface: iosColors.elevated,
    surfaceVariant: iosColors.elevated2,
    surfaceDisabled: iosColors.fillTertiary,
    onSurface: iosColors.label,
    onSurfaceVariant: iosColors.labelSecondary,
    onSurfaceDisabled: iosColors.labelTertiary,
    outline: iosColors.separator,
    outlineVariant: iosColors.glassBorder,
    inverseSurface: iosColors.black,
    inverseOnSurface: iosColors.white,
    inversePrimary: iosColors.maroonLight,
    shadow: iosColors.black,
    scrim: 'rgba(0, 0, 0, 0.5)',
    backdrop: 'rgba(0, 0, 0, 0.4)',
  },
  roundness: 16,
};

export const darkTheme = {
  ...MD3DarkTheme,
  dark: true,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3DarkTheme.colors,
    primary: iosColors.maroonLight,
    primaryContainer: iosColors.maroonSubtle,
    secondary: iosColors.systemBlue,
    secondaryContainer: 'rgba(100, 210, 255, 0.12)',
    tertiary: iosColors.systemGreen,
    error: iosColors.systemRed,
    errorContainer: 'rgba(255, 69, 58, 0.12)',
    background: '#000000',
    surface: '#1C1C1E',
    surfaceVariant: '#2C2C2E',
    surfaceDisabled: 'rgba(120, 120, 128, 0.24)',
    onSurface: '#FFFFFF',
    onSurfaceVariant: 'rgba(235, 235, 245, 0.6)',
    onSurfaceDisabled: 'rgba(235, 235, 245, 0.3)',
    outline: 'rgba(84, 84, 88, 0.65)',
    outlineVariant: 'rgba(255, 255, 255, 0.15)',
    inverseSurface: '#FFFFFF',
    inverseOnSurface: '#000000',
    inversePrimary: iosColors.maroon,
    shadow: '#000000',
    scrim: 'rgba(0, 0, 0, 0.7)',
    backdrop: 'rgba(0, 0, 0, 0.6)',
  },
  roundness: 16,
};
