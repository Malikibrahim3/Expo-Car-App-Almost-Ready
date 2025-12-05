/**
 * Notifications Screen
 * Shows all notifications and alerts
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Bell, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Car, 
  DollarSign,
  Check,
  Trash2,
  BellOff
} from 'lucide-react-native';
import { Colors, Typography, Spacing, Radius, haptic, IconSizes } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { useSubscriptionContext } from '@/src/context/SubscriptionContext';
import notificationService from '@/src/services/NotificationService';
import UndoToast from '@/src/components/UndoToast';
import FloatingHelpButton from '@/src/components/FloatingHelpButton';
import { UpgradeBanner } from '@/src/components/UpgradePrompt';

interface Notification {
  id: string;
  type: 'equity_positive' | 'equity_negative' | 'reminder' | 'deal' | 'price_change';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  vehicleId?: string;
}

// Mock notifications for demo
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'equity_positive',
    title: '🎉 Great News About Your Car!',
    message: 'Your 2022 Tesla Model 3 is now worth more than you owe! You could keep $6,000 if you sell now.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    read: false,
    vehicleId: '1',
  },
  {
    id: '2',
    type: 'deal',
    title: 'New Partner Offer',
    message: 'Carvana is offering +$500 bonus on trade-ins this week. Check it out!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    read: false,
  },
  {
    id: '3',
    type: 'price_change',
    title: 'Your Car Value Changed',
    message: 'Your 2021 BMW 330i went up by $800 based on recent market data.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: true,
    vehicleId: '2',
  },
  {
    id: '4',
    type: 'reminder',
    title: 'Almost Time to Sell',
    message: 'Your 2023 Audi A4 will be a good time to sell in about 2 months.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    read: true,
    vehicleId: '3',
  },
  {
    id: '5',
    type: 'equity_negative',
    title: 'Update on Your Car',
    message: 'Your 2021 BMW 330i lost $500 in value this month. Better to wait before selling.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 1 week ago
    read: true,
    vehicleId: '2',
  },
];

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'equity_positive': return { icon: TrendingUp, color: Colors.positive };
    case 'equity_negative': return { icon: TrendingDown, color: Colors.negative };
    case 'reminder': return { icon: Clock, color: Colors.warning };
    case 'deal': return { icon: DollarSign, color: Colors.brand };
    case 'price_change': return { icon: Car, color: Colors.info };
    default: return { icon: Bell, color: Colors.textSecondary };
  }
};

const formatTimestamp = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

const NotificationCard = ({ 
  notification, 
  onPress, 
  onMarkRead,
  colors
}: { 
  notification: Notification; 
  onPress: () => void;
  onMarkRead: () => void;
  colors: any;
}) => {
  const { icon: Icon, color } = getNotificationIcon(notification.type);

  return (
    <Pressable 
      onPress={onPress}
      style={({ pressed }) => [
        styles.notificationCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        !notification.read && { backgroundColor: colors.brandSubtle, borderColor: colors.borderAccent },
        pressed && { backgroundColor: colors.surfaceHover }
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <Icon size={20} color={color} />
      </View>
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, { color: colors.text }, !notification.read && { fontWeight: '600' }]}>
            {notification.title}
          </Text>
          {!notification.read && <View style={[styles.unreadDot, { backgroundColor: colors.brand }]} />}
        </View>
        <Text style={[styles.notificationMessage, { color: colors.textSecondary }]} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={[styles.notificationTime, { color: colors.textTertiary }]}>{formatTimestamp(notification.timestamp)}</Text>
      </View>

      {!notification.read && (
        <Pressable onPress={onMarkRead} style={styles.markReadButton}>
          <Check size={16} color={colors.textTertiary} />
        </Pressable>
      )}
    </Pressable>
  );
};

export default function NotificationsPage() {
  const { colors } = useThemeMode();
  const { isDemoMode } = useAuth() as any;
  const { isPro, marketShifts } = useSubscriptionContext();
  
  // Only show notifications in demo mode
  const [notifications, setNotifications] = useState<Notification[]>(isDemoMode ? MOCK_NOTIFICATIONS : []);
  const [refreshing, setRefreshing] = useState(false);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [previousNotifications, setPreviousNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const onRefresh = () => {
    setRefreshing(true);
    haptic.light();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleNotificationPress = (notification: Notification) => {
    haptic.light();
    // Mark as read
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );
    // Navigate to relevant screen based on type
  };

  const handleMarkRead = (id: string) => {
    haptic.light();
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const handleMarkAllRead = () => {
    haptic.medium();
    setPreviousNotifications([...notifications]);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setShowUndoToast(true);
  };

  const handleUndoMarkAllRead = () => {
    if (previousNotifications.length > 0) {
      setNotifications(previousNotifications);
      setPreviousNotifications([]);
      setShowUndoToast(false);
      haptic.success();
    }
  };

  const handleClearAll = () => {
    haptic.medium();
    setPreviousNotifications([...notifications]);
    setNotifications([]);
    setShowUndoToast(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
              {unreadCount > 0 && (
                <Text style={[styles.subtitle, { color: colors.brand }]}>{unreadCount} unread</Text>
              )}
            </View>
            {notifications.length > 0 && (
              <View style={styles.headerActions}>
                {unreadCount > 0 && (
                  <Pressable onPress={handleMarkAllRead} style={[styles.headerButton, { backgroundColor: colors.brandSubtle }]}>
                    <Check size={16} color={colors.brand} />
                    <Text style={[styles.headerButtonText, { color: colors.brand }]}>Mark all read</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* Pro Market Shifts Section - or upgrade banner for free users */}
          {isPro && marketShifts && marketShifts.length > 0 ? (
            <View style={[styles.marketShiftsSection, { backgroundColor: 'rgba(255, 215, 0, 0.1)', borderColor: 'rgba(255, 215, 0, 0.3)' }]}>
              <View style={styles.marketShiftsHeader}>
                <Text style={styles.marketShiftsTitle}>📊 Market Shifts</Text>
                <View style={styles.proBadgeSmall}>
                  <Text style={styles.proBadgeSmallText}>PRO</Text>
                </View>
              </View>
              {marketShifts.slice(0, 3).map((shift: any, index: number) => (
                <View key={index} style={styles.marketShiftItem}>
                  <Text style={[styles.marketShiftText, { color: colors.text }]}>
                    {shift.make} {shift.model}
                  </Text>
                  <Text style={[styles.marketShiftValue, { color: shift.shiftDirection === 'up' ? colors.positive : colors.negative }]}>
                    {shift.shiftDirection === 'up' ? '↑' : '↓'} {shift.shiftPercent?.toFixed(1) || 0}%
                  </Text>
                </View>
              ))}
            </View>
          ) : !isPro ? (
            <View style={{ marginBottom: Spacing.md }}>
              <UpgradeBanner feature="alerts" />
            </View>
          ) : null}

          {/* Notifications List */}
          {notifications.length > 0 ? (
            <View style={styles.notificationsList}>
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onPress={() => handleNotificationPress(notification)}
                  onMarkRead={() => handleMarkRead(notification.id)}
                  colors={colors}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.backgroundTertiary }]}>
                <BellOff size={48} color={colors.textQuaternary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>You're all caught up!</Text>
              <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                We'll let you know when something important happens with your cars.
              </Text>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Undo Toast */}
        <UndoToast
          message="Marked all as read"
          visible={showUndoToast}
          onUndo={handleUndoMarkAllRead}
          onDismiss={() => {
            setShowUndoToast(false);
            setPreviousNotifications([]);
          }}
        />

        {/* Floating Help Button */}
        <FloatingHelpButton 
          screenName="Notifications"
          contextHelp="This screen shows updates about your cars. We'll notify you when your car's value changes or when it's a good time to sell."
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.base },

  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    paddingTop: Spacing.md, 
    marginBottom: Spacing.lg 
  },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: Colors.brand, marginTop: 4 },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.brandSubtle,
    borderRadius: Radius.sm,
  },
  headerButtonText: { fontSize: 13, color: Colors.brand, fontWeight: '500' },

  // Pro Market Shifts
  marketShiftsSection: {
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  marketShiftsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  marketShiftsTitle: { fontSize: 15, fontWeight: '700', color: '#B8860B' },
  proBadgeSmall: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  proBadgeSmallText: { fontSize: 10, fontWeight: '700', color: '#000', letterSpacing: 0.5 },
  marketShiftItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  marketShiftText: { fontSize: 14, fontWeight: '500' },
  marketShiftValue: { fontSize: 14, fontWeight: '700' },

  notificationsList: { gap: Spacing.sm },

  notificationCard: { 
    flexDirection: 'row',
    backgroundColor: Colors.surface, 
    borderWidth: 1, 
    borderColor: Colors.border, 
    padding: Spacing.md,
  },
  notificationCardUnread: {
    backgroundColor: Colors.brandSubtle,
    borderColor: Colors.borderAccent,
  },
  notificationCardPressed: { backgroundColor: Colors.surfaceHover },

  iconContainer: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: 12,
  },

  notificationContent: { flex: 1 },
  notificationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  notificationTitle: { fontSize: 15, fontWeight: '500', color: Colors.text, flex: 1 },
  notificationTitleUnread: { fontWeight: '600' },
  unreadDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: Colors.brand,
    marginLeft: 8,
  },
  notificationMessage: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 4 },
  notificationTime: { fontSize: 12, color: Colors.textTertiary },

  markReadButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  emptyState: { 
    alignItems: 'center', 
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  emptyMessage: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
