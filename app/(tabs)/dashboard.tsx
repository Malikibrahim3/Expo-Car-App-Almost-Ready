/**
 * Dashboard - FIXED
 * One clear message, one primary action, no noise
 * Now with Getting Started checklist and simplified vehicle cards
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, Text, View, Pressable, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, TrendingUp, TrendingDown, ArrowRight, AlertTriangle, PartyPopper } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radius, Shadows, haptic, IconSizes } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { useCarContext } from '@/src/context/CarContext';
import { useSubscriptionContext } from '@/src/context/SubscriptionContext';
import { VehicleImage } from '@/src/components/VehicleImage';
import { DataSourceBadge, LastUpdated, TrustFooter } from '@/src/components/TrustBadge';
import AppHeader from '@/src/components/AppHeader';
import GettingStartedChecklist from '@/src/components/GettingStartedChecklist';
import SimpleVehicleCard from '@/src/components/SimpleVehicleCard';
import FloatingHelpButton from '@/src/components/FloatingHelpButton';
import InfoTooltip from '@/src/components/InfoTooltip';
import QuickTour from '@/src/components/QuickTour';
import { generateProjections, generateHybridProjections } from '@/src/utils/equityCalculator';

// Helper function to calculate optimal sell time (defined outside component to avoid re-creation)
function calculateOptimalSellTime(car: any, currentYear: number, currentMonth: number) {
  if (car.ownershipType === 'cash' || !car.purchasePrice || !car.termMonths) {
    return { optimalSellMonth: null, optimalSellEquity: null, monthsUntilOptimal: null };
  }
  
  try {
    const searchStr = `${car.make} ${car.model}`.toLowerCase();
    const exoticMakes = ['ferrari', 'lamborghini', 'mclaren', 'bugatti', 'bentley', 'rolls-royce', 'aston martin'];
    const evKeywords = ['tesla', 'model 3', 'model y', 'model s', 'model x', 'bolt', 'leaf', 'ioniq', 'ev6', 'rivian', 'lucid'];
    const luxuryMakes = ['mercedes', 'bmw', 'audi', 'lexus', 'porsche', 'jaguar', 'land rover', 'maserati', 'genesis'];
    
    let category: 'economy' | 'premium' | 'ev' | 'exotic' = 'economy';
    if (exoticMakes.some(m => searchStr.includes(m))) category = 'exotic';
    else if (evKeywords.some(k => searchStr.includes(k))) category = 'ev';
    else if (luxuryMakes.some(m => searchStr.includes(m))) category = 'premium';
    
    const financeType = car.ownershipType === 'cash' ? 'cash' : (car.ownershipType === 'lease' || car.ownershipType === 'balloon') ? 'pcp' : 'hp';
    const loanAmount = (car.purchasePrice || 0) - (car.deposit || 0);
    const monthsElapsed = car.startDate
      ? Math.max(0, (currentYear - new Date(car.startDate).getFullYear()) * 12 +
          (currentMonth - new Date(car.startDate).getMonth()))
      : 0;
    
    // Use hybrid approach when market data is available
    const hasMarketData = car.estimatedValue && car.estimatedValue > 0;
    
    const projections = hasMarketData
      ? generateHybridProjections(
          car.estimatedValue,
          car.tradeInValue,
          car.privatePartyValue,
          car.valueConfidence || 'medium',
          car.purchasePrice,
          category,
          financeType as any,
          loanAmount,
          car.monthlyPayment || 0,
          car.interestRate || 0,
          car.termMonths || 60,
          monthsElapsed,
          car.balloonPayment || 0,
          car.mileage || 0,
          12000
        )
      : generateProjections(
          car.purchasePrice,
          category,
          financeType as any,
          loanAmount,
          car.monthlyPayment || 0,
          car.interestRate || 0,
          car.termMonths || 60,
          monthsElapsed,
          car.balloonPayment || 0,
          car.mileage || 0,
          12000
        );
    
    // Find the optimal month (marked by generateProjections/generateHybridProjections)
    const optimalProjection = projections.find(p => p.isOptimalMonth);
    
    if (optimalProjection) {
      const optimalIdx = projections.indexOf(optimalProjection);
      return {
        optimalSellMonth: optimalProjection.monthLabel || null,
        optimalSellEquity: Math.round(optimalProjection.cashPosition.tradeIn),
        monthsUntilOptimal: Math.max(0, optimalIdx - monthsElapsed),
      };
    }
    
    // Fallback: find highest equity (shouldn't happen with correct logic)
    const bestMonth = projections.reduce(
      (best: any, curr: any, idx: number) =>
        curr.cashPosition.tradeIn > best.equity ? { ...curr, idx, equity: curr.cashPosition.tradeIn } : best,
      { equity: -Infinity, idx: 0, monthLabel: '' }
    );
    
    if (bestMonth.idx >= 0) {
      return {
        optimalSellMonth: bestMonth.monthLabel || null,
        optimalSellEquity: Math.round(bestMonth.equity),
        monthsUntilOptimal: Math.max(0, bestMonth.idx - monthsElapsed),
      };
    }
  } catch (e) {
    // Silently fail
  }
  return { optimalSellMonth: null, optimalSellEquity: null, monthsUntilOptimal: null };
}

const DASHBOARD_TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to AutoTrack! 👋',
    description: 'This app helps you know exactly when to sell your car to get the most money.',
    position: 'center' as const,
  },
  {
    id: 'best-option',
    title: 'Your Best Option',
    description: 'The green card at the top shows your best car to sell right now and how much you\'d pocket.',
    position: 'top' as const,
  },
  {
    id: 'vehicles',
    title: 'Your Vehicles',
    description: 'Tap any car to see details, including a chart showing the best time to sell.',
    position: 'bottom' as const,
  },
  {
    id: 'help',
    title: 'Need Help?',
    description: 'Tap the ? button in the corner anytime you need help or have questions.',
    position: 'bottom' as const,
  },
];

export default function Dashboard() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const { isDemoMode } = useAuth() as any;
  const { cars } = useCarContext();
  const { isPro, usage, refreshSummary } = useSubscriptionContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Helper to calculate equity from car data
  const calculateEquity = (car: any) => {
    const currentValue = car.estimatedValue || car.purchasePrice || 0;
    
    // Calculate payoff amount
    if (car.ownershipType === 'cash') return currentValue;
    
    const loanAmount = (car.purchasePrice || 0) - (car.deposit || 0);
    if (!loanAmount || !car.monthlyPayment) return currentValue - loanAmount;
    
    // Calculate months elapsed
    const monthsElapsed = car.startDate
      ? Math.max(0, (new Date().getFullYear() - new Date(car.startDate).getFullYear()) * 12 +
          (new Date().getMonth() - new Date(car.startDate).getMonth()))
      : 0;
    
    // Calculate remaining balance
    const monthlyRate = (car.interestRate || 0) / 100 / 12;
    let balance = loanAmount;
    for (let i = 0; i < monthsElapsed; i++) {
      const interest = balance * monthlyRate;
      const principal = car.monthlyPayment - interest;
      balance = Math.max(0, balance - principal);
    }
    
    return Math.round(currentValue - balance);
  };
  
  // Transform cars from CarContext to display format
  // CarContext now handles demo vehicles automatically
  const vehicles = useMemo(() => {
    return cars.map((car: any) => {
      const equity = calculateEquity(car);
      const isPositive = equity >= 0;
      
      return {
        id: car.id,
        name: `${car.year} ${car.make} ${car.model}`,
        nickname: car.nickname || null,
        make: car.make,
        model: car.model,
        year: car.year,
        trim: car.trim || '',
        equity: equity,
        estimatedValue: car.estimatedValue || null,
        tradeInValue: car.tradeInValue || null,
        privatePartyValue: car.privatePartyValue || null,
        action: isPositive ? 'sell' : 'wait',
        recommendation: isPositive ? `Good time to sell — you'd keep $${Math.round(equity).toLocaleString()}` : 'Better to wait',
        mileage: car.mileage || 0,
        financeType: car.ownershipType === 'loan' ? 'Loan' : car.ownershipType === 'lease' ? 'Lease' : car.ownershipType === 'balloon' ? 'Balloon' : 'Cash',
        monthlyPayment: car.monthlyPayment || 0,
        loanAmount: car.ownershipType === 'cash' ? 0 : (car.purchasePrice || 0) - (car.deposit || 0),
        payoffAmount: (() => {
          if (car.ownershipType === 'cash') return 0;
          const loanAmt = (car.purchasePrice || 0) - (car.deposit || 0);
          const monthsElapsed = car.startDate
            ? Math.max(0, (new Date().getFullYear() - new Date(car.startDate).getFullYear()) * 12 +
                (new Date().getMonth() - new Date(car.startDate).getMonth()))
            : 0;
          const monthlyRate = (car.interestRate || 0) / 100 / 12;
          let balance = loanAmt;
          for (let i = 0; i < monthsElapsed; i++) {
            const interest = balance * monthlyRate;
            const principal = (car.monthlyPayment || 0) - interest;
            balance = Math.max(0, balance - principal);
          }
          return Math.round(balance);
        })(),
        // Optimal sell time - calculated from projections
        ...calculateOptimalSellTime(car, new Date().getFullYear(), new Date().getMonth()),
      };
    });
  }, [cars]);

  useEffect(() => { setTimeout(() => setLoading(false), 600); }, []);

  const summary = useMemo(() => {
    if (vehicles.length === 0) {
      return { totalEquity: 0, readyCount: 0, waitCount: 0, bestDeal: null };
    }
    const totalEquity = vehicles.reduce((sum, v) => sum + v.equity, 0);
    const readyToSell = vehicles.filter(v => v.equity >= 0);
    const bestDeal = readyToSell.length > 0 ? readyToSell.reduce((best, v) => v.equity > best.equity ? v : best) : null;
    return { totalEquity, readyCount: readyToSell.length, waitCount: vehicles.length - readyToSell.length, bestDeal };
  }, [vehicles]);

  const onRefresh = () => { setRefreshing(true); haptic.light(); setTimeout(() => setRefreshing(false), 1000); };

  // Check if user has vehicles
  const hasVehicles = vehicles.length > 0;
  const notificationsEnabled = true; // In real app, check notification settings

  if (loading) return <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.brand} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Quick Tour for first-time users */}
      <QuickTour screenId="dashboard" steps={DASHBOARD_TOUR_STEPS} />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AppHeader showNotifications showThemeToggle notificationCount={isDemoMode ? 2 : 0} />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}>
          
          {/* Demo Mode Banner */}
          {isDemoMode && (
            <Pressable 
              onPress={() => router.push('/(auth)/signup')}
              style={[styles.demoBanner, { backgroundColor: colors.brandSubtle }]}
            >
              <Text style={[styles.demoBannerText, { color: colors.text }]}>
                🎮 Demo Mode — <Text style={{ color: colors.brand, fontWeight: '600' }}>Sign up to save your cars</Text>
              </Text>
            </Pressable>
          )}

          {/* Getting Started Checklist - for new users (not in demo mode) */}
          {!isDemoMode && (
            <GettingStartedChecklist
              onAddCar={() => router.push('/(tabs)/garage')}
              onViewNotifications={() => router.push('/(tabs)/profile')}
              hasVehicles={hasVehicles}
              notificationsEnabled={notificationsEnabled}
            />
          )}

          {/* Data Source Attribution */}
          <View style={styles.trustRow}>
            <DataSourceBadge source="kbb" />
            <LastUpdated timestamp={new Date(Date.now() - 2 * 60 * 60 * 1000)} />
          </View>

          {/* Pro Status Banner - shows refresh status for Pro users */}
          {isPro && hasVehicles && (
            <Pressable 
              onPress={() => router.push('/(app)/subscription')}
              style={({ pressed }) => pressed && { opacity: 0.8 }}
            >
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 165, 0, 0.1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.proStatusBanner, { borderColor: 'rgba(255, 215, 0, 0.3)' }]}
              >
                <View style={styles.proStatusLeft}>
                  <Text style={[styles.proStatusLabel, { color: '#B8860B' }]}>⚡ Pro Active</Text>
                  <Text style={[styles.proStatusText, { color: colors.textSecondary }]}>
                    {usage?.dailyRefreshSlotsUsed || 0}/{usage?.dailyRefreshSlotsUsed !== undefined ? 10 : 0} daily slots • {refreshSummary?.manualRefreshesAvailable || 0} refresh available
                  </Text>
                </View>
                <ChevronRight size={16} color="#B8860B" />
              </LinearGradient>
            </Pressable>
          )}

          {/* Free Plan Upgrade Prompt */}
          {!isPro && hasVehicles && vehicles.length >= 1 && (
            <Pressable 
              onPress={() => router.push('/(app)/subscription')}
              style={({ pressed }) => [styles.upgradePrompt, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.upgradePromptLeft}>
                <Text style={[styles.upgradePromptTitle, { color: colors.text }]}>Unlock Pro Features</Text>
                <Text style={[styles.upgradePromptText, { color: colors.textTertiary }]}>Daily updates • Unlimited cars • Priority refresh</Text>
              </View>
              <View style={[styles.upgradePromptBtn, { backgroundColor: colors.brand }]}>
                <Text style={styles.upgradePromptBtnText}>Upgrade</Text>
              </View>
            </Pressable>
          )}

          {/* Hero - The ONE thing that matters - iOS style card */}
          {!hasVehicles ? (
            <View style={[styles.heroCard, { backgroundColor: colors.surface }, Shadows.md]}>
              <TrendingUp size={28} color={colors.brand} />
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Welcome to AutoTrack</Text>
              <Text style={[styles.heroCarName, { color: colors.text }]}>Add your first car to get started</Text>
              <Text style={[styles.heroAction, { color: colors.textTertiary }]}>We'll track its value and tell you the best time to sell.</Text>
            </View>
          ) : summary.bestDeal ? (
            <Pressable onPress={() => { haptic.medium(); router.push({ pathname: '/(app)/car-detail', params: { vehicleId: summary.bestDeal.id } }); }}
              style={({ pressed }) => [styles.heroCard, { backgroundColor: colors.positiveBg }, Shadows.md, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}>
              <TrendingUp size={28} color={colors.positive} />
              <Text style={[styles.heroLabel, { color: colors.positive }]}>Best option today</Text>
              <Text style={[styles.heroCarName, { color: colors.text }]}>{summary.bestDeal.name}</Text>
              <Text style={[styles.heroValue, { color: colors.positive }]}>+${Math.round(summary.bestDeal.equity).toLocaleString()}</Text>
              <Text style={[styles.heroAction, { color: colors.textSecondary }]}>Sell now and keep this money</Text>
              <View style={styles.heroCta}><Text style={[styles.heroCtaText, { color: colors.positive }]}>See details</Text><ArrowRight size={16} color={colors.positive} /></View>
            </Pressable>
          ) : (
            <View style={[styles.heroCard, { backgroundColor: colors.surface }, Shadows.md]}>
              <AlertTriangle size={28} color={colors.warning} />
              <Text style={[styles.heroLabel, { color: colors.warning }]}>Hold tight</Text>
              <Text style={[styles.heroCarName, { color: colors.text }]}>None of your cars are ready to sell</Text>
              <Text style={[styles.heroAction, { color: colors.textTertiary }]}>Wait to avoid losing money. We'll notify you when it's time.</Text>
            </View>
          )}

          {/* Only show stats and vehicle list if user has vehicles */}
          {hasVehicles ? (
            <>
              {/* Quick Stats */}
              <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: colors.positive }]}>{summary.readyCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Good to sell</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: colors.warning }]}>{summary.waitCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Better to wait</Text>
                </View>
              </View>

              {/* Vehicle List - Simplified cards with less cognitive load */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Vehicles</Text>
                  <InfoTooltip 
                    term="What You'd Pocket" 
                    explanation="This shows how much money you'd keep (or lose) if you sold your car today, after paying off any remaining loan balance."
                  />
                </View>
                {vehicles.map((vehicle, index) => (
                  <SimpleVehicleCard
                    key={vehicle.id}
                    id={vehicle.id}
                    name={vehicle.name}
                    nickname={vehicle.nickname}
                    make={vehicle.make}
                    model={vehicle.model}
                    year={vehicle.year}
                    trim={vehicle.trim}
                    equity={vehicle.equity}
                    estimatedValue={vehicle.estimatedValue}
                    tradeInValue={vehicle.tradeInValue}
                    privatePartyValue={vehicle.privatePartyValue}
                    monthsToPositive={vehicle.monthsToPositive}
                    hasDailyRefresh={isPro && index < 10}
                    loanAmount={vehicle.loanAmount}
                    payoffAmount={vehicle.payoffAmount}
                    financeType={vehicle.financeType}
                    optimalSellMonth={vehicle.optimalSellMonth}
                    optimalSellEquity={vehicle.optimalSellEquity}
                    monthsUntilOptimal={vehicle.monthsUntilOptimal}
                    onPress={() => router.push({ pathname: '/(app)/car-detail', params: { vehicleId: vehicle.id } })}
                  />
                ))}
              </View>
            </>
          ) : null}

          {/* Add Vehicle CTA - iOS solid button style */}
          <Pressable 
            onPress={() => { haptic.medium(); router.push('/(tabs)/garage'); }} 
            style={({ pressed }) => [
              styles.addCta, 
              { backgroundColor: colors.brand },
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
            ]}
          >
            <Text style={styles.addCtaText}>{hasVehicles ? 'Add Another Car' : 'Add Your First Car'}</Text>
          </Pressable>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Floating Help Button */}
        <FloatingHelpButton 
          screenName="Dashboard"
          contextHelp="This is your home screen. It shows all your cars and tells you which ones are good to sell right now."
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.base },

  demoBanner: { paddingVertical: 12, paddingHorizontal: 16, marginBottom: Spacing.md, borderRadius: 10 },
  demoBannerText: { fontSize: 14, textAlign: 'center', letterSpacing: -0.08 },
  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, marginBottom: Spacing.md },

  // Pro Status Banner
  proStatusBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingVertical: 12, 
    paddingHorizontal: 14, 
    marginBottom: Spacing.md, 
    borderRadius: 12,
    borderWidth: 1,
  },
  proStatusLeft: { flex: 1 },
  proStatusLabel: { fontSize: 13, fontWeight: '700', marginBottom: 2, letterSpacing: 0.3 },
  proStatusText: { fontSize: 12, letterSpacing: -0.08 },

  // Free Plan Upgrade Prompt
  upgradePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  upgradePromptLeft: { flex: 1 },
  upgradePromptTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  upgradePromptText: { fontSize: 12, letterSpacing: -0.08 },
  upgradePromptBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  upgradePromptBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  heroCard: { padding: 20, marginBottom: Spacing.lg, borderRadius: 16 },
  heroCardPositive: { backgroundColor: Colors.positiveBg },
  heroCardNegative: { backgroundColor: Colors.surface },
  heroIcon: { marginBottom: 12 },
  heroLabel: { fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  heroCarName: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8, letterSpacing: 0.38 },
  heroValue: { fontSize: 44, fontWeight: '700', color: Colors.positive, letterSpacing: 0, marginBottom: 4 },
  heroAction: { fontSize: 15, color: Colors.textSecondary, marginBottom: 16, letterSpacing: -0.24 },
  heroCta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroCtaText: { fontSize: 15, color: Colors.positive, fontWeight: '600' },

  statsRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 14, marginBottom: Spacing.xl },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.lg },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  statValue: { fontSize: 34, fontWeight: '700', letterSpacing: 0.37 },
  statLabel: { fontSize: 13, color: Colors.textTertiary, marginTop: 4, letterSpacing: -0.08 },

  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { ...Typography.headline, color: Colors.text },

  vehicleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.md },
  vehicleImage: { borderRadius: Radius.sm },
  vehicleCardPressed: { backgroundColor: Colors.surfaceHover },
  vehicleMain: { flex: 1 },
  vehicleName: { ...Typography.headline, color: Colors.text, marginBottom: 2 },
  vehicleMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  vehicleMetaText: { fontSize: 12, color: Colors.textTertiary },
  vehicleMetaDot: { fontSize: 12, color: Colors.textQuaternary, marginHorizontal: 6 },
  vehicleRecommendation: { fontSize: 13 },
  vehicleRight: { alignItems: 'flex-end', marginRight: Spacing.sm },
  vehicleEquity: { fontSize: 18, fontWeight: '700', fontFamily: 'monospace' },
  vehicleBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },

  addCta: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14 },
  addCtaText: { fontSize: 17, fontWeight: '600', color: 'white', letterSpacing: -0.41 },
});
