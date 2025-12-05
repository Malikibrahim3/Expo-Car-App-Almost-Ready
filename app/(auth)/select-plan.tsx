/**
 * Plan Selection Screen
 * 
 * Shown after signup to let users choose Free or Pro plan.
 * Pro selection shows benefits and allows bypass for now (no payment required yet).
 */
import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Star, Zap, RefreshCw, Shield, ChevronRight, Car, Calendar, RotateCcw, BarChart3, Trophy, TrendingUp, Download } from 'lucide-react-native';
import { Radius, haptic } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { useSubscriptionContext } from '@/src/context/SubscriptionContext';
import { IOSText as Text } from '../../src/components/ios';
import Toast from 'react-native-toast-message';
import { supabase } from '@/src/lib/supabaseClient';

const FREE_FEATURES = [
  { icon: Car, text: '1 vehicle' },
  { icon: Calendar, text: 'Weekly value updates' },
  { icon: RotateCcw, text: '1 manual refresh per week' },
  { icon: BarChart3, text: 'Basic value tracking' },
];

const PRO_FEATURES = [
  { icon: Car, text: 'Unlimited vehicles', highlight: true },
  { icon: Zap, text: 'Daily value updates', highlight: true },
  { icon: RotateCcw, text: '1 manual refresh per day', highlight: true },
  { icon: Trophy, text: 'Priority refresh queue', highlight: true },
  { icon: TrendingUp, text: 'Market shift alerts', highlight: true },
  { icon: Download, text: 'Export your data', highlight: false },
];

export default function SelectPlan() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const { user } = useAuth() as any;
  const { refresh: refreshSubscription } = useSubscriptionContext();
  
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelectPlan = async (plan: 'free' | 'pro') => {
    haptic.medium();
    setSelectedPlan(plan);
  };

  const handleContinue = async () => {
    if (!selectedPlan) return;
    
    setLoading(true);
    haptic.medium();

    try {
      // Save plan selection to database
      if (user?.id) {
        // Create or update subscription record
        const subscriptionData = {
          user_id: user.id,
          plan_type: selectedPlan,
          max_vehicles: selectedPlan === 'pro' ? -1 : 1,
          daily_refresh_vehicles: selectedPlan === 'pro' ? 10 : 0,
          manual_refresh_interval_days: selectedPlan === 'pro' ? 1 : 7,
          is_active: true,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('user_subscriptions')
          .upsert(subscriptionData, { onConflict: 'user_id' });

        if (error) {
          console.error('Error saving plan:', error);
          // Continue anyway - subscription will default to free
        } else {
          // Refresh subscription context to pick up the new plan
          await refreshSubscription();
        }
      }

      if (selectedPlan === 'pro') {
        // For now, just show success and continue (no payment required)
        Toast.show({
          type: 'success',
          text1: 'Welcome to Pro!',
          text2: 'Enjoy unlimited vehicles and daily updates',
        });
      } else {
        Toast.show({
          type: 'success',
          text1: 'Free plan selected',
          text2: 'You can upgrade anytime',
        });
      }

      // Continue to onboarding
      router.replace('/(auth)/onboarding');
    } catch (error) {
      console.error('Plan selection error:', error);
      // Continue anyway
      router.replace('/(auth)/onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    haptic.light();
    // Default to free plan
    Toast.show({
      type: 'info',
      text1: 'Starting with Free',
      text2: 'You can upgrade anytime from settings',
    });
    router.replace('/(auth)/onboarding');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Choose Your Plan</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Start free or unlock everything with Pro
            </Text>
          </View>

          {/* Plan Cards */}
          <View style={styles.plansContainer}>
            {/* Free Plan */}
            <Pressable
              onPress={() => handleSelectPlan('free')}
              style={({ pressed }) => [
                styles.planCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                selectedPlan === 'free' && { borderColor: colors.brand, borderWidth: 2 },
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={styles.planHeader}>
                <Text style={[styles.planName, { color: colors.text }]}>Free</Text>
                <Text style={[styles.planPrice, { color: colors.text }]}>$0</Text>
                <Text style={[styles.planPeriod, { color: colors.textTertiary }]}>forever</Text>
              </View>

              <View style={styles.featuresList}>
                {FREE_FEATURES.map((feature, index) => {
                  const IconComponent = feature.icon;
                  return (
                    <View key={index} style={styles.featureRow}>
                      <View style={styles.featureIconContainer}>
                        <IconComponent size={16} color={colors.textSecondary} />
                      </View>
                      <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                        {feature.text}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {selectedPlan === 'free' && (
                <View style={[styles.selectedBadge, { backgroundColor: colors.brand }]}>
                  <Check size={16} color="#fff" strokeWidth={3} />
                </View>
              )}
            </Pressable>

            {/* Pro Plan */}
            <Pressable
              onPress={() => handleSelectPlan('pro')}
              style={({ pressed }) => [
                styles.planCard,
                styles.proCard,
                selectedPlan === 'pro' && { borderWidth: 2 },
                pressed && { opacity: 0.9 },
              ]}
            >
              {/* Recommended Badge */}
              <View style={styles.recommendedBadge}>
                <Star size={12} color="#fff" fill="#fff" />
                <Text style={styles.recommendedText}>RECOMMENDED</Text>
              </View>

              <LinearGradient
                colors={['#FFD700', '#FFA500', '#FF8C00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.proGradient}
              >
                <View style={styles.planHeader}>
                  <View style={styles.proNameRow}>
                    <Star size={20} color="#fff" fill="#fff" />
                    <Text style={styles.proPlanName}>Pro</Text>
                  </View>
                  <Text style={styles.proPlanPrice}>$4.99</Text>
                  <Text style={styles.proPlanPeriod}>/month</Text>
                </View>

                <View style={styles.featuresList}>
                  {PRO_FEATURES.map((feature, index) => {
                    const IconComponent = feature.icon;
                    return (
                      <View key={index} style={styles.featureRow}>
                        <View style={styles.featureIconContainer}>
                          <IconComponent size={16} color={feature.highlight ? '#fff' : 'rgba(255,255,255,0.8)'} />
                        </View>
                        <Text style={[
                          styles.proFeatureText,
                          feature.highlight && styles.proFeatureHighlight
                        ]}>
                          {feature.text}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Free Trial Note */}
                <View style={styles.trialNote}>
                  <Zap size={14} color="#fff" />
                  <Text style={styles.trialNoteText}>Start free, pay later</Text>
                </View>
              </LinearGradient>

              {selectedPlan === 'pro' && (
                <View style={[styles.selectedBadge, styles.proSelectedBadge]}>
                  <Check size={16} color="#000" strokeWidth={3} />
                </View>
              )}
            </Pressable>
          </View>

          {/* Trust Signals */}
          <View style={styles.trustSection}>
            <View style={styles.trustItem}>
              <Shield size={16} color={colors.textTertiary} />
              <Text style={[styles.trustText, { color: colors.textTertiary }]}>
                Cancel anytime
              </Text>
            </View>
            <View style={styles.trustItem}>
              <RefreshCw size={16} color={colors.textTertiary} />
              <Text style={[styles.trustText, { color: colors.textTertiary }]}>
                Switch plans anytime
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          <Pressable
            onPress={handleContinue}
            disabled={!selectedPlan || loading}
            style={[styles.continueButton, !selectedPlan && styles.buttonDisabled]}
          >
            <LinearGradient
              colors={selectedPlan === 'pro' ? ['#FFD700', '#FFA500'] : colors.gradientBrand}
              style={styles.continueGradient}
            >
              {loading ? (
                <ActivityIndicator color={selectedPlan === 'pro' ? '#000' : '#fff'} />
              ) : (
                <>
                  <Text style={[
                    styles.continueText,
                    selectedPlan === 'pro' && styles.proContinueText
                  ]}>
                    {selectedPlan === 'pro' ? 'Start with Pro' : 'Continue with Free'}
                  </Text>
                  <ChevronRight size={20} color={selectedPlan === 'pro' ? '#000' : '#fff'} />
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: colors.textTertiary }]}>
              Skip for now
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },

  header: { alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 4, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, textAlign: 'center' },

  plansContainer: { gap: 12 },

  planCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  proCard: {
    borderWidth: 0,
    padding: 0,
    overflow: 'hidden',
  },
  proGradient: {
    padding: 16,
    borderRadius: 14,
  },

  recommendedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  recommendedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  planHeader: { marginBottom: 12 },
  planName: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  planPrice: { fontSize: 32, fontWeight: '800' },
  planPeriod: { fontSize: 13 },

  proNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  proPlanName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  proPlanPrice: { fontSize: 32, fontWeight: '800', color: '#fff' },
  proPlanPeriod: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  featuresList: { gap: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureIconContainer: { width: 24, alignItems: 'center' },
  featureText: { fontSize: 14, flex: 1 },
  proFeatureText: { fontSize: 14, flex: 1, color: 'rgba(255,255,255,0.9)' },
  proFeatureHighlight: { color: '#fff', fontWeight: '600' },

  trialNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  trialNoteText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  selectedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proSelectedBadge: {
    backgroundColor: '#FFD700',
    top: 48,
  },

  trustSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustText: { fontSize: 12 },

  actions: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  continueButton: { marginBottom: 12 },
  buttonDisabled: { opacity: 0.5 },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: Radius.sm,
  },
  continueText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  proContinueText: { color: '#000' },

  skipButton: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: 15 },
});
