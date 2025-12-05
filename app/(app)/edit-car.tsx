/**
 * Edit Car - Updated to use LinearDesign system
 * Now properly loads car data from context and saves changes
 * Includes input validation for security
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Check, Car, Gauge, DollarSign, Calendar, CreditCard } from 'lucide-react-native';
import { Typography, Spacing, Radius, Shadows, haptic } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';
import { useCarContext } from '@/src/context/CarContext';
import Toast from 'react-native-toast-message';
import { validateMileage, validateMoneyAmount, validateInterestRate } from '@/src/utils/validation';

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  prefix?: string;
  suffix?: string;
  colors: any;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  prefix,
  suffix,
  colors,
}) => (
  <View style={[styles.fieldContainer, { borderBottomColor: colors.border }]}>
    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
    <View style={styles.fieldInputContainer}>
      {prefix && <Text style={[styles.fieldPrefix, { color: colors.textTertiary }]}>{prefix}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.textQuaternary}
        style={[styles.fieldInput, { color: colors.text }]}
      />
      {suffix && <Text style={[styles.fieldSuffix, { color: colors.textTertiary }]}>{suffix}</Text>}
    </View>
  </View>
);

export default function EditCar() {
  const router = useRouter();
  const { vehicleId } = useLocalSearchParams();
  const { colors } = useThemeMode();
  const { cars, updateCar, loading } = useCarContext() as any;

  // Find the car from context
  const carId = Array.isArray(vehicleId) ? vehicleId[0] : vehicleId;
  const car = cars.find((c: any) => String(c.id) === String(carId));

  // Form state - initialized from car data
  const [mileage, setMileage] = useState('');
  const [annualMileage, setAnnualMileage] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [interestRate, setInterestRate] = useState('');

  // Initialize form values when car data loads
  useEffect(() => {
    if (car) {
      setMileage(car.mileage?.toString() || '0');
      setAnnualMileage(car.annualMileage?.toString() || '12000');
      setMonthlyPayment(car.monthlyPayment?.toString() || '0');
      setInterestRate(car.interestRate?.toString() || '0');
    }
  }, [car]);

  const handleCancel = useCallback(() => {
    haptic.light();
    router.back();
  }, [router]);

  const handleSave = useCallback(async () => {
    if (!car) return;
    
    haptic.medium();
    
    // Validate all inputs before saving
    const mileageValidation = validateMileage(mileage);
    if (!mileageValidation.isValid) {
      Toast.show({ type: 'error', text1: 'Invalid Mileage', text2: mileageValidation.error });
      return;
    }
    
    const annualMileageValidation = validateMileage(annualMileage);
    if (!annualMileageValidation.isValid) {
      Toast.show({ type: 'error', text1: 'Invalid Annual Mileage', text2: annualMileageValidation.error });
      return;
    }
    
    const paymentValidation = validateMoneyAmount(monthlyPayment, 'Monthly payment');
    if (!paymentValidation.isValid) {
      Toast.show({ type: 'error', text1: 'Invalid Payment', text2: paymentValidation.error });
      return;
    }
    
    const rateValidation = validateInterestRate(interestRate);
    if (!rateValidation.isValid) {
      Toast.show({ type: 'error', text1: 'Invalid Interest Rate', text2: rateValidation.error });
      return;
    }
    
    // Build updates object with validated values
    const updates: any = {};
    
    const newMileage = mileageValidation.sanitizedValue;
    const newAnnualMileage = annualMileageValidation.sanitizedValue;
    const newMonthlyPayment = paymentValidation.sanitizedValue;
    const newInterestRate = rateValidation.sanitizedValue;
    
    if (newMileage !== car.mileage) updates.mileage = newMileage;
    if (newAnnualMileage !== car.annualMileage) updates.annualMileage = newAnnualMileage;
    if (newMonthlyPayment !== car.monthlyPayment) updates.monthlyPayment = newMonthlyPayment;
    if (newInterestRate !== car.interestRate) updates.interestRate = newInterestRate;
    
    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      await updateCar(car.id, updates);
      haptic.success();
      Toast.show({
        type: 'success',
        text1: 'Changes Saved',
        text2: 'Your vehicle details have been updated.',
      });
    } else {
      Toast.show({
        type: 'info',
        text1: 'No Changes',
        text2: 'No changes were made.',
      });
    }
    
    router.back();
  }, [car, mileage, annualMileage, monthlyPayment, interestRate, updateCar, router]);

  // Loading state
  if (loading || !car) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {loading ? 'Loading...' : 'Vehicle Not Found'}
            </Text>
            <View style={{ width: 44 }} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const financeTypeLabel = car.ownershipType === 'loan' ? 'Loan' : 
    car.ownershipType === 'lease' ? 'Lease' : 
    car.ownershipType === 'balloon' ? 'Balloon' : 'Cash';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          >
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Vehicle</Text>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.8 }]}
          >
            <LinearGradient colors={colors.gradientBrand} style={styles.saveButtonGradient}>
              <Check size={18} color="white" strokeWidth={2.5} />
            </LinearGradient>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Vehicle Info Card */}
          <View style={[styles.vehicleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.vehicleIcon, { backgroundColor: colors.brandSubtle }]}>
              <Car size={24} color={colors.brand} />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={[styles.vehicleName, { color: colors.text }]}>
                {car.year} {car.make} {car.model}
              </Text>
              <Text style={[styles.vehicleType, { color: colors.textTertiary }]}>
                {financeTypeLabel} • Edit details below
              </Text>
            </View>
          </View>

          {/* Mileage Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Gauge size={16} color={colors.textTertiary} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Mileage</Text>
            </View>
            <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <FormField
                label="Current Mileage"
                value={mileage}
                onChangeText={setMileage}
                keyboardType="numeric"
                suffix="mi"
                colors={colors}
              />
              <FormField
                label="Annual Mileage"
                value={annualMileage}
                onChangeText={setAnnualMileage}
                keyboardType="numeric"
                suffix="mi/yr"
                colors={colors}
              />
            </View>
            <Text style={[styles.sectionHint, { color: colors.textQuaternary }]}>
              Keep this updated so we can give you accurate predictions
            </Text>
          </View>

          {/* Finance Section - Only show for financed vehicles */}
          {car.ownershipType !== 'cash' && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <CreditCard size={16} color={colors.textTertiary} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Finance</Text>
              </View>
              <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <FormField
                  label="Monthly Payment"
                  value={monthlyPayment}
                  onChangeText={setMonthlyPayment}
                  keyboardType="numeric"
                  prefix="$"
                  suffix="/mo"
                  colors={colors}
                />
                <FormField
                  label="Interest Rate"
                  value={interestRate}
                  onChangeText={setInterestRate}
                  keyboardType="decimal-pad"
                  suffix="%"
                  colors={colors}
                />
              </View>
              <Text style={[styles.sectionHint, { color: colors.textQuaternary }]}>
                These affect your equity and optimal sell time calculations
              </Text>
            </View>
          )}

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [styles.saveFullButton, pressed && { opacity: 0.9 }]}
          >
            <LinearGradient
              colors={colors.gradientPositive}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveFullGradient}
            >
              <Check size={20} color="white" />
              <Text style={styles.saveFullText}>Save Changes</Text>
            </LinearGradient>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerTitle: {
    ...Typography.headline,
  },
  saveButton: {},
  saveButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.base },

  // Vehicle Card
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfo: { flex: 1 },
  vehicleName: {
    ...Typography.headline,
    marginBottom: 2,
  },
  vehicleType: {
    fontSize: 13,
  },

  // Section
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHint: {
    fontSize: 12,
    marginTop: Spacing.sm,
    marginLeft: Spacing.xs,
    lineHeight: 18,
  },

  // Form Card
  formCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },

  // Field
  fieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
    borderBottomWidth: 1,
  },
  fieldLabel: {
    fontSize: 14,
  },
  fieldInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldPrefix: {
    fontSize: 14,
    marginRight: 2,
  },
  fieldInput: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    minWidth: 60,
    fontFamily: 'monospace',
  },
  fieldSuffix: {
    fontSize: 13,
    marginLeft: 4,
  },

  // Save Full Button
  saveFullButton: {
    marginTop: Spacing.lg,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadows.brandGlow,
  },
  saveFullGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: Spacing.sm,
  },
  saveFullText: {
    ...Typography.headline,
    color: 'white',
  },
});
