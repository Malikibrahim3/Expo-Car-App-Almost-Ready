/**
 * IOSList - iOS-style list container
 * Replaces react-native-paper List.Section
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { IOSText } from './IOSText';
import { IOS_PADDING, IOS_SPACING, IOS_COLORS } from './theme';

interface IOSListProps {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle | ViewStyle[];
}

export const IOSList: React.FC<IOSListProps> = ({ children, title, style }) => {
  return (
    <View style={[styles.container, style]}>
      {title && <IOSText style={styles.title}>{title}</IOSText>}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: IOS_SPACING,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: IOS_COLORS.labelSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: IOS_PADDING,
    paddingVertical: 8,
  },
  content: {
    backgroundColor: IOS_COLORS.systemBackground,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
