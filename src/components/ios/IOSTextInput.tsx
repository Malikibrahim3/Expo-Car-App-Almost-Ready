/**
 * iOS-Compliant TextInput
 * Wrapper around React Native Paper TextInput
 * Enforces iOS Human Interface Guidelines
 */
import React from 'react';
import { TextInput as PaperTextInput, TextInputProps } from 'react-native-paper';
import { StyleSheet } from 'react-native';

export const IOSTextInput: React.FC<TextInputProps> = ({
  style,
  contentStyle,
  ...props
}) => {
  return (
    <PaperTextInput
      style={[styles.input, style]}
      contentStyle={[styles.content, contentStyle]}
      mode="outlined"
      outlineColor="#E5E5EA"
      activeOutlineColor="#0F81A3"
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    minHeight: 44, // iOS minimum touch target
  },
  content: {
    paddingVertical: 8,
  },
});
