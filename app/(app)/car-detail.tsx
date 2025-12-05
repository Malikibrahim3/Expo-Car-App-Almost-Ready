/**
 * Car Detail - Redesigned
 * Clean layout with clear hierarchy: Hero stats → Actions → Chart → Details
 * Professional financial chart like Robinhood/stock apps
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Bell,
  TrendingUp,
  Clock,
  Calendar,
  Gauge,
  CreditCard,
  DollarSign,
  Car,
  Zap,
  Pencil,
  Trash2,
} from 'lucide-react-native';
import { Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  Shadows,
  haptic,
} from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';
import { generateProjections, generateHybridProjections } from '@/src/utils/equityCalculator';
import Confetti from '@/src/components/Confetti';
import { VehicleImage } from '@/src/components/VehicleImage';
import notificationService from '@/src/services/NotificationService';
import Toast from 'react-native-toast-message';
import InfoTooltip from '@/src/components/InfoTooltip';
import FloatingHelpButton from '@/src/components/FloatingHelpButton';
import { useCarContext } from '@/src/context/CarContext';
import { useSubscriptionContext } from '@/src/context/SubscriptionContext';
import { UpgradeModal, UpgradeBanner } from '@/src/components/UpgradePrompt';
import ProfitChart from '@/src/components/ProfitChart';
import SellRecommendationCard from '@/src/components/SellRecommendationCard';
import { generateSellRecommendation, VehicleFinanceData } from '@/src/utils/sellRecommendation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CarDetail() {
  const router = useRouter();
  const { vehicleId } = useLocalSearchParams();
  const id = vehicleId; // Alias for clarity
  const { colors } = useThemeMode();
  const { cars, deleteCar, loading, initialized } = useCarContext() as any;
  const { isPro, checkRefreshEligibility } = useSubscriptionContext();
  const [showDetails, setShowDetails] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasShownConfetti, setHasShownConfetti] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Find the car from context (cast to any since CarContext is JS)
  // vehicleId from params might be string or array, ensure it's a string
  const carId = Array.isArray(id) ? id[0] : id;
  const car = cars.find((c: any) => String(c.id) === String(carId)) as any;
  
  // Debug logging
  console.log('[CarDetail] Looking for car:', carId, 'Available cars:', cars.map((c: any) => c.id));
  
  // Calculate derived values
  const calculateMonthsElapsed = (startDate: string | null) => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const now = new Date();
    const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    return Math.max(0, months);
  };

  const calculatePayoffAmount = (
    loanAmount: number, 
    monthlyPayment: number, 
    interestRate: number, 
    monthsElapsed: number,
    termMonths: number,
    balloonPayment: number = 0,
    ownershipType: string = 'loan'
  ) => {
    if (!loanAmount || !monthlyPayment) return 0;
    const monthlyRate = (interestRate || 0) / 100 / 12;
    
    // For balloon/PCP loans, the principal to amortize excludes the balloon
    // The balloon is paid at the end, so it's always part of the remaining balance
    if (ownershipType === 'balloon' || ownershipType === 'lease') {
      const principalToAmortize = loanAmount - balloonPayment;
      const principalPerMonth = principalToAmortize / termMonths;
      const principalPaid = principalPerMonth * monthsElapsed;
      const principalRemaining = Math.max(0, principalToAmortize - principalPaid);
      // Add balloon back - it's always owed until the end
      return Math.round(principalRemaining + balloonPayment);
    }
    
    // Standard loan: use amortization formula
    let balance = loanAmount;
    for (let i = 0; i < monthsElapsed; i++) {
      const interest = balance * monthlyRate;
      const principal = monthlyPayment - interest;
      balance = Math.max(0, balance - principal);
    }
    return Math.round(balance);
  };

  // Build vehicle data from car context
  const monthsElapsed = car ? calculateMonthsElapsed(car.startDate) : 0;
  const loanAmount = car?.ownershipType === 'cash' ? 0 : (car?.purchasePrice || 0) - (car?.deposit || 0);
  const payoffAmount = car ? calculatePayoffAmount(
    loanAmount, 
    car.monthlyPayment || 0, 
    car.interestRate || 0, 
    monthsElapsed,
    car.termMonths || 60,
    car.balloonPayment || 0,
    car.ownershipType || 'loan'
  ) : 0;
  const currentValue = car?.estimatedValue || car?.purchasePrice || 0;
  
  const VEHICLE = car ? {
    id: car.id,
    make: car.make,
    model: car.model,
    year: car.year,
    vin: car.vin || '',
    mileage: car.mileage || 0,
    color: car.color || '',
    financeType: car.ownershipType === 'loan' ? 'Loan' : car.ownershipType === 'lease' ? 'Lease' : car.ownershipType === 'balloon' ? 'Balloon' : 'Cash',
    purchasePrice: car.purchasePrice || 0,
    currentValue: currentValue,
    privateValue: car.privatePartyValue || Math.round(currentValue * 1.05),
    tradeInValue: car.tradeInValue || Math.round(currentValue * 0.88),
    downPayment: car.deposit || 0,
    loanAmount: loanAmount,
    payoffAmount: payoffAmount,
    monthlyPayment: car.monthlyPayment || 0,
    interestRate: car.interestRate || 0,
    termMonths: car.termMonths || 60,
    monthsElapsed: monthsElapsed,
    annualMileage: car.annualMileage || 12000,
    balloonPayment: car.balloonPayment || 0,
  } : null;

  const [selectedIndex, setSelectedIndex] = useState(VEHICLE?.monthsElapsed || 0);

  const monthsRemaining = VEHICLE ? VEHICLE.termMonths - VEHICLE.monthsElapsed : 0;

  // Handle loading state - AFTER all hooks
  if (loading || !initialized) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color={colors.text} />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Loading...</Text>
            </View>
            <View style={{ width: 44 }} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              Loading vehicle details...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Detect vehicle category for accurate depreciation
  const detectCategory = (make: string, model: string): 'economy' | 'premium' | 'ev' | 'exotic' => {
    const searchStr = `${make} ${model}`.toLowerCase();
    const exoticMakes = ['ferrari', 'lamborghini', 'mclaren', 'bugatti', 'pagani', 'koenigsegg', 'bentley', 'rolls-royce', 'aston martin'];
    const evKeywords = ['tesla', 'model 3', 'model y', 'model s', 'model x', 'bolt', 'leaf', 'ioniq', 'ev6', 'rivian', 'lucid', 'polestar'];
    const luxuryMakes = ['mercedes', 'bmw', 'audi', 'lexus', 'porsche', 'jaguar', 'land rover', 'maserati', 'genesis', 'infiniti'];
    
    if (exoticMakes.some(m => searchStr.includes(m))) return 'exotic';
    if (evKeywords.some(k => searchStr.includes(k))) return 'ev';
    if (luxuryMakes.some(m => searchStr.includes(m))) return 'premium';
    return 'economy';
  };

  // Map ownership type to finance type
  const getFinanceType = (ownershipType: string): 'hp' | 'pcp' | 'cash' => {
    if (ownershipType === 'cash') return 'cash';
    if (ownershipType === 'lease' || ownershipType === 'balloon') return 'pcp';
    return 'hp';
  };

  // Chart data - must be called before early returns (hooks rule)
  const chartData = useMemo(() => {
    if (!VEHICLE) return [];
    
    const category = detectCategory(VEHICLE.make, VEHICLE.model);
    const financeType = getFinanceType(car?.ownershipType || 'loan');
    
    // Use HYBRID approach: MarketCheck data for current value, formula for projections
    // This grounds our predictions in real market data when available
    const hasMarketData = car?.estimatedValue && car.estimatedValue > 0;
    
    const projections = hasMarketData 
      ? generateHybridProjections(
          car.estimatedValue,           // MarketCheck current value
          car.tradeInValue,             // MarketCheck trade-in
          car.privatePartyValue,        // MarketCheck private party
          car.valueConfidence || 'medium',
          VEHICLE.purchasePrice,
          category,
          financeType,
          VEHICLE.loanAmount,
          VEHICLE.monthlyPayment,
          VEHICLE.interestRate,
          VEHICLE.termMonths,
          VEHICLE.monthsElapsed,
          VEHICLE.balloonPayment,
          VEHICLE.mileage,
          VEHICLE.annualMileage
        )
      : generateProjections(
          VEHICLE.purchasePrice,
          category,
          financeType,
          VEHICLE.loanAmount,
          VEHICLE.monthlyPayment,
          VEHICLE.interestRate,
          VEHICLE.termMonths,
          VEHICLE.monthsElapsed,
          VEHICLE.balloonPayment,
          VEHICLE.mileage,
          VEHICLE.annualMileage
        );
    // Find the optimal month (marked by generateProjections/generateHybridProjections)
    const optimalProjection = projections.find(p => p.isOptimalMonth);
    const optimalIdx = optimalProjection ? projections.indexOf(optimalProjection) : 0;
    
    // Use consistent trade-in values throughout the chart
    // Don't override current month with retail values - it creates a misleading spike
    return projections.map((p, idx) => ({
      month: p.month,
      equity: p.cashPosition.tradeIn,
      label: p.monthLabel || `Month ${p.month}`,
      carValue: p.tradeInValue,
      loanOwed: p.settlementFigure,
      isOptimal: idx === optimalIdx,
    }));
  }, [VEHICLE, car?.ownershipType]);

  // Find the optimal month from the projections (not just highest value)
  const bestMonth = useMemo(() => {
    if (chartData.length === 0) return { equity: 0, idx: 0, label: 'Month 0' };
    
    const optimal = chartData.find(d => d.isOptimal);
    if (optimal) {
      const idx = chartData.indexOf(optimal);
      return { ...optimal, idx };
    }
    // Fallback: find highest equity
    return chartData.reduce(
      (best: any, curr: any, idx: number) =>
        curr.equity > best.equity ? { ...curr, idx } : best,
      { equity: -Infinity, idx: 0, label: 'Month 0' }
    );
  }, [chartData]);

  const selectedChartData = chartData[selectedIndex];
  const selectedIsPositive = selectedChartData?.equity >= 0;
  
  // Use chart data for current month to ensure hero matches chart
  // This is the single source of truth for all displayed values
  const currentMonthData = chartData[VEHICLE?.monthsElapsed || 0];
  const heroSaleValue = currentMonthData?.carValue || VEHICLE?.tradeInValue || 0;
  const heroToClear = currentMonthData?.loanOwed || VEHICLE?.payoffAmount || 0;
  const heroEquity = currentMonthData?.equity || (heroSaleValue - heroToClear);
  const heroDeposit = VEHICLE?.downPayment || 0;
  const heroRealProfit = heroEquity - heroDeposit;

  // Confetti effect for positive equity
  useEffect(() => {
    if (heroEquity >= 0 && !hasShownConfetti && car) {
      const timer = setTimeout(() => {
        setShowConfetti(true);
        setHasShownConfetti(true);
        haptic.success();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [heroEquity, hasShownConfetti, car]);

  // Generate sell recommendation with confidence intervals and warnings
  const sellRecommendation = useMemo(() => {
    if (!VEHICLE || chartData.length === 0) return null;
    
    const category = detectCategory(VEHICLE.make, VEHICLE.model);
    const financeType = getFinanceType(car?.ownershipType || 'loan');
    
    // Get raw projections for recommendation engine (use hybrid when market data available)
    const hasMarketData = car?.estimatedValue && car.estimatedValue > 0;
    
    const projections = hasMarketData 
      ? generateHybridProjections(
          car.estimatedValue,
          car.tradeInValue,
          car.privatePartyValue,
          car.valueConfidence || 'medium',
          VEHICLE.purchasePrice,
          category,
          financeType,
          VEHICLE.loanAmount,
          VEHICLE.monthlyPayment,
          VEHICLE.interestRate,
          VEHICLE.termMonths,
          VEHICLE.monthsElapsed,
          VEHICLE.balloonPayment,
          VEHICLE.mileage,
          VEHICLE.annualMileage
        )
      : generateProjections(
          VEHICLE.purchasePrice,
          category,
          financeType,
          VEHICLE.loanAmount,
          VEHICLE.monthlyPayment,
          VEHICLE.interestRate,
          VEHICLE.termMonths,
          VEHICLE.monthsElapsed,
          VEHICLE.balloonPayment,
          VEHICLE.mileage,
          VEHICLE.annualMileage
        );
    
    // Use chart data for current month to ensure consistency
    const currentData = chartData[VEHICLE.monthsElapsed] || chartData[0];
    const vehicleData: VehicleFinanceData = {
      purchasePrice: VEHICLE.purchasePrice,
      currentValue: currentData?.carValue || VEHICLE.tradeInValue,
      payoffAmount: currentData?.loanOwed || VEHICLE.payoffAmount,
      monthsElapsed: VEHICLE.monthsElapsed,
      termMonths: VEHICLE.termMonths,
      monthlyPayment: VEHICLE.monthlyPayment,
      balloonPayment: VEHICLE.balloonPayment,
      ownershipType: (car?.ownershipType || 'loan') as 'loan' | 'lease' | 'balloon' | 'cash',
      mileage: VEHICLE.mileage,
      annualMileage: VEHICLE.annualMileage,
      category,
      depositPaid: VEHICLE.downPayment,
    };
    
    return generateSellRecommendation(vehicleData, projections);
  }, [VEHICLE, car?.ownershipType, chartData]);

  // Handle case where car is not found - AFTER all hooks
  if (!car || !VEHICLE) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color={colors.text} />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Vehicle Not Found</Text>
            </View>
            <View style={{ width: 44 }} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              This vehicle could not be found. It may have been deleted.
            </Text>
            <Text style={{ color: colors.textTertiary, textAlign: 'center', marginTop: 10, fontSize: 12 }}>
              ID: {carId}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const handleSetReminder = async () => {
    haptic.medium();
    const monthsUntilOptimal = bestMonth.idx - VEHICLE.monthsElapsed;
    if (monthsUntilOptimal > 0) {
      await notificationService.initialize();
      await notificationService.scheduleOptimalSellReminder(
        VEHICLE.id,
        `${VEHICLE.year} ${VEHICLE.make} ${VEHICLE.model}`,
        monthsUntilOptimal
      );
      Toast.show({
        type: 'success',
        text1: 'Reminder Set!',
        text2: `We'll notify you in ${monthsUntilOptimal} months.`,
      });
    }
  };

  const handleGetValuation = () => {
    haptic.medium();
    // Navigate to sell options where they can see dealer trade-in values
    router.push({ pathname: '/(app)/sell-options', params: { vehicleId: VEHICLE.id } });
  };

  const handleDeleteVehicle = () => {
    haptic.medium();
    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to remove your ${VEHICLE.year} ${VEHICLE.make} ${VEHICLE.model}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCar(VEHICLE.id);
            haptic.success();
            Toast.show({
              type: 'success',
              text1: 'Vehicle Removed',
              text2: `Your ${VEHICLE.make} ${VEHICLE.model} has been deleted.`,
            });
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Confetti
        visible={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => {
              haptic.light();
              router.back();
            }}
            style={styles.backButton}
          >
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {VEHICLE.year} {VEHICLE.make} {VEHICLE.model}
            </Text>
          </View>
          <Pressable
            onPress={handleDeleteVehicle}
            style={styles.backButton}
          >
            <Trash2 size={22} color={colors.negative} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section - Vehicle + Key Financial Position */}
          <View
            style={[
              styles.heroSection,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.heroTop}>
              <VehicleImage
                make={VEHICLE.make}
                model={VEHICLE.model}
                year={VEHICLE.year}
                size="large"
              />
              <View style={styles.heroStats}>
                <View style={styles.equityLabelRow}>
                  <Text style={[styles.heroEquityLabel, { color: colors.textTertiary }]}>
                    Equity
                  </Text>
                  <InfoTooltip 
                    term="Equity"
                    explanation="Sale value minus remaining finance. This is what you'd walk away with after clearing your loan."
                    size={14}
                  />
                </View>
                <Text
                  style={[
                    styles.heroEquityValue,
                    { color: heroEquity >= 0 ? colors.positive : colors.negative },
                  ]}
                >
                  {heroEquity >= 0 ? '+' : '-'}$
                  {Math.round(Math.abs(heroEquity)).toLocaleString()}
                </Text>
                <Text style={[styles.heroEquitySubLabel, { color: colors.textTertiary }]}>
                  Sale value minus finance{heroDeposit > 0 ? '. Excludes deposit.' : ''}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: sellRecommendation?.statusBgColor || (heroEquity >= 0 ? 'rgba(255, 184, 0, 0.15)' : colors.warningBg),
                    },
                  ]}
                >
                  {sellRecommendation?.statusIcon === 'check' ? (
                    <TrendingUp size={14} color={sellRecommendation?.statusColor || '#22C55E'} />
                  ) : sellRecommendation?.statusIcon === 'trending_up' ? (
                    <TrendingUp size={14} color={sellRecommendation?.statusColor || '#FFB800'} />
                  ) : sellRecommendation?.statusIcon === 'alert' ? (
                    <Clock size={14} color={sellRecommendation?.statusColor || colors.negative} />
                  ) : (
                    <Clock size={14} color={sellRecommendation?.statusColor || colors.warning} />
                  )}
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: sellRecommendation?.statusColor || (heroEquity >= 0 ? '#FFB800' : colors.warning) },
                    ]}
                  >
                    {sellRecommendation?.headline || (heroEquity >= 0 ? 'Optimal — Sell Now' : `Wait — Optimal: ${bestMonth.idx - VEHICLE.monthsElapsed}mo`)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Stats Row */}
            <View style={[styles.quickStats, { borderTopColor: colors.border }]}>
              <View style={styles.quickStatItem}>
                <Text style={[styles.quickStatValue, { color: colors.brand, fontWeight: '800' }]}>
                  ${Math.round(heroSaleValue).toLocaleString()}
                </Text>
                <Text style={[styles.quickStatLabel, { color: colors.textTertiary }]}>
                  Sale Value
                </Text>
              </View>
              <View style={[styles.quickStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.quickStatItem}>
                <Text style={[styles.quickStatValue, { color: colors.text }]}>
                  ${Math.round(heroToClear).toLocaleString()}
                </Text>
                <Text style={[styles.quickStatLabel, { color: colors.textTertiary }]}>
                  Finance Owed
                </Text>
              </View>
              <View style={[styles.quickStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.quickStatItem}>
                <Text style={[styles.quickStatValue, { color: heroEquity >= 0 ? colors.positive : colors.negative, fontWeight: '800' }]}>
                  {heroEquity >= 0 ? '+' : '-'}${Math.round(Math.abs(heroEquity)).toLocaleString()}
                </Text>
                <Text style={[styles.quickStatLabel, { color: colors.textTertiary }]}>
                  Equity
                </Text>
              </View>
            </View>
          </View>

          {/* Sell Recommendation Card */}
          {sellRecommendation && (
            <View style={{ marginBottom: Spacing.md }}>
              <SellRecommendationCard
                recommendation={sellRecommendation}
                colors={colors}
                onAction={() => {
                  haptic.medium();
                  if (sellRecommendation.status === 'optimal_now' || sellRecommendation.status === 'good_to_sell') {
                    router.push({ pathname: '/(app)/sell-options', params: { vehicleId: VEHICLE.id } });
                  } else {
                    handleSetReminder();
                  }
                }}
              />
            </View>
          )}

          {/* Vehicle & Finance Details - Now higher up */}
          <View
            style={[
              styles.detailsSection,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.detailsSectionHeader}>
              <View style={styles.detailsSectionTitleRow}>
                <Car size={18} color={colors.textSecondary} />
                <Text style={[styles.detailsSectionTitle, { color: colors.text }]}>
                  Vehicle & Finance
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  haptic.medium();
                  router.push({ pathname: '/(app)/edit-car', params: { vehicleId: VEHICLE.id } });
                }}
                style={({ pressed }) => [
                  styles.editButton,
                  { backgroundColor: colors.brandSubtle },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Pencil size={14} color={colors.brand} />
                <Text style={[styles.editButtonText, { color: colors.brand }]}>Edit</Text>
              </Pressable>
            </View>

            {/* Compact Details Grid */}
            <View style={styles.detailsCompactGrid}>
              <View style={[styles.detailCompactItem, { borderRightColor: colors.border, borderBottomColor: colors.border }]}>
                <Gauge size={14} color={colors.textTertiary} />
                <Text style={[styles.detailCompactLabel, { color: colors.textTertiary }]}>Mileage</Text>
                <Text style={[styles.detailCompactValue, { color: colors.text }]}>{VEHICLE.mileage.toLocaleString()} mi</Text>
              </View>
              <View style={[styles.detailCompactItem, { borderBottomColor: colors.border }]}>
                <Calendar size={14} color={colors.textTertiary} />
                <Text style={[styles.detailCompactLabel, { color: colors.textTertiary }]}>Year</Text>
                <Text style={[styles.detailCompactValue, { color: colors.text }]}>{VEHICLE.year}</Text>
              </View>
              <View style={[styles.detailCompactItem, { borderRightColor: colors.border }]}>
                <CreditCard size={14} color={colors.textTertiary} />
                <Text style={[styles.detailCompactLabel, { color: colors.textTertiary }]}>Finance</Text>
                <Text style={[styles.detailCompactValue, { color: colors.text }]}>{VEHICLE.financeType}</Text>
              </View>
              <View style={styles.detailCompactItem}>
                <DollarSign size={14} color={colors.textTertiary} />
                <Text style={[styles.detailCompactLabel, { color: colors.textTertiary }]}>Monthly</Text>
                <Text style={[styles.detailCompactValue, { color: colors.text }]}>${VEHICLE.monthlyPayment}</Text>
              </View>
            </View>

            {/* Expandable Extra Details */}
            <Pressable
              onPress={() => {
                haptic.light();
                setShowDetails(!showDetails);
              }}
              style={[styles.moreDetailsToggle, { borderTopColor: colors.border }]}
            >
              <Text style={[styles.moreDetailsText, { color: colors.textSecondary }]}>
                {showDetails ? 'Hide details' : 'More details'}
              </Text>
              {showDetails ? (
                <ChevronUp size={16} color={colors.textTertiary} />
              ) : (
                <ChevronDown size={16} color={colors.textTertiary} />
              )}
            </Pressable>

            {showDetails && (
              <View style={[styles.extraDetails, { borderTopColor: colors.border }]}>
                <View style={styles.extraDetailRow}>
                  <Text style={[styles.extraDetailLabel, { color: colors.textSecondary }]}>Sale Price</Text>
                  <Text style={[styles.extraDetailValue, { color: colors.text }]}>${Math.round(heroSaleValue).toLocaleString()}</Text>
                </View>
                <View style={styles.extraDetailRow}>
                  <Text style={[styles.extraDetailLabel, { color: colors.textSecondary }]}>Finance Owed</Text>
                  <Text style={[styles.extraDetailValue, { color: colors.text }]}>${Math.round(heroToClear).toLocaleString()}</Text>
                </View>
                <View style={styles.extraDetailRow}>
                  <Text style={[styles.extraDetailLabel, { color: colors.textSecondary }]}>Equity</Text>
                  <Text style={[styles.extraDetailValue, { color: heroEquity >= 0 ? colors.positive : colors.negative }]}>
                    {heroEquity >= 0 ? '+' : '-'}${Math.round(Math.abs(heroEquity)).toLocaleString()}
                  </Text>
                </View>
                {heroDeposit > 0 && (
                  <>
                    <View style={[styles.extraDetailDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.extraDetailRow}>
                      <Text style={[styles.extraDetailLabel, { color: colors.textSecondary }]}>Deposit Paid</Text>
                      <Text style={[styles.extraDetailValue, { color: colors.text }]}>${Math.round(heroDeposit).toLocaleString()}</Text>
                    </View>
                    <View style={styles.extraDetailRow}>
                      <Text style={[styles.extraDetailLabel, { color: colors.text, fontWeight: '600' }]}>Net Position After Deposit</Text>
                      <Text style={[styles.extraDetailValue, { color: heroRealProfit >= 0 ? colors.positive : colors.negative, fontWeight: '700' }]}>
                        {heroRealProfit >= 0 ? '+' : '-'}${Math.round(Math.abs(heroRealProfit)).toLocaleString()}
                      </Text>
                    </View>
                  </>
                )}
                <View style={[styles.extraDetailDivider, { backgroundColor: colors.border }]} />
                <View style={styles.extraDetailRow}>
                  <Text style={[styles.extraDetailLabel, { color: colors.textSecondary }]}>Purchase Price</Text>
                  <Text style={[styles.extraDetailValue, { color: colors.text }]}>${Math.round(VEHICLE.purchasePrice).toLocaleString()}</Text>
                </View>
                <View style={styles.extraDetailRow}>
                  <Text style={[styles.extraDetailLabel, { color: colors.textSecondary }]}>Loan Term</Text>
                  <Text style={[styles.extraDetailValue, { color: colors.text }]}>{VEHICLE.termMonths} months @ {VEHICLE.interestRate}%</Text>
                </View>
                {VEHICLE.balloonPayment > 0 && (
                  <View style={styles.extraDetailRow}>
                    <Text style={[styles.extraDetailLabel, { color: colors.textSecondary }]}>Balloon Payment</Text>
                    <Text style={[styles.extraDetailValue, { color: colors.text }]}>${Math.round(VEHICLE.balloonPayment).toLocaleString()}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Pro Refresh Banner - or Upgrade prompt for free users */}
          {isPro ? (
            <Pressable
              onPress={async () => {
                haptic.medium();
                setRefreshing(true);
                // Simulate refresh - in real app this would call the valuation API
                setTimeout(() => {
                  setRefreshing(false);
                  Toast.show({ type: 'success', text1: 'Value Updated', text2: 'Latest market data applied' });
                }, 1500);
              }}
              disabled={refreshing}
              style={({ pressed }) => pressed && { opacity: 0.8 }}
            >
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 165, 0, 0.1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.proRefreshBanner}
              >
                <View style={styles.proRefreshLeft}>
                  <Text style={styles.proRefreshLabel}>⚡ Pro: Daily Updates Active</Text>
                  <Text style={[styles.proRefreshText, { color: colors.textSecondary }]}>
                    {refreshing ? 'Refreshing...' : 'Tap to refresh value now'}
                  </Text>
                </View>
                <View style={[styles.proRefreshBtn, refreshing && { opacity: 0.5 }]}>
                  <Text style={styles.proRefreshBtnText}>{refreshing ? '...' : 'Refresh'}</Text>
                </View>
              </LinearGradient>
            </Pressable>
          ) : (
            <View style={{ marginBottom: Spacing.md }}>
              <UpgradeBanner feature="daily_updates" />
            </View>
          )}

          {/* Action Button - Single clear CTA */}
          <View style={styles.actionsSection}>
            <Pressable
              onPress={heroEquity >= 0 ? handleGetValuation : handleSetReminder}
              style={({ pressed }) => [
                styles.primaryAction,
                pressed && { opacity: 0.9 },
              ]}
            >
              <LinearGradient
                colors={heroEquity >= 0 ? colors.gradientPositive : colors.gradientBrand}
                style={styles.primaryActionGradient}
              >
                {heroEquity >= 0 ? (
                  <Zap size={20} color="white" />
                ) : (
                  <Bell size={20} color="white" />
                )}
                <Text style={styles.primaryActionText}>
                  {heroEquity >= 0 ? 'See Selling Options' : 'Remind Me When Optimal'}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Profit Timeline Chart */}
          <View
            style={[
              styles.chartSection,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.chartSectionTitle, { color: colors.text }]}>
              Position Over Time
            </Text>
            
            <ProfitChart
              data={chartData}
              selectedIndex={selectedIndex}
              onSelectIndex={setSelectedIndex}
              colors={colors}
              currentMonthIndex={VEHICLE.monthsElapsed}
              bestMonthIndex={bestMonth.idx}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Floating Help Button */}
        <FloatingHelpButton 
          screenName="Car Details"
          contextHelp="This screen shows your Net Sale Position — what you'd walk away with after clearing your loan. The chart shows how this changes over time, helping you find the optimal sell window."
        />
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
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.41 },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.base },

  // Hero Section - iOS card style
  heroSection: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  heroStats: {
    flex: 1,
  },
  equityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroEquityLabel: {
    fontSize: 13,
    letterSpacing: -0.08,
  },
  heroEquityValue: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.37,
  },
  heroEquitySubLabel: {
    fontSize: 12,
    letterSpacing: -0.08,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.08,
  },
  quickStats: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  quickStatValue: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.41,
  },
  quickStatLabel: {
    fontSize: 13,
    marginTop: 2,
    letterSpacing: -0.08,
  },
  quickStatDivider: {
    width: StyleSheet.hairlineWidth,
  },

  // Pro Refresh Banner
  proRefreshBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  proRefreshLeft: { flex: 1 },
  proRefreshLabel: { fontSize: 13, fontWeight: '700', color: '#B8860B', marginBottom: 2, letterSpacing: 0.3 },
  proRefreshText: { fontSize: 12, letterSpacing: -0.08 },
  proRefreshBtn: { backgroundColor: '#FFD700', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  proRefreshBtnText: { color: '#000', fontSize: 13, fontWeight: '600' },

  // Actions - iOS solid button style
  actionsSection: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  primaryAction: {},
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  primaryActionText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.41,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
  },
  secondaryActionText: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.41,
  },

  // Chart Section - iOS card style
  chartSection: {
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  chartSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.24,
    marginBottom: Spacing.sm,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.41,
  },
  chartValueDisplay: {
    alignItems: 'flex-end',
  },
  chartSelectedValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0,
  },
  chartSelectedLabel: {
    fontSize: 13,
    marginTop: 2,
    letterSpacing: -0.08,
  },
  chartHintRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  chartHint: {
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: -0.08,
  },
  chartExplainer: {
    padding: Spacing.sm,
    borderRadius: 10,
    marginTop: Spacing.md,
  },
  chartExplainerText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: -0.08,
  },
  bestTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: 10,
    marginTop: Spacing.md,
  },
  bestTimeText: {
    fontSize: 13,
    flex: 1,
    letterSpacing: -0.08,
  },

  // Vehicle & Finance Details Section - iOS grouped list style
  detailsSection: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  detailsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  detailsSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailsSectionTitle: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.24,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.24,
  },
  detailsCompactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailCompactItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  detailCompactLabel: {
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 0,
  },
  detailCompactValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: -0.24,
  },
  moreDetailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  moreDetailsText: {
    fontSize: 15,
    letterSpacing: -0.24,
  },
  extraDetails: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  extraDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  extraDetailLabel: {
    fontSize: 15,
    letterSpacing: -0.24,
  },
  extraDetailValue: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.24,
  },
  extraDetailDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.sm,
    letterSpacing: -0.24,
  },
});
