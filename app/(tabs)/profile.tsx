/**
 * Profile - Settings with theme and notification controls
 */

import React, { useState, useEffect } from 'react';
import { ScrollView, Text, View, Switch, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, Shield, HelpCircle, LogOut, ChevronRight, MessageSquare, TrendingUp, TrendingDown, Clock, RotateCcw, Sun, Moon, Smartphone, AlertCircle, Trash2, Download, Star, Zap, RefreshCw } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radius, Shadows, haptic, IconSizes } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { useSubscriptionContext } from '@/src/context/SubscriptionContext';
import { supabase } from '@/src/lib/supabaseClient';
import notificationService, { NotificationSettings } from '@/src/services/NotificationService';
import AppHeader from '@/src/components/AppHeader';
import Toast from 'react-native-toast-message';
import FloatingHelpButton from '@/src/components/FloatingHelpButton';
import { resetAllTours } from '@/src/components/QuickTour';

const SettingsRow = ({ icon, label, value, isSwitch, onPress, onValueChange, isLast, destructive, colors }: any) => (
  <Pressable onPress={() => { if (!isSwitch && onPress) { haptic.light(); onPress(); } }} disabled={isSwitch}
    style={({ pressed }) => [styles.settingsRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }, pressed && !isSwitch && { backgroundColor: colors.surfaceHover }]}>
    <View style={styles.settingsIcon}>{icon}</View>
    <Text style={[styles.settingsLabel, { color: colors.text }, destructive && { color: colors.negative }]}>{label}</Text>
    {isSwitch ? (
      <Switch value={value} onValueChange={(v) => { haptic.light(); onValueChange?.(v); }} trackColor={{ false: colors.border, true: colors.positive }} thumbColor="#FFFFFF" />
    ) : (
      <ChevronRight size={IconSizes.sm} color={colors.textQuaternary} />
    )}
  </Pressable>
);

interface UserProfile {
  full_name: string | null;
  first_name: string | null;
  email: string;
  goal: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { isDark, themeMode, setTheme, colors } = useThemeMode();
  const { user, isDemoMode, signOut, exitDemoMode } = useAuth() as any;
  const { 
    isPro, 
    isFree, 
    usage, 
    subscription, 
    refreshSummary,
    isDemoMode: isSubDemoMode,
    demoPlanType,
    toggleDemoPlan,
    upgrade,
    canUseFeature,
  } = useSubscriptionContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: true,
    equityAlerts: true,
    priceDrops: true,
    reminders: true,
    marketUpdates: false,
  });

  useEffect(() => {
    loadNotificationSettings();
    loadUserProfile();
  }, [user]);

  const loadUserProfile = async () => {
    if (isDemoMode) {
      setProfile({
        full_name: 'Demo User',
        first_name: 'Demo',
        email: 'demo@example.com',
        goal: 'track',
      });
      return;
    }

    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, first_name, email, goal')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        // Fallback to auth user data
        setProfile({
          full_name: user.user_metadata?.full_name || null,
          first_name: null,
          email: user.email || '',
          goal: null,
        });
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Profile load error:', err);
    }
  };

  const loadNotificationSettings = async () => {
    await notificationService.initialize();
    setNotificationSettings(notificationService.getSettings());
  };

  const updateNotificationSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...notificationSettings, [key]: value };
    setNotificationSettings(newSettings);
    await notificationService.saveSettings({ [key]: value });
  };

  const handleThemeChange = (mode: string) => {
    haptic.light();
    setTheme(mode);
  };

  const handleSignOut = () => {
    // In demo mode, just exit demo mode
    if (isDemoMode) {
      exitDemoMode();
      router.replace('/(auth)/landing');
      return;
    }
    
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        try {
          await signOut();
          router.replace('/(auth)/landing');
        } catch (error) {
          console.error('Sign out error:', error);
          router.replace('/(auth)/landing');
        }
      }},
    ]);
  };

  const handleResetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem('@onboarding_complete');
      // Also reset all quick tours
      await resetAllTours();
      haptic.success();
      Toast.show({
        type: 'success',
        text1: 'Tutorial Reset',
        text2: 'You\'ll see the tutorial and tips on next app launch.',
      });
    } catch (error) {
      console.error('Failed to reset onboarding:', error);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account?',
      'This will permanently delete your account and all your vehicle data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Everything', 
          style: 'destructive', 
          onPress: async () => {
            try {
              if (!user?.id || isDemoMode) {
                // Demo mode - just clear local and redirect
                await AsyncStorage.clear();
                exitDemoMode?.();
                router.replace('/(auth)/landing');
                return;
              }

              // Delete user data from Supabase tables (CASCADE will handle related data)
              // The user's vehicles, subscriptions, etc. will be deleted via ON DELETE CASCADE
              
              // First delete from vehicles table (this cascades to refresh_tracking, etc.)
              await supabase.from('vehicles').delete().eq('user_id', user.id);
              
              // Delete subscription record
              await supabase.from('user_subscriptions').delete().eq('user_id', user.id);
              
              // Sign out the user (this invalidates their session)
              await supabase.auth.signOut();
              
              // Clear local data
              await AsyncStorage.clear();
              
              haptic.success();
              Toast.show({ type: 'success', text1: 'Account deleted', text2: 'Your data has been removed' });
              router.replace('/(auth)/landing');
              
              // Note: The auth.users record remains but is now orphaned.
              // For full deletion, you'd need a Supabase Edge Function with service_role key
              // or handle it via Supabase Dashboard manually for GDPR requests.
            } catch (error) {
              console.error('Delete account error:', error);
              Toast.show({ type: 'error', text1: 'Could not delete account', text2: 'Please try again' });
            }
          }
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AppHeader showSettings={false} showThemeToggle={false} />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

          {/* Demo Mode Banner */}
          {isDemoMode && (
            <Pressable 
              onPress={() => router.push('/(auth)/signup')}
              style={[styles.demoBanner, { backgroundColor: colors.brandSubtle }]}
            >
              <Text style={[styles.demoBannerTitle, { color: colors.text }]}>🎮 You're in Demo Mode</Text>
              <Text style={[styles.demoBannerText, { color: colors.textSecondary }]}>
                Sign up to save your cars and get personalized alerts
              </Text>
              <View style={[styles.demoBannerButton, { backgroundColor: colors.brand }]}>
                <Text style={styles.demoBannerButtonText}>Create Free Account</Text>
              </View>
            </Pressable>
          )}

          {/* User Card */}
          {!isDemoMode && (
            <View style={[styles.userCard, { backgroundColor: colors.surface }, Shadows.sm]}>
              <LinearGradient colors={colors.gradientBrand} style={styles.userAvatar}>
                <Text style={styles.userInitials}>
                  {profile?.first_name?.[0]?.toUpperCase() || profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
                </Text>
              </LinearGradient>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {profile?.first_name || profile?.full_name || 'User'}
                </Text>
                <Text style={[styles.userEmail, { color: colors.textTertiary }]}>
                  {profile?.email || user?.email || 'No email'}
                </Text>
              </View>
            </View>
          )}

          {/* Subscription Section */}
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Subscription</Text>
          
          {/* PRO PLAN - Premium Gold Card */}
          {isPro ? (
            <View style={styles.proCard}>
              <LinearGradient
                colors={['#FFD700', '#FFA500', '#FF8C00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.proCardGradient}
              >
                {/* Pro Header */}
                <View style={styles.proCardHeader}>
                  <View style={styles.proCardTitleRow}>
                    <Star size={20} color="#fff" fill="#fff" />
                    <Text style={styles.proCardTitle}>Pro Member</Text>
                  </View>
                  {isSubDemoMode && (
                    <View style={styles.proDemoBadge}>
                      <Text style={styles.proDemoBadgeText}>🎮 Demo</Text>
                    </View>
                  )}
                </View>

                {/* Pro Benefits Row */}
                <View style={styles.proBenefitsRow}>
                  <View style={styles.proBenefit}>
                    <Text style={styles.proBenefitValue}>∞</Text>
                    <Text style={styles.proBenefitLabel}>Vehicles</Text>
                  </View>
                  <View style={styles.proBenefitDivider} />
                  <View style={styles.proBenefit}>
                    <Text style={styles.proBenefitValue}>Daily</Text>
                    <Text style={styles.proBenefitLabel}>Updates</Text>
                  </View>
                  <View style={styles.proBenefitDivider} />
                  <View style={styles.proBenefit}>
                    <Text style={styles.proBenefitValue}>Priority</Text>
                    <Text style={styles.proBenefitLabel}>Queue</Text>
                  </View>
                </View>

                {/* Current Usage */}
                <View style={styles.proUsageRow}>
                  <View style={styles.proUsageItem}>
                    <Text style={styles.proUsageValue}>{usage?.vehiclesUsed || 0}</Text>
                    <Text style={styles.proUsageLabel}>vehicles tracked</Text>
                  </View>
                  <View style={styles.proUsageItem}>
                    <Text style={styles.proUsageValue}>{usage?.dailyRefreshSlotsUsed || 0}/10</Text>
                    <Text style={styles.proUsageLabel}>daily slots used</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Demo Toggle for Pro */}
              {isSubDemoMode && (
                <View style={[styles.demoToggleCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.demoToggleLabel, { color: colors.textSecondary }]}>Preview as:</Text>
                  <View style={styles.demoToggleRow}>
                    <Pressable 
                      style={[styles.demoToggleBtn, !isPro && styles.demoToggleBtnActive]}
                      onPress={() => { if (isPro) { haptic.light(); toggleDemoPlan(); } }}
                    >
                      <Text style={[styles.demoToggleBtnText, !isPro && styles.demoToggleBtnTextActive]}>Free</Text>
                    </Pressable>
                    <Pressable 
                      style={[styles.demoToggleBtn, isPro && styles.demoToggleBtnActivePro]}
                      onPress={() => { if (!isPro) { haptic.light(); toggleDemoPlan(); } }}
                    >
                      <Text style={[styles.demoToggleBtnText, isPro && styles.demoToggleBtnTextActivePro]}>⭐ Pro</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Manage Button */}
              {!isSubDemoMode && (
                <Pressable 
                  style={[styles.proManageButton, { backgroundColor: colors.surface }]}
                  onPress={() => { haptic.light(); router.push('/(app)/subscription'); }}
                >
                  <Text style={[styles.proManageButtonText, { color: colors.text }]}>Manage Subscription</Text>
                </Pressable>
              )}
            </View>
          ) : (
            /* FREE PLAN - Basic Card */
            <View style={[styles.settingsCard, { backgroundColor: colors.surface }, Shadows.sm]}>
              <View style={styles.subscriptionHeader}>
                <View style={styles.subscriptionPlanRow}>
                  <View style={styles.planBadge}>
                    <Text style={styles.planBadgeText}>Free Plan</Text>
                  </View>
                  {isSubDemoMode && (
                    <View style={styles.demoBadge}>
                      <Text style={styles.demoBadgeText}>🎮 Demo</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Free Usage Stats */}
              <View style={[styles.usageContainer, { borderTopColor: colors.border }]}>
                <View style={styles.usageStat}>
                  <Text style={[styles.usageValue, { color: colors.text }]}>
                    {usage?.vehiclesUsed || 0}
                    <Text style={[styles.usageTotal, { color: colors.textTertiary }]}>
                      /{subscription?.maxVehicles === -1 ? '∞' : subscription?.maxVehicles || 1}
                    </Text>
                  </Text>
                  <Text style={[styles.usageLabel, { color: colors.textSecondary }]}>Vehicles</Text>
                </View>
                <View style={styles.usageStat}>
                  <Text style={[styles.usageValue, { color: colors.text }]}>Weekly</Text>
                  <Text style={[styles.usageLabel, { color: colors.textSecondary }]}>Updates</Text>
                </View>
                <View style={styles.usageStat}>
                  <Text style={[styles.usageValue, { color: colors.text }]}>1/week</Text>
                  <Text style={[styles.usageLabel, { color: colors.textSecondary }]}>Refresh</Text>
                </View>
              </View>

              {/* Demo Toggle for Free */}
              {isSubDemoMode && (
                <View style={styles.demoToggleContainer}>
                  <Text style={[styles.demoToggleLabel, { color: colors.textSecondary }]}>Preview as:</Text>
                  <View style={styles.demoToggleRow}>
                    <Pressable 
                      style={[styles.demoToggleBtn, !isPro && styles.demoToggleBtnActive]}
                      onPress={() => { if (isPro) { haptic.light(); toggleDemoPlan(); } }}
                    >
                      <Text style={[styles.demoToggleBtnText, !isPro && styles.demoToggleBtnTextActive]}>Free</Text>
                    </Pressable>
                    <Pressable 
                      style={[styles.demoToggleBtn, isPro && styles.demoToggleBtnActivePro]}
                      onPress={() => { if (!isPro) { haptic.light(); toggleDemoPlan(); } }}
                    >
                      <Text style={[styles.demoToggleBtnText, isPro && styles.demoToggleBtnTextActivePro]}>⭐ Pro</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Upgrade Button */}
              {!isSubDemoMode && (
                <Pressable 
                  style={[styles.upgradeButton, { backgroundColor: colors.brand }]}
                  onPress={() => { haptic.medium(); router.push('/(app)/subscription'); }}
                >
                  <Zap size={16} color="#fff" />
                  <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Pro Features List - Only show for Free users */}
          {isFree && (
            <View style={[styles.proFeaturesCard, { backgroundColor: colors.surface }, Shadows.sm]}>
              <Text style={[styles.proFeaturesTitle, { color: colors.text }]}>Unlock with Pro</Text>
              <View style={styles.proFeatureRow}>
                <Star size={14} color={colors.warning} />
                <Text style={[styles.proFeatureText, { color: colors.textSecondary }]}>Unlimited vehicles</Text>
              </View>
              <View style={styles.proFeatureRow}>
                <RefreshCw size={14} color={colors.warning} />
                <Text style={[styles.proFeatureText, { color: colors.textSecondary }]}>Daily updates for 10 cars</Text>
              </View>
              <View style={styles.proFeatureRow}>
                <Zap size={14} color={colors.warning} />
                <Text style={[styles.proFeatureText, { color: colors.textSecondary }]}>1 manual refresh per day</Text>
              </View>
              <View style={styles.proFeatureRow}>
                <TrendingUp size={14} color={colors.warning} />
                <Text style={[styles.proFeatureText, { color: colors.textSecondary }]}>Market shift alerts</Text>
              </View>
            </View>
          )}

          {/* Appearance - iOS Segmented Control style */}
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Appearance</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.surface }, Shadows.sm]}>
            <View style={[styles.themeSelector, { backgroundColor: colors.backgroundTertiary }]}>
              <Pressable 
                onPress={() => handleThemeChange('light')}
                style={[styles.themeOption, themeMode === 'light' && [styles.themeOptionActive, { backgroundColor: colors.surface }]]}
              >
                <Text style={[styles.themeOptionText, { color: colors.textSecondary }, themeMode === 'light' && { color: colors.text, fontWeight: '600' }]}>Light</Text>
              </Pressable>
              <Pressable 
                onPress={() => handleThemeChange('dark')}
                style={[styles.themeOption, themeMode === 'dark' && [styles.themeOptionActive, { backgroundColor: colors.surface }]]}
              >
                <Text style={[styles.themeOptionText, { color: colors.textSecondary }, themeMode === 'dark' && { color: colors.text, fontWeight: '600' }]}>Dark</Text>
              </Pressable>
              <Pressable 
                onPress={() => handleThemeChange('system')}
                style={[styles.themeOption, themeMode === 'system' && [styles.themeOptionActive, { backgroundColor: colors.surface }]]}
              >
                <Text style={[styles.themeOptionText, { color: colors.textSecondary }, themeMode === 'system' && { color: colors.text, fontWeight: '600' }]}>Auto</Text>
              </Pressable>
            </View>
          </View>

          {/* Notifications */}
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Notifications</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.surface }, Shadows.sm]}>
            <SettingsRow 
              icon={<Bell size={18} color={colors.textSecondary} />} 
              label="Push Notifications" 
              value={notificationSettings.enabled} 
              isSwitch 
              onValueChange={(v: boolean) => updateNotificationSetting('enabled', v)}
              colors={colors}
            />
            <SettingsRow 
              icon={<TrendingUp size={18} color={colors.positive} />} 
              label="Positive Equity Alerts" 
              value={notificationSettings.equityAlerts} 
              isSwitch 
              onValueChange={(v: boolean) => updateNotificationSetting('equityAlerts', v)}
              colors={colors}
            />
            <SettingsRow 
              icon={<TrendingDown size={18} color={colors.negative} />} 
              label="Price Drop Alerts" 
              value={notificationSettings.priceDrops} 
              isSwitch 
              onValueChange={(v: boolean) => updateNotificationSetting('priceDrops', v)}
              colors={colors}
            />
            <SettingsRow 
              icon={<Clock size={18} color={colors.warning} />} 
              label="Sell Time Reminders" 
              value={notificationSettings.reminders} 
              isSwitch 
              onValueChange={(v: boolean) => updateNotificationSetting('reminders', v)} 
              isLast
              colors={colors}
            />
          </View>
          <Text style={[styles.settingsHint, { color: colors.textQuaternary }]}>We'll let you know when it's a good time to sell your car.</Text>

          {/* Support */}
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Support</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.surface }, Shadows.sm]}>
            <SettingsRow icon={<HelpCircle size={18} color={colors.textSecondary} />} label="Help Center" onPress={() => {}} colors={colors} />
            <SettingsRow icon={<MessageSquare size={18} color={colors.textSecondary} />} label="Send Feedback" onPress={() => {}} colors={colors} />
            <SettingsRow icon={<Shield size={18} color={colors.textSecondary} />} label="Privacy Policy" onPress={() => router.push('/(app)/privacy-policy')} colors={colors} />
            <SettingsRow icon={<Shield size={18} color={colors.textSecondary} />} label="Terms of Service" onPress={() => router.push('/(app)/terms-of-service')} colors={colors} />
            <SettingsRow icon={<Download size={18} color={colors.textSecondary} />} label="Export My Data" onPress={() => router.push('/(app)/export-data')} colors={colors} />
            <SettingsRow icon={<RotateCcw size={18} color={colors.textSecondary} />} label="Replay Tutorial" onPress={handleResetOnboarding} isLast colors={colors} />
          </View>

          {/* Sign Out / Exit Demo */}
          <View style={[styles.settingsCard, { marginTop: Spacing.xl, backgroundColor: colors.surface }, Shadows.sm]}>
            <SettingsRow 
              icon={<LogOut size={18} color={isDemoMode ? colors.brand : colors.negative} />} 
              label={isDemoMode ? "Exit Demo Mode" : "Sign Out"} 
              onPress={handleSignOut} 
              isLast 
              destructive={!isDemoMode}
              colors={colors} 
            />
          </View>

          {/* Danger Zone - only show for real accounts */}
          {!isDemoMode && (
            <>
              <Text style={[styles.sectionHeader, { color: colors.negative, marginTop: Spacing.xl }]}>Danger Zone</Text>
              <View style={[styles.settingsCard, { backgroundColor: colors.surface }, Shadows.sm]}>
                <SettingsRow icon={<AlertCircle size={18} color={colors.negative} />} label="Delete My Account" onPress={handleDeleteAccount} isLast destructive colors={colors} />
              </View>
              <Text style={[styles.settingsHint, { color: colors.textTertiary }]}>This will permanently delete your account and all your data.</Text>
            </>
          )}

          <Text style={[styles.versionText, { color: colors.textQuaternary }]}>AutoTrack v1.0.0</Text>
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Floating Help Button */}
        <FloatingHelpButton 
          screenName="Settings"
          contextHelp="This is where you can change your preferences, manage notifications, and get help. Tap any option to make changes."
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.base },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: 0.37, marginTop: Spacing.md, marginBottom: Spacing.lg },

  demoBanner: { padding: Spacing.md, marginBottom: Spacing.xl, borderRadius: 14, alignItems: 'center' },
  demoBannerTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.41, marginBottom: 4 },
  demoBannerText: { fontSize: 15, letterSpacing: -0.24, textAlign: 'center', marginBottom: Spacing.md },
  demoBannerButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  demoBannerButtonText: { color: 'white', fontSize: 15, fontWeight: '600', letterSpacing: -0.24 },

  userCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, marginBottom: Spacing.xl, borderRadius: 14 },
  userAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  userInitials: { fontSize: 22, fontWeight: '600', color: 'white' },
  userInfo: { flex: 1 },
  userName: { fontSize: 20, fontWeight: '600', letterSpacing: 0.38 },
  userEmail: { fontSize: 15, marginTop: 2, letterSpacing: -0.24 },

  sectionHeader: { fontSize: 13, fontWeight: '400', letterSpacing: -0.08, marginBottom: Spacing.sm, marginLeft: Spacing.md, textTransform: 'uppercase' },
  settingsCard: { borderRadius: 14, marginBottom: Spacing.md, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: Spacing.md },
  settingsRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  settingsRowPressed: { opacity: 0.7 },
  settingsIcon: { width: 32, marginRight: Spacing.sm },
  settingsLabel: { flex: 1, fontSize: 17, letterSpacing: -0.41 },
  settingsLabelDestructive: { color: Colors.negative },
  settingsHint: { fontSize: 13, marginBottom: Spacing.lg, marginLeft: Spacing.md, lineHeight: 18, letterSpacing: -0.08 },

  versionText: { fontSize: 13, textAlign: 'center', marginTop: Spacing.xl, letterSpacing: -0.08 },

  themeSelector: { flexDirection: 'row', padding: 2, borderRadius: 10, margin: Spacing.sm },
  themeOption: { 
    flex: 1, 
    alignItems: 'center', 
    paddingVertical: 8, 
    borderRadius: 8,
  },
  themeOptionActive: { 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  themeOptionText: { fontSize: 13, fontWeight: '500' },
  themeOptionTextActive: { fontWeight: '600' },

  // Subscription styles
  subscriptionHeader: { padding: Spacing.md },
  subscriptionPlanRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#e9ecef', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16 
  },
  planBadgePro: { backgroundColor: '#ffd700' },
  planBadgeText: { fontSize: 14, fontWeight: '600', color: '#495057' },
  planBadgeTextPro: { color: '#000' },
  demoBadge: { 
    backgroundColor: '#fff3cd', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  demoBadgeText: { fontSize: 12, fontWeight: '500', color: '#856404' },
  demoToggleContainer: { marginTop: Spacing.md },
  demoToggleLabel: { fontSize: 13, marginBottom: 8 },
  demoToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  demoTogglePlan: { fontSize: 14, fontWeight: '500' },
  demoTogglePlanActive: { fontWeight: '700' },
  usageContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  usageStat: { alignItems: 'center' },
  usageValue: { fontSize: 24, fontWeight: '700' },
  usageTotal: { fontSize: 16, fontWeight: '400' },
  usageLabel: { fontSize: 12, marginTop: 4 },
  upgradeButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingVertical: 12,
    borderRadius: 10,
  },
  upgradeButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  manageButtonText: { fontSize: 15, fontWeight: '500' },
  proFeaturesCard: { borderRadius: 14, padding: Spacing.md, marginBottom: Spacing.md },
  proFeaturesTitle: { fontSize: 15, fontWeight: '600', marginBottom: Spacing.sm },
  proFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  proFeatureText: { fontSize: 14 },

  // Pro Card Styles - Premium Gold Design
  proCard: { marginBottom: Spacing.md, borderRadius: 16, overflow: 'hidden' },
  proCardGradient: { padding: Spacing.lg },
  proCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  proCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proCardTitle: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  proDemoBadge: { backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  proDemoBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  proBenefitsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.md },
  proBenefit: { alignItems: 'center' },
  proBenefitValue: { fontSize: 18, fontWeight: '700', color: '#fff' },
  proBenefitLabel: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  proBenefitDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  proUsageRow: { flexDirection: 'row', justifyContent: 'space-around' },
  proUsageItem: { alignItems: 'center' },
  proUsageValue: { fontSize: 28, fontWeight: '800', color: '#fff' },
  proUsageLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  proManageButton: { marginTop: Spacing.sm, marginHorizontal: 0, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  proManageButtonText: { fontSize: 15, fontWeight: '600' },
  demoToggleCard: { marginTop: Spacing.sm, padding: Spacing.md, borderRadius: 12 },
  demoToggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: '#f0f0f0' },
  demoToggleBtnActive: { backgroundColor: '#e9ecef' },
  demoToggleBtnActivePro: { backgroundColor: '#ffd700' },
  demoToggleBtnText: { fontSize: 14, fontWeight: '500', color: '#666' },
  demoToggleBtnTextActive: { color: '#000', fontWeight: '600' },
  demoToggleBtnTextActivePro: { color: '#000', fontWeight: '700' },
});
