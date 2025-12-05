/**
 * Privacy Policy Screen
 * Required for App Store submission
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Shield, Mail } from 'lucide-react-native';
import { useThemeMode } from '@/src/context/ThemeContext';
import { Typography, Spacing, Radius } from '@/src/constants/LinearDesign';

const LAST_UPDATED = 'December 4, 2024';
const CONTACT_EMAIL = 'privacy@carvaluetracker.com'; // Update with your email

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );

  const Paragraph = ({ children }: { children: React.ReactNode }) => (
    <Text style={[styles.paragraph, { color: colors.textSecondary }]}>{children}</Text>
  );

  const BulletPoint = ({ children }: { children: React.ReactNode }) => (
    <View style={styles.bulletRow}>
      <Text style={[styles.bullet, { color: colors.textTertiary }]}>•</Text>
      <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{children}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Header Card */}
          <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Shield size={32} color={colors.brand} />
            <Text style={[styles.headerCardTitle, { color: colors.text }]}>Your Privacy Matters</Text>
            <Text style={[styles.headerCardSubtitle, { color: colors.textTertiary }]}>
              Last updated: {LAST_UPDATED}
            </Text>
          </View>

          <Section title="Overview">
            <Paragraph>
              CarValue Tracker ("we", "our", or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, and safeguard your information 
              when you use our mobile application.
            </Paragraph>
          </Section>

          <Section title="Information We Collect">
            <Paragraph>We collect information you provide directly:</Paragraph>
            <BulletPoint>Account information (email address, name)</BulletPoint>
            <BulletPoint>Vehicle details (make, model, year, mileage, VIN)</BulletPoint>
            <BulletPoint>Financial information (purchase price, loan details, monthly payments)</BulletPoint>
            <Paragraph>We automatically collect:</Paragraph>
            <BulletPoint>Device information (device type, operating system)</BulletPoint>
            <BulletPoint>Usage data (features used, screens viewed)</BulletPoint>
            <BulletPoint>Crash reports and performance data</BulletPoint>
          </Section>

          <Section title="How We Use Your Information">
            <Paragraph>We use your information to:</Paragraph>
            <BulletPoint>Provide vehicle valuations and equity calculations</BulletPoint>
            <BulletPoint>Track your vehicle portfolio over time</BulletPoint>
            <BulletPoint>Send notifications about optimal selling times</BulletPoint>
            <BulletPoint>Improve our app and develop new features</BulletPoint>
            <BulletPoint>Respond to your requests and support inquiries</BulletPoint>
          </Section>

          <Section title="Data Storage & Security">
            <Paragraph>
              Your data is stored securely using Supabase, which provides enterprise-grade 
              security including encryption at rest and in transit. We implement appropriate 
              technical and organizational measures to protect your personal information.
            </Paragraph>
          </Section>

          <Section title="Third-Party Services">
            <Paragraph>We use the following third-party services:</Paragraph>
            <BulletPoint>Supabase - Database and authentication</BulletPoint>
            <BulletPoint>Marketcheck - Vehicle valuation data</BulletPoint>
            <BulletPoint>Apple/Google - Authentication (Sign in with Apple/Google)</BulletPoint>
            <Paragraph>
              These services have their own privacy policies governing their use of your data.
            </Paragraph>
          </Section>

          <Section title="Data Sharing">
            <Paragraph>
              We do not sell your personal information. We may share data with:
            </Paragraph>
            <BulletPoint>Service providers who assist in operating our app</BulletPoint>
            <BulletPoint>Law enforcement when required by law</BulletPoint>
            <BulletPoint>Business partners with your explicit consent</BulletPoint>
          </Section>

          <Section title="Your Rights">
            <Paragraph>You have the right to:</Paragraph>
            <BulletPoint>Access your personal data</BulletPoint>
            <BulletPoint>Correct inaccurate data</BulletPoint>
            <BulletPoint>Delete your account and associated data</BulletPoint>
            <BulletPoint>Export your data</BulletPoint>
            <BulletPoint>Opt out of marketing communications</BulletPoint>
          </Section>

          <Section title="Data Retention">
            <Paragraph>
              We retain your data for as long as your account is active. If you delete your 
              account, we will delete your personal data within 30 days, except where we are 
              required to retain it for legal purposes.
            </Paragraph>
          </Section>

          <Section title="Children's Privacy">
            <Paragraph>
              Our app is not intended for children under 13. We do not knowingly collect 
              personal information from children under 13. If you believe we have collected 
              such information, please contact us immediately.
            </Paragraph>
          </Section>

          <Section title="Changes to This Policy">
            <Paragraph>
              We may update this Privacy Policy from time to time. We will notify you of any 
              changes by posting the new policy in the app and updating the "Last updated" date.
            </Paragraph>
          </Section>

          <Section title="Contact Us">
            <Paragraph>
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </Paragraph>
            <Pressable 
              onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
              style={[styles.contactButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Mail size={18} color={colors.brand} />
              <Text style={[styles.contactButtonText, { color: colors.brand }]}>{CONTACT_EMAIL}</Text>
            </Pressable>
          </Section>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...Typography.headline, flex: 1, textAlign: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.base },
  
  headerCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderWidth: 1,
    borderRadius: Radius.md,
    marginBottom: Spacing.xl,
  },
  headerCardTitle: {
    ...Typography.title2,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  headerCardSubtitle: {
    fontSize: 13,
  },
  
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.headline,
    marginBottom: Spacing.sm,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: Spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    paddingLeft: Spacing.sm,
    marginBottom: 6,
  },
  bullet: {
    fontSize: 15,
    marginRight: Spacing.sm,
  },
  bulletText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
  },
  contactButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
