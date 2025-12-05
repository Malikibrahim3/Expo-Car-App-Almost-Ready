/**
 * Sell Options Explorer
 * Helps users understand different selling options, prices, and timeframes
 */

import React, { useState, useMemo } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  ChevronRight,
  Car,
  Store,
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  Zap,
  Shield,
  HelpCircle,
  Info,
  FileText,
  CreditCard,
  Building2,
  ArrowRightLeft,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { Typography, Spacing, Radius, Shadows, haptic, IconSizes } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';
import { useCarContext } from '@/src/context/CarContext';
import Toast from 'react-native-toast-message';
import FloatingHelpButton from '@/src/components/FloatingHelpButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper to calculate payoff amount
const calculatePayoffAmount = (loanAmount: number, monthlyPayment: number, interestRate: number, monthsElapsed: number) => {
  if (!loanAmount || !monthlyPayment) return 0;
  const monthlyRate = (interestRate || 0) / 100 / 12;
  let balance = loanAmount;
  for (let i = 0; i < monthsElapsed; i++) {
    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    balance = Math.max(0, balance - principal);
  }
  return Math.round(balance);
};

const calculateMonthsElapsed = (startDate: string | null) => {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return Math.max(0, months);
};

interface SellOption {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  price: number;
  timeframe: string;
  timeframeDays: number;
  effort: 'low' | 'medium' | 'high';
  pros: string[];
  cons: string[];
  bestFor: string;
  color: string;
}

/**
 * Get pricing multipliers based on vehicle value tier
 * Luxury/exotic vehicles have tighter margins (dealers pay closer to retail)
 * Economy vehicles have wider margins
 */
const getPricingTier = (value: number) => {
  if (value >= 150000) {
    // Exotic/Ultra-luxury ($150k+): Lamborghini, Ferrari, Bentley, etc.
    return {
      tradeIn: 0.92,      // 8% below retail (dealers compete for these)
      instant: 0.88,      // 12% below retail
      private: 1.03,      // 3% above retail (rare cars command premium)
      tier: 'exotic'
    };
  } else if (value >= 75000) {
    // Luxury ($75k-$150k): Porsche, high-end BMW/Mercedes, etc.
    return {
      tradeIn: 0.90,      // 10% below retail
      instant: 0.85,      // 15% below retail
      private: 1.05,      // 5% above retail
      tier: 'luxury'
    };
  } else if (value >= 40000) {
    // Premium ($40k-$75k): Entry luxury, loaded trucks, etc.
    return {
      tradeIn: 0.88,      // 12% below retail
      instant: 0.84,      // 16% below retail
      private: 1.06,      // 6% above retail
      tier: 'premium'
    };
  } else {
    // Standard (under $40k): Most mainstream vehicles
    return {
      tradeIn: 0.85,      // 15% below retail
      instant: 0.82,      // 18% below retail
      private: 1.08,      // 8% above retail (more room to negotiate)
      tier: 'standard'
    };
  }
};

// Generate sell options based on vehicle data with tiered pricing
const generateSellOptions = (vehicle: any): SellOption[] => {
  const currentValue = vehicle.estimatedValue || vehicle.purchasePrice || 0;
  const pricing = getPricingTier(currentValue);
  
  // Use stored values if available, otherwise calculate from tier
  const tradeInValue = vehicle.tradeInValue || Math.round(currentValue * pricing.tradeIn);
  const privateValue = vehicle.privatePartyValue || Math.round(currentValue * pricing.private);
  const instantOfferValue = Math.round(currentValue * pricing.instant);

  return [
    {
      id: 'instant',
      title: 'Quick Sale',
      subtitle: 'Carvana, CarMax, Vroom',
      icon: Zap,
      price: instantOfferValue,
      timeframe: '1-3 days',
      timeframeDays: 2,
      effort: 'low',
      pros: ['Fastest option', 'No negotiating', 'They pick up your car', 'Price is guaranteed'],
      cons: ['You\'ll get less money', 'Take it or leave it'],
      bestFor: 'When you need to sell fast with no hassle',
      color: '#06B6D4',
    },
    {
      id: 'dealer',
      title: 'Sell to a Dealer',
      subtitle: 'Local dealerships',
      icon: Store,
      price: tradeInValue,
      timeframe: '1-7 days',
      timeframeDays: 4,
      effort: 'medium',
      pros: ['Easy if you\'re buying another car', 'May save on taxes', 'One simple transaction'],
      cons: ['Less money than selling yourself', 'They may pressure you to buy'],
      bestFor: 'When you\'re buying another car from a dealer',
      color: '#8B5CF6',
    },
    {
      id: 'private',
      title: 'Sell It Yourself',
      subtitle: 'Facebook, Craigslist, etc.',
      icon: Users,
      price: privateValue,
      timeframe: '2-8 weeks',
      timeframeDays: 35,
      effort: 'high',
      pros: ['You\'ll get the most money', 'You\'re in control', 'Negotiate your price'],
      cons: ['Takes more time', 'Watch out for scams', 'More paperwork', 'Strangers test driving your car'],
      bestFor: 'When you want the most money and have time',
      color: '#22C55E',
    },
  ];
};

const TIMELINE_INFO = [
  {
    title: 'When to Sell',
    icon: Calendar,
    items: [
      { label: 'Best months', value: 'March-May, Sept-Oct', desc: 'Tax refund season & back-to-school' },
      { label: 'Avoid', value: 'December-January', desc: 'Holiday spending reduces buyers' },
      { label: 'Mileage sweet spots', value: 'Under 30k, 60k, 100k', desc: 'Before major service intervals' },
    ],
  },
  {
    title: 'Market Timing',
    icon: TrendingUp,
    items: [
      { label: 'New model release', value: '-5% to -15%', desc: 'Prices drop when new models launch' },
      { label: 'Gas price spikes', value: '+5% to +10%', desc: 'EVs & hybrids gain value' },
      { label: 'Inventory shortage', value: '+10% to +20%', desc: 'Like 2021-2022 chip shortage' },
    ],
  },
];

const EffortIndicator = ({ level, colors }: { level: 'low' | 'medium' | 'high'; colors: any }) => {
  const levels = { low: 1, medium: 2, high: 3 };
  const levelColors = { low: colors.positive, medium: colors.warning, high: colors.negative };
  
  return (
    <View style={styles.effortContainer}>
      <Text style={[styles.effortLabel, { color: colors.textTertiary }]}>Effort</Text>
      <View style={styles.effortDots}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.effortDot,
              { backgroundColor: i <= levels[level] ? levelColors[level] : colors.border },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const SellOptionCard = ({ 
  option, 
  isExpanded, 
  onToggle, 
  payoffAmount,
  colors 
}: { 
  option: SellOption; 
  isExpanded: boolean; 
  onToggle: () => void;
  payoffAmount: number;
  colors: any;
}) => {
  const Icon = option.icon;
  const equity = option.price - payoffAmount;
  const isPositiveEquity = equity >= 0;

  return (
    <Pressable
      onPress={() => { haptic.light(); onToggle(); }}
      style={({ pressed }) => [
        styles.optionCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { backgroundColor: colors.surfaceHover },
      ]}
    >
      {/* Header */}
      <View style={styles.optionHeader}>
        <View style={[styles.optionIcon, { backgroundColor: `${option.color}15` }]}>
          <Icon size={24} color={option.color} />
        </View>
        <View style={styles.optionInfo}>
          <Text style={[styles.optionTitle, { color: colors.text }]}>{option.title}</Text>
          <Text style={[styles.optionSubtitle, { color: colors.textTertiary }]}>{option.subtitle}</Text>
        </View>
        <View style={styles.optionPriceSection}>
          <Text style={[styles.optionPrice, { color: colors.text }]}>
            ${Math.round(option.price).toLocaleString()}
          </Text>
          <Text style={[styles.optionEquity, { color: isPositiveEquity ? colors.positive : colors.negative }]}>
            {isPositiveEquity ? '+' : ''}{Math.round(equity).toLocaleString()} equity
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={[styles.quickStats, { borderTopColor: colors.border }]}>
        <View style={styles.statItem}>
          <Clock size={14} color={colors.textTertiary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>{option.timeframe}</Text>
        </View>
        <EffortIndicator level={option.effort} colors={colors} />
        <View style={styles.expandIndicator}>
          <Text style={[styles.expandText, { color: colors.brand }]}>
            {isExpanded ? 'Less' : 'Details'}
          </Text>
          <ChevronRight
            size={16}
            color={colors.brand}
            style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
          />
        </View>
      </View>

      {/* Expanded Details */}
      {isExpanded && (
        <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
          {/* Best For */}
          <View style={[styles.bestForBadge, { backgroundColor: `${option.color}10` }]}>
            <Info size={14} color={option.color} />
            <Text style={[styles.bestForText, { color: option.color }]}>
              Best for: {option.bestFor}
            </Text>
          </View>

          {/* Pros */}
          <View style={styles.prosConsSection}>
            <Text style={[styles.prosConsTitle, { color: colors.positive }]}>Pros</Text>
            {option.pros.map((pro, idx) => (
              <View key={idx} style={styles.prosConsItem}>
                <CheckCircle size={14} color={colors.positive} />
                <Text style={[styles.prosConsText, { color: colors.textSecondary }]}>{pro}</Text>
              </View>
            ))}
          </View>

          {/* Cons */}
          <View style={styles.prosConsSection}>
            <Text style={[styles.prosConsTitle, { color: colors.negative }]}>Cons</Text>
            {option.cons.map((con, idx) => (
              <View key={idx} style={styles.prosConsItem}>
                <XCircle size={14} color={colors.negative} />
                <Text style={[styles.prosConsText, { color: colors.textSecondary }]}>{con}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <Pressable
            onPress={() => {
              haptic.medium();
              Toast.show({
                type: 'info',
                text1: `Exploring ${option.title}`,
                text2: 'This would show partner offers for this option',
              });
            }}
            style={({ pressed }) => [
              styles.optionCta,
              { backgroundColor: option.color },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.optionCtaText}>Get {option.title} Offers</Text>
            <ChevronRight size={18} color="white" />
          </Pressable>
        </View>
      )}
    </Pressable>
  );
};

const ComparisonBar = ({ options, payoffAmount, colors }: { options: SellOption[]; payoffAmount: number; colors: any }) => {
  const maxPrice = Math.max(...options.map(o => o.price));
  const minPrice = Math.min(...options.map(o => o.price));
  const range = maxPrice - minPrice;

  return (
    <View style={[styles.comparisonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.comparisonTitle, { color: colors.text }]}>Price Comparison</Text>
      <Text style={[styles.comparisonSubtitle, { color: colors.textTertiary }]}>
        Difference: ${Math.round(maxPrice - minPrice).toLocaleString()}
      </Text>
      
      <View style={styles.comparisonBars}>
        {options.map((option) => {
          const width = range > 0 ? ((option.price - minPrice) / range) * 100 : 100;
          const equity = option.price - payoffAmount;
          
          return (
            <View key={option.id} style={styles.barRow}>
              <View style={styles.barLabel}>
                <Text style={[styles.barLabelText, { color: colors.textSecondary }]}>{option.title}</Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: colors.backgroundTertiary }]}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${Math.max(20, width)}%`, backgroundColor: option.color },
                  ]}
                />
              </View>
              <Text style={[styles.barValue, { color: colors.text }]}>
                ${Math.round(option.price).toLocaleString()}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Payoff line indicator */}
      <View style={styles.payoffIndicator}>
        <View style={[styles.payoffLine, { backgroundColor: colors.negative }]} />
        <Text style={[styles.payoffText, { color: colors.textTertiary }]}>
          Payoff: ${Math.round(payoffAmount).toLocaleString()}
        </Text>
      </View>
    </View>
  );
};

// Finance types and their settlement requirements
const FINANCE_SETTLEMENT_INFO = [
  {
    type: 'Auto Loan (Bank/Credit Union)',
    icon: Building2,
    ownershipStatus: 'You own the car (with lien)',
    titleHolder: 'Lender holds title as security',
    canSellPrivately: true,
    mustSettleFirst: true,
    settlementProcess: [
      'Get payoff amount from your lender (valid 10-30 days)',
      'Find a buyer and agree on sale price',
      'Buyer pays the LENDER directly for the settlement amount',
      'Buyer pays YOU the remaining balance (your equity)',
      'Lender releases the title once paid (5-10 business days)',
      'Sign title over to buyer when received',
    ],
    tips: 'Meet at your bank branch - they can facilitate the split payment and verify funds. Some lenders have a "third party payoff" process specifically for this.',
    warning: 'The lender must be paid off FIRST before you receive any money. Never accept full payment yourself if there\'s outstanding finance.',
    example: 'Car sells for $25,000. You owe $18,000. Buyer pays $18,000 to your lender, then pays you $7,000.',
  },
  {
    type: 'Hire Purchase (HP)',
    icon: FileText,
    ownershipStatus: 'Finance company owns until settled',
    titleHolder: 'Finance company holds title',
    canSellPrivately: true,
    mustSettleFirst: true,
    settlementProcess: [
      'Request settlement figure from your HP provider',
      'Find a buyer and agree on sale price',
      'Buyer pays the HP COMPANY directly for settlement amount',
      'HP company confirms settlement and releases ownership',
      'Buyer pays YOU the remaining balance (your equity)',
      'You sign over the V5C/title to the buyer',
    ],
    tips: 'Many HP companies have a process for this - call them and ask about "selling with outstanding finance". They can provide bank details for the buyer to pay directly.',
    warning: 'You legally cannot sell the car without settling the HP first - the finance company owns it. Selling without settlement is fraud and the car can be repossessed from the new owner.',
    example: 'Car sells for $20,000. HP settlement is $14,000. Buyer pays $14,000 to HP company, then pays you $6,000.',
  },
  {
    type: 'Personal Contract Purchase (PCP)',
    icon: CreditCard,
    ownershipStatus: 'Finance company owns throughout',
    titleHolder: 'Finance company holds title',
    canSellPrivately: true,
    mustSettleFirst: true,
    settlementProcess: [
      'Get settlement figure (remaining payments + balloon/GMFV)',
      'Settlement is often higher than you expect due to balloon payment',
      'Find a buyer - sale price must cover settlement for you to profit',
      'Buyer pays the PCP COMPANY directly for settlement amount',
      'PCP company releases ownership to you',
      'Buyer pays YOU any remaining equity, then you sign over title',
    ],
    tips: 'Dealers often offer to handle PCP settlements and may beat your equity figure to win your trade-in. Get quotes from multiple dealers before selling privately.',
    warning: 'The balloon payment (GMFV) can be substantial - often 30-50% of the original car price. Make sure the car\'s value exceeds your total settlement before committing to sell.',
    example: 'Car worth $22,000. PCP settlement is $19,000 (includes $12,000 balloon). Buyer pays $19,000 to PCP company, pays you $3,000.',
  },
  {
    type: 'Lease (PCH/Operating Lease)',
    icon: Lock,
    ownershipStatus: 'You never own the car',
    titleHolder: 'Leasing company - always',
    canSellPrivately: false,
    mustSettleFirst: false,
    settlementProcess: [
      'You CANNOT sell a leased car - you don\'t own it',
      'Your only options are:',
      '• Return the car at end of lease term',
      '• Pay early termination fees to exit early',
      '• Transfer the lease to someone else (if allowed)',
      '• Some leases have a purchase option at the end',
    ],
    tips: 'Check if your lease allows transfers. Websites like Swapalease or LeaseTrader connect people who want out of leases with those looking for short-term leases.',
    warning: 'Early termination fees are typically 50% or more of your remaining payments. Read your contract carefully - it\'s usually cheaper to keep paying until the end.',
    example: 'No sale possible. If you have 12 months left at $400/month, early termination might cost $2,400+ in fees.',
  },
];

export default function SellOptionsScreen() {
  const router = useRouter();
  const { vehicleId } = useLocalSearchParams();
  const { colors } = useThemeMode();
  const { cars, loading, initialized } = useCarContext() as any;
  const [expandedOption, setExpandedOption] = useState<string | null>(null);
  const [showTimingGuide, setShowTimingGuide] = useState(false);
  const [showFinanceGuide, setShowFinanceGuide] = useState(false);
  const [expandedFinanceType, setExpandedFinanceType] = useState<string | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'fast' | 'best-price'>('all');

  // Find the car from context
  const carId = Array.isArray(vehicleId) ? vehicleId[0] : vehicleId;
  const car = cars.find((c: any) => String(c.id) === String(carId)) as any;

  // Calculate vehicle data from car context
  const VEHICLE = useMemo(() => {
    if (!car) return null;
    
    const monthsElapsed = calculateMonthsElapsed(car.startDate);
    const loanAmount = car.ownershipType === 'cash' ? 0 : (car.purchasePrice || 0) - (car.deposit || 0);
    const payoffAmount = calculatePayoffAmount(loanAmount, car.monthlyPayment || 0, car.interestRate || 0, monthsElapsed);
    const currentValue = car.estimatedValue || car.purchasePrice || 0;
    
    return {
      id: car.id,
      make: car.make,
      model: car.model,
      year: car.year,
      mileage: car.mileage || 0,
      payoffAmount: payoffAmount,
      currentValue: currentValue,
      privateValue: car.privatePartyValue || Math.round(currentValue * 1.05),
      tradeInValue: car.tradeInValue || Math.round(currentValue * 0.88),
      instantOfferValue: Math.round((car.tradeInValue || Math.round(currentValue * 0.88)) * 0.96),
      ownershipType: car.ownershipType,
    };
  }, [car]);

  // Generate sell options based on actual vehicle data
  const SELL_OPTIONS = useMemo(() => {
    if (!car) return [];
    return generateSellOptions(car);
  }, [car]);

  const toggleOption = (id: string) => {
    setExpandedOption(expandedOption === id ? null : id);
  };

  // Filter options based on urgency
  const filteredOptions = useMemo(() => {
    if (urgencyFilter === 'fast') {
      return SELL_OPTIONS.filter(o => o.timeframeDays <= 7);
    }
    if (urgencyFilter === 'best-price') {
      return [...SELL_OPTIONS].sort((a, b) => b.price - a.price);
    }
    return SELL_OPTIONS;
  }, [urgencyFilter, SELL_OPTIONS]);

  // Handle loading state
  if (loading || !initialized) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color={colors.text} />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Loading...</Text>
            </View>
            <View style={{ width: 40 }} />
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

  // Handle case where car is not found
  if (!car || !VEHICLE) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color={colors.text} />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Vehicle Not Found</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              This vehicle could not be found. Please select a vehicle from your garage first.
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/garage')}
              style={{ marginTop: 20, padding: 12, backgroundColor: colors.brand, borderRadius: 8 }}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Go to Garage</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => { haptic.light(); router.back(); }} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Sell Options</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
              {VEHICLE.year} {VEHICLE.make} {VEHICLE.model}
            </Text>
          </View>
          <Pressable
            onPress={() => { haptic.light(); setShowTimingGuide(!showTimingGuide); }}
            style={[styles.helpButton, { backgroundColor: colors.surface }]}
          >
            <HelpCircle size={20} color={colors.brand} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Simple Question - How fast do you need to sell? */}
          <View style={[styles.questionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.questionTitle, { color: colors.text }]}>How fast do you need to sell?</Text>
            <View style={styles.urgencyOptions}>
              <Pressable
                onPress={() => { haptic.light(); setUrgencyFilter('fast'); }}
                style={[
                  styles.urgencyOption,
                  { backgroundColor: urgencyFilter === 'fast' ? colors.brandSubtle : colors.backgroundTertiary, borderColor: urgencyFilter === 'fast' ? colors.brand : colors.border },
                ]}
              >
                <Zap size={18} color={urgencyFilter === 'fast' ? colors.brand : colors.textTertiary} />
                <Text style={[styles.urgencyText, { color: urgencyFilter === 'fast' ? colors.brand : colors.textSecondary }]}>
                  ASAP
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { haptic.light(); setUrgencyFilter('best-price'); }}
                style={[
                  styles.urgencyOption,
                  { backgroundColor: urgencyFilter === 'best-price' ? colors.brandSubtle : colors.backgroundTertiary, borderColor: urgencyFilter === 'best-price' ? colors.brand : colors.border },
                ]}
              >
                <DollarSign size={18} color={urgencyFilter === 'best-price' ? colors.brand : colors.textTertiary} />
                <Text style={[styles.urgencyText, { color: urgencyFilter === 'best-price' ? colors.brand : colors.textSecondary }]}>
                  Best Price
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { haptic.light(); setUrgencyFilter('all'); }}
                style={[
                  styles.urgencyOption,
                  { backgroundColor: urgencyFilter === 'all' ? colors.brandSubtle : colors.backgroundTertiary, borderColor: urgencyFilter === 'all' ? colors.brand : colors.border },
                ]}
              >
                <Text style={[styles.urgencyText, { color: urgencyFilter === 'all' ? colors.brand : colors.textSecondary }]}>
                  Show All
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Intro for new sellers */}
          <View style={[styles.introCard, { backgroundColor: colors.brandSubtle, borderColor: colors.borderAccent }]}>
            <Car size={20} color={colors.brand} />
            <View style={styles.introContent}>
              <Text style={[styles.introTitle, { color: colors.text }]}>New to selling?</Text>
              <Text style={[styles.introText, { color: colors.textSecondary }]}>
                Compare your options below. Each method has different prices, timeframes, and effort levels.
              </Text>
            </View>
          </View>

          {/* Price Comparison */}
          <ComparisonBar options={SELL_OPTIONS} payoffAmount={VEHICLE.payoffAmount} colors={colors} />

          {/* Sell Options */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Options</Text>
          
          {filteredOptions.map((option) => (
            <SellOptionCard
              key={option.id}
              option={option}
              isExpanded={expandedOption === option.id}
              onToggle={() => toggleOption(option.id)}
              payoffAmount={VEHICLE.payoffAmount}
              colors={colors}
            />
          ))}

          {/* Finance Settlement Guide Toggle */}
          <Pressable
            onPress={() => { haptic.light(); setShowFinanceGuide(!showFinanceGuide); }}
            style={[styles.guideToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.guideToggleIcon, { backgroundColor: colors.warningBg }]}>
              <CreditCard size={20} color={colors.warning} />
            </View>
            <View style={styles.guideToggleContent}>
              <Text style={[styles.guideToggleTitle, { color: colors.text }]}>
                Got Outstanding Finance?
              </Text>
              <Text style={[styles.guideToggleSubtitle, { color: colors.textTertiary }]}>
                Learn how settlement works for your finance type
              </Text>
            </View>
            {showFinanceGuide ? (
              <ChevronUp size={20} color={colors.textTertiary} />
            ) : (
              <ChevronDown size={20} color={colors.textTertiary} />
            )}
          </Pressable>

          {/* Finance Settlement Education */}
          {showFinanceGuide && (
            <View style={styles.financeGuideSection}>
              {/* Important Notice */}
              <View style={[styles.financeNotice, { backgroundColor: colors.warningBg, borderColor: `${colors.warning}40` }]}>
                <AlertCircle size={18} color={colors.warning} />
                <Text style={[styles.financeNoticeText, { color: colors.text }]}>
                  If you have outstanding finance, the car isn't fully yours until it's paid off. Here's what that means for selling.
                </Text>
              </View>

              {/* Finance Type Cards */}
              {FINANCE_SETTLEMENT_INFO.map((finance, idx) => {
                const FinanceIcon = finance.icon;
                const isExpanded = expandedFinanceType === finance.type;
                
                return (
                  <Pressable
                    key={idx}
                    onPress={() => {
                      haptic.light();
                      setExpandedFinanceType(isExpanded ? null : finance.type);
                    }}
                    style={[
                      styles.financeCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    {/* Finance Type Header */}
                    <View style={styles.financeCardHeader}>
                      <View style={[styles.financeIcon, { backgroundColor: colors.brandSubtle }]}>
                        <FinanceIcon size={20} color={colors.brand} />
                      </View>
                      <View style={styles.financeCardInfo}>
                        <Text style={[styles.financeCardTitle, { color: colors.text }]}>
                          {finance.type}
                        </Text>
                        <View style={styles.financeCardMeta}>
                          {finance.canSellPrivately ? (
                            <View style={[styles.sellBadge, { backgroundColor: colors.positiveBg }]}>
                              <Unlock size={10} color={colors.positive} />
                              <Text style={[styles.sellBadgeText, { color: colors.positive }]}>
                                Can sell privately
                              </Text>
                            </View>
                          ) : (
                            <View style={[styles.sellBadge, { backgroundColor: colors.negativeBg }]}>
                              <Lock size={10} color={colors.negative} />
                              <Text style={[styles.sellBadgeText, { color: colors.negative }]}>
                                Cannot sell privately
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <ChevronRight
                        size={18}
                        color={colors.textTertiary}
                        style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                      />
                    </View>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <View style={[styles.financeCardExpanded, { borderTopColor: colors.border }]}>
                        {/* Ownership Status */}
                        <View style={styles.financeDetailRow}>
                          <Text style={[styles.financeDetailLabel, { color: colors.textTertiary }]}>
                            Ownership
                          </Text>
                          <Text style={[styles.financeDetailValue, { color: colors.text }]}>
                            {finance.ownershipStatus}
                          </Text>
                        </View>
                        <View style={styles.financeDetailRow}>
                          <Text style={[styles.financeDetailLabel, { color: colors.textTertiary }]}>
                            Title/V5C held by
                          </Text>
                          <Text style={[styles.financeDetailValue, { color: colors.text }]}>
                            {finance.titleHolder}
                          </Text>
                        </View>

                        {/* Settlement Process */}
                        <Text style={[styles.financeProcessTitle, { color: colors.text }]}>
                          How to Sell:
                        </Text>
                        {finance.settlementProcess.map((step, stepIdx) => (
                          <View key={stepIdx} style={styles.financeStep}>
                            <View style={[styles.financeStepNumber, { backgroundColor: colors.brandSubtle }]}>
                              <Text style={[styles.financeStepNumberText, { color: colors.brand }]}>
                                {stepIdx + 1}
                              </Text>
                            </View>
                            <Text style={[styles.financeStepText, { color: colors.textSecondary }]}>
                              {step}
                            </Text>
                          </View>
                        ))}

                        {/* Tip */}
                        <View style={[styles.financeTip, { backgroundColor: colors.positiveBg }]}>
                          <CheckCircle size={14} color={colors.positive} />
                          <Text style={[styles.financeTipText, { color: colors.text }]}>
                            {finance.tips}
                          </Text>
                        </View>

                        {/* Warning */}
                        <View style={[styles.financeWarning, { backgroundColor: colors.negativeBg }]}>
                          <AlertCircle size={14} color={colors.negative} />
                          <Text style={[styles.financeWarningText, { color: colors.text }]}>
                            {finance.warning}
                          </Text>
                        </View>

                        {/* Example */}
                        {finance.example && (
                          <View style={[styles.financeExample, { backgroundColor: colors.backgroundTertiary }]}>
                            <Text style={[styles.financeExampleLabel, { color: colors.textTertiary }]}>
                              Example:
                            </Text>
                            <Text style={[styles.financeExampleText, { color: colors.text }]}>
                              {finance.example}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              })}

              {/* Private Sale with Finance - Step by Step */}
              <View style={[styles.privateFinanceCard, { backgroundColor: colors.surface, borderColor: colors.borderAccent }]}>
                <View style={styles.privateFinanceHeader}>
                  <ArrowRightLeft size={20} color={colors.brand} />
                  <Text style={[styles.privateFinanceTitle, { color: colors.text }]}>
                    How Private Sales Work with Finance
                  </Text>
                </View>
                <Text style={[styles.privateFinanceSubtitle, { color: colors.textSecondary }]}>
                  The key rule: Finance company gets paid FIRST, then you get your equity.
                </Text>

                <View style={styles.privateFinanceSteps}>
                  <View style={styles.privateStep}>
                    <View style={[styles.privateStepDot, { backgroundColor: colors.brand }]} />
                    <View style={styles.privateStepContent}>
                      <Text style={[styles.privateStepTitle, { color: colors.text }]}>
                        1. Get your settlement figure
                      </Text>
                      <Text style={[styles.privateStepDesc, { color: colors.textTertiary }]}>
                        Contact your finance company for the exact payoff amount. Ask for their bank details for third-party payments. Settlement figures are usually valid for 10-30 days.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.privateStep}>
                    <View style={[styles.privateStepDot, { backgroundColor: colors.brand }]} />
                    <View style={styles.privateStepContent}>
                      <Text style={[styles.privateStepTitle, { color: colors.text }]}>
                        2. Agree sale price with buyer
                      </Text>
                      <Text style={[styles.privateStepDesc, { color: colors.textTertiary }]}>
                        Be upfront that there's outstanding finance. Show them the settlement figure. Your equity = Sale price minus settlement.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.privateStep}>
                    <View style={[styles.privateStepDot, { backgroundColor: colors.warning }]} />
                    <View style={styles.privateStepContent}>
                      <Text style={[styles.privateStepTitle, { color: colors.text }]}>
                        3. Buyer pays finance company FIRST
                      </Text>
                      <Text style={[styles.privateStepDesc, { color: colors.textTertiary }]}>
                        Buyer transfers the settlement amount directly to your finance company. This clears the debt and releases ownership to you. Get confirmation from the finance company.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.privateStep}>
                    <View style={[styles.privateStepDot, { backgroundColor: colors.brand }]} />
                    <View style={styles.privateStepContent}>
                      <Text style={[styles.privateStepTitle, { color: colors.text }]}>
                        4. Buyer pays YOU the remaining equity
                      </Text>
                      <Text style={[styles.privateStepDesc, { color: colors.textTertiary }]}>
                        Once finance is settled, buyer pays you the difference between sale price and settlement. This is your profit from the sale.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.privateStep}>
                    <View style={[styles.privateStepDot, { backgroundColor: colors.positive }]} />
                    <View style={styles.privateStepContent}>
                      <Text style={[styles.privateStepTitle, { color: colors.text }]}>
                        5. Complete the paperwork
                      </Text>
                      <Text style={[styles.privateStepDesc, { color: colors.textTertiary }]}>
                        Once you receive the clear title from the finance company (5-10 days), sign it over to the buyer. Provide a bill of sale and hand over the keys.
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Example Box */}
                <View style={[styles.exampleBox, { backgroundColor: colors.brandSubtle, borderColor: colors.borderAccent }]}>
                  <Text style={[styles.exampleTitle, { color: colors.brand }]}>Example</Text>
                  <Text style={[styles.exampleText, { color: colors.text }]}>
                    You're selling your car for $25,000. You owe $18,000 on finance.
                  </Text>
                  <View style={styles.exampleBreakdown}>
                    <Text style={[styles.exampleLine, { color: colors.textSecondary }]}>
                      • Buyer pays $18,000 → Finance company
                    </Text>
                    <Text style={[styles.exampleLine, { color: colors.textSecondary }]}>
                      • Buyer pays $7,000 → You (your equity)
                    </Text>
                    <Text style={[styles.exampleLine, { color: colors.positive }]}>
                      • You walk away with $7,000 profit
                    </Text>
                  </View>
                </View>

                <View style={[styles.privateFinanceNote, { backgroundColor: colors.backgroundTertiary }]}>
                  <Info size={14} color={colors.textTertiary} />
                  <Text style={[styles.privateFinanceNoteText, { color: colors.textTertiary }]}>
                    Pro tip: Meet at your bank or the finance company's office. They can help facilitate the transaction and verify all payments clear properly.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Timing Guide */}
          {showTimingGuide && (
            <View style={styles.timingSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Timing Guide</Text>
              
              {TIMELINE_INFO.map((section, idx) => {
                const SectionIcon = section.icon;
                return (
                  <View
                    key={idx}
                    style={[styles.timingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={styles.timingHeader}>
                      <SectionIcon size={18} color={colors.brand} />
                      <Text style={[styles.timingTitle, { color: colors.text }]}>{section.title}</Text>
                    </View>
                    {section.items.map((item, itemIdx) => (
                      <View key={itemIdx} style={[styles.timingItem, { borderTopColor: colors.border }]}>
                        <View style={styles.timingItemHeader}>
                          <Text style={[styles.timingLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                          <Text style={[styles.timingValue, { color: colors.text }]}>{item.value}</Text>
                        </View>
                        <Text style={[styles.timingDesc, { color: colors.textTertiary }]}>{item.desc}</Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          )}

          {/* Help Card */}
          <View style={[styles.helpCard, { backgroundColor: colors.backgroundTertiary }]}>
            <AlertCircle size={16} color={colors.textTertiary} />
            <Text style={[styles.helpText, { color: colors.textTertiary }]}>
              Prices are estimates based on current market data. Actual offers may vary based on vehicle condition and local demand.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Floating Help Button */}
        <FloatingHelpButton 
          screenName="Sell Options"
          contextHelp="This screen shows different ways to sell your car. Quick Sale is fastest, Private Sale gets you the most money. Tap any option to see pros and cons."
        />
      </SafeAreaView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.base, paddingBottom: 20 },

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
  headerTitle: { ...Typography.headline },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  helpButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  questionCard: {
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  urgencyOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  urgencyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: Radius.sm,
  },
  urgencyText: {
    fontSize: 13,
    fontWeight: '600',
  },

  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },
  introContent: { flex: 1 },
  introTitle: { ...Typography.subheadline, marginBottom: 4 },
  introText: { fontSize: 13, lineHeight: 18 },

  comparisonCard: {
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },
  comparisonTitle: { ...Typography.headline, marginBottom: 4 },
  comparisonSubtitle: { fontSize: 13, marginBottom: Spacing.md },
  comparisonBars: { gap: Spacing.sm },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barLabel: { width: 80 },
  barLabelText: { fontSize: 12 },
  barTrack: {
    flex: 1,
    height: 24,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    width: 70,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  payoffIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
  },
  payoffLine: {
    width: 20,
    height: 2,
  },
  payoffText: { fontSize: 12 },

  sectionTitle: {
    ...Typography.headline,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },

  optionCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: { flex: 1 },
  optionTitle: { ...Typography.headline, marginBottom: 2 },
  optionSubtitle: { fontSize: 12 },
  optionPriceSection: { alignItems: 'flex-end' },
  optionPrice: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  optionEquity: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: { fontSize: 13 },
  effortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  effortLabel: { fontSize: 12 },
  effortDots: {
    flexDirection: 'row',
    gap: 4,
  },
  effortDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  expandIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandText: { fontSize: 13, fontWeight: '500' },

  expandedContent: {
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  bestForBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  bestForText: { fontSize: 13, fontWeight: '500', flex: 1 },
  prosConsSection: { marginBottom: Spacing.md },
  prosConsTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  prosConsItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  prosConsText: { fontSize: 13, flex: 1, lineHeight: 18 },
  optionCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
  },
  optionCtaText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },

  timingSection: { marginTop: Spacing.md },
  timingCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  timingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  timingTitle: { ...Typography.subheadline },
  timingItem: {
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  timingItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timingLabel: { fontSize: 13 },
  timingValue: { fontSize: 14, fontWeight: '600' },
  timingDesc: { fontSize: 12, lineHeight: 16 },

  helpCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.lg,
  },
  helpText: { flex: 1, fontSize: 12, lineHeight: 18 },

  // Finance Guide Styles
  guideToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  guideToggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideToggleContent: { flex: 1 },
  guideToggleTitle: { ...Typography.subheadline, marginBottom: 2 },
  guideToggleSubtitle: { fontSize: 12 },

  financeGuideSection: { marginBottom: Spacing.lg },
  financeNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  financeNoticeText: { flex: 1, fontSize: 13, lineHeight: 20 },

  financeCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  financeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  financeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  financeCardInfo: { flex: 1 },
  financeCardTitle: { ...Typography.subheadline, marginBottom: 4 },
  financeCardMeta: { flexDirection: 'row', alignItems: 'center' },
  sellBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  sellBadgeText: { fontSize: 11, fontWeight: '600' },

  financeCardExpanded: {
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  financeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  financeDetailLabel: { fontSize: 12 },
  financeDetailValue: { fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },

  financeProcessTitle: {
    ...Typography.subheadline,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  financeStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  financeStepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  financeStepNumberText: { fontSize: 12, fontWeight: '700' },
  financeStepText: { flex: 1, fontSize: 13, lineHeight: 20 },

  financeTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
  },
  financeTipText: { flex: 1, fontSize: 12, lineHeight: 18 },

  financeWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
  },
  financeWarningText: { flex: 1, fontSize: 12, lineHeight: 18 },

  privateFinanceCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  privateFinanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  privateFinanceTitle: { ...Typography.subheadline },
  privateFinanceSubtitle: { fontSize: 13, marginBottom: Spacing.md },

  privateFinanceSteps: { gap: Spacing.md },
  privateStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  privateStepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  privateStepContent: { flex: 1 },
  privateStepTitle: { ...Typography.subheadline, marginBottom: 2 },
  privateStepDesc: { fontSize: 12, lineHeight: 18 },

  privateFinanceNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.md,
  },
  privateFinanceNoteText: { flex: 1, fontSize: 12, lineHeight: 18 },

  exampleBox: {
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.sm,
    marginTop: Spacing.md,
  },
  exampleTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  exampleText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  exampleBreakdown: {
    gap: 4,
  },
  exampleLine: {
    fontSize: 13,
    lineHeight: 20,
  },

  financeExample: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
  },
  financeExampleLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  financeExampleText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
