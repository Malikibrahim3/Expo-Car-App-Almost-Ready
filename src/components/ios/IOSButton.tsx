/**
 * iOS-Compliant Button - Apple HIG style
 * Solid fills, no gradients, proper iOS sizing
 */
import React from 'react';
import { Button as PaperButton, ButtonProps } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { IOS_COLORS } from './theme';

interface IOSButtonProps extends Omit<ButtonProps, 'compact'> {
  compact?: boolean;
}

export const IOSButton: React.FC<IOSButtonProps> = ({ 
  contentStyle,
  compact,
  mode = 'contained',
  style,
  buttonColor,
  textColor,
  ...props 
}) => {
  // Brand color for primary actions - solid fill, no gradient
  const finalButtonColor = mode === 'contained' && !buttonColor ? IOS_COLORS.brand : buttonColor;
  const finalTextColor = mode === 'contained' && !textColor ? '#FFFFFF' : textColor;
  
  return (
    <PaperButton
      mode={mode}
      buttonColor={finalButtonColor}
      textColor={finalTextColor}
      contentStyle={[styles.content, compact && styles.contentCompact, contentStyle]}
      style={[styles.button, style]}
      labelStyle={styles.label}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12, // iOS standard button radius
  },
  content: {
    height: 50, // iOS standard 50pt touch target
    paddingVertical: 0,
  },
  contentCompact: {
    height: 44,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.41,
  },
});
