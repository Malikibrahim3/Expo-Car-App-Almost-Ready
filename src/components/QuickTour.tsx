/**
 * QuickTour - Contextual tooltips for first-time visitors to each screen
 * Shows helpful hints pointing to key features
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { Spacing, Radius, haptic } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TourStep {
  id: string;
  title: string;
  description: string;
  position: 'top' | 'center' | 'bottom';
}

interface QuickTourProps {
  screenId: string;
  steps: TourStep[];
  onComplete?: () => void;
}

export default function QuickTour({ screenId, steps, onComplete }: QuickTourProps) {
  const { colors } = useThemeMode();
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    checkIfSeen();
  }, []);

  const checkIfSeen = async () => {
    try {
      const seen = await AsyncStorage.getItem(`@tour_${screenId}`);
      if (!seen) {
        setVisible(true);
      }
    } catch {
      // If error, don't show tour
    }
  };

  const handleNext = () => {
    haptic.light();
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    haptic.light();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(`@tour_${screenId}`, 'true');
    } catch {}
    setVisible(false);
    onComplete?.();
  };

  const handleSkip = async () => {
    haptic.light();
    await handleComplete();
  };

  if (!visible || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  const getPositionStyle = () => {
    switch (step.position) {
      case 'top':
        return { top: 120 };
      case 'bottom':
        return { bottom: 150 };
      default:
        return { top: SCREEN_HEIGHT / 2 - 100 };
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        {/* Skip button */}
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: 'white' }]}>Skip tour</Text>
        </Pressable>

        {/* Tour card */}
        <View style={[styles.card, getPositionStyle(), { backgroundColor: colors.surface }]}>
          {/* Progress dots */}
          <View style={styles.progressDots}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  { backgroundColor: index === currentStep ? colors.brand : colors.border },
                ]}
              />
            ))}
          </View>

          {/* Content */}
          <Text style={[styles.title, { color: colors.text }]}>{step.title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {step.description}
          </Text>

          {/* Navigation */}
          <View style={styles.navigation}>
            {!isFirst ? (
              <Pressable onPress={handlePrevious} style={styles.navButton}>
                <ChevronLeft size={20} color={colors.textTertiary} />
                <Text style={[styles.navText, { color: colors.textTertiary }]}>Back</Text>
              </Pressable>
            ) : (
              <View style={styles.navButton} />
            )}

            <Pressable
              onPress={handleNext}
              style={[styles.nextButton, { backgroundColor: colors.brand }]}
            >
              <Text style={styles.nextText}>{isLast ? 'Got it!' : 'Next'}</Text>
              {!isLast && <ChevronRight size={18} color="white" />}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Reset tour for a specific screen (call from settings)
export const resetTour = async (screenId: string) => {
  try {
    await AsyncStorage.removeItem(`@tour_${screenId}`);
  } catch {}
};

// Reset all tours
export const resetAllTours = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const tourKeys = keys.filter(k => k.startsWith('@tour_'));
    await AsyncStorage.multiRemove(tourKeys);
  } catch {}
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
  skipText: {
    fontSize: 15,
  },
  card: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    minWidth: 80,
  },
  navText: {
    fontSize: 15,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: Radius.sm,
  },
  nextText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
