/**
 * Haptic Feedback Utility
 * Provides tactile feedback for interactions
 */

import * as Haptics from 'expo-haptics';

export const hapticFeedback = {
  // Light tap (button press)
  light: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Haptics not supported on this device
    }
  },
  
  // Medium tap (card selection)
  medium: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Haptics not supported
    }
  },
  
  // Heavy tap (important action)
  heavy: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      // Haptics not supported
    }
  },
  
  // Success (save, add)
  success: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      // Haptics not supported
    }
  },
  
  // Error (delete, fail)
  error: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      // Haptics not supported
    }
  },
  
  // Warning (swipe threshold)
  warning: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      // Haptics not supported
    }
  },
  
  // Selection change (picker, toggle)
  selection: () => {
    try {
      Haptics.selectionAsync();
    } catch (error) {
      // Haptics not supported
    }
  },
};

export default hapticFeedback;
