/**
 * Subscription Context
 * 
 * Provides subscription state and actions throughout the app.
 * Integrates with AuthContext to automatically load subscription data.
 * Supports demo mode with Free/Pro toggle for testing.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  UserSubscription,
  PlanType,
  PlanLimits,
  RefreshEligibility,
  UserRefreshSummary,
  MarketShiftAlert,
  PLAN_DEFINITIONS,
} from '../types/subscription';
import {
  getSubscriptionWithUsage,
  canAddVehicle as checkCanAddVehicle,
  upgradeToPro,
  cancelSubscription,
  setVehicleRefreshTier,
} from '../services/subscriptionService';
import {
  checkManualRefreshEligibility,
  getUserRefreshSummary,
  getActiveMarketShifts,
  initializeVehicleTracking,
  removeVehicleTracking,
} from '../services/refreshSchedulerService';

// Demo mode subscriptions
const DEMO_FREE_SUBSCRIPTION: UserSubscription = {
  id: 'demo-free',
  userId: 'demo-user',
  planType: 'free',
  maxVehicles: 1, // Free plan only allows 1 vehicle
  dailyRefreshVehicles: 0,
  manualRefreshIntervalDays: 7,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const DEMO_PRO_SUBSCRIPTION: UserSubscription = {
  id: 'demo-pro',
  userId: 'demo-user',
  planType: 'pro',
  maxVehicles: -1,
  dailyRefreshVehicles: 10,
  manualRefreshIntervalDays: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Feature keys for gating
export type FeatureKey = 
  | 'unlimited_vehicles'
  | 'daily_updates'
  | 'manual_refresh'
  | 'priority_queue'
  | 'market_shift_alerts'
  | 'export_data'
  | 'advanced_alerts';

interface SubscriptionContextValue {
  subscription: UserSubscription | null;
  limits: PlanLimits | null;
  usage: {
    vehiclesUsed: number;
    vehiclesRemaining: number;
    dailyRefreshSlotsUsed: number;
    dailyRefreshSlotsRemaining: number;
  } | null;
  refreshSummary: UserRefreshSummary | null;
  marketShifts: MarketShiftAlert[];
  loading: boolean;
  error: string | null;
  isPro: boolean;
  isFree: boolean;
  planType: PlanType | null;
  canAddMoreVehicles: boolean;
  isDemoMode: boolean;
  demoPlanType: PlanType;
  setDemoPlanType: (plan: PlanType) => void;
  toggleDemoPlan: () => void;
  refresh: () => Promise<void>;
  checkCanAddVehicle: () => Promise<{ allowed: boolean; reason?: string }>;
  upgrade: (stripeCustomerId?: string, stripeSubscriptionId?: string) => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
  downgrade: () => Promise<boolean>; // Alias for cancelSubscription
  checkRefreshEligibility: (vehicleId: string) => Promise<RefreshEligibility>;
  setRefreshTier: (vehicleId: string, tier: 'daily' | 'weekly') => Promise<boolean>;
  initVehicleTracking: (vehicleId: string) => Promise<void>;
  removeTracking: (vehicleId: string) => Promise<void>;
  canUseFeature: (feature: FeatureKey) => boolean;
  getFeatureLimit: (feature: FeatureKey) => number | string | boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function useSubscriptionContext(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
}

interface SubscriptionProviderProps {
  children: ReactNode;
  demoUser?: { id: string } | null;
}

export function SubscriptionProvider({ children, demoUser }: SubscriptionProviderProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoPlanType, setDemoPlanType] = useState<PlanType>('pro'); // Demo starts as Pro (has 3 vehicles)

  // Detect demo mode from prop
  useEffect(() => {
    if (demoUser?.id === 'demo-user') {
      setIsDemoMode(true);
      setUserId('demo-user');
    } else if (demoUser === null) {
      // Exiting demo mode
      setIsDemoMode(false);
    }
  }, [demoUser]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [usage, setUsage] = useState<SubscriptionContextValue['usage']>(null);
  const [refreshSummary, setRefreshSummary] = useState<UserRefreshSummary | null>(null);
  const [marketShifts, setMarketShifts] = useState<MarketShiftAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoVehicleCount, setDemoVehicleCount] = useState(3); // Demo mode has 3 vehicles

  const toggleDemoPlan = useCallback(() => {
    setDemoPlanType(prev => prev === 'free' ? 'pro' : 'free');
  }, []);

  const loadDemoSubscription = useCallback(() => {
    const demoSub = demoPlanType === 'pro' ? DEMO_PRO_SUBSCRIPTION : DEMO_FREE_SUBSCRIPTION;
    const demoLimits = PLAN_DEFINITIONS[demoPlanType];
    
    setSubscription(demoSub);
    setLimits(demoLimits);
    setUsage({
      vehiclesUsed: demoVehicleCount,
      vehiclesRemaining: demoSub.maxVehicles === -1 ? Infinity : Math.max(0, demoSub.maxVehicles - demoVehicleCount),
      dailyRefreshSlotsUsed: demoPlanType === 'pro' ? 3 : 0,
      dailyRefreshSlotsRemaining: demoPlanType === 'pro' ? 7 : 0,
    });
    setRefreshSummary({
      planType: demoPlanType,
      totalVehicles: demoVehicleCount,
      dailyRefreshVehicles: demoPlanType === 'pro' ? Math.min(demoVehicleCount, 10) : 0,
      weeklyRefreshVehicles: demoPlanType === 'pro' ? Math.max(0, demoVehicleCount - 10) : demoVehicleCount,
      vehiclesDueForRefresh: 1,
      manualRefreshesAvailable: 1,
      activeMarketShifts: demoPlanType === 'pro' ? 2 : 0,
    });
    setMarketShifts(demoPlanType === 'pro' ? [{
      id: 'demo-shift-1',
      make: 'Tesla',
      model: 'Model 3',
      shiftPercent: 2.3,
      shiftDirection: 'down',
      detectedAt: new Date(),
      isActive: true,
      affectedVehiclesCount: 1,
      refreshesTriggered: 1,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }] : []);
    setLoading(false);
    setError(null);
  }, [demoPlanType, demoVehicleCount]);

  const loadSubscription = useCallback(async () => {
    if (!userId || isDemoMode) {
      if (isDemoMode) loadDemoSubscription();
      else setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [subscriptionData, summary, shifts] = await Promise.all([
        getSubscriptionWithUsage(userId),
        getUserRefreshSummary(userId),
        getActiveMarketShifts(userId),
      ]);

      if (subscriptionData) {
        setSubscription(subscriptionData.subscription);
        setLimits(subscriptionData.limits);
        setUsage(subscriptionData.usage);
      } else {
        setSubscription({ ...DEMO_FREE_SUBSCRIPTION, userId });
        setLimits(PLAN_DEFINITIONS.free);
        setUsage({ vehiclesUsed: 0, vehiclesRemaining: 2, dailyRefreshSlotsUsed: 0, dailyRefreshSlotsRemaining: 0 });
      }

      setRefreshSummary(summary);
      setMarketShifts(shifts);
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError('Error loading subscription');
    } finally {
      setLoading(false);
    }
  }, [userId, isDemoMode, loadDemoSubscription]);

  // Listen for auth changes - check both Supabase session AND demo mode
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || null;
      setUserId(currentUserId);
      // Don't set demo mode here - it will be set by the prop/context
    };
    
    checkAuth();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUserId = session?.user?.id || null;
      setUserId(currentUserId);
    });

    return () => authSub.unsubscribe();
  }, []);

  // Load subscription - but wait for demo mode to be determined first
  useEffect(() => { 
    // If we have a demo user prop, wait for demo mode to be set
    if (isDemoMode) {
      loadDemoSubscription();
    } else {
      loadSubscription(); 
    }
  }, [loadSubscription, loadDemoSubscription, isDemoMode]);
  
  // Reload when demo plan type changes
  useEffect(() => { 
    if (isDemoMode) loadDemoSubscription(); 
  }, [demoPlanType, loadDemoSubscription, isDemoMode]);

  useEffect(() => {
    if (!userId || isDemoMode) return;
    const channel = supabase
      .channel('subscription-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_subscriptions', filter: `user_id=eq.${userId}` }, () => loadSubscription())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, isDemoMode, loadSubscription]);

  const checkCanAdd = useCallback(async () => {
    if (isDemoMode) {
      const currentSub = demoPlanType === 'pro' ? DEMO_PRO_SUBSCRIPTION : DEMO_FREE_SUBSCRIPTION;
      if (currentSub.maxVehicles === -1) return { allowed: true };
      if (demoVehicleCount >= currentSub.maxVehicles) {
        return { allowed: false, reason: `You've reached the maximum of ${currentSub.maxVehicles} vehicles on the Free plan. Upgrade to Pro for unlimited vehicles.` };
      }
      return { allowed: true };
    }
    if (!userId) return { allowed: false, reason: 'Not logged in' };
    return checkCanAddVehicle(userId);
  }, [userId, isDemoMode, demoPlanType, demoVehicleCount]);

  const upgrade = useCallback(async (stripeCustomerId?: string, stripeSubscriptionId?: string) => {
    if (isDemoMode) { setDemoPlanType('pro'); return true; }
    if (!userId) return false;
    const result = await upgradeToPro(userId, stripeCustomerId, stripeSubscriptionId);
    if (result) await loadSubscription();
    return !!result;
  }, [userId, isDemoMode, loadSubscription]);

  const cancel = useCallback(async () => {
    if (isDemoMode) { setDemoPlanType('free'); return true; }
    if (!userId) return false;
    const result = await cancelSubscription(userId);
    if (result) await loadSubscription();
    return !!result;
  }, [userId, isDemoMode, loadSubscription]);

  // Alias for backward compatibility
  const downgrade = cancel;

  const checkRefreshEligibility = useCallback(async (vehicleId: string): Promise<RefreshEligibility> => {
    if (isDemoMode) return { canRefresh: true };
    if (!userId) return { canRefresh: false, reason: 'Not logged in' };
    return checkManualRefreshEligibility(userId, vehicleId);
  }, [userId, isDemoMode]);

  const setRefreshTier = useCallback(async (vehicleId: string, tier: 'daily' | 'weekly') => {
    if (isDemoMode) return tier === 'daily' ? demoPlanType === 'pro' : true;
    if (!userId) return false;
    const result = await setVehicleRefreshTier(userId, vehicleId, tier);
    if (result) await loadSubscription();
    return result;
  }, [userId, isDemoMode, demoPlanType, loadSubscription]);

  const initVehicleTracking = useCallback(async (vehicleId: string) => {
    if (isDemoMode) { setDemoVehicleCount(prev => prev + 1); return; }
    if (!userId) return;
    await initializeVehicleTracking(userId, vehicleId);
    await loadSubscription();
  }, [userId, isDemoMode, loadSubscription]);

  const removeTracking = useCallback(async (vehicleId: string) => {
    if (isDemoMode) { setDemoVehicleCount(prev => Math.max(0, prev - 1)); return; }
    await removeVehicleTracking(vehicleId);
    await loadSubscription();
  }, [isDemoMode, loadSubscription]);

  const canUseFeature = useCallback((feature: FeatureKey): boolean => {
    const currentPlan = isDemoMode ? demoPlanType : subscription?.planType;
    const featureAccess: Record<FeatureKey, PlanType[]> = {
      unlimited_vehicles: ['pro'],
      daily_updates: ['pro'],
      manual_refresh: ['free', 'pro'],
      priority_queue: ['pro'],
      market_shift_alerts: ['pro'],
      export_data: ['pro'],
      advanced_alerts: ['pro'],
    };
    return featureAccess[feature]?.includes(currentPlan || 'free') ?? false;
  }, [isDemoMode, demoPlanType, subscription?.planType]);

  const getFeatureLimit = useCallback((feature: FeatureKey): number | string | boolean => {
    const currentPlan = isDemoMode ? demoPlanType : subscription?.planType;
    const currentLimits = isDemoMode ? PLAN_DEFINITIONS[demoPlanType] : limits;
    switch (feature) {
      case 'unlimited_vehicles': return currentLimits?.maxVehicles === -1 ? true : currentLimits?.maxVehicles || 2;
      case 'daily_updates': return currentLimits?.dailyRefreshVehicles || 0;
      case 'manual_refresh': return currentPlan === 'pro' ? '1 per day' : '1 per week';
      case 'priority_queue': return currentPlan === 'pro';
      case 'market_shift_alerts': return currentPlan === 'pro';
      case 'export_data': return currentPlan === 'pro';
      case 'advanced_alerts': return currentPlan === 'pro';
      default: return false;
    }
  }, [isDemoMode, demoPlanType, subscription?.planType, limits]);

  const isPro = isDemoMode ? demoPlanType === 'pro' : subscription?.planType === 'pro';
  const isFree = isDemoMode ? demoPlanType === 'free' : subscription?.planType === 'free';
  const planType = isDemoMode ? demoPlanType : subscription?.planType || null;
  const canAddMoreVehicles = usage ? (subscription?.maxVehicles === -1 || (usage.vehiclesUsed < (subscription?.maxVehicles || 2))) : true;

  const value: SubscriptionContextValue = {
    subscription, limits, usage, refreshSummary, marketShifts, loading, error,
    isPro, isFree, planType, canAddMoreVehicles, isDemoMode, demoPlanType,
    setDemoPlanType, toggleDemoPlan, refresh: loadSubscription, checkCanAddVehicle: checkCanAdd,
    upgrade, cancelSubscription: cancel, downgrade, checkRefreshEligibility, setRefreshTier, 
    initVehicleTracking, removeTracking, canUseFeature, getFeatureLimit,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export default SubscriptionContext;
