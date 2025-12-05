/**
 * IOSHelperText - iOS-style helper/error text
 * Replaces react-native-paper HelperText
 */
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { IOSText } from './IOSText';
import { IOS_COLORS } from './theme';

interface IOSHelperTextProps {
  children: React.ReactNode;
  type?: 'error' | 'info';
  visible?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export const IOSHelperText: React.FC<IOSHelperTextProps> = ({ 
  children, 
  type = 'info',
  visible = true,
  style 
}) => {
  if (!visible) return null;

  return (
    <IOSText 
      style={[
        styles.text,
        type === 'error' && styles.error,
        style
      ]}
    >
      {children}
    </IOSText>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    color: IOS_COLORS.labelSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
  error: {
    color: '#FF3B30',
  },
});
