/**
 * InfoTooltip - iOS-style popover for explanations
 * Clean, minimal design following Apple HIG
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Dimensions } from 'react-native';
import { Info } from 'lucide-react-native';
import { Spacing, Shadows, haptic } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface InfoTooltipProps {
  term: string;
  explanation: string;
  size?: number;
}

export default function InfoTooltip({ term, explanation, size = 14 }: InfoTooltipProps) {
  const { colors } = useThemeMode();
  const [visible, setVisible] = useState(false);

  const handlePress = () => {
    haptic.light();
    setVisible(true);
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.trigger, pressed && { opacity: 0.6 }]}
        accessibilityLabel={`Learn more about ${term}`}
        accessibilityRole="button"
        accessibilityHint="Tap to see explanation"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Info size={size} color={colors.textTertiary} />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable 
          style={styles.overlay} 
          onPress={() => setVisible(false)}
          accessibilityLabel="Close explanation"
        >
          <View style={[styles.tooltip, { backgroundColor: colors.surface }, Shadows.lg]}>
            <Text style={[styles.tooltipTerm, { color: colors.text }]}>{term}</Text>
            <Text style={[styles.tooltipText, { color: colors.textSecondary }]}>
              {explanation}
            </Text>
            <Pressable 
              onPress={() => setVisible(false)}
              style={({ pressed }) => [
                styles.gotItButton, 
                { backgroundColor: colors.brand },
                pressed && { opacity: 0.8 }
              ]}
            >
              <Text style={styles.gotItText}>Got it</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export const styles = StyleSheet.create({
  trigger: {
    padding: 4,
    marginLeft: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  tooltip: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 320,
    borderRadius: 14,
    padding: Spacing.lg,
  },
  tooltipTerm: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.41,
    marginBottom: Spacing.sm,
  },
  tooltipText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.24,
    marginBottom: Spacing.lg,
  },
  gotItButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  gotItText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
    letterSpacing: -0.41,
  },
});
