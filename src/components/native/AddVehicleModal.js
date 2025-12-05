/**
 * Add Vehicle Modal - US Market
 * 3-step wizard with VIN lookup, progressive disclosure
 * Collects all data needed for financial forecasting
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text as RNText, TextInput } from 'react-native';
import { IOSText as Text, IOSModal as Modal } from '../ios';
import { useCarContext } from '../../context/CarContext';
import { Colors, Spacing, Radius, haptic } from '../../constants/LinearDesign';
import { useThemeMode } from '../../context/ThemeContext';
import Toast from 'react-native-toast-message';
import { Car, CreditCard, Banknote, ChevronLeft, ChevronRight, Search, Calendar, Percent, DollarSign } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import VINLookup from '../VINLookup';
import CurrencyInput from '../CurrencyInput';
import DropdownPicker from '../DropdownPicker';
import * as vehicleData from '../../services/vehicleDataService';
import { getVehicleValuation } from '../../services/valuationService';

const STEPS = ['Your Car', 'How You Pay', 'Finance Details', 'Confirm'];

// Helper to calculate monthly payment from loan details
const calculateMonthlyPayment = (principal, apr, termMonths) => {
  if (!principal || !apr || !termMonths) return null;
  const monthlyRate = apr / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.round(payment);
};

// Helper to calculate months elapsed from start date
const calculateMonthsElapsed = (startDate) => {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return Math.max(0, months);
};

// Generate month options for date picker (last 7 years) - MEMOIZED outside component
const MONTH_OPTIONS = (() => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 84; i++) { // 7 years
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM format
    const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    options.push({ value, label, key: `month-${i}` }); // Add unique key
  }
  return options;
})();

// Generate term options
const TERM_OPTIONS = [
  { value: '24', label: '24 months (2 years)' },
  { value: '36', label: '36 months (3 years)' },
  { value: '48', label: '48 months (4 years)' },
  { value: '60', label: '60 months (5 years)' },
  { value: '72', label: '72 months (6 years)' },
  { value: '84', label: '84 months (7 years)' },
];

// Condition options with value adjustments
const CONDITION_OPTIONS = [
  { value: 'excellent', label: 'Excellent', desc: 'Like new, no issues', adjustment: 1.05 },
  { value: 'good', label: 'Good', desc: 'Minor wear, well maintained', adjustment: 1.0 },
  { value: 'fair', label: 'Fair', desc: 'Some cosmetic issues', adjustment: 0.92 },
  { value: 'poor', label: 'Poor', desc: 'Needs work', adjustment: 0.80 },
];

export default function AddVehicleModal({ visible, onDismiss }) {
  const { addCar } = useCarContext();
  const { colors } = useThemeMode();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [useManualEntry, setUseManualEntry] = useState(true);
  
  // Dropdown data (fetched from Supabase)
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [trims, setTrims] = useState([]);
  const [years, setYears] = useState([]);
  const [loadingData, setLoadingData] = useState({ makes: false, models: false, trims: false, years: false });
  
  // Step 1: Vehicle Info
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [trim, setTrim] = useState('');
  const [nickname, setNickname] = useState('');
  const [color, setColor] = useState('');
  const [mileage, setMileage] = useState('');
  const [annualMileage, setAnnualMileage] = useState('12000'); // Default 12k/year
  const [condition, setCondition] = useState('good'); // Default to "Good"
  
  // Step 2: Finance Type
  const [financeType, setFinanceType] = useState('');
  
  // Step 3: Finance Details
  const [purchasePrice, setPurchasePrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [loanAmount, setLoanAmount] = useState(''); // Auto-calculated but editable
  const [termMonths, setTermMonths] = useState('');
  const [apr, setApr] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState(''); // Auto-calculated but editable
  const [startDate, setStartDate] = useState('');
  const [balloonPayment, setBalloonPayment] = useState('');
  
  // Auto-calculated values
  const [autoCalculatedLoan, setAutoCalculatedLoan] = useState(false);
  const [autoCalculatedBalloon, setAutoCalculatedBalloon] = useState(false);
  
  // Market value for confirmation
  const [marketValue, setMarketValue] = useState(null);
  const [loadingValue, setLoadingValue] = useState(false);

  // Load makes on mount
  useEffect(() => {
    if (visible) {
      loadMakes();
      loadYears();
    }
  }, [visible]);

  // Load models when make changes
  useEffect(() => {
    if (make) {
      loadModels(make);
    } else {
      setModels([]);
    }
  }, [make]);

  // Load trims when model changes
  useEffect(() => {
    if (make && model) {
      loadTrims(make, model);
    } else {
      setTrims([]);
    }
  }, [make, model]);

  // Track if user manually edited loan amount
  const [userEditedLoan, setUserEditedLoan] = useState(false);
  
  // Auto-calculate loan amount when purchase price or deposit changes
  useEffect(() => {
    // Skip for cash purchases
    if (financeType === 'cash') return;
    
    // Don't override if user manually edited
    if (userEditedLoan) return;
    
    // Need purchase price to calculate
    const price = parseFloat(purchasePrice) || 0;
    if (price <= 0) return;
    
    const dep = parseFloat(deposit) || 0;
    const calculated = Math.max(0, price - dep);
    
    setLoanAmount(calculated.toString());
    setAutoCalculatedLoan(true);
  }, [purchasePrice, deposit, financeType, userEditedLoan]);

  // Track if user manually edited balloon
  const [userEditedBalloon, setUserEditedBalloon] = useState(false);
  
  // Auto-calculate balloon payment for balloon loans/leases
  useEffect(() => {
    // Only for balloon/lease types
    if (financeType !== 'balloon' && financeType !== 'lease') return;
    
    // Don't override if user manually edited
    if (userEditedBalloon) return;
    
    // Need these values to calculate
    const principal = parseFloat(loanAmount) || 0;
    const payment = parseFloat(monthlyPayment) || 0;
    const term = parseInt(termMonths) || 0;
    
    // Need all three core values
    if (principal <= 0 || payment <= 0 || term <= 0) return;
    
    const rate = parseFloat(apr) || 0;
    const monthlyRate = rate / 100 / 12;
    
    let calculatedBalloon;
    if (monthlyRate === 0 || rate === 0) {
      // No interest: balloon = principal - (payment * term)
      calculatedBalloon = principal - (payment * term);
    } else {
      // With interest: Future value of principal minus future value of payments
      const fvPrincipal = principal * Math.pow(1 + monthlyRate, term);
      const fvPayments = payment * ((Math.pow(1 + monthlyRate, term) - 1) / monthlyRate);
      calculatedBalloon = fvPrincipal - fvPayments;
    }
    
    const finalBalloon = Math.max(0, Math.round(calculatedBalloon));
    setBalloonPayment(finalBalloon.toString());
    setAutoCalculatedBalloon(true);
  }, [loanAmount, monthlyPayment, apr, termMonths, financeType, userEditedBalloon]);

  const loadMakes = async () => {
    setLoadingData(prev => ({ ...prev, makes: true }));
    const data = await vehicleData.getMakes();
    setMakes(data);
    setLoadingData(prev => ({ ...prev, makes: false }));
  };

  const loadModels = async (selectedMake) => {
    setLoadingData(prev => ({ ...prev, models: true }));
    const data = await vehicleData.getModels(selectedMake);
    setModels(data);
    setLoadingData(prev => ({ ...prev, models: false }));
  };

  const loadTrims = async (selectedMake, selectedModel) => {
    setLoadingData(prev => ({ ...prev, trims: true }));
    const data = await vehicleData.getTrims(selectedMake, selectedModel);
    setTrims(data);
    setLoadingData(prev => ({ ...prev, trims: false }));
  };

  const loadYears = async () => {
    setLoadingData(prev => ({ ...prev, years: true }));
    const data = await vehicleData.getAllYears();
    setYears(data);
    setLoadingData(prev => ({ ...prev, years: false }));
  };
  
  const resetForm = () => {
    setStep(0);
    setUseManualEntry(true);
    setYear(''); setMake(''); setModel(''); setTrim(''); setNickname(''); setColor(''); setMileage(''); setAnnualMileage('12000'); setCondition('good');
    setFinanceType('');
    setPurchasePrice(''); setDeposit(''); setLoanAmount(''); setTermMonths(''); setApr('');
    setMonthlyPayment(''); setStartDate(''); setBalloonPayment('');
    setAutoCalculatedLoan(false); setAutoCalculatedBalloon(false); setUserEditedBalloon(false); setUserEditedLoan(false);
    setMarketValue(null); setLoadingValue(false);
  };

  const handleVehicleFound = (vehicleData) => {
    haptic.success();
    setYear(vehicleData.year.toString());
    setMake(vehicleData.make);
    setModel(vehicleData.model);
    setTrim(vehicleData.trim || '');
    setStep(0.5);
  };

  // Validation errors state
  const [validationError, setValidationError] = useState('');

  // Update validation error message when relevant fields change
  useEffect(() => {
    if (!startDate || !year || financeType === 'cash') {
      setValidationError('');
      return;
    }
    
    const startYear = parseInt(startDate.split('-')[0]);
    const startMonth = parseInt(startDate.split('-')[1]);
    const carYear = parseInt(year);
    const earliestAllowedYear = carYear - 1;
    const earliestAllowedMonth = 7;
    
    if (startYear < earliestAllowedYear || (startYear === earliestAllowedYear && startMonth < earliestAllowedMonth)) {
      const earliestDate = new Date(earliestAllowedYear, earliestAllowedMonth - 1, 1)
        .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      setValidationError(`A ${carYear} vehicle can't have financing starting before ${earliestDate}`);
    } else {
      setValidationError('');
    }
  }, [startDate, year, financeType]);

  // Memoize canProceed to prevent multiple calls during render
  const canProceed = React.useMemo(() => {
    if (step === 0) {
      if (!useManualEntry) return false;
      return !!(year && make && model && mileage); // Mileage now required
    }
    if (step === 0.5) return true;
    if (step === 1) return !!financeType;
    if (step === 2) {
      if (financeType === 'cash') return !!purchasePrice;
      // For financed vehicles, need core details and valid date
      if (!purchasePrice || !monthlyPayment || !termMonths || !startDate) return false;
      
      // Inline the date validation check (pure logic, no state updates)
      if (!startDate || !year || financeType === 'cash') return true;
      const startYear = parseInt(startDate.split('-')[0]);
      const startMonth = parseInt(startDate.split('-')[1]);
      const carYear = parseInt(year);
      const earliestAllowedYear = carYear - 1;
      const earliestAllowedMonth = 7;
      return !(startYear < earliestAllowedYear || (startYear === earliestAllowedYear && startMonth < earliestAllowedMonth));
    }
    if (step === 3) return true; // Confirmation step
    return false;
  }, [step, useManualEntry, year, make, model, mileage, financeType, purchasePrice, monthlyPayment, termMonths, startDate]);

  const handleNext = async () => {
    if (step === 0 && useManualEntry) setStep(1);
    else if (step === 0.5) setStep(1);
    else if (step === 1) setStep(2);
    else if (step === 2) {
      // Go to confirmation step and fetch market value
      setStep(3);
      setLoadingValue(true);
      try {
        const valuation = await getVehicleValuation({
          make,
          model,
          year: parseInt(year),
          trim,
          mileage: parseInt(mileage) || 50000,
          condition,
          color,
        });
        setMarketValue(valuation);
      } catch (error) {
        console.error('Error fetching valuation:', error);
      }
      setLoadingValue(false);
    }
    else if (step === 3) handleSubmit();
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    const monthsElapsed = calculateMonthsElapsed(startDate);
    
    const newCar = {
      id: Date.now().toString(),
      year: parseInt(year),
      make,
      model,
      trim: trim || '',
      nickname: nickname || null,
      color: color || null,
      mileage: parseInt(mileage) || 0,
      annualMileage: parseInt(annualMileage) || 12000,
      condition: condition,
      conditionAdjustment: CONDITION_OPTIONS.find(c => c.value === condition)?.adjustment || 1.0,
      
      // Purchase info
      purchasePrice: parseFloat(purchasePrice) || 0,
      
      // Finance details
      ownershipType: financeType,
      deposit: parseFloat(deposit) || 0,
      loanAmount: parseFloat(loanAmount) || 0,
      termMonths: parseInt(termMonths) || 0,
      interestRate: parseFloat(apr) || 0,
      monthlyPayment: parseFloat(monthlyPayment) || 0,
      startDate: startDate ? new Date(startDate + '-01').toISOString() : new Date().toISOString(),
      monthsElapsed,
      balloonPayment: (financeType === 'lease' || financeType === 'balloon') ? parseFloat(balloonPayment) || 0 : 0,
      
      // Market value from confirmation step
      estimatedValue: marketValue?.estimatedValue || null,
      tradeInValue: marketValue?.tradeInValue || null,
      privatePartyValue: marketValue?.privatePartyValue || null,
      valuationConfidence: marketValue?.confidence || null,
      lastValuationDate: marketValue ? new Date().toISOString() : null,
      
      addedDate: new Date().toISOString(),
    };
    
    await addCar(newCar);
    haptic.success();
    Toast.show({ 
      type: 'success', 
      text1: '🎉 Your car is added!', 
      text2: `We'll track the value of your ${year} ${make} ${model} for you.`,
      visibilityTime: 4000,
    });
    resetForm();
    setLoading(false);
    onDismiss();
  };

  const renderStep = () => {
    // Step 0.5: Nickname (after VIN lookup)
    if (step === 0.5) {
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>Almost done!</Text>
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
            Give your {year} {make} {model} a nickname to tell it apart from other cars.
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>NICKNAME (optional)</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border, color: colors.text }]} 
              value={nickname} 
              onChangeText={setNickname} 
              placeholder="My Daily Driver, Wife's Car, etc." 
              placeholderTextColor={colors.textQuaternary} 
              autoFocus
            />
          </View>

          <Pressable onPress={() => setStep(1)} style={styles.skipButton}>
            <RNText style={[styles.skipButtonText, { color: colors.textTertiary }]}>Skip for now</RNText>
          </Pressable>
        </View>
      );
    }

    // Step 0: Vehicle Selection
    if (step === 0) {
      if (!useManualEntry) {
        return (
          <View style={styles.stepContent}>
            <VINLookup 
              onVehicleFound={handleVehicleFound}
              onManualEntry={() => setUseManualEntry(true)}
            />
          </View>
        );
      }
      
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>Tell us about your car</Text>
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Select your vehicle details below.</Text>
          
          <DropdownPicker
            label="YEAR"
            value={year}
            options={years}
            onSelect={setYear}
            placeholder={loadingData.years ? "Loading..." : "Select year..."}
            disabled={loadingData.years}
          />
          
          <DropdownPicker
            label="MAKE"
            value={make}
            options={makes}
            onSelect={(val) => { setMake(val); setModel(''); setTrim(''); }}
            placeholder={loadingData.makes ? "Loading..." : "Select make..."}
            disabled={loadingData.makes}
          />
          
          <DropdownPicker
            label="MODEL"
            value={model}
            options={models}
            onSelect={(val) => { setModel(val); setTrim(''); }}
            placeholder={loadingData.models ? "Loading..." : (make ? "Select model..." : "Select make first")}
            disabled={!make || loadingData.models}
          />
          
          <DropdownPicker
            label="TRIM LEVEL (optional)"
            value={trim}
            options={trims}
            onSelect={setTrim}
            placeholder={loadingData.trims ? "Loading..." : (model ? "Select trim..." : "Select model first")}
            disabled={!model || loadingData.trims}
          />
          
          <DropdownPicker
            label="EXTERIOR COLOR (optional)"
            value={color}
            options={vehicleData.CAR_COLORS}
            onSelect={setColor}
            placeholder="Select color..."
            hint="Color can affect resale value"
          />
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>CURRENT MILEAGE</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border, color: colors.text }]} 
              value={mileage} 
              onChangeText={setMileage} 
              placeholder="45,000" 
              placeholderTextColor={colors.textQuaternary}
              keyboardType="number-pad"
            />
            <RNText style={[styles.inputHint, { color: colors.textTertiary }]}>
              Required for accurate valuation
            </RNText>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>ESTIMATED YEARLY MILEAGE</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border, color: colors.text }]} 
              value={annualMileage} 
              onChangeText={setAnnualMileage} 
              placeholder="12,000" 
              placeholderTextColor={colors.textQuaternary}
              keyboardType="number-pad"
            />
            <RNText style={[styles.inputHint, { color: colors.textTertiary }]}>
              How many miles you drive per year (affects future value predictions)
            </RNText>
          </View>
          
          {/* Condition Selector */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>VEHICLE CONDITION</Text>
            <View style={styles.conditionOptions}>
              {CONDITION_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => { haptic.light(); setCondition(opt.value); }}
                  style={[
                    styles.conditionOption,
                    { backgroundColor: colors.backgroundTertiary, borderColor: colors.border },
                    condition === opt.value && { borderColor: colors.brand, backgroundColor: colors.brandSubtle }
                  ]}
                >
                  <RNText style={[
                    styles.conditionLabel,
                    { color: colors.text },
                    condition === opt.value && { color: colors.brand, fontWeight: '600' }
                  ]}>
                    {opt.label}
                  </RNText>
                  <RNText style={[styles.conditionDesc, { color: colors.textQuaternary }]}>
                    {opt.desc}
                  </RNText>
                </Pressable>
              ))}
            </View>
            <RNText style={[styles.inputHint, { color: colors.textTertiary }]}>
              Affects your car's estimated value
            </RNText>
          </View>
          
          <Pressable onPress={() => setUseManualEntry(false)} style={styles.switchButton}>
            <Search size={14} color={colors.brand} />
            <RNText style={[styles.switchButtonText, { color: colors.brand }]}>Try VIN lookup instead</RNText>
          </Pressable>
        </View>
      );
    }

    // Step 1: Finance Type
    if (step === 1) {
      const financeOptions = [
        { value: 'loan', label: 'Standard Loan', desc: 'Fixed monthly payments until paid off', icon: Banknote },
        { value: 'balloon', label: 'Balloon Loan', desc: 'Lower payments + large final payment', icon: Banknote },
        { value: 'lease', label: 'Lease', desc: 'Monthly payments + buyout option at end', icon: CreditCard },
        { value: 'cash', label: 'Paid Cash', desc: 'You own it outright', icon: Car },
      ];
      
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>How are you paying for it?</Text>
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>This helps us calculate your equity position.</Text>
          <View style={styles.financeOptionsGrid}>
            {financeOptions.map((opt) => (
              <Pressable 
                key={opt.value} 
                onPress={() => setFinanceType(opt.value)}
                style={[
                  styles.financeOptionGrid, 
                  { backgroundColor: colors.backgroundTertiary, borderColor: colors.border }, 
                  financeType === opt.value && { borderColor: colors.brand, backgroundColor: colors.brandSubtle }
                ]}
              >
                <opt.icon size={20} color={financeType === opt.value ? colors.brand : colors.textTertiary} />
                <RNText style={[styles.financeLabel, { color: colors.textSecondary }, financeType === opt.value && { color: colors.brand }]}>
                  {opt.label}
                </RNText>
                <RNText style={[styles.financeDescSmall, { color: colors.textQuaternary }]}>{opt.desc}</RNText>
              </Pressable>
            ))}
          </View>
        </View>
      );
    }

    // Step 2: Finance Details
    if (step === 2) {
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            {financeType === 'cash' ? 'Purchase details' : 'Finance details'}
          </Text>
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
            {financeType === 'cash' 
              ? 'Tell us what you paid for the car.'
              : 'We need these details to forecast your equity over time.'}
          </Text>
          
          {/* Purchase Price - Always shown */}
          <CurrencyInput
            label="PURCHASE PRICE"
            value={purchasePrice}
            onChangeText={setPurchasePrice}
            placeholder="35,000"
            hint="The total price you paid (or MSRP for lease)"
            suggestions={[25000, 35000, 45000, 55000]}
          />
          
          {financeType !== 'cash' && (
            <>
              {/* Down Payment */}
              <CurrencyInput
                label="DOWN PAYMENT / DEPOSIT"
                value={deposit}
                onChangeText={(val) => { setDeposit(val); setAutoCalculatedLoan(true); }}
                placeholder="5,000"
                hint="How much you put down upfront"
                suggestions={[2000, 5000, 10000, 15000]}
              />
              
              {/* Loan Amount - Auto-calculated */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>AMOUNT FINANCED</Text>
                  {autoCalculatedLoan && (
                    <RNText style={[styles.autoLabel, { color: colors.brand }]}>Auto-calculated</RNText>
                  )}
                </View>
                <TextInput 
                  style={[styles.input, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border, color: colors.text }]} 
                  value={loanAmount ? `$${parseInt(loanAmount).toLocaleString()}` : ''} 
                  onChangeText={(val) => { setLoanAmount(val.replace(/[^0-9]/g, '')); setAutoCalculatedLoan(false); setUserEditedLoan(true); }}
                  placeholder="$30,000" 
                  placeholderTextColor={colors.textQuaternary}
                  keyboardType="number-pad"
                />
                <RNText style={[styles.inputHint, { color: colors.textTertiary }]}>
                  Purchase price minus down payment
                </RNText>
              </View>
              
              {/* When did it start */}
              <DropdownPicker
                label="WHEN DID YOUR LOAN/LEASE START?"
                value={startDate}
                options={MONTH_OPTIONS}
                onSelect={setStartDate}
                placeholder="Select month..."
                hint="This helps us calculate how much you've paid off"
              />
              
              {/* Validation Error Display */}
              {validationError && (
                <View style={[styles.errorContainer, { backgroundColor: colors.negativeSubtle, borderColor: colors.negative }]}>
                  <RNText style={[styles.errorText, { color: colors.negative }]}>
                    ⚠️ {validationError}
                  </RNText>
                </View>
              )}
              
              {/* Loan Term */}
              <DropdownPicker
                label="LOAN/LEASE TERM"
                value={termMonths}
                options={TERM_OPTIONS}
                onSelect={setTermMonths}
                placeholder="Select term length..."
              />
              
              {/* APR */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>INTEREST RATE (APR %)</Text>
                <View style={styles.inputWithIcon}>
                  <Percent size={16} color={colors.textTertiary} style={styles.inputIcon} />
                  <TextInput 
                    style={[styles.input, styles.inputWithIconPadding, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border, color: colors.text }]} 
                    value={apr} 
                    onChangeText={setApr}
                    placeholder="6.9" 
                    placeholderTextColor={colors.textQuaternary}
                    keyboardType="decimal-pad"
                  />
                </View>
                <RNText style={[styles.inputHint, { color: colors.textTertiary }]}>
                  Check your loan statement or contract
                </RNText>
              </View>
              
              {/* Monthly Payment */}
              <CurrencyInput
                label="MONTHLY PAYMENT"
                value={monthlyPayment}
                onChangeText={setMonthlyPayment}
                placeholder="450"
                hint="Your actual monthly payment amount"
                suggestions={[350, 450, 550, 650]}
              />
              
              {/* Balloon Payment - For balloon loans and leases */}
              {(financeType === 'lease' || financeType === 'balloon') && (
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>
                      {financeType === 'lease' ? "BUYOUT / RESIDUAL VALUE" : "BALLOON PAYMENT"}
                    </Text>
                    {autoCalculatedBalloon && balloonPayment && (
                      <RNText style={[styles.autoLabel, { color: colors.brand }]}>Auto-calculated</RNText>
                    )}
                  </View>
                  <CurrencyInput
                    value={balloonPayment}
                    onChangeText={(val) => { setBalloonPayment(val); setAutoCalculatedBalloon(false); setUserEditedBalloon(true); }}
                    placeholder="18,000"
                    hint={autoCalculatedBalloon 
                      ? "Calculated from your loan details (verify with your contract)"
                      : financeType === 'lease' 
                        ? "The amount to buy the car at lease end"
                        : "The large final payment at end of loan"}
                    suggestions={[10000, 15000, 20000, 25000]}
                  />
                </View>
              )}
            </>
          )}
        </View>
      );
    }

    // Step 3: Confirmation
    if (step === 3) {
      const financeTypeLabels = {
        loan: 'Standard Loan',
        balloon: 'Balloon Loan',
        lease: 'Lease',
        cash: 'Paid Cash',
      };
      
      const formatCurrency = (val) => {
        const num = parseFloat(val) || 0;
        return `$${num.toLocaleString()}`;
      };
      
      const startDateLabel = startDate ? 
        new Date(startDate + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 
        'Not set';
      
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>Confirm your details</Text>
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
            Review everything before adding your vehicle.
          </Text>
          
          {/* Market Value Card */}
          <View style={[styles.valueCard, { backgroundColor: colors.brandSubtle, borderColor: colors.brand }]}>
            <RNText style={[styles.valueCardLabel, { color: colors.brand }]}>ESTIMATED MARKET VALUE</RNText>
            {loadingValue ? (
              <RNText style={[styles.valueCardAmount, { color: colors.brand }]}>Calculating...</RNText>
            ) : marketValue ? (
              <>
                <RNText style={[styles.valueCardAmount, { color: colors.brand }]}>
                  {formatCurrency(marketValue.estimatedValue)}
                </RNText>
                <RNText style={[styles.valueCardRange, { color: colors.textSecondary }]}>
                  Range: {marketValue.displayRange}
                </RNText>
              </>
            ) : (
              <RNText style={[styles.valueCardAmount, { color: colors.textSecondary }]}>Unable to estimate</RNText>
            )}
          </View>
          
          {/* Vehicle Details */}
          <View style={[styles.confirmSection, { borderColor: colors.border }]}>
            <RNText style={[styles.confirmSectionTitle, { color: colors.textTertiary }]}>VEHICLE</RNText>
            <RNText style={[styles.confirmValue, { color: colors.text }]}>
              {year} {make} {model} {trim}
            </RNText>
            {nickname && (
              <RNText style={[styles.confirmSubValue, { color: colors.textSecondary }]}>"{nickname}"</RNText>
            )}
            <View style={styles.confirmRow}>
              <RNText style={[styles.confirmLabel, { color: colors.textTertiary }]}>Mileage:</RNText>
              <RNText style={[styles.confirmData, { color: colors.text }]}>{parseInt(mileage).toLocaleString()} miles</RNText>
            </View>
            <View style={styles.confirmRow}>
              <RNText style={[styles.confirmLabel, { color: colors.textTertiary }]}>Condition:</RNText>
              <RNText style={[styles.confirmData, { color: colors.text }]}>{CONDITION_OPTIONS.find(c => c.value === condition)?.label || 'Good'}</RNText>
            </View>
            {color && (
              <View style={styles.confirmRow}>
                <RNText style={[styles.confirmLabel, { color: colors.textTertiary }]}>Color:</RNText>
                <RNText style={[styles.confirmData, { color: colors.text }]}>{color}</RNText>
              </View>
            )}
          </View>
          
          {/* Finance Details */}
          <View style={[styles.confirmSection, { borderColor: colors.border }]}>
            <RNText style={[styles.confirmSectionTitle, { color: colors.textTertiary }]}>FINANCE</RNText>
            <View style={styles.confirmRow}>
              <RNText style={[styles.confirmLabel, { color: colors.textTertiary }]}>Type:</RNText>
              <RNText style={[styles.confirmData, { color: colors.text }]}>{financeTypeLabels[financeType]}</RNText>
            </View>
            <View style={styles.confirmRow}>
              <RNText style={[styles.confirmLabel, { color: colors.textTertiary }]}>Purchase Price:</RNText>
              <RNText style={[styles.confirmData, { color: colors.text }]}>{formatCurrency(purchasePrice)}</RNText>
            </View>
            {financeType !== 'cash' && (
              <>
                <View style={styles.confirmRow}>
                  <RNText style={[styles.confirmLabel, { color: colors.textTertiary }]}>Down Payment:</RNText>
                  <RNText style={[styles.confirmData, { color: colors.text }]}>{formatCurrency(deposit)}</RNText>
                </View>
                <View style={styles.confirmRow}>
                  <RNText style={[styles.confirmLabel, { color: colors.textTertiary }]}>Amount Financed:</RNText>
                  <RNText style={[styles.confirmData, { color: colors.text }]}>{formatCurrency(loanAmount)}</RNText>
                </View>
                <View style={styles.confirmRow}>
                  <RNText style={[styles.confirmLabel, { color: colors.textTertiary }]}>Monthly Payment:</RNText>
                  <RNText style={[styles.confirmData, { color: colors.text }]}>{formatCurrency(monthlyPayment)}</RNText>
                </View>
                <View style={styles.confirmRow}>
                  <RNText style={[styles.confirmLabel, { color: colors.textTertiary }]}>Term:</RNText>
                  <RNText style={[styles.confirmData, { color: colors.text }]}>{termMonths} months</RNText>
                </View>
                <View style={styles.confirmRow}>
                  <RNText style={[styles.confirmLabel, { color: colors.textTertiary }]}>APR:</RNText>
                  <RNText style={[styles.confirmData, { color: colors.text }]}>{apr || '0'}%</RNText>
                </View>
                <View style={styles.confirmRow}>
                  <RNText style={[styles.confirmLabel, { color: colors.textTertiary }]}>Started:</RNText>
                  <RNText style={[styles.confirmData, { color: colors.text }]}>{startDateLabel}</RNText>
                </View>
                {(financeType === 'balloon' || financeType === 'lease') && balloonPayment && (
                  <View style={styles.confirmRow}>
                    <RNText style={[styles.confirmLabel, { color: colors.textTertiary }]}>
                      {financeType === 'lease' ? 'Buyout:' : 'Balloon:'}
                    </RNText>
                    <RNText style={[styles.confirmData, { color: colors.text }]}>{formatCurrency(balloonPayment)}</RNText>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      );
    }
  };

  return (
    <Modal visible={visible} onDismiss={() => { resetForm(); onDismiss(); }}>
      <View style={styles.container}>
        {/* Progress */}
        <View style={styles.progress}>
          {STEPS.map((s, i) => (
            <View key={i} style={styles.progressItem}>
              <View style={[styles.progressDot, { backgroundColor: colors.border }, i <= step && { backgroundColor: colors.brand }]} />
              <RNText style={[styles.progressLabel, { color: colors.textQuaternary }, i <= step && { color: colors.brand, fontWeight: '600' }]}>{s}</RNText>
            </View>
          ))}
        </View>

        {/* Scroll hint for steps with lots of content */}
        {(step === 0 || step === 2 || step === 3) && (
          <View style={[styles.scrollIndicator, { backgroundColor: colors.brandSubtle }]}>
            <RNText style={[styles.scrollIndicatorText, { color: colors.brand }]}>↓ Scroll for more fields below</RNText>
          </View>
        )}

        <ScrollView 
          showsVerticalScrollIndicator={true} 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          {(step > 0 || step === 0.5) && (
            <Pressable onPress={() => {
              if (step === 0.5) setStep(0);
              else if (step === 1) setStep(year && make && model && !useManualEntry ? 0.5 : 0);
              else if (step === 2) setStep(1);
              else if (step === 3) setStep(2);
            }} style={styles.backButton}>
              <ChevronLeft size={20} color={colors.textSecondary} />
              <RNText style={[styles.backButtonText, { color: colors.textSecondary }]}>Back</RNText>
            </Pressable>
          )}
          <Pressable onPress={handleNext} disabled={!canProceed || loading} style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}>
            <LinearGradient colors={canProceed ? colors.gradientBrand : [colors.textQuaternary, colors.textQuaternary]} style={styles.nextButtonGradient}>
              <RNText style={styles.nextButtonText}>{step === 3 ? 'Add Vehicle' : 'Continue'}</RNText>
              {step < 2 && <ChevronRight size={18} color="white" />}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {},
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 16 },
  progressItem: { alignItems: 'center' },
  progressDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  progressLabel: { fontSize: 11 },
  scrollView: { maxHeight: 480 },
  scrollContent: { paddingBottom: 40 },
  scrollIndicator: { alignItems: 'center', paddingVertical: 10, marginBottom: 8, borderRadius: 8, marginHorizontal: 20 },
  scrollIndicatorText: { fontSize: 13, fontWeight: '600' },
  errorContainer: { padding: 12, borderRadius: 8, borderWidth: 1, marginTop: -8, marginBottom: 16 },
  errorText: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  stepContent: {},
  stepTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  stepDesc: { fontSize: 14, marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  inputLabel: { fontSize: 11, letterSpacing: 1 },
  autoLabel: { fontSize: 10, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  inputWithIcon: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 14, top: 14, zIndex: 1 },
  inputWithIconPadding: { paddingLeft: 38 },
  inputHint: { fontSize: 12, marginTop: 6 },
  financeOptions: { flexDirection: 'row', gap: 12 },
  financeOptionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  financeOption: { flex: 1, alignItems: 'center', padding: 16, borderWidth: 1, borderRadius: Radius.sm },
  financeOptionGrid: { width: '48%', alignItems: 'center', padding: 14, borderWidth: 1, borderRadius: Radius.sm },
  financeLabel: { fontSize: 13, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  financeDesc: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  financeDescSmall: { fontSize: 10, marginTop: 4, textAlign: 'center', lineHeight: 14 },
  conditionOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  conditionOption: { width: '48%', padding: 12, borderWidth: 1, borderRadius: Radius.sm },
  conditionLabel: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  conditionDesc: { fontSize: 11 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  backButtonText: { fontSize: 15 },
  nextButton: { flex: 1 },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: Radius.sm },
  nextButtonText: { fontSize: 15, fontWeight: '600', color: 'white' },
  switchButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 8 },
  switchButtonText: { fontSize: 14 },
  skipButton: { alignItems: 'center', paddingVertical: 12, marginTop: 16 },
  skipButtonText: { fontSize: 14 },
  // Confirmation step styles
  valueCard: { padding: 16, borderRadius: Radius.md, borderWidth: 1, marginBottom: 20, alignItems: 'center' },
  valueCardLabel: { fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  valueCardAmount: { fontSize: 32, fontWeight: '700' },
  valueCardRange: { fontSize: 13, marginTop: 4 },
  confirmSection: { borderWidth: 1, borderRadius: Radius.sm, padding: 14, marginBottom: 12 },
  confirmSectionTitle: { fontSize: 11, letterSpacing: 1, marginBottom: 10 },
  confirmValue: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  confirmSubValue: { fontSize: 14, fontStyle: 'italic', marginBottom: 8 },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  confirmLabel: { fontSize: 13 },
  confirmData: { fontSize: 13, fontWeight: '500' },
});
