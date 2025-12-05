/**
 * BackButton - Accessible back navigation with label
 * Provides consistent back navigation across the app
 */
import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { haptic, Spacing } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';

interface BackButtonProps {
  label?: string;
  onPress?: () => void;
  showLabel?: boolean;
}

export default function BackButton({ 
  label = 'Back', 
  onPress,
  showLabel = true 
}: BackButtonProps) {
  const router = useRouter();
  const { colors } = useThemeMode();

  const handlePress = () => {
    haptic.light();
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.container, pressed && { opacity: 0.7 }]}
      accessibilityLabel={`Go back${label !== 'Back' ? ` to ${label}` : ''}`}
      accessibilityRole="button"
      accessibilityHint="Navigates to the previous screen"
    >
      <ChevronLeft size={24} color={colors.text} />
      {showLabel && (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.md,
    marginLeft: -Spacing.xs,
    minWidth: 44,
    minHeight: 44,
  },
  label: {
    fontSize: 16,
    marginLeft: -4,
  },
});
