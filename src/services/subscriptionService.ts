/**
 * Subscription Service
 * 
 * Manages user subscriptions, plan limits, and feature access.
 * Implements the hybrid refresh strategy with Free and Pro tiers.
 */

import { supabase } from '../lib/supabaseClient';
import {
  UserSubscription,
  PlanType,
  PlanLimits,
  PLAN_DEFINITIONS,
  SubscriptionResponse,
} from '../types/subscription';

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Get user's subscription details
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Table doesn't exist yet - return default free subscription
      if (error.code === 'PGRST205' || error.code === '42P01') {
        console.warn('user_subscriptions table not found - using default free plan. Run scripts/create-subscription-tables.sql in Supabase.');
        return getDefaultFreeSubscription(userId);
      }
      if (error.code === 'PGRST116') {
        // No subscription found, create default
        return await createDefaultSubscription(userId);
      }
      throw error;
    }

    return transformSubscription(data);
  } catch (error: any) {
    // Gracefully handle missing table
    if (error?.code === 'PGRST205' || error?.code === '42P01' || error?.message?.includes('user_subscriptions')) {
      console.warn('user_subscriptions table not found - using default free plan');
      return getDefaultFreeSubscription(userId);
    }
    console.error('Error getting subscription:', error);
    return getDefaultFreeSubscription(userId);
  }
}

/**
 * Get default free subscription (used when table doesn't exist)
 */
function getDefaultFreeSubscription(userId: string): UserSubscription {
  const freeLimits = PLAN_DEFINITIONS.free;
  return {
    id: 'default-free',
    userId,
    planType: 'free',
    maxVehicles: freeLimits.maxVehicles,
    dailyRefreshVehicles: freeLimits.dailyRefreshVehicles,
    manualRefreshIntervalDays: freeLimits.manualRefreshIntervalDays,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Create default free subscription for new user
 */
export async function createDefaultSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    const freeLimits = PLAN_DEFINITIONS.free;
    
    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan_type: 'free',
        max_vehicles: freeLimits.maxVehicles,
        daily_refresh_vehicles: freeLimits.dailyRefreshVehicles,
        manual_refresh_interval_days: freeLimits.manualRefreshIntervalDays,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      // Table doesn't exist - return default
      if (error.code === 'PGRST205' || error.code === '42P01') {
        return getDefaultFreeSubscription(userId);
      }
      throw error;
    }
    return transformSubscription(data);
  } catch (error: any) {
    console.error('Error creating default subscription:', error);
    // Return default free subscription as fallback
    return getDefaultFreeSubscription(userId);
  }
}

/**
 * Upgrade user to Pro plan
 */
export async function upgradeToPro(
  userId: string,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<UserSubscription | null> {
  try {
    const proLimits = PLAN_DEFINITIONS.pro;
    const now = new Date();
    const billingEnd = new Date(now);
    billingEnd.setMonth(billingEnd.getMonth() + 1);

    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({
        plan_type: 'pro',
        max_vehicles: proLimits.maxVehicles,
        daily_refresh_vehicles: proLimits.dailyRefreshVehicles,
        manual_refresh_interval_days: proLimits.manualRefreshIntervalDays,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        billing_cycle_start: now.toISOString(),
        billing_cycle_end: billingEnd.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    
    // Update vehicle refresh tiers for Pro user
    await updateVehicleRefreshTiers(userId, 'pro');
    
    return transformSubscription(data);
  } catch (error) {
    console.error('Error upgrading to Pro:', error);
    return null;
  }
}

/**
 * Cancel subscription / Downgrade to Free plan
 * This is the same operation - cancelling Pro returns user to Free tier
 */
export async function cancelSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    const freeLimits = PLAN_DEFINITIONS.free;

    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({
        plan_type: 'free',
        max_vehicles: freeLimits.maxVehicles,
        daily_refresh_vehicles: freeLimits.dailyRefreshVehicles,
        manual_refresh_interval_days: freeLimits.manualRefreshIntervalDays,
        stripe_subscription_id: null,
        billing_cycle_start: null,
        billing_cycle_end: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    
    // Update vehicle refresh tiers for Free user
    await updateVehicleRefreshTiers(userId, 'free');
    
    return transformSubscription(data);
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return null;
  }
}

// Alias for backward compatibility
export const downgradeToFree = cancelSubscription;

// ============================================================================
// PLAN LIMITS & VALIDATION
// ============================================================================

/**
 * Get plan limits for a plan type
 */
export function getPlanLimits(planType: PlanType): PlanLimits {
  return PLAN_DEFINITIONS[planType];
}

/**
 * Check if user can add more vehicles
 */
export async function canAddVehicle(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription) {
      return { allowed: false, reason: 'No subscription found' };
    }

    // Pro users have unlimited vehicles
    if (subscription.maxVehicles === -1) {
      return { allowed: true };
    }

    // Count current vehicles
    const { count, error } = await supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;

    const currentCount = count || 0;
    if (currentCount >= subscription.maxVehicles) {
      return {
        allowed: false,
        reason: `You've reached the maximum of ${subscription.maxVehicles} vehicles on the Free plan. Upgrade to Pro for unlimited vehicles.`,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking vehicle limit:', error);
    return { allowed: false, reason: 'Error checking limits' };
  }
}

/**
 * Get full subscription response with usage stats
 */
export async function getSubscriptionWithUsage(userId: string): Promise<SubscriptionResponse | null> {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription) {
      // Return default free subscription with zero usage
      const defaultSub = getDefaultFreeSubscription(userId);
      const limits = getPlanLimits('free');
      return {
        subscription: defaultSub,
        limits,
        usage: {
          vehiclesUsed: 0,
          vehiclesRemaining: defaultSub.maxVehicles,
          dailyRefreshSlotsUsed: 0,
          dailyRefreshSlotsRemaining: 0,
        },
      };
    }

    // Get vehicle count (this table should exist)
    let vehicleCount = 0;
    try {
      const { count } = await supabase
        .from('vehicles')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      vehicleCount = count || 0;
    } catch (e) {
      // Vehicles table might not exist either
      vehicleCount = 0;
    }

    // Get daily refresh slots used (gracefully handle missing table)
    let dailySlotsUsed = 0;
    try {
      const { count: dailySlots } = await supabase
        .from('vehicle_refresh_tracking')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('refresh_tier', 'daily');
      dailySlotsUsed = dailySlots || 0;
    } catch (e) {
      // Table doesn't exist yet
      dailySlotsUsed = 0;
    }

    const limits = getPlanLimits(subscription.planType);

    return {
      subscription,
      limits,
      usage: {
        vehiclesUsed: vehicleCount,
        vehiclesRemaining: subscription.maxVehicles === -1 
          ? Infinity 
          : Math.max(0, subscription.maxVehicles - vehicleCount),
        dailyRefreshSlotsUsed: dailySlotsUsed,
        dailyRefreshSlotsRemaining: Math.max(0, subscription.dailyRefreshVehicles - dailySlotsUsed),
      },
    };
  } catch (error) {
    console.error('Error getting subscription with usage:', error);
    // Return default free subscription as fallback
    const defaultSub = getDefaultFreeSubscription(userId);
    const limits = getPlanLimits('free');
    return {
      subscription: defaultSub,
      limits,
      usage: {
        vehiclesUsed: 0,
        vehiclesRemaining: defaultSub.maxVehicles,
        dailyRefreshSlotsUsed: 0,
        dailyRefreshSlotsRemaining: 0,
      },
    };
  }
}

// ============================================================================
// VEHICLE REFRESH TIER MANAGEMENT
// ============================================================================

/**
 * Update vehicle refresh tiers when plan changes
 */
async function updateVehicleRefreshTiers(userId: string, planType: PlanType): Promise<void> {
  try {
    if (planType === 'pro') {
      // Get user's vehicles ordered by most recently added
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!vehicles) return;

      // First 10 vehicles get daily refresh
      const dailyVehicles = vehicles.slice(0, 10);
      const weeklyVehicles = vehicles.slice(10);

      // Update daily tier vehicles
      if (dailyVehicles.length > 0) {
        await supabase
          .from('vehicle_refresh_tracking')
          .upsert(
            dailyVehicles.map(v => ({
              vehicle_id: v.id,
              user_id: userId,
              refresh_tier: 'daily',
              priority_queue: true,
            })),
            { onConflict: 'vehicle_id' }
          );
      }

      // Update weekly tier vehicles
      if (weeklyVehicles.length > 0) {
        await supabase
          .from('vehicle_refresh_tracking')
          .upsert(
            weeklyVehicles.map(v => ({
              vehicle_id: v.id,
              user_id: userId,
              refresh_tier: 'weekly',
              priority_queue: true, // Pro users still get priority
            })),
            { onConflict: 'vehicle_id' }
          );
      }
    } else {
      // Free plan: all vehicles get weekly refresh, no priority
      await supabase
        .from('vehicle_refresh_tracking')
        .update({
          refresh_tier: 'weekly',
          priority_queue: false,
        })
        .eq('user_id', userId);
    }
  } catch (error) {
    console.error('Error updating vehicle refresh tiers:', error);
  }
}

/**
 * Set a vehicle's refresh tier (Pro users can choose which cars get daily updates)
 */
export async function setVehicleRefreshTier(
  userId: string,
  vehicleId: string,
  tier: 'daily' | 'weekly'
): Promise<boolean> {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription || subscription.planType !== 'pro') {
      console.error('Only Pro users can change refresh tiers');
      return false;
    }

    if (tier === 'daily') {
      // Check if user has available daily slots
      const { count } = await supabase
        .from('vehicle_refresh_tracking')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('refresh_tier', 'daily');

      if ((count || 0) >= subscription.dailyRefreshVehicles) {
        console.error('No daily refresh slots available');
        return false;
      }
    }

    const { error } = await supabase
      .from('vehicle_refresh_tracking')
      .update({ refresh_tier: tier, updated_at: new Date().toISOString() })
      .eq('vehicle_id', vehicleId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error setting vehicle refresh tier:', error);
    return false;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function transformSubscription(data: any): UserSubscription {
  return {
    id: data.id,
    userId: data.user_id,
    planType: data.plan_type,
    maxVehicles: data.max_vehicles,
    dailyRefreshVehicles: data.daily_refresh_vehicles,
    manualRefreshIntervalDays: data.manual_refresh_interval_days,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    billingCycleStart: data.billing_cycle_start ? new Date(data.billing_cycle_start) : undefined,
    billingCycleEnd: data.billing_cycle_end ? new Date(data.billing_cycle_end) : undefined,
    isActive: data.is_active,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export default {
  getUserSubscription,
  createDefaultSubscription,
  upgradeToPro,
  cancelSubscription,
  downgradeToFree, // Alias for cancelSubscription
  getPlanLimits,
  canAddVehicle,
  getSubscriptionWithUsage,
  setVehicleRefreshTier,
};
