/**
 * IOSDivider - iOS-style divider
 * Replaces react-native-paper Divider
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { IOS_COLORS } from './theme';

interface IOSDividerProps {
  style?: ViewStyle | ViewStyle[];
}

export const IOSDivider: React.FC<IOSDividerProps> = ({ style }) => {
  return <View style={[styles.divider, style]} />;
};

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: IOS_COLORS.separator,
  },
});
