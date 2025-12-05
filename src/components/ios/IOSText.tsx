/**
 * iOS-Compliant Text - Linear Dark Theme
 */
import React from 'react';
import { Text as PaperText, TextProps } from 'react-native-paper';
import { TextStyle } from 'react-native';
import { IOS_COLORS } from './theme';

interface IOSTextProps extends TextProps<any> {
  style?: TextStyle | TextStyle[];
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}

export const IOSText: React.FC<IOSTextProps> = ({ 
  variant, 
  style, 
  weight,
  ...props 
}) => {
  const isHeading = variant && (
    variant.includes('headline') || 
    variant.includes('display') || 
    variant.includes('title')
  );
  
  const fontWeights: Record<string, TextStyle['fontWeight']> = {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  };
  
  const iosStyle: TextStyle = {
    fontWeight: weight ? fontWeights[weight] : isHeading ? '700' : '400',
    color: IOS_COLORS.label,
  };
  
  return (
    <PaperText
      variant={variant}
      style={[iosStyle, style]}
      {...props}
    />
  );
};
