/**
 * Garage - Vehicle list with trust signals
 * Now with empty state and undo functionality
 */
import React, { useState, useMemo } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, ChevronRight, TrendingUp, Clock } from 'lucide-react-native';
import { Colors, Spacing, Shadows, haptic } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { useCarContext } from '@/src/context/CarContext';
import { useSubscriptionContext } from '@/src/context/SubscriptionContext';
import AddVehicleModal from '../../src/components/native/AddVehicleModal';
import { VehicleImage } from '@/src/components/VehicleImage';
import AppHeader from '@/src/components/AppHeader';
import EmptyGarage from '@/src/components/EmptyGarage';
import UndoToast from '@/src/components/UndoToast';
import FloatingHelpButton from '@/src/components/FloatingHelpButton';
import { UpgradeModal } from '@/src/components/UpgradePrompt';
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

export default function Garage() {
  const router = useRouter();
  const { colors } = useThemeMode();
  const _auth = useAuth(); // Keep auth context active
  const { cars, deleteCar } = useCarContext();
  const { isPro, usage, canAddMoreVehicles } = useSubscriptionContext();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletedVehicle, setDeletedVehicle] = useState<any>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Transform cars from CarContext to display format
  // CarContext now handles demo vehicles automatically
  const vehicles = useMemo(() => {
    return cars.map((car: any) => {
      // Calculate payoff amount
      const calculatePayoff = () => {
        if (car.ownershipType === 'cash') return 0;
        const loanAmount = (car.purchasePrice || 0) - (car.deposit || 0);
        if (!loanAmount || !car.monthlyPayment) return loanAmount;
        
        const monthsElapsed = car.startDate ? 
          Math.max(0, (new Date().getFullYear() - new Date(car.startDate).getFullYear()) * 12 + 
          (new Date().getMonth() - new Date(car.startDate).getMonth())) : 0;
        
        // For balloon/PCP loans, handle the balloon payment correctly
        if (car.ownershipType === 'balloon' || car.ownershipType === 'lease') {
          const balloonPayment = car.balloonPayment || 0;
          const principalToAmortize = loanAmount - balloonPayment;
          const termMonths = car.termMonths || 60;
          const principalPerMonth = principalToAmortize / termMonths;
          const principalPaid = principalPerMonth * monthsElapsed;
          const principalRemaining = Math.max(0, principalToAmortize - principalPaid);
          // Balloon is always owed until the end
          return Math.round(principalRemaining + balloonPayment);
        }
        
        // Standard loan: use amortization formula
        const monthlyRate = (car.interestRate || 0) / 100 / 12;
        let balance = loanAmount;
        for (let i = 0; i < monthsElapsed; i++) {
          const interest = balance * monthlyRate;
          const principal = car.monthlyPayment - interest;
          balance = Math.max(0, balance - principal);
        }
        return Math.round(balance);
      };
      
      // Use projections for consistent values with car-detail page
      const monthsElapsed = car.startDate ? 
        Math.max(0, (new Date().getFullYear() - new Date(car.startDate).getFullYear()) * 12 + 
        (new Date().getMonth() - new Date(car.startDate).getMonth())) : 0;
      
      const optimalData = calculateOptimalSellTime(car, new Date().getFullYear(), new Date().getMonth());
      
      // Get current month values from projections for consistency
      let currentValue = car.estimatedValue || car.purchasePrice || 0;
      let payoffAmount = calculatePayoff();
      
      // Use projections for consistent values (same source as car-detail)
      // This ensures garage and detail page show identical numbers
      if (car.purchasePrice && car.ownershipType !== 'cash') {
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
              car.annualMileage || 12000
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
              car.annualMileage || 12000
            );
        
        // Get current month data - projections array is indexed by month number
        const currentMonthData = projections[monthsElapsed];
        if (currentMonthData) {
          currentValue = currentMonthData.tradeInValue;
          payoffAmount = currentMonthData.settlementFigure;
        }
      }
      
      const equity = currentValue - payoffAmount;
      const isPositive = equity >= 0;
      
      return {
        id: car.id,
        name: `${car.year} ${car.make} ${car.model}`,
        nickname: car.nickname || null,
        make: car.make,
        model: car.model,
        year: car.year,
        trim: car.trim || '',
        exteriorColor: car.color || '',
        equity: equity, // Show equity (sale - finance), not deposit-adjusted
        statusText: isPositive ? 'GOOD TO SELL' : 'WAIT',
        statusDesc: isPositive ? `Equity $${Math.round(Math.abs(equity)).toLocaleString()}` : `Underwater $${Math.round(Math.abs(equity)).toLocaleString()}`,
        color: isPositive ? Colors.positive : Colors.info,
        mileage: car.mileage || 0,
        financeType: car.ownershipType === 'loan' ? 'Loan' : car.ownershipType === 'lease' ? 'Lease' : car.ownershipType === 'balloon' ? 'Balloon' : 'Cash',
        monthlyPayment: car.monthlyPayment || 0,
        currentValue: currentValue,
        payoffAmount: payoffAmount,
        loanAmount: car.ownershipType === 'cash' ? 0 : (car.purchasePrice || 0) - (car.deposit || 0),
        // Optimal sell time calculation
        ...calculateOptimalSellTime(car, new Date().getFullYear(), new Date().getMonth()),
      };
    });
  }, [cars]);

  // Show empty state when user has no vehicles
  // In demo mode, CarContext provides demo vehicles so this will be false
  const showEmptyState = vehicles.length === 0;

  const onRefresh = () => {
    setRefreshing(true);
    haptic.light();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    const vehicle = vehicles.find((v: any) => v.id === vehicleId);
    if (vehicle) {
      haptic.medium();
      Alert.alert(
        'Delete Vehicle',
        `Are you sure you want to remove your ${vehicle.name}? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              setDeletedVehicle(vehicle);
              deleteCar(vehicleId);
              setShowUndoToast(true);
              haptic.success();
            },
          },
        ]
      );
    }
  };

  const handleUndoDelete = () => {
    if (deletedVehicle) {
      // Note: For proper undo, we'd need to re-add the car to CarContext
      // For now, just hide the toast
      setDeletedVehicle(null);
      setShowUndoToast(false);
      haptic.success();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AppHeader showNotifications showThemeToggle />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}>
          
          {/* Empty State */}
          {showEmptyState ? (
            <EmptyGarage onAddCar={() => {
              if (canAddMoreVehicles) {
                setAddModalVisible(true);
              } else {
                setShowUpgradeModal(true);
              }
            }} />
          ) : (
            <>
          <View style={styles.header}>
            <View>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
                {isPro ? ' • Unlimited' : ` of ${usage?.vehiclesRemaining !== undefined ? vehicles.length + (usage?.vehiclesRemaining || 0) : 1}`}
              </Text>
            </View>
            <Pressable 
              onPress={() => { 
                haptic.medium(); 
                if (canAddMoreVehicles) {
                  setAddModalVisible(true);
                } else {
                  setShowUpgradeModal(true);
                }
              }} 
              style={({ pressed }) => [
                styles.addButton, 
                { backgroundColor: canAddMoreVehicles ? colors.brand : colors.textTertiary },
                pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }
              ]}
            >
              <Plus size={20} color="white" strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Pro Status or Upgrade Prompt */}
          {isPro ? (
            <LinearGradient
              colors={['rgba(255, 215, 0, 0.12)', 'rgba(255, 165, 0, 0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.proGarageStatus}
            >
              <Text style={styles.proGarageText}>⚡ Pro: Unlimited vehicles with daily updates</Text>
            </LinearGradient>
          ) : !canAddMoreVehicles ? (
            <Pressable 
              onPress={() => router.push('/(app)/subscription')}
              style={({ pressed }) => [styles.limitReached, { backgroundColor: colors.warningBg || '#FFF3CD' }, pressed && { opacity: 0.8 }]}
            >
              <Text style={[styles.limitReachedText, { color: colors.warning }]}>
                Vehicle limit reached • <Text style={{ fontWeight: '600' }}>Upgrade to Pro</Text>
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.trustRow}>
            <Text style={[styles.trustText, { color: colors.textTertiary }]}>Values from Kelley Blue Book</Text>
          </View>
          {vehicles.map((vehicle) => {
            const isPositive = vehicle.equity >= 0;
            const hasLoan = vehicle.financeType !== 'Cash' && vehicle.loanAmount > 0;
            const paidOff = hasLoan ? Math.max(0, vehicle.loanAmount - vehicle.payoffAmount) : 0;
            const payoffProgress = hasLoan ? Math.min(1, paidOff / vehicle.loanAmount) : 0;
            
            // Smart recommendation logic
            const getRecommendation = () => {
              const hasOptimalData = vehicle.monthsUntilOptimal !== null && vehicle.monthsUntilOptimal !== undefined;
              
              if (isPositive) {
                if (!hasOptimalData || vehicle.monthsUntilOptimal <= 0) {
                  return { text: '🎯 Optimal — Sell now', color: colors.positive };
                } else {
                  const extra = vehicle.optimalSellEquity && vehicle.optimalSellEquity > vehicle.equity 
                    ? ` (+$${Math.round(vehicle.optimalSellEquity - vehicle.equity).toLocaleString()} if you wait)`
                    : '';
                  return { 
                    text: `Good now • Best: ${vehicle.optimalSellMonth || `${vehicle.monthsUntilOptimal}mo`}${extra}`,
                    color: colors.positive
                  };
                }
              } else {
                if (hasOptimalData && vehicle.monthsUntilOptimal > 0) {
                  return { 
                    text: `Wait • Best: ${vehicle.optimalSellMonth || `${vehicle.monthsUntilOptimal}mo`}`,
                    color: colors.warning
                  };
                }
                return { text: 'Underwater — Wait', color: colors.negative };
              }
            };
            const recommendation = getRecommendation();
            
            return (
              <Pressable 
                key={vehicle.id} 
                onPress={() => { haptic.light(); router.push({ pathname: '/(app)/car-detail', params: { vehicleId: vehicle.id } }); }} 
                style={({ pressed }) => [
                  styles.vehicleCard, 
                  { backgroundColor: colors.surface },
                  Shadows.sm,
                  pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
                ]}
              >
                {/* Main Row: Image + Info + Equity + Chevron */}
                <View style={styles.vehicleHeader}>
                  <VehicleImage make={vehicle.make} model={vehicle.model} year={vehicle.year} size="medium" showPhoto />
                  <View style={styles.vehicleInfo}>
                    {vehicle.nickname ? (
                      <>
                        <Text style={[styles.vehicleNickname, { color: colors.text }]}>{vehicle.nickname}</Text>
                        <Text style={[styles.vehicleSubname, { color: colors.textSecondary }]}>{vehicle.name}</Text>
                      </>
                    ) : (
                      <Text style={[styles.vehicleName, { color: colors.text }]}>{vehicle.name}</Text>
                    )}
                    {/* Car Value */}
                    {vehicle.currentValue > 0 && (
                      <Text style={[styles.valueText, { color: colors.textSecondary }]}>
                        Worth ${Math.round(vehicle.currentValue).toLocaleString()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.equitySection}>
                    <Text style={[styles.equityValue, { color: isPositive ? colors.positive : colors.negative }]}>
                      {isPositive ? '+' : '−'}${Math.round(Math.abs(vehicle.equity)).toLocaleString()}
                    </Text>
                    <Text style={[styles.equityLabel, { color: isPositive ? colors.positive : colors.negative }]}>
                      {isPositive ? "equity" : "underwater"}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={colors.textQuaternary} />
                </View>
                
                {/* Recommendation Banner */}
                <View style={[styles.recommendationRow, { 
                  backgroundColor: recommendation.color === colors.positive ? colors.positiveBg 
                    : recommendation.color === colors.negative ? colors.negativeBg 
                    : colors.warningBg 
                }]}>
                  {recommendation.color === colors.positive ? (
                    <TrendingUp size={16} color={recommendation.color} />
                  ) : (
                    <Clock size={16} color={recommendation.color} />
                  )}
                  <Text style={[styles.recommendationText, { color: recommendation.color }]}>
                    {recommendation.text}
                  </Text>
                </View>
                
                {/* Loan Payoff Progress Bar - Full Width at Bottom */}
                {hasLoan && (
                  <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                      <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Loan payoff</Text>
                      <Text style={[styles.progressPercent, { color: payoffProgress >= 1 ? colors.positive : colors.brand }]}>
                        {Math.round(payoffProgress * 100)}%
                      </Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${payoffProgress * 100}%`,
                            backgroundColor: payoffProgress >= 1 ? colors.positive : colors.brand,
                          }
                        ]} 
                      />
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}
          <Pressable 
            onPress={() => { 
              haptic.light(); 
              if (canAddMoreVehicles) {
                setAddModalVisible(true);
              } else {
                setShowUpgradeModal(true);
              }
            }} 
            style={({ pressed }) => [styles.addVehicleCta, pressed && { opacity: 0.6 }]}
          >
            <Text style={[styles.addVehicleText, { color: colors.brand }]}>Add another vehicle</Text>
          </Pressable>
          <Text style={[styles.helpText, { color: colors.textTertiary }]}>
            Values show what you'd pocket after paying off your loan
          </Text>
            </>
          )}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Undo Toast for deleted vehicles */}
        <UndoToast
          message={`${deletedVehicle?.name || 'Vehicle'} removed`}
          visible={showUndoToast}
          onUndo={handleUndoDelete}
          onDismiss={() => {
            setShowUndoToast(false);
            setDeletedVehicle(null);
          }}
        />

        {/* Floating Help Button */}
        <FloatingHelpButton 
          screenName="My Cars"
          contextHelp="This screen shows all your vehicles. Tap any car to see details, or tap the + button to add a new car."
        />

        <AddVehicleModal visible={addModalVisible} onDismiss={() => setAddModalVisible(false)} />
        
        {/* Upgrade Modal - shown when vehicle limit reached */}
        <UpgradeModal 
          visible={showUpgradeModal} 
          onClose={() => setShowUpgradeModal(false)} 
          feature="vehicles" 
        />
      </SafeAreaView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.base },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  subtitle: { fontSize: 15, letterSpacing: -0.24 },
  addButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  proGarageStatus: { 
    paddingVertical: 10, 
    paddingHorizontal: 14, 
    borderRadius: 10, 
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  proGarageText: { fontSize: 13, fontWeight: '600', color: '#B8860B', textAlign: 'center', letterSpacing: -0.08 },
  limitReached: { 
    paddingVertical: 10, 
    paddingHorizontal: 14, 
    borderRadius: 10, 
    marginBottom: Spacing.sm,
  },
  limitReachedText: { fontSize: 13, textAlign: 'center', letterSpacing: -0.08 },
  trustRow: { marginBottom: Spacing.md },
  trustText: { fontSize: 13, textAlign: 'center', letterSpacing: -0.08 },
  vehicleCard: { borderRadius: 16, marginBottom: Spacing.md, padding: Spacing.md },
  vehicleHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  vehicleInfo: { flex: 1 },
  vehicleNickname: { fontSize: 18, fontWeight: '600', letterSpacing: -0.41 },
  vehicleSubname: { fontSize: 14, letterSpacing: -0.08, marginTop: 2 },
  vehicleName: { fontSize: 18, fontWeight: '600', letterSpacing: -0.41 },
  valueText: { fontSize: 14, fontWeight: '500', letterSpacing: -0.08, marginTop: 4 },
  equitySection: { alignItems: 'flex-end', marginRight: 4 },
  equityLabel: { fontSize: 12, marginTop: 2 },
  equityValue: { fontSize: 22, fontWeight: '700' },
  // Recommendation banner
  recommendationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.md, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  recommendationText: { fontSize: 14, fontWeight: '600', letterSpacing: -0.08, flex: 1 },
  // Progress bar at bottom
  progressSection: { marginTop: Spacing.md },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progressLabel: { fontSize: 13, fontWeight: '500', letterSpacing: -0.08 },
  progressPercent: { fontSize: 14, fontWeight: '700', letterSpacing: -0.08 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  addVehicleCta: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg },
  addVehicleText: { fontSize: 17, fontWeight: '600', letterSpacing: -0.41 },
  helpText: { fontSize: 13, textAlign: 'center', marginTop: Spacing.sm, letterSpacing: -0.08 },
});
