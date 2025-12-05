/**
 * IOSActivityIndicator - iOS-style loading spinner
 * Replaces react-native-paper ActivityIndicator
 */
import React from 'react';
import { ActivityIndicator, ViewStyle } from 'react-native';
import { MAROON } from './theme';

interface IOSActivityIndicatorProps {
  size?: 'small' | 'large' | number;
  color?: string;
  style?: ViewStyle | ViewStyle[];
}

export const IOSActivityIndicator: React.FC<IOSActivityIndicatorProps> = ({ 
  size = 'large', 
  color = MAROON,
  style 
}) => {
  return <ActivityIndicator size={size} color={color} style={style} />;
};
