/**
 * VINVisualGuide - Shows users where to find their VIN
 * Clear step-by-step text instructions
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { FileText, CreditCard, Car, X, Check, MapPin } from 'lucide-react-native';
import { Spacing, Radius, haptic } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';

interface VINVisualGuideProps {
  visible: boolean;
  onClose: () => void;
}

const VIN_LOCATIONS = [
  {
    id: 'door',
    icon: Car,
    title: "Driver's Door Jamb",
    isRecommended: true,
    steps: [
      'Open your driver-side door all the way',
      'Look at the door frame where the door latches to the car',
      'Find the white or silver sticker (usually near the latch)',
      'The VIN is the 17-character code on that sticker',
    ],
    tip: 'This is the easiest and most reliable place to find it!',
  },
  {
    id: 'dashboard',
    title: 'Dashboard Corner',
    icon: MapPin,
    isRecommended: false,
    steps: [
      'Stand outside your car on the driver\'s side',
      'Look through the windshield at the dashboard',
      'Check the bottom-left corner where the dash meets the windshield',
      'You\'ll see a small metal plate with the VIN stamped on it',
    ],
    tip: 'Easier to see from outside the car looking in',
  },
  {
    id: 'registration',
    title: 'Registration Card',
    icon: FileText,
    isRecommended: false,
    steps: [
      'Check your glove box for your registration card',
      'The VIN is printed on the registration document',
      'It\'s usually near the top of the card',
    ],
    tip: 'Your title document also has the VIN if you have it handy',
  },
  {
    id: 'insurance',
    title: 'Insurance Card or App',
    icon: CreditCard,
    isRecommended: false,
    steps: [
      'Check your insurance card in your wallet',
      'Or open your insurance company\'s mobile app',
      'Look under "My Vehicles" or "Policy Details"',
      'The VIN will be listed with your vehicle info',
    ],
    tip: 'Most insurance apps show this in the vehicle details section',
  },
];

export default function VINVisualGuide({ visible, onClose }: VINVisualGuideProps) {
  const { colors } = useThemeMode();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: colors.text }]}>Where to Find Your VIN</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              4 easy places to look
            </Text>
          </View>
          <Pressable
            onPress={() => {
              haptic.light();
              onClose();
            }}
            style={[styles.closeButton, { backgroundColor: colors.surface }]}
          >
            <X size={20} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* What is a VIN */}
          <View style={[styles.infoCard, { backgroundColor: colors.brandSubtle }]}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>What's a VIN?</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Your Vehicle Identification Number is a unique 17-character code. It's like a
              fingerprint for your car - no two are alike.
            </Text>
            <View
              style={[styles.exampleBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.exampleLabel, { color: colors.textTertiary }]}>Example VIN:</Text>
              <Text style={[styles.exampleVin, { color: colors.text }]}>1HGBH41JXMN109186</Text>
              <Text style={[styles.exampleNote, { color: colors.textTertiary }]}>
                17 characters • Letters and numbers • No I, O, or Q
              </Text>
            </View>
          </View>

          {/* Location Cards */}
          {VIN_LOCATIONS.map((location, index) => {
            const Icon = location.icon;

            return (
              <View
                key={location.id}
                style={[
                  styles.locationCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  location.isRecommended && { borderColor: colors.positive, borderWidth: 2 },
                ]}
              >
                {/* Recommended Badge */}
                {location.isRecommended && (
                  <View style={[styles.recommendedBadge, { backgroundColor: colors.positive }]}>
                    <Check size={12} color="white" />
                    <Text style={styles.recommendedText}>Easiest Option</Text>
                  </View>
                )}

                {/* Header */}
                <View style={styles.locationHeader}>
                  <View style={[styles.locationIcon, { backgroundColor: colors.brandSubtle }]}>
                    <Icon size={24} color={colors.brand} />
                  </View>
                  <View style={styles.locationTitleSection}>
                    <Text style={[styles.locationTitle, { color: colors.text }]}>
                      {index + 1}. {location.title}
                    </Text>
                  </View>
                </View>

                {/* Steps */}
                <View style={styles.stepsList}>
                  {location.steps.map((step, stepIndex) => (
                    <View key={stepIndex} style={styles.stepItem}>
                      <View style={[styles.stepNumber, { backgroundColor: colors.brandSubtle }]}>
                        <Text style={[styles.stepNumberText, { color: colors.brand }]}>
                          {stepIndex + 1}
                        </Text>
                      </View>
                      <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
                    </View>
                  ))}
                </View>

                {/* Tip */}
                {location.tip && (
                  <View style={[styles.tipBox, { backgroundColor: colors.positiveBg }]}>
                    <Text style={[styles.tipText, { color: colors.positive }]}>💡 {location.tip}</Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* Still can't find it */}
          <View style={[styles.helpCard, { backgroundColor: colors.warningBg }]}>
            <Text style={[styles.helpTitle, { color: colors.text }]}>Still can't find it?</Text>
            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
              No problem! Just tap "I'll type in my car info instead" and enter your car's year,
              make, and model manually. We can still help you track your car's value.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Footer */}
        <View
          style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}
        >
          <Pressable
            onPress={() => {
              haptic.light();
              onClose();
            }}
            style={[styles.doneButton, { backgroundColor: colors.brand }]}
          >
            <Text style={styles.doneButtonText}>Got it, thanks!</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  infoCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  exampleBox: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  exampleLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  exampleVin: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  exampleNote: {
    fontSize: 11,
    marginTop: 6,
  },
  locationCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginLeft: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: 20,
  },
  recommendedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTitleSection: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  stepsList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 10,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  tipBox: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  tipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  helpCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  doneButton: {
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
});
