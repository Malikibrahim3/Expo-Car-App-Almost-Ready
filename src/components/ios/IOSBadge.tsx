/**
 * IOSBadge - iOS-style badge
 * Replaces react-native-paper Badge
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { IOSText } from './IOSText';
import { MAROON, IOS_COLORS } from './theme';

interface IOSBadgeProps {
  children: React.ReactNode;
  size?: number;
  style?: ViewStyle | ViewStyle[];
  backgroundColor?: string;
}

export const IOSBadge: React.FC<IOSBadgeProps> = ({ 
  children, 
  size = 20,
  style,
  backgroundColor = MAROON 
}) => {
  return (
    <View 
      style={[
        styles.badge, 
        { 
          minWidth: size, 
          height: size, 
          borderRadius: size / 2,
          backgroundColor 
        },
        style
      ]}
    >
      <IOSText style={styles.text} weight="semibold">
        {children}
      </IOSText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  text: {
    color: IOS_COLORS.white,
    fontSize: 12,
  },
});
