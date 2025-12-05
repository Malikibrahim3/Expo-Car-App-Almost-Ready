/**
 * EmptyGarage - iOS-style empty state
 * Clean, minimal design following Apple HIG
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Car } from 'lucide-react-native';
import { Spacing, Shadows, haptic } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';

interface EmptyGarageProps {
  onAddCar: () => void;
}

export default function EmptyGarage({ onAddCar }: EmptyGarageProps) {
  const { colors } = useThemeMode();

  return (
    <View style={styles.container}>
      {/* Illustration */}
      <View style={[styles.illustration, { backgroundColor: colors.brandSubtle }]}>
        <Car size={48} color={colors.brand} strokeWidth={1.5} />
      </View>

      {/* Text */}
      <Text style={[styles.title, { color: colors.text }]}>
        No cars yet
      </Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Add your first car to see how much you'd pocket if you sold it today.
      </Text>

      {/* CTA Button - iOS solid style */}
      <Pressable
        onPress={() => {
          haptic.medium();
          onAddCar();
        }}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.brand },
          pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        ]}
      >
        <Text style={styles.buttonText}>Add Your First Car</Text>
      </Pressable>

      {/* Helper text */}
      <Text style={[styles.helperText, { color: colors.textTertiary }]}>
        It only takes 2 minutes
      </Text>

      {/* What you'll get - iOS grouped list style */}
      <View style={[styles.benefitsCard, { backgroundColor: colors.surface }, Shadows.sm]}>
        <Text style={[styles.benefitsTitle, { color: colors.textSecondary }]}>
          What you'll see
        </Text>
        <View style={styles.benefitsList}>
          <Text style={[styles.benefitItem, { color: colors.text }]}>
            Your car's current value
          </Text>
          <Text style={[styles.benefitItem, { color: colors.text }]}>
            How much you'd pocket if you sold
          </Text>
          <Text style={[styles.benefitItem, { color: colors.text }]}>
            The best time to sell
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  illustration: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.35,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.24,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    maxWidth: 280,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginBottom: Spacing.sm,
  },
  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.41,
  },
  helperText: {
    fontSize: 13,
    letterSpacing: -0.08,
    marginBottom: Spacing.xl,
  },
  benefitsCard: {
    width: '100%',
    padding: Spacing.md,
    borderRadius: 14,
  },
  benefitsTitle: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.08,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  benefitsList: {
    gap: 10,
  },
  benefitItem: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
});
