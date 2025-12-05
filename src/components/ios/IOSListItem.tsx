/**
 * IOSListItem - iOS-style list item
 * Replaces react-native-paper List.Item
 */
import React from 'react';
import { Pressable, View, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { IOSText } from './IOSText';
import { IOS_PADDING, IOS_MIN_TAP, IOS_COLORS } from './theme';

interface IOSListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: string;
  rightIcon?: string;
  rightComponent?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
}

export const IOSListItem: React.FC<IOSListItemProps> = ({ 
  title, 
  subtitle, 
  leftIcon,
  rightIcon = 'chevron-forward',
  rightComponent,
  onPress,
  style 
}) => {
  const content = (
    <View style={[styles.container, style]}>
      {leftIcon && (
        <View style={styles.leftIcon}>
          <Icon name={leftIcon} size={24} color={IOS_COLORS.label} />
        </View>
      )}
      <View style={styles.content}>
        <IOSText style={styles.title} weight="regular">
          {title}
        </IOSText>
        {subtitle && (
          <IOSText style={styles.subtitle}>
            {subtitle}
          </IOSText>
        )}
      </View>
      {rightComponent || (onPress && (
        <Icon name={rightIcon} size={20} color={IOS_COLORS.labelTertiary} />
      ))}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: IOS_MIN_TAP,
    paddingHorizontal: IOS_PADDING,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: IOS_COLORS.separator,
  },
  leftIcon: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    color: IOS_COLORS.label,
  },
  subtitle: {
    fontSize: 15,
    color: IOS_COLORS.labelSecondary,
    marginTop: 2,
  },
  pressed: {
    backgroundColor: IOS_COLORS.secondarySystemBackground,
  },
});
