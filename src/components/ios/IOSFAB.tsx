/**
 * IOSFAB - iOS-style Floating Action Button
 * Replaces react-native-paper FAB
 */
import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { MAROON, IOS_SHADOW_MAROON, IOS_COLORS } from './theme';

interface IOSFABProps {
  icon: string;
  onPress: () => void;
  style?: ViewStyle | ViewStyle[];
  color?: string;
  size?: number;
}

export const IOSFAB: React.FC<IOSFABProps> = ({ 
  icon, 
  onPress, 
  style, 
  color = IOS_COLORS.white,
  size = 24 
}) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        IOS_SHADOW_MAROON,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MAROON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
