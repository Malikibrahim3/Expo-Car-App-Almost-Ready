/**
 * GettingStartedChecklist - iOS-style onboarding checklist
 * Clean, minimal design following Apple HIG
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CheckCircle, Circle, ChevronRight, X } from 'lucide-react-native';
import { Spacing, Shadows, haptic } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: () => void;
}

interface GettingStartedChecklistProps {
  onAddCar: () => void;
  onViewNotifications: () => void;
  hasVehicles: boolean;
  notificationsEnabled: boolean;
}

const STORAGE_KEY = '@getting_started_dismissed';

export default function GettingStartedChecklist({
  onAddCar,
  onViewNotifications,
  hasVehicles,
  notificationsEnabled,
}: GettingStartedChecklistProps) {
  const { colors } = useThemeMode();
  const [dismissed, setDismissed] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    checkDismissed();
  }, []);

  const checkDismissed = async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      const allComplete = hasVehicles && notificationsEnabled;
      setDismissed(value === 'true' || allComplete);
    } catch {
      setDismissed(false);
    }
  };

  const handleDismiss = async () => {
    haptic.light();
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
      setDismissed(true);
    } catch {}
  };

  if (dismissed || (hasVehicles && notificationsEnabled)) {
    return null;
  }

  const items: ChecklistItem[] = [
    {
      id: 'add_car',
      title: 'Add your first car',
      description: 'Tell us about your vehicle',
      completed: hasVehicles,
      action: onAddCar,
    },
    {
      id: 'notifications',
      title: 'Turn on notifications',
      description: "Get alerts when it's time to sell",
      completed: notificationsEnabled,
      action: onViewNotifications,
    },
  ];

  const completedCount = items.filter(i => i.completed).length;
  const progress = completedCount / items.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, Shadows.sm]}>
      {/* Header */}
      <Pressable 
        onPress={() => { haptic.light(); setExpanded(!expanded); }}
        style={styles.header}
      >
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Getting Started</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {completedCount} of {items.length} complete
          </Text>
        </View>
        <Pressable 
          onPress={handleDismiss} 
          style={({ pressed }) => [styles.dismissButton, pressed && { opacity: 0.6 }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={18} color={colors.textTertiary} />
        </Pressable>
      </Pressable>

      {/* Progress Bar - iOS style */}
      <View style={[styles.progressTrack, { backgroundColor: colors.backgroundTertiary }]}>
        <View 
          style={[
            styles.progressFill, 
            { backgroundColor: colors.brand, width: `${progress * 100}%` }
          ]} 
        />
      </View>

      {/* Checklist Items - iOS list style */}
      {expanded && (
        <View style={[styles.items, { backgroundColor: colors.background }]}>
          {items.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => {
                if (!item.completed && item.action) {
                  haptic.medium();
                  item.action();
                }
              }}
              disabled={item.completed}
              style={({ pressed }) => [
                styles.item,
                index < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                pressed && !item.completed && { backgroundColor: colors.surfaceHover },
              ]}
            >
              {item.completed ? (
                <CheckCircle size={22} color={colors.positive} />
              ) : (
                <Circle size={22} color={colors.textTertiary} />
              )}
              <View style={styles.itemContent}>
                <Text style={[
                  styles.itemTitle, 
                  { color: colors.text },
                  item.completed && { color: colors.textTertiary }
                ]}>
                  {item.title}
                </Text>
                <Text style={[styles.itemDescription, { color: colors.textTertiary }]}>
                  {item.description}
                </Text>
              </View>
              {!item.completed && (
                <ChevronRight size={18} color={colors.textQuaternary} />
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.41,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    letterSpacing: -0.08,
  },
  dismissButton: {
    padding: 4,
  },
  progressTrack: {
    height: 4,
    marginHorizontal: Spacing.md,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  items: {
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    borderRadius: 10,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.41,
  },
  itemDescription: {
    fontSize: 13,
    marginTop: 2,
    letterSpacing: -0.08,
  },
});
