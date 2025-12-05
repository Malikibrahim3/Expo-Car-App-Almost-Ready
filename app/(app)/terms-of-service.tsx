/**
 * Terms of Service Screen
 * Required for App Store submission
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, FileText, Mail } from 'lucide-react-native';
import { useThemeMode } from '@/src/context/ThemeContext';
import { Typography, Spacing, Radius } from '@/src/constants/LinearDesign';

const LAST_UPDATED = 'December 4, 2024';
const CONTACT_EMAIL = 'support@carvaluetracker.com'; // Update with your email

export default function TermsOfServiceScreen() {
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Terms of Service</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Header Card */}
          <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FileText size={32} color={colors.brand} />
            <Text style={[styles.headerCardTitle, { color: colors.text }]}>Terms of Service</Text>
            <Text style={[styles.headerCardSubtitle, { color: colors.textTertiary }]}>
              Last updated: {LAST_UPDATED}
            </Text>
          </View>

          <Section title="Agreement to Terms">
            <Paragraph>
              By accessing or using CarValue Tracker ("the App"), you agree to be bound by these 
              Terms of Service. If you do not agree to these terms, please do not use the App.
            </Paragraph>
          </Section>

          <Section title="Description of Service">
            <Paragraph>
              CarValue Tracker provides vehicle portfolio tracking, market valuations, and equity 
              calculations to help you understand your vehicle's financial position. The App is 
              provided for informational purposes only.
            </Paragraph>
          </Section>

          <Section title="Account Registration">
            <Paragraph>To use certain features, you must create an account. You agree to:</Paragraph>
            <BulletPoint>Provide accurate and complete information</BulletPoint>
            <BulletPoint>Maintain the security of your account credentials</BulletPoint>
            <BulletPoint>Notify us immediately of any unauthorized access</BulletPoint>
            <BulletPoint>Accept responsibility for all activities under your account</BulletPoint>
          </Section>

          <Section title="Acceptable Use">
            <Paragraph>You agree not to:</Paragraph>
            <BulletPoint>Use the App for any illegal purpose</BulletPoint>
            <BulletPoint>Attempt to gain unauthorized access to our systems</BulletPoint>
            <BulletPoint>Interfere with or disrupt the App's functionality</BulletPoint>
            <BulletPoint>Scrape, copy, or redistribute our data without permission</BulletPoint>
            <BulletPoint>Use automated systems to access the App excessively</BulletPoint>
            <BulletPoint>Impersonate others or provide false information</BulletPoint>
          </Section>

          <Section title="Valuation Disclaimer">
            <Paragraph>
              IMPORTANT: Vehicle valuations provided by the App are estimates based on market data 
              and algorithms. They are NOT guaranteed prices and should NOT be relied upon as the 
              sole basis for financial decisions.
            </Paragraph>
            <Paragraph>
              Actual vehicle values may vary significantly based on condition, location, market 
              conditions, and other factors not captured by our estimates. Always obtain 
              professional appraisals before making significant financial decisions.
            </Paragraph>
          </Section>

          <Section title="Financial Information Disclaimer">
            <Paragraph>
              The App provides tools to track loan balances, equity positions, and payment 
              schedules. This information is based on data you provide and standard calculations. 
              It may not reflect your actual financial situation.
            </Paragraph>
            <Paragraph>
              We are not financial advisors. The App does not provide financial, legal, or tax 
              advice. Consult qualified professionals for advice specific to your situation.
            </Paragraph>
          </Section>

          <Section title="Intellectual Property">
            <Paragraph>
              The App, including its design, features, and content, is owned by CarValue Tracker 
              and protected by intellectual property laws. You may not copy, modify, distribute, 
              or create derivative works without our written permission.
            </Paragraph>
          </Section>

          <Section title="Third-Party Services">
            <Paragraph>
              The App integrates with third-party services for valuations and authentication. 
              Your use of these services is subject to their respective terms and privacy policies. 
              We are not responsible for third-party service availability or accuracy.
            </Paragraph>
          </Section>

          <Section title="Limitation of Liability">
            <Paragraph>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, CARVALUE TRACKER SHALL NOT BE LIABLE FOR 
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING 
              BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL.
            </Paragraph>
            <Paragraph>
              Our total liability for any claims arising from your use of the App shall not 
              exceed the amount you paid us in the twelve months preceding the claim, or $100, 
              whichever is greater.
            </Paragraph>
          </Section>

          <Section title="Indemnification">
            <Paragraph>
              You agree to indemnify and hold harmless CarValue Tracker and its officers, 
              directors, employees, and agents from any claims, damages, or expenses arising 
              from your use of the App or violation of these Terms.
            </Paragraph>
          </Section>

          <Section title="Termination">
            <Paragraph>
              We may suspend or terminate your access to the App at any time, with or without 
              cause, with or without notice. You may delete your account at any time through 
              the App settings.
            </Paragraph>
          </Section>

          <Section title="Changes to Terms">
            <Paragraph>
              We may modify these Terms at any time. We will notify you of material changes 
              through the App or by email. Your continued use of the App after changes 
              constitutes acceptance of the new Terms.
            </Paragraph>
          </Section>

          <Section title="Governing Law">
            <Paragraph>
              These Terms shall be governed by and construed in accordance with the laws of 
              the United States, without regard to conflict of law principles.
            </Paragraph>
          </Section>

          <Section title="Contact Us">
            <Paragraph>
              If you have questions about these Terms, please contact us:
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
