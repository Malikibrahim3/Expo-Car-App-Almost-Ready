/**
 * Landing Screen - FIXED
 * Clear value prop, social proof, demo preview
 */
import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Star, Users, Zap, Shield, Database } from 'lucide-react-native';
import { Colors, Typography, Shadows, Radius } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';
import { IOSText as Text } from '../../src/components/ios';
import { useAuth } from '../../src/context/AuthContext';
import Toast from 'react-native-toast-message';
// Trust components are inline in this file
import { VehicleImage } from '@/src/components/VehicleImage';

export default function Landing() {
  const router = useRouter();
  const { enterDemoMode } = useAuth();
  const { colors } = useThemeMode();
  const [devLoading, setDevLoading] = useState(false);

  const handleDemoMode = () => {
    setDevLoading(true);
    Toast.show({ type: 'success', text1: 'Demo Mode', text2: 'Explore with sample data' });
    // Enter demo mode - this sets up a fake user with demo data
    enterDemoMode();
    // Give time for state to propagate through context providers
    setTimeout(() => {
      router.replace('/(tabs)/dashboard');
      setDevLoading(false);
    }, 500);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.hero}>
          <View style={[styles.badge, { backgroundColor: colors.brandSubtle }]}>
            <Text style={[styles.badgeText, { color: colors.brand }]}>CAR FINANCE TRACKER</Text>
          </View>
          <Text style={[styles.headline, { color: colors.text }]}>Know exactly when{'\n'}to sell your car</Text>
          <Text style={[styles.subheadline, { color: colors.textSecondary }]}>Stop guessing. See the exact month when selling makes you money instead of costing you.</Text>
        </View>

        <View style={[styles.demoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.demoHeader}>
            <View style={[styles.demoDot, { backgroundColor: colors.positive }]} />
            <Text style={[styles.demoLabel, { color: colors.textTertiary }]}>LIVE EXAMPLE</Text>
          </View>
          <View style={styles.demoContent}>
            {/* Car Image */}
            <VehicleImage make="BMW" model="3 Series" year={2022} size="medium" />
            <View style={styles.demoInfo}>
              <Text style={[styles.demoCarName, { color: colors.text }]}>2022 BMW 3 Series</Text>
              <Text style={[styles.demoStatus, { color: colors.positive }]}>Ready to sell</Text>
            </View>
            <View style={styles.demoRight}>
              <Text style={[styles.demoProfit, { color: colors.positive }]}>+$4,500</Text>
              <Text style={[styles.demoProfitLabel, { color: colors.textTertiary }]}>in your pocket</Text>
            </View>
          </View>
          <View style={[styles.demoFooter, { borderTopColor: colors.border }]}>
            <Text style={[styles.demoFooterText, { color: colors.textSecondary }]}>Sarah waited 3 months and pocketed $4,500 more than if she'd sold immediately.</Text>
          </View>
        </View>

        <View style={styles.socialProof}>
          <View style={styles.proofItem}><Users size={16} color={colors.brand} /><Text style={[styles.proofText, { color: colors.textSecondary }]}>2,400+ users</Text></View>
          <View style={[styles.proofDivider, { backgroundColor: colors.border }]} />
          <View style={styles.proofItem}><Star size={16} color={colors.brand} /><Text style={[styles.proofText, { color: colors.textSecondary }]}>4.8 rating</Text></View>
          <View style={[styles.proofDivider, { backgroundColor: colors.border }]} />
          <View style={styles.proofItem} testID="security-badge"><Shield size={16} color={colors.positive} /><Text style={[styles.proofText, { color: colors.textSecondary }]}>Secure</Text></View>
        </View>

        {/* Data Source Trust */}
        <View style={styles.trustSection}>
          <Text style={[styles.trustLabel, { color: colors.textTertiary }]}>Values powered by</Text>
          <View style={styles.trustLogos}>
            <View style={[styles.trustBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Database size={14} color={colors.info} />
              <Text style={[styles.trustBadgeText, { color: colors.text }]}>Kelley Blue Book</Text>
            </View>
            <View style={[styles.trustBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Database size={14} color={colors.info} />
              <Text style={[styles.trustBadgeText, { color: colors.text }]}>Edmunds</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => router.push('/(auth)/signup')} style={({ pressed }) => [styles.primaryWrapper, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}>
            <LinearGradient colors={colors.gradientBrand} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Get Started Free</Text>
              <ArrowRight size={20} color="white" />
            </LinearGradient>
          </Pressable>
          <Pressable onPress={() => router.push('/(auth)/login')} style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>I already have an account</Text>
          </Pressable>
        </View>

        <Pressable 
          onPress={handleDemoMode} 
          disabled={devLoading} 
          style={[styles.demoButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {devLoading ? <ActivityIndicator size="small" color={colors.brand} /> : (
            <>
              <Zap size={18} color={colors.brand} />
              <Text style={[styles.demoText, { color: colors.text }]}>Try it first without signing up</Text>
            </>
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1, paddingHorizontal: 24 },
  hero: { paddingTop: 60, marginBottom: 32 },
  badge: { backgroundColor: Colors.brandSubtle, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 16 },
  badgeText: { fontSize: 11, color: Colors.brand, letterSpacing: 1, fontWeight: '700' },
  headline: { fontSize: 36, fontWeight: '700', color: Colors.text, letterSpacing: -1, lineHeight: 42, marginBottom: 12 },
  subheadline: { ...Typography.body, color: Colors.textSecondary, lineHeight: 24 },
  demoCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 24 },
  demoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  demoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.positive },
  demoLabel: { fontSize: 10, color: Colors.textTertiary, letterSpacing: 0.5 },
  demoContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  demoInfo: { flex: 1 },
  demoCarName: { ...Typography.headline, color: Colors.text, marginBottom: 2 },
  demoStatus: { fontSize: 12, color: Colors.positive },
  demoRight: { alignItems: 'flex-end' },
  demoProfit: { fontSize: 28, fontWeight: '700', color: Colors.positive, letterSpacing: -1 },
  demoProfitLabel: { fontSize: 12, color: Colors.textTertiary },
  demoFooter: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  demoFooterText: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 18 },
  socialProof: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' },
  proofItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proofDivider: { width: 1, height: 16, backgroundColor: Colors.border, marginHorizontal: 12 },
  proofText: { fontSize: 13, color: Colors.textSecondary },
  trustSection: { alignItems: 'center', marginBottom: 24 },
  trustLabel: { fontSize: 11, letterSpacing: 0.5, marginBottom: 8 },
  trustLogos: { flexDirection: 'row', gap: 8 },
  trustBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderRadius: Radius.xs },
  trustBadgeText: { fontSize: 12, fontWeight: '500' },
  actions: { marginTop: 'auto', paddingBottom: 16 },
  primaryWrapper: { ...Shadows.brandGlow, marginBottom: 12 },
  primaryButton: { height: 56, borderRadius: Radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { ...Typography.headline, color: 'white', fontWeight: '600' },
  secondaryButton: { height: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { ...Typography.body, color: Colors.textSecondary },
  demoButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 20, borderWidth: 1, borderRadius: Radius.sm, marginTop: 8 },
  demoText: { fontSize: 15, fontWeight: '500' },
});
