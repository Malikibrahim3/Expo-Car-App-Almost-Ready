/**
 * Email Verification Screen
 * Shown after signup when email confirmation is required
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Mail, RefreshCw, ArrowLeft, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/src/lib/supabaseClient';
import { useThemeMode } from '@/src/context/ThemeContext';
import { Typography, Spacing, Radius, haptic } from '@/src/constants/LinearDesign';
import Toast from 'react-native-toast-message';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const { colors } = useThemeMode();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const userEmail = Array.isArray(email) ? email[0] : email || 'your email';

  const handleResendEmail = async () => {
    if (resending || !email) return;
    
    setResending(true);
    haptic.light();

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      });

      if (error) throw error;

      setResent(true);
      Toast.show({
        type: 'success',
        text1: 'Email Sent',
        text2: 'Check your inbox for the verification link.',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to resend',
        text2: error.message || 'Please try again later.',
      });
    } finally {
      setResending(false);
    }
  };

  const handleBackToLogin = () => {
    haptic.light();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: colors.brandSubtle }]}>
            <Mail size={48} color={colors.brand} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>Check your email</Text>
          
          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            We've sent a verification link to:
          </Text>
          <Text style={[styles.email, { color: colors.text }]}>{userEmail}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Click the link in the email to verify your account and start tracking your vehicles.
          </Text>

          {/* Tips */}
          <View style={[styles.tipsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.tipsTitle, { color: colors.text }]}>Didn't receive it?</Text>
            <Text style={[styles.tipText, { color: colors.textTertiary }]}>• Check your spam or junk folder</Text>
            <Text style={[styles.tipText, { color: colors.textTertiary }]}>• Make sure you entered the correct email</Text>
            <Text style={[styles.tipText, { color: colors.textTertiary }]}>• Wait a few minutes and try again</Text>
          </View>

          {/* Resend Button */}
          <Pressable
            onPress={handleResendEmail}
            disabled={resending}
            style={({ pressed }) => [
              styles.resendButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.8 },
              resending && { opacity: 0.6 },
            ]}
          >
            {resent ? (
              <CheckCircle size={20} color={colors.positive} />
            ) : (
              <RefreshCw size={20} color={colors.brand} style={resending ? styles.spinning : undefined} />
            )}
            <Text style={[styles.resendButtonText, { color: resent ? colors.positive : colors.brand }]}>
              {resending ? 'Sending...' : resent ? 'Email Sent!' : 'Resend verification email'}
            </Text>
          </Pressable>

          {/* Back to Login */}
          <Pressable
            onPress={handleBackToLogin}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          >
            <ArrowLeft size={18} color={colors.textSecondary} />
            <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>
              Back to login
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.title1,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  tipsCard: {
    width: '100%',
    padding: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  tipsTitle: {
    ...Typography.subheadline,
    marginBottom: Spacing.sm,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 22,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderRadius: Radius.sm,
    marginBottom: Spacing.lg,
  },
  resendButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  spinning: {
    // Note: React Native doesn't support CSS animations
    // In production, use Animated API for rotation
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  backButtonText: {
    fontSize: 15,
  },
});
