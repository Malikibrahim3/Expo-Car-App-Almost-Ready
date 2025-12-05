/**
 * Sign Up Screen - Linear Dark Theme
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
import Toast from 'react-native-toast-message';
import { SecurityBadge } from '@/src/components/TrustBadge';
import { validateEmail, validatePassword } from '@/src/utils/validation';

export default function SignUp() {
  const router = useRouter();
  const { signUp, signIn, signInWithApple, enterDemoMode } = useAuth() as any;
  const { colors } = useThemeMode();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [devLoading, setDevLoading] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  useEffect(() => {
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
    setError('');
    haptic.medium();
    
    const { data, error } = await signInWithApple();
    
    if (error) {
      if (error.message !== 'Sign in was cancelled') {
        setError(error.message || 'Apple Sign In failed. Please try again.');
      }
    } else {
      // New user from Apple - go to plan selection
      Toast.show({ type: 'success', text1: 'Account created!', text2: 'Choose your plan' });
      router.replace('/(auth)/select-plan');
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) { 
      setError('Please fill in all the fields'); 
      return; 
    }
    
    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || 'Invalid email');
      return;
    }
    
    if (password !== confirmPassword) { 
      setError('Your passwords don\'t match. Please check and try again.'); 
      return; 
    }
    
    // Validate password strength using shared validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error || 'Invalid password');
      return;
    }
    
    setLoading(true);
    setError('');
    const result = await signUp(emailValidation.sanitizedValue, password, emailValidation.sanitizedValue) as any;
    if (result.error) { 
      const message = result.error.message?.toLowerCase() || '';
      if (message.includes('already') || message.includes('exists') || message.includes('registered')) {
        setError('This email is already registered. Try signing in instead.');
      } else if (message.includes('invalid') && message.includes('email')) {
        setError('That email doesn\'t look right. Please check it.');
      } else {
        setError(result.error.message || 'Something went wrong. Please try again.');
      }
    } else if (result.needsEmailConfirmation) {
      // Email confirmation required - redirect to verify email screen
      router.replace({ pathname: '/(auth)/verify-email', params: { email } }); 
    } else { 
      Toast.show({ type: 'success', text1: 'Account created!', text2: 'Choose your plan' }); 
      router.replace('/(auth)/select-plan'); 
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
              <Text style={[styles.title, { color: colors.text }]} testID="signup-title">Create Account</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Start tracking your vehicles</Text>
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
                <Text style={[styles.passwordHint, { color: colors.textQuaternary }]}>
                  8+ characters, 1 capital letter, 1 special character
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>CONFIRM PASSWORD</Text>
                <View style={styles.passwordContainer}>
                  <TextInput style={[styles.input, styles.passwordInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="••••••••" placeholderTextColor={colors.textQuaternary} secureTextEntry={!showPassword} editable={!loading} />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                    {showPassword ? <EyeOff size={20} color={colors.textTertiary} /> : <Eye size={20} color={colors.textTertiary} />}
                  </Pressable>
                </View>
              </View>

              {error ? <Text style={[styles.error, { color: colors.negative }]}>{error}</Text> : null}

              <Pressable onPress={handleSignUp} disabled={loading} style={styles.buttonWrapper} testID="signup-button">
                <LinearGradient colors={colors.gradientBrand} style={styles.signUpButton}>
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.signUpText}>Create Account</Text>}
                </LinearGradient>
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
                  style={[styles.appleButtonCustom, { backgroundColor: '#000' }]}
                >
                  <Text style={styles.appleButtonText}> Sign up with Apple</Text>
                </Pressable>
              </View>
            </View>

            {/* Terms and Privacy */}
            <Text style={[styles.termsText, { color: colors.textQuaternary }]}>
              By creating an account, you agree to our{' '}
              <Text style={{ color: colors.brand }} onPress={() => router.push('/(app)/terms-of-service')}>
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text style={{ color: colors.brand }} onPress={() => router.push('/(app)/privacy-policy')}>
                Privacy Policy
              </Text>
            </Text>

            <View style={styles.footer}>
              <Text style={[styles.haveAccountText, { color: colors.textSecondary }]}>Already have an account?</Text>
              <Pressable onPress={() => router.push('/(auth)/login')}>
                <Text style={[styles.signInLink, { color: colors.brand }]}>Sign In</Text>
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
  passwordHint: { fontSize: 12, marginTop: 6, marginLeft: 4 },
  input: { backgroundColor: Colors.surface, borderRadius: Radius.sm, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 50 },
  eyeButton: { position: 'absolute', right: 14, top: 14 },
  error: { ...Typography.caption, color: Colors.negative, marginBottom: 16, textAlign: 'center' },
  buttonWrapper: { marginTop: 8, ...Shadows.brandGlow },
  signUpButton: { height: 52, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  signUpText: { ...Typography.headline, color: 'white', fontWeight: '600' },
  footer: { alignItems: 'center' },
  haveAccountText: { ...Typography.body, color: Colors.textSecondary, marginBottom: 4 },
  signInLink: { ...Typography.body, color: Colors.brand, fontWeight: '600' },
  devButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 24, borderTopWidth: 1 },
  devButtonText: { fontSize: 14 },
  termsText: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 24 },
  socialSection: { marginTop: 24 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  divider: { flex: 1, height: 1 },
  dividerText: { paddingHorizontal: 16, fontSize: 14 },
  appleButtonCustom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 8 },
  appleButtonText: { color: 'white', fontSize: 17, fontWeight: '600' },
});
