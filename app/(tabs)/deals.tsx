/**
 * Deals Tab - Partner Offers
 * Shows deals from partners on cars, financing, trade-ins
 */

import React, { useState } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Tag, 
  Percent, 
  Car, 
  DollarSign, 
  ChevronRight, 
  Star, 
  Clock, 
  Shield,
  Zap,
  ExternalLink
} from 'lucide-react-native';
import { Colors, Typography, Spacing, Radius, haptic } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';
import Toast from 'react-native-toast-message';
import { VehicleImage } from '@/src/components/VehicleImage';
import { DataSourceBadge, LastUpdated, SecurityBadge } from '@/src/components/TrustBadge';
import AppHeader from '@/src/components/AppHeader';
import { useAuth } from '@/src/context/AuthContext';

interface Deal {
  id: string;
  partner: string;
  partnerLogo?: string;
  title: string;
  description: string;
  type: 'trade-in' | 'financing' | 'insurance' | 'service' | 'new-car';
  highlight: string;
  expiresIn?: string;
  rating?: number;
  featured?: boolean;
  msrp?: number;
  discount?: number;
}

const PARTNER_DEALS: Deal[] = [
  // New Car Deals
  {
    id: 'nc1',
    partner: 'BMW',
    title: '2024 BMW 3 Series',
    description: 'Exclusive AutoTrack member pricing. 330i with M Sport package.',
    type: 'new-car',
    highlight: '$3,500 off MSRP',
    expiresIn: '7 days',
    featured: true,
    msrp: 46900,
    discount: 3500,
  },
  {
    id: 'nc2',
    partner: 'Mercedes-Benz',
    title: '2024 C-Class Sedan',
    description: 'Premium sedan with latest tech. Special financing available.',
    type: 'new-car',
    highlight: '1.9% APR for 60 months',
    expiresIn: '14 days',
    msrp: 48100,
  },
  {
    id: 'nc3',
    partner: 'Tesla',
    title: '2024 Model 3',
    description: 'Long Range AWD with free Supercharging for 1 year.',
    type: 'new-car',
    highlight: 'Free Supercharging',
    msrp: 47990,
  },
  {
    id: 'nc4',
    partner: 'Audi',
    title: '2024 A4 Premium Plus',
    description: 'Quattro AWD with Virtual Cockpit. Loyalty bonus available.',
    type: 'new-car',
    highlight: '$2,000 loyalty bonus',
    expiresIn: '21 days',
    msrp: 45900,
    discount: 2000,
  },
  // Trade-In Deals
  {
    id: '1',
    partner: 'Carvana',
    title: 'Instant Cash Offer',
    description: 'Get a real offer in 2 minutes. We\'ll pick up your car for free.',
    type: 'trade-in',
    highlight: '+$500 bonus this week',
    expiresIn: '3 days',
    rating: 4.5,
    featured: true,
  },
  {
    id: '2',
    partner: 'CarMax',
    title: 'No-Haggle Trade-In',
    description: 'Get an instant offer good for 7 days. No obligation to buy from us.',
    type: 'trade-in',
    highlight: 'Price match guarantee',
    rating: 4.3,
  },
  // Financing Deals
  {
    id: '3',
    partner: 'Capital One Auto',
    title: 'Pre-Qualified Financing',
    description: 'Check your rate in seconds with no impact to your credit score.',
    type: 'financing',
    highlight: 'Rates from 5.49% APR',
    rating: 4.6,
  },
  {
    id: '4',
    partner: 'LightStream',
    title: 'Auto Loan Refinance',
    description: 'Lower your monthly payment. Same day funding available.',
    type: 'financing',
    highlight: 'No fees ever',
    rating: 4.7,
  },
  // Insurance
  {
    id: '5',
    partner: 'Root Insurance',
    title: 'Save on Car Insurance',
    description: 'Good drivers save an average of $900/year. Quote in 3 minutes.',
    type: 'insurance',
    highlight: 'Based on how you drive',
    rating: 4.2,
  },
  // Service
  {
    id: '6',
    partner: 'YourMechanic',
    title: 'Mobile Car Service',
    description: 'Certified mechanics come to you. Book online, pay less than the dealer.',
    type: 'service',
    highlight: '30% less than dealers',
    rating: 4.4,
  },
];

const getTypeIcon = (type: Deal['type']) => {
  switch (type) {
    case 'new-car': return Car;
    case 'trade-in': return Car;
    case 'financing': return DollarSign;
    case 'insurance': return Shield;
    case 'service': return Zap;
    default: return Tag;
  }
};

const getTypeColor = (type: Deal['type']) => {
  switch (type) {
    case 'new-car': return Colors.brand;
    case 'trade-in': return Colors.positive;
    case 'financing': return Colors.purple;
    case 'insurance': return Colors.warning;
    case 'service': return '#06B6D4';
    default: return Colors.textSecondary;
  }
};

const DealCard = ({ deal, onPress, colors }: { deal: Deal; onPress: () => void; colors: any }) => {
  const TypeIcon = getTypeIcon(deal.type);
  const typeColor = getTypeColor(deal.type);

  return (
    <Pressable 
      onPress={onPress}
      style={({ pressed }) => [
        styles.dealCard, 
        { backgroundColor: colors.surface, borderColor: colors.border },
        deal.featured && { borderColor: colors.warning, backgroundColor: 'rgba(234, 179, 8, 0.05)' },
        pressed && { backgroundColor: colors.surfaceHover }
      ]}
    >
      {deal.featured && (
        <View style={styles.featuredBadge}>
          <Star size={12} color={colors.warning} fill={colors.warning} />
          <Text style={[styles.featuredText, { color: colors.warning }]}>FEATURED</Text>
        </View>
      )}

      <View style={styles.dealHeader}>
        {/* Show real car photo for new-car deals, logo for others */}
        {deal.type === 'new-car' ? (
          <VehicleImage 
            make={deal.partner} 
            model={deal.title.replace(/^\d{4}\s+\w+\s+/, '')} // Extract model from title
            size="medium" 
            style={styles.dealCarImage} 
            showPhoto={true}
          />
        ) : (
          <View style={[styles.typeIcon, { backgroundColor: `${typeColor}15` }]}>
            <TypeIcon size={20} color={typeColor} />
          </View>
        )}
        <View style={styles.dealPartner}>
          <Text style={[styles.partnerName, { color: colors.text }]}>{deal.partner}</Text>
          {deal.rating && (
            <View style={styles.ratingRow}>
              <Star size={12} color={colors.warning} fill={colors.warning} />
              <Text style={[styles.ratingText, { color: colors.textSecondary }]}>{deal.rating}</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={[styles.dealTitle, { color: colors.text }]}>{deal.title}</Text>
      <Text style={[styles.dealDescription, { color: colors.textSecondary }]}>{deal.description}</Text>

      {/* Show MSRP for new cars */}
      {deal.type === 'new-car' && deal.msrp && (
        <View style={styles.priceRow}>
          <Text style={[styles.msrpLabel, { color: colors.textTertiary }]}>Sticker Price</Text>
          <Text style={[styles.msrpValue, { color: colors.text }]}>${Math.round(deal.msrp).toLocaleString()}</Text>
          {deal.discount && (
            <Text style={[styles.discountValue, { color: colors.positive }]}>-${Math.round(deal.discount).toLocaleString()}</Text>
          )}
        </View>
      )}

      <View style={styles.dealFooter}>
        <View style={[styles.highlightBadge, { backgroundColor: colors.positiveBg }]}>
          <Percent size={12} color={colors.positive} />
          <Text style={[styles.highlightText, { color: colors.positive }]}>{deal.highlight}</Text>
        </View>
        {deal.expiresIn && (
          <View style={styles.expiresBadge}>
            <Clock size={12} color={colors.warning} />
            <Text style={[styles.expiresText, { color: colors.warning }]}>Ends in {deal.expiresIn}</Text>
          </View>
        )}
      </View>

      <View style={[styles.dealCta, { borderTopColor: colors.border }]}>
        <Text style={[styles.dealCtaText, { color: colors.brand }]}>View Offer</Text>
        <ExternalLink size={14} color={colors.brand} />
      </View>
    </Pressable>
  );
};

export default function DealsPage() {
  const { colors } = useThemeMode();
  const { isDemoMode } = useAuth() as any;
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const onRefresh = () => {
    setRefreshing(true);
    haptic.light();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleDealPress = (deal: Deal) => {
    haptic.medium();
    Toast.show({
      type: 'info',
      text1: `Opening ${deal.partner}`,
      text2: 'This would open the partner\'s website',
    });
  };

  // Only show deals in demo mode - fresh accounts should see empty state
  const availableDeals = isDemoMode ? PARTNER_DEALS : [];
  
  const filteredDeals = selectedType 
    ? availableDeals.filter(d => d.type === selectedType)
    : availableDeals;

  const filterTypes = [
    { key: null, label: 'All' },
    { key: 'new-car', label: 'New Cars' },
    { key: 'trade-in', label: 'Sell to Dealer' },
    { key: 'financing', label: 'Financing' },
    { key: 'insurance', label: 'Insurance' },
    { key: 'service', label: 'Service' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <AppHeader showNotifications showThemeToggle />
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Partner Deals</Text>
            <Text style={[styles.subtitle, { color: colors.textTertiary }]}>Exclusive offers from our trusted partners</Text>
          </View>

          {/* Trust indicators */}
          <View style={styles.trustRow}>
            <DataSourceBadge source="market" />
            <SecurityBadge type="verified" />
            <LastUpdated timestamp={new Date(Date.now() - 30 * 60 * 1000)} />
          </View>

          {/* Filter Pills */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            {filterTypes.map((filter) => (
              <Pressable
                key={filter.key || 'all'}
                onPress={() => { haptic.light(); setSelectedType(filter.key); }}
                style={[
                  styles.filterPill,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  selectedType === filter.key && { backgroundColor: colors.brandSubtle, borderColor: colors.brand }
                ]}
              >
                <Text style={[
                  styles.filterPillText,
                  { color: colors.textSecondary },
                  selectedType === filter.key && { color: colors.brand }
                ]}>
                  {filter.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Deals List */}
          {filteredDeals.length > 0 ? (
            <View style={styles.dealsList}>
              {filteredDeals.map((deal) => (
                <DealCard 
                  key={deal.id} 
                  deal={deal} 
                  onPress={() => handleDealPress(deal)}
                  colors={colors}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.backgroundTertiary }]}>
                <Tag size={48} color={colors.textQuaternary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No deals available</Text>
              <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                Partner deals and offers will appear here once available. Check back soon!
              </Text>
            </View>
          )}

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={[styles.disclaimerText, { color: colors.textQuaternary }]}>
              AutoTrack may receive compensation from partners. Offers subject to eligibility and approval.
            </Text>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.base },

  header: { paddingTop: Spacing.md, marginBottom: Spacing.md },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: Colors.textTertiary, marginTop: 4 },
  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, marginBottom: Spacing.md },

  filterScroll: { marginBottom: Spacing.lg, marginHorizontal: -Spacing.base },
  filterContent: { paddingHorizontal: Spacing.base, gap: 8 },
  filterPill: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    backgroundColor: Colors.surface, 
    borderWidth: 1, 
    borderColor: Colors.border,
    borderRadius: 20,
  },
  filterPillActive: { 
    backgroundColor: Colors.brandSubtle, 
    borderColor: Colors.brand,
  },
  filterPillText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  filterPillTextActive: { color: Colors.brand },

  dealsList: { gap: Spacing.md },

  dealCard: { 
    backgroundColor: Colors.surface, 
    borderWidth: 1, 
    borderColor: Colors.border, 
    padding: Spacing.md,
  },
  dealCarImage: {
    marginRight: 12,
  },
  dealCardFeatured: { 
    borderColor: Colors.warning,
    backgroundColor: 'rgba(234, 179, 8, 0.05)',
  },
  dealCardPressed: { backgroundColor: Colors.surfaceHover },

  featuredBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    marginBottom: 12,
  },
  featuredText: { fontSize: 10, fontWeight: '700', color: Colors.warning, letterSpacing: 0.5 },

  dealHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  typeIcon: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: 12,
  },
  dealPartner: { flex: 1 },
  partnerName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 12, color: Colors.textSecondary },

  dealTitle: { ...Typography.headline, color: Colors.text, marginBottom: 4 },
  dealDescription: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 12 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  msrpLabel: { fontSize: 12, color: Colors.textTertiary }, // "Sticker Price" label
  msrpValue: { fontSize: 16, fontWeight: '600', color: Colors.text },
  discountValue: { fontSize: 14, fontWeight: '600', color: Colors.positive },

  dealFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  highlightBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: Colors.positiveBg, 
    paddingHorizontal: 8, 
    paddingVertical: 4,
    borderRadius: 4,
  },
  highlightText: { fontSize: 12, color: Colors.positive, fontWeight: '600' },
  expiresBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: 'rgba(234, 179, 8, 0.1)', 
    paddingHorizontal: 8, 
    paddingVertical: 4,
    borderRadius: 4,
  },
  expiresText: { fontSize: 12, color: Colors.warning, fontWeight: '500' },

  dealCta: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'flex-end',
    gap: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dealCtaText: { fontSize: 14, color: Colors.brand, fontWeight: '600' },

  disclaimer: { marginTop: Spacing.xl, padding: Spacing.md },
  disclaimerText: { fontSize: 12, color: Colors.textQuaternary, textAlign: 'center', lineHeight: 18 },

  emptyState: { 
    alignItems: 'center', 
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  emptyIcon: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  emptyMessage: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
