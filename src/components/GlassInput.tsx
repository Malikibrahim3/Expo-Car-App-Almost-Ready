import React from 'react';
import { TextInput, TextInputProps, Text, View } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../constants/LinearDesign';

interface GlassInputProps extends TextInputProps {
  label: string;
  icon?: React.ReactNode;
}

export const GlassInput = ({ label, icon, ...props }: GlassInputProps) => {
  return (
    <View style={{ marginBottom: Spacing.base }}>
      <Text
        style={{
          color: Colors.textTertiary,
          fontSize: 12,
          marginBottom: 8,
          fontWeight: '600',
          paddingLeft: 4,
          letterSpacing: 1,
        }}
      >
        {label.toUpperCase()}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: Spacing.base,
          height: 56,
          backgroundColor: Colors.surface,
          borderWidth: 1,
          borderColor: Colors.border,
          borderRadius: Radius.sm,
        }}
      >
        {icon && <View style={{ marginRight: 12, opacity: 0.7 }}>{icon}</View>}
        <TextInput
          style={{
            flex: 1,
            color: Colors.text,
            fontSize: 16,
            fontWeight: '500',
          }}
          placeholderTextColor={Colors.textQuaternary}
          selectionColor={Colors.brand}
          {...props}
        />
      </View>
    </View>
  );
};
