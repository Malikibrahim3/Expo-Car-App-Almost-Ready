/**
 * IOSCard - iOS-style card component
 * Clean, borderless cards with subtle shadows - Apple HIG compliant
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { IOS_PADDING } from './theme';
import { useThemeMode } from '../../context/ThemeContext';

interface IOSCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  elevation?: number;
}

export const IOSCard: React.FC<IOSCardProps> = ({ children, style, elevation = 2 }) => {
  const { colors } = useThemeMode();
  
  // iOS-style subtle shadow - no colored glows
  const CARD_SHADOW = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  };

  return (
    <View style={[styles.card, CARD_SHADOW, { backgroundColor: colors.surface }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: IOS_PADDING,
  },
});
