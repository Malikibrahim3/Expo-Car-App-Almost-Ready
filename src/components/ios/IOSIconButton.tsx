/**
 * iOS-Compliant Icon Button
 * Enforces 44×44pt minimum touch target (iOS HIG)
 */
import React from 'react';
import { IconButton as PaperIconButton, IconButtonProps } from 'react-native-paper';
import { StyleSheet, ViewStyle } from 'react-native';

interface IOSIconButtonProps extends Omit<IconButtonProps, 'style'> {
  style?: ViewStyle;
}

export const IOSIconButton: React.FC<IOSIconButtonProps> = ({ 
  size = 24, 
  style, 
  ...props 
}) => {
  return (
    <PaperIconButton
      size={size}
      style={[styles.container, style]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    margin: 0,
  },
});
