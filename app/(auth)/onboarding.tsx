/**
 * Onboarding Flow
 * 
 * Simple 2-step flow: Name → Goals → Garage (to add first car)
 * 
 * Car adding is handled by AddVehicleModal which has the full flow:
 * - Vehicle details (year, make, model, trim, color, mileage, condition)
 * - Payment type (cash, loan, lease, balloon)
 * - Finance details (purchase price, down payment, monthly payment, etc.)
 * - Real-time valuation
 */
import React, { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, User, Car, Target, ArrowRight, DollarSign, Clock, TrendingUp } from 'lucide-react-native';
import { Colors, Radius, haptic } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { IOSText as Text } from '../../src/components/ios';
import Toast from 'react-native-toast-message';
import { supabase } from '@/src/lib/supabaseClient';

const GOALS = [
  { id: 'track', label: 'Track value only', Icon: TrendingUp },
  { id: 'sell_soon', label: 'Planning to sell soon', Icon: DollarSign },
  { id: 'best_time', label: 'Find best time to sell', Icon: Clock },
  { id: 'upgrade', label: 'See upgrade options', Icon: Car },
];

export default function Onboarding() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const { user } = useAuth() as any;
  
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Simple 2-step onboarding: Name → Goals
  // Car adding is done via the AddVehicleModal which has the full payment flow
  const totalSteps = 2;

  const saveProfile = async () => {
    if (!user?.id) {
      console.error('No user ID available');
      return;
    }
    
    if (!user?.email) {
      console.error('No user email available');
      Toast.show({ 
        type: 'error', 
        text1: 'Profile Error', 
        text2: 'User email not found. Please try logging in again.' 
      });
      return;
    }
    
    setSaving(true);
    try {
      console.log('Saving profile for user:', user.email, 'Name:', firstName, 'Goal:', selectedGoal);
      
      // First try to update existing profile (created by trigger on signup)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        // Profile exists, update it
        console.log('Updating existing profile...');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: firstName,
            first_name: firstName,
            goal: selectedGoal,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating profile:', updateError);
          Toast.show({ 
            type: 'error', 
            text1: 'Profile Error', 
            text2: 'Could not update your profile. Please try again.' 
          });
        } else {
          console.log('Profile updated successfully');
        }
      } else {
        // Profile doesn't exist, create it
        console.log('Creating new profile...');
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: firstName,
            first_name: firstName,
            goal: selectedGoal,
            onboarding_completed: true,
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
          Toast.show({ 
            type: 'error', 
            text1: 'Profile Error', 
            text2: 'Could not create your profile. Please try again.' 
          });
        } else {
          console.log('Profile created successfully');
        }
      }
    } catch (err) {
      console.error('Profile save error:', err);
      Toast.show({ 
        type: 'error', 
        text1: 'Profile Error', 
        text2: 'Could not save your profile. Please try again.' 
      });
    }
    setSaving(false);
  };

  const handleNext = async () => {
    haptic.light();
    
    if (step === 1) {
      // Name → Goals
      setStep(2);
    } else if (step === 2) {
      // Goals → Save profile and go to garage to add first car
      await saveProfile();
      Toast.show({ 
        type: 'success', 
        text1: 'Welcome!', 
        text2: 'Now add your first car to get started.',
        visibilityTime: 3000,
      });
      router.replace('/(tabs)/garage');
    }
  };

  const canContinue = () => {
    if (step === 1) return firstName.trim().length > 0;
    if (step === 2) return selectedGoal !== '';
    return false;
  };

  const renderStep = () => {
    // Step 1: Name
    if (step === 1) {
      return (
        <View style={styles.stepContent}>
          <View style={[styles.iconCircle, { backgroundColor: colors.brandSubtle }]}>
            <User size={32} color={colors.brand} />
          </View>
          <Text style={[styles.stepTitle, { color: colors.text }]}>What's your name?</Text>
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
            We'll use this to personalize your experience
          </Text>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={colors.textQuaternary}
              autoFocus
              autoCapitalize="words"
            />
          </View>
        </View>
      );
    }

    // Step 2: Goals
    if (step === 2) {
      return (
        <View style={styles.stepContent}>
          <View style={[styles.iconCircle, { backgroundColor: colors.brandSubtle }]}>
            <Target size={32} color={colors.brand} />
          </View>
          <Text style={[styles.stepTitle, { color: colors.text }]}>What's your goal?</Text>
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
            This helps us personalize your dashboard
          </Text>

          <View style={styles.goalsList}>
            {GOALS.map((goal) => {
              const GoalIcon = goal.Icon;
              const isSelected = selectedGoal === goal.id;
              return (
                <Pressable
                  key={goal.id}
                  onPress={() => { haptic.light(); setSelectedGoal(goal.id); }}
                  style={[
                    styles.goalOption,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    isSelected && { borderColor: colors.brand, backgroundColor: colors.brandSubtle }
                  ]}
                >
                  <View style={[styles.goalIconContainer, { backgroundColor: isSelected ? colors.brand : colors.backgroundTertiary }]}>
                    <GoalIcon size={20} color={isSelected ? '#fff' : colors.textSecondary} />
                  </View>
                  <Text style={[
                    styles.goalLabel,
                    { color: colors.text },
                    isSelected && { color: colors.brand, fontWeight: '600' }
                  ]}>
                    {goal.label}
                  </Text>
                  {isSelected && (
                    <ArrowRight size={20} color={colors.brand} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }
  };

  const currentStep = step;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    { backgroundColor: colors.border },
                    i < currentStep && { backgroundColor: colors.brand }
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.progressText, { color: colors.textTertiary }]}>
              Step {currentStep} of {totalSteps}
            </Text>
          </View>

          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {renderStep()}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable 
              onPress={handleNext} 
              disabled={!canContinue() || saving}
              style={[styles.nextButton, !canContinue() && styles.nextButtonDisabled]}
              testID="onboarding-next-button"
            >
              <LinearGradient 
                colors={canContinue() ? colors.gradientBrand : [colors.textQuaternary, colors.textQuaternary]} 
                style={styles.nextGradient}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={styles.nextText}>
                      {step === 2 ? 'Add Your First Car' : 'Continue'}
                    </Text>
                    <ChevronRight size={20} color="white" />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  progressContainer: { alignItems: 'center', paddingVertical: 16 },
  progressBar: { flexDirection: 'row', gap: 6, marginBottom: 8, paddingHorizontal: 24 },
  progressDot: { flex: 1, height: 3, borderRadius: 1.5 },
  progressText: { fontSize: 12 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20, alignItems: 'center' },
  stepContent: { alignItems: 'center', width: '100%' },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stepTitle: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  stepDesc: { fontSize: 15, textAlign: 'center', marginBottom: 28, paddingHorizontal: 16, lineHeight: 22 },
  inputGroup: { width: '100%', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  goalsList: { width: '100%', gap: 10, marginTop: 20 },
  goalOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, borderRadius: Radius.sm, gap: 12 },
  goalIconContainer: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  goalLabel: { flex: 1, fontSize: 15 },
  actions: { paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  nextButton: { width: '100%' },
  nextButtonDisabled: { opacity: 0.5 },
  nextGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: Radius.sm },
  nextText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
