/**
 * UndoToast - Shows undo option for destructive actions
 * Disappears after 5 seconds
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Undo2 } from 'lucide-react-native';
import { Spacing, Radius, haptic } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';

interface UndoToastProps {
  message: string;
  visible: boolean;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export default function UndoToast({
  message,
  visible,
  onUndo,
  onDismiss,
  duration = 5000,
}: UndoToastProps) {
  const { colors } = useThemeMode();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();

      // Progress bar countdown
      progressAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration,
        useNativeDriver: false,
      }).start();

      // Auto dismiss
      timeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, duration);
    } else {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible]);

  const handleUndo = () => {
    haptic.medium();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onUndo();
  };

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: 100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          backgroundColor: colors.surface, 
          borderColor: colors.border,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Progress bar */}
      <Animated.View
        style={[
          styles.progressBar,
          {
            backgroundColor: colors.brand,
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />

      <View style={styles.content}>
        <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
        <Pressable
          onPress={handleUndo}
          style={[styles.undoButton, { backgroundColor: colors.brandSubtle }]}
        >
          <Undo2 size={16} color={colors.brand} />
          <Text style={[styles.undoText, { color: colors.brand }]}>Undo</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.base,
    right: Spacing.base,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  progressBar: {
    height: 3,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    paddingTop: Spacing.md + 3,
  },
  message: {
    fontSize: 15,
    flex: 1,
    marginRight: Spacing.sm,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.sm,
  },
  undoText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
