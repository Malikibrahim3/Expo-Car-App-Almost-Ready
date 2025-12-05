/**
 * Forgot Password - Linear Dark Theme
 */
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, CheckCircle } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';
import { IOSText as Text } from '../../src/components/ios';
import Toast from 'react-native-toast-message';

export default function ForgotPassword() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const { colors } = useThemeMode();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const handleReset = async () => {
    if (!email) { setError('Please enter your email address'); return; }
    setLoading(true);
    setError('');
    const { error } = await resetPassword(email);
    if (error) { setError(error.message); Toast.show({ type: 'error', text1: 'Reset Failed', text2: error.message }); }
    else { setSuccess(true); Toast.show({ type: 'success', text1: 'Check Your Email', text2: 'Password reset link sent' }); }
    setLoading(false);
  };
  
  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.successContainer}>
            <View style={[styles.successIcon, { backgroundColor: colors.positiveBg }]}>
              <CheckCircle size={48} color={colors.positive} />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>Check Your Email</Text>
            <Text style={[styles.successDesc, { color: colors.textSecondary }]}>We sent a link to {email}. Check your inbox and click the link to reset your password.</Text>
            <Pressable onPress={() => router.push('/(auth)/login')} style={styles.buttonWrapper}>
              <LinearGradient colors={colors.gradientBrand} style={styles.button}>
                <Text style={styles.buttonText}>Back to Sign In</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Enter your email to receive a reset link</Text>
          </View>
          
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>EMAIL</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.textQuaternary} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!loading} />
            </View>
            
            {error ? <Text style={[styles.error, { color: colors.negative }]}>{error}</Text> : null}
            
            <Pressable onPress={handleReset} disabled={loading} style={styles.buttonWrapper}>
              <LinearGradient colors={colors.gradientBrand} style={styles.button}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Send Reset Link</Text>}
              </LinearGradient>
            </Pressable>
            
            <Pressable onPress={() => router.back()} style={styles.backLink}>
              <Text style={[styles.backLinkText, { color: colors.brand }]}>Back to Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, justifyContent: 'center' },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -12, position: 'absolute', top: 16, left: 24 },
  header: { marginBottom: 32 },
  title: { ...Typography.largeTitle, color: Colors.text, fontSize: 32, marginBottom: 8 },
  subtitle: { ...Typography.body, color: Colors.textSecondary },
  form: { gap: 16 },
  inputContainer: { marginBottom: 4 },
  inputLabel: { ...Typography.caption, color: Colors.textTertiary, marginBottom: 8, marginLeft: 4, letterSpacing: 1 },
  input: { backgroundColor: Colors.surface, borderRadius: Radius.sm, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  error: { ...Typography.caption, color: Colors.negative, textAlign: 'center' },
  buttonWrapper: { marginTop: 8, ...Shadows.brandGlow },
  button: { height: 52, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  buttonText: { ...Typography.headline, color: 'white', fontWeight: '600' },
  backLink: { alignItems: 'center', paddingVertical: 16 },
  backLinkText: { ...Typography.body, color: Colors.brand },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.positiveBg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  successTitle: { ...Typography.title1, color: Colors.text },
  successDesc: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
});
