/**
 * Login Screen - Linear Dark Theme
 */
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff, ChevronLeft, Zap } from 'lucide-react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../../src/context/AuthContext';
import { Colors, Typography, Spacing, Radius, Shadows, haptic } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';
import { IOSText as Text } from '../../src/components/ios';
import { SecurityBadge } from '@/src/components/TrustBadge';
import Toast from 'react-native-toast-message';
import { validateEmail } from '@/src/utils/validation';

export default function Login() {
  const router = useRouter();
  const { signIn, signInWithApple, enterDemoMode } = useAuth() as any;
  const { colors } = useThemeMode();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [devLoading, setDevLoading] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  useEffect(() => {
    // Check if Apple Sign In is available (iOS 13+)
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
    }
  }, []);

  const handleDevSignIn = () => {
    setDevLoading(true);
    haptic.medium();
    enterDemoMode(); // Set demo mode flag
    Toast.show({ type: 'success', text1: 'Demo Mode', text2: 'Showing sample data' });
    setTimeout(() => {
      router.replace('/(tabs)/dashboard');
      setDevLoading(false);
    }, 300);
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    setError('');
    haptic.medium();
    
    const { data, error } = await signInWithApple();
    
    if (error) {
      if (error.message !== 'Sign in was cancelled') {
        setError(error.message || 'Apple Sign In failed. Please try again.');
      }
    } else {
      Toast.show({ type: 'success', text1: 'Welcome!', text2: 'Signed in with Apple' });
      router.replace('/(tabs)/dashboard');
    }
    setAppleLoading(false);
  };

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in both your email and password'); return; }
    
    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || 'Invalid email');
      return;
    }
    
    setLoading(true);
    setError('');
    const { error } = await signIn(emailValidation.sanitizedValue, password);
    if (error) { 
      console.log('❌ Login error:', error);
      console.log('Error message:', error.message);
      console.log('Error code:', error.code);
      
      // Show error in toast for debugging
      Toast.show({ 
        type: 'error', 
        text1: 'Login Failed', 
        text2: error.message,
        visibilityTime: 5000 
      });
      
      // Convert technical errors to friendly messages
      const message = error.message?.toLowerCase() || '';
      if (message.includes('invalid') || message.includes('credentials')) {
        setError('Wrong email or password. Please check and try again.');
      } else if (message.includes('network') || message.includes('fetch')) {
        setError('Can\'t connect. Please check your internet and try again.');
      } else if (message.includes('email not confirmed')) {
        setError('Please verify your email address before logging in.');
      } else {
        // Show actual error for debugging
        setError(error.message || 'Something went wrong. Please try again.');
      }
    } else { 
      router.replace('/(tabs)/dashboard'); 
    }
    setLoading(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color={colors.text} />
            </Pressable>

            {/* Logo */}
            <View style={styles.logoContainer}>
              <LinearGradient colors={colors.gradientBrand} style={styles.logoIcon}>
                <Text style={styles.logoIconText}>A</Text>
              </LinearGradient>
              <Text style={[styles.logoText, { color: colors.text }]}>AutoTrack</Text>
            </View>

            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Sign In</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Welcome back to AutoTrack</Text>
              <View style={styles.securityRow}>
                <SecurityBadge type="encrypted" />
              </View>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>EMAIL</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.textQuaternary} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!loading} />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>PASSWORD</Text>
                <View style={styles.passwordContainer}>
                  <TextInput style={[styles.input, styles.passwordInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor={colors.textQuaternary} secureTextEntry={!showPassword} editable={!loading} />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                    {showPassword ? <EyeOff size={20} color={colors.textTertiary} /> : <Eye size={20} color={colors.textTertiary} />}
                  </Pressable>
                </View>
              </View>

              {error ? <Text style={[styles.error, { color: colors.negative }]}>{error}</Text> : null}

              <Pressable onPress={handleLogin} disabled={loading} style={styles.buttonWrapper} testID="login-button">
                <LinearGradient colors={colors.gradientBrand} style={styles.signInButton}>
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.signInText}>Sign In</Text>}
                </LinearGradient>
              </Pressable>

              <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={[styles.forgotText, { color: colors.brand }]}>Forgot password?</Text>
              </Pressable>

              {/* Apple Sign In */}
              <View style={styles.socialSection}>
                <View style={styles.dividerRow}>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.textTertiary }]}>or</Text>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                </View>
                
                <Pressable 
                  onPress={handleAppleSignIn} 
                  disabled={appleLoading}
                  style={[styles.appleButtonCustom, { backgroundColor: '#000' }]}
                >
                  {appleLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.appleButtonText}> Sign in with Apple</Text>
                  )}
                </Pressable>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={[styles.noAccountText, { color: colors.textSecondary }]}>Don't have an account?</Text>
              <Pressable onPress={() => router.push('/(auth)/signup')}>
                <Text style={[styles.signUpLink, { color: colors.brand }]}>Sign Up</Text>
              </Pressable>
            </View>

            {/* Dev Sign In */}
            <Pressable 
              onPress={handleDevSignIn} 
              disabled={devLoading}
              style={[styles.devButton, { borderColor: colors.border }]}
            >
              {devLoading ? (
                <ActivityIndicator size="small" color={colors.brand} />
              ) : (
                <>
                  <Zap size={16} color={colors.textTertiary} />
                  <Text style={[styles.devButtonText, { color: colors.textTertiary }]}>Quick Demo (No Sign Up)</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -12 },
  logoContainer: { alignItems: 'center', marginTop: 20, marginBottom: 32 },
  logoIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoIconText: { color: 'white', fontSize: 28, fontWeight: '700' },
  logoText: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  header: { marginBottom: 32 },
  title: { ...Typography.largeTitle, color: Colors.text, fontSize: 32, marginBottom: 8 },
  subtitle: { ...Typography.body, color: Colors.textSecondary },
  securityRow: { marginTop: 12 },
  form: { marginBottom: 32 },
  inputContainer: { marginBottom: 20 },
  inputLabel: { ...Typography.caption, color: Colors.textTertiary, marginBottom: 8, marginLeft: 4, letterSpacing: 1 },
  input: { backgroundColor: Colors.surface, borderRadius: Radius.sm, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 50 },
  eyeButton: { position: 'absolute', right: 14, top: 14 },
  error: { ...Typography.caption, color: Colors.negative, marginBottom: 16, textAlign: 'center' },
  buttonWrapper: { marginTop: 8, ...Shadows.brandGlow },
  signInButton: { height: 52, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  signInText: { ...Typography.headline, color: 'white', fontWeight: '600' },
  forgotText: { ...Typography.body, color: Colors.brand, textAlign: 'center', marginTop: 16 },
  footer: { alignItems: 'center' },
  noAccountText: { ...Typography.body, color: Colors.textSecondary, marginBottom: 4 },
  signUpLink: { ...Typography.body, color: Colors.brand, fontWeight: '600' },
  devButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 24, borderTopWidth: 1 },
  devButtonText: { fontSize: 14 },
  socialSection: { marginTop: 24 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  divider: { flex: 1, height: 1 },
  dividerText: { paddingHorizontal: 16, fontSize: 14 },
  appleButtonCustom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 8 },
  appleButtonText: { color: 'white', fontSize: 17, fontWeight: '600' },
});
