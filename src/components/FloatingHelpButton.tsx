/**
 * FloatingHelpButton - iOS-style help button
 * Smaller, more subtle design following Apple HIG
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Linking } from 'react-native';
import { HelpCircle, X, MessageCircle, Book, Phone, ChevronRight } from 'lucide-react-native';
import { Spacing, Shadows, haptic } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';

interface HelpItem {
  icon: any;
  title: string;
  description: string;
  action: () => void;
}

interface FloatingHelpButtonProps {
  screenName?: string;
  contextHelp?: string;
}

export default function FloatingHelpButton({ 
  screenName = 'this screen',
  contextHelp,
}: FloatingHelpButtonProps) {
  const { colors } = useThemeMode();
  const [visible, setVisible] = useState(false);

  const helpItems: HelpItem[] = [
    {
      icon: Book,
      title: 'How to use ' + screenName,
      description: contextHelp || 'Learn how this screen works',
      action: () => setVisible(false),
    },
    {
      icon: MessageCircle,
      title: 'Chat with us',
      description: 'Get help from our support team',
      action: () => setVisible(false),
    },
    {
      icon: Phone,
      title: 'Call support',
      description: 'Talk to a real person',
      action: () => {
        Linking.openURL('tel:+18001234567');
        setVisible(false);
      },
    },
  ];

  return (
    <>
      {/* Floating Button - smaller, iOS style */}
      <Pressable
        onPress={() => {
          haptic.light();
          setVisible(true);
        }}
        style={({ pressed }) => [
          styles.floatingButton, 
          { backgroundColor: colors.surface },
          Shadows.md,
          pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }
        ]}
        accessibilityLabel="Get help"
        accessibilityRole="button"
      >
        <HelpCircle size={20} color={colors.brand} />
      </Pressable>

      {/* Help Modal - iOS sheet style */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable 
          style={styles.overlay} 
          onPress={() => setVisible(false)}
        >
          <View 
            style={[styles.sheet, { backgroundColor: colors.surface }]}
            onStartShouldSetResponder={() => true}
          >
            {/* iOS drag indicator */}
            <View style={[styles.handle, { backgroundColor: colors.textQuaternary }]} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Need Help?</Text>
              <Pressable 
                onPress={() => setVisible(false)} 
                style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}
              >
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Context Help */}
            {contextHelp && (
              <View style={[styles.contextCard, { backgroundColor: colors.backgroundTertiary }]}>
                <Text style={[styles.contextText, { color: colors.text }]}>
                  {contextHelp}
                </Text>
              </View>
            )}

            {/* Help Options - iOS list style */}
            <View style={[styles.options, { backgroundColor: colors.background }]}>
              {helpItems.map((item, index) => {
                const Icon = item.icon;
                const isLast = index === helpItems.length - 1;
                return (
                  <Pressable
                    key={index}
                    onPress={() => {
                      haptic.light();
                      item.action();
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                      pressed && { backgroundColor: colors.surfaceHover },
                    ]}
                  >
                    <Icon size={22} color={colors.brand} />
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionTitle, { color: colors.text }]}>
                        {item.title}
                      </Text>
                      <Text style={[styles.optionDescription, { color: colors.textTertiary }]}>
                        {item.description}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={colors.textQuaternary} />
                  </Pressable>
                );
              })}
            </View>

            {/* FAQ Link */}
            <Pressable 
              onPress={() => setVisible(false)}
              style={({ pressed }) => [styles.faqLink, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.faqText, { color: colors.brand }]}>
                View Frequently Asked Questions
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: Spacing.base,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.38,
  },
  closeButton: {
    padding: 4,
  },
  contextCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 10,
  },
  contextText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.24,
  },
  options: {
    marginHorizontal: Spacing.lg,
    borderRadius: 14,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.41,
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 2,
    letterSpacing: -0.08,
  },
  faqLink: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  faqText: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.41,
  },
});
