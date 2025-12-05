/**
 * Market - Linear Dark Theme
 * 
 * Premium dark coming soon page with:
 * - Sharp, technical aesthetic
 * - Orange accent highlights
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Store, TrendingUp, Sparkles, Bell, ArrowRight } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radius, Shadows, haptic, IconSizes } from '@/src/constants/LinearDesign';

const features = [
  { icon: TrendingUp, title: 'Smart Recommendations', description: 'AI-powered suggestions based on your preferences', color: Colors.positive, bg: Colors.positiveBg },
  { icon: Sparkles, title: 'Exclusive Deals', description: 'Partner discounts you won\'t find anywhere else', color: Colors.brand, bg: Colors.brandSubtle },
  { icon: Bell, title: 'Price Alerts', description: 'Get notified when prices drop', color: Colors.warning, bg: Colors.warningBg },
];

export default function MarketPage() {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.largeTitle} accessibilityRole="header">Marketplace</Text>

          {/* Hero Card */}
          <View style={styles.heroContainer}>
            <View style={styles.heroCard}>
              <LinearGradient colors={['rgba(249, 115, 22, 0.2)', 'transparent']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.heroGradient} />
              <View style={styles.heroIconContainer}>
                <Store size={IconSizes.xl} color={Colors.brand} />
              </View>
              <Text style={styles.heroTitle}>Launching Soon</Text>
              <Text style={styles.heroDescription}>Exclusive deals and partnerships with top automotive brands</Text>
              
              <Pressable onPress={() => haptic.light()} style={({ pressed }) => [styles.notifyButton, pressed && styles.notifyButtonPressed]}>
                <LinearGradient colors={Colors.gradientBrand} style={styles.notifyButtonGradient}>
                  <Text style={styles.notifyButtonText}>Notify Me</Text>
                  <ArrowRight size={IconSizes.sm} color="white" />
                </LinearGradient>
              </Pressable>
            </View>
          </View>

          <Text style={styles.sectionTitle}>WHAT'S COMING</Text>
          
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Pressable key={index} onPress={() => haptic.light()} style={({ pressed }) => [styles.featureCard, pressed && styles.featureCardPressed]}>
                <View style={[styles.featureIcon, { backgroundColor: feature.bg }]}>
                  <Icon size={IconSizes.md} color={feature.color} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </Pressable>
            );
          })}

          <View style={styles.footerCard}>
            <Text style={styles.footerText}>We're working with dealerships and car brands to bring you great deals. Sign up to be notified when we launch!</Text>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.base },
  largeTitle: { ...Typography.largeTitle, color: Colors.text, marginTop: Spacing.md, marginBottom: Spacing.lg },
  
  heroContainer: { marginBottom: Spacing.xl, ...Shadows.cardGlow },
  heroCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, padding: Spacing.xxl, alignItems: 'center', overflow: 'hidden' },
  heroGradient: { position: 'absolute', top: 0, right: 0, width: 250, height: 250 },
  heroIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.brandSubtle, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  heroTitle: { ...Typography.title1, color: Colors.text, marginBottom: Spacing.sm },
  heroDescription: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: Spacing.xl },
  notifyButton: { ...Shadows.brandGlow },
  notifyButtonPressed: { opacity: 0.95, transform: [{ scale: 0.98 }] },
  notifyButtonGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.xs, gap: Spacing.sm },
  notifyButtonText: { ...Typography.headline, color: 'white' },
  
  sectionTitle: { ...Typography.caption, color: Colors.textTertiary, letterSpacing: 1, marginBottom: Spacing.md, marginLeft: Spacing.sm },
  
  featureCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, marginBottom: Spacing.md },
  featureCardPressed: { backgroundColor: Colors.surfaceHover, borderColor: Colors.borderStrong },
  featureIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  featureContent: { flex: 1 },
  featureTitle: { ...Typography.headline, color: Colors.text, marginBottom: 2 },
  featureDescription: { ...Typography.footnote, color: Colors.textSecondary, lineHeight: 18 },
  
  footerCard: { backgroundColor: Colors.backgroundTertiary, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, marginTop: Spacing.md },
  footerText: { ...Typography.footnote, color: Colors.textTertiary, textAlign: 'center', lineHeight: 20 },
});
