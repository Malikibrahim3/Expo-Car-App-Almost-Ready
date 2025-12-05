/**
 * AppHeader - iOS-style navigation bar
 * Clean, minimal design following Apple HIG
 * Now with Pro badge indicator
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Bell, Moon, Sun, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Spacing, haptic } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';
import { useSubscriptionContext } from '@/src/context/SubscriptionContext';

interface AppHeaderProps {
  showSearch?: boolean;
  showNotifications?: boolean;
  showSettings?: boolean;
  showThemeToggle?: boolean;
  showProBadge?: boolean;
  notificationCount?: number;
  title?: string;
}

export default function AppHeader({
  showSearch = false,
  showNotifications = true,
  showSettings = false,
  showThemeToggle = true,
  showProBadge = true,
  notificationCount = 0,
  title,
}: AppHeaderProps) {
  const router = useRouter();
  const { isDark, colors, toggleTheme } = useThemeMode();
  const { isPro, isDemoMode } = useSubscriptionContext();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Title with Pro Badge */}
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]}>
          {title || 'AutoTrack'}
        </Text>
        {showProBadge && isPro && (
          <Pressable 
            onPress={() => { haptic.light(); router.push('/(app)/subscription'); }}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.proBadge}
            >
              <Star size={10} color="#fff" fill="#fff" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </LinearGradient>
          </Pressable>
        )}
        {showProBadge && !isPro && (
          <Pressable 
            onPress={() => { haptic.light(); router.push('/(app)/subscription'); }}
            style={({ pressed }) => [styles.freeBadge, { backgroundColor: colors.surfaceHover }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.freeBadgeText, { color: colors.textTertiary }]}>FREE</Text>
          </Pressable>
        )}
      </View>

      {/* Actions - iOS style icon buttons */}
      <View style={styles.actions}>
        {showThemeToggle && (
          <Pressable
            onPress={() => {
              haptic.light();
              toggleTheme();
            }}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && { opacity: 0.6 },
            ]}
            accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isDark ? (
              <Sun size={22} color={colors.brand} />
            ) : (
              <Moon size={22} color={colors.brand} />
            )}
          </Pressable>
        )}

        {showNotifications && (
          <Pressable
            onPress={() => {
              haptic.light();
              router.push('/(tabs)/notifications');
            }}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && { opacity: 0.6 },
            ]}
            accessibilityLabel={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ''}`}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Bell size={22} color={colors.brand} />
            {notificationCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.negative }]}>
                <Text style={styles.badgeText}>
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Text>
              </View>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.37,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  proBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  freeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  actionButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
});
