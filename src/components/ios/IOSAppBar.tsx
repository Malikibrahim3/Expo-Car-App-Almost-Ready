/**
 * IOSAppBar - iOS-style app bar / navigation header
 * Replaces react-native-paper Appbar
 */
import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { IOSText } from './IOSText';
import { IOS_PADDING, IOS_MIN_TAP, IOS_COLORS, MAROON } from './theme';

interface IOSAppBarProps {
  title?: string;
  leftIcon?: string;
  rightIcon?: string;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  style?: ViewStyle | ViewStyle[];
}

export const IOSAppBar: React.FC<IOSAppBarProps> = ({ 
  title, 
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  style 
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        {leftIcon && onLeftPress && (
          <Pressable onPress={onLeftPress} style={styles.iconButton}>
            <Icon name={leftIcon} size={24} color={MAROON} />
          </Pressable>
        )}
      </View>
      
      {title && (
        <IOSText style={styles.title} weight="semibold" numberOfLines={1}>
          {title}
        </IOSText>
      )}
      
      <View style={styles.right}>
        {rightIcon && onRightPress && (
          <Pressable onPress={onRightPress} style={styles.iconButton}>
            <Icon name={rightIcon} size={24} color={MAROON} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: IOS_MIN_TAP,
    paddingHorizontal: IOS_PADDING,
    backgroundColor: IOS_COLORS.systemBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: IOS_COLORS.separator,
  },
  left: {
    width: 60,
    alignItems: 'flex-start',
  },
  right: {
    width: 60,
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    fontSize: 17,
    textAlign: 'center',
    color: IOS_COLORS.label,
  },
  iconButton: {
    minHeight: IOS_MIN_TAP,
    minWidth: IOS_MIN_TAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
