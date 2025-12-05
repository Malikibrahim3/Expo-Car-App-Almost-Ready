/**
 * iOS-Compliant Chip
 * Enforces 44pt minimum height (iOS HIG)
 * Works WITH React Native Paper
 */
import React from 'react';
import { Chip as PaperChip, ChipProps } from 'react-native-paper';
import { StyleSheet, ViewStyle } from 'react-native';

interface IOSChipProps extends Omit<ChipProps, 'compact'> {
  compact?: boolean; // Ignored - always enforces minimum height
}

export const IOSChip: React.FC<IOSChipProps> = ({ 
  style,
  compact, // Ignored
  selectedColor,
  ...props 
}) => {
  // BRIGHT PINK - IMPOSSIBLE TO MISS!
  const finalSelectedColor = selectedColor || '#FF1493';
  
  return (
    <PaperChip
      selectedColor={finalSelectedColor}
      style={[styles.container, style]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    height: 44,
    borderRadius: 22,  // Half of height for pill shape
  },
});
