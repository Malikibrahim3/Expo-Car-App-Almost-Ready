/**
 * Refresh Scheduler Service
 * 
 * Manages the hybrid refresh strategy:
 * - Weekly automated updates for all users
 * - Daily updates for Pro users (up to 10 cars)
 * - Manual refresh with plan-based limits
 * - Automatic extra refresh on material market shifts (±1-2%)
 */

import { supabase } from '../lib/supabaseClient';
import {
  VehicleRefreshTracking,
  RefreshHistory,
  RefreshType,
  RefreshEligibility,
  RefreshStatus,
  UserRefreshSummary,
  RefreshResponse,
  MarketShiftAlert,
  MARKET_SHIFT_THRESHOLDS,
} from '../types/subscription';
import { getUserSubscription } from './subscriptionService';

// ============================================================================
// REFRESH ELIGIBILITY
// ============================================================================

/**
 * Check if a vehicle is eligible for manual refresh
 */
export async function checkManualRefreshEligibility(
  userId: string,
  vehicleId: string
): Promise<RefreshEligibility> {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription) {
      return { canRefresh: false, reason: 'No subscription found' };
    }

    // Get vehicle's refresh tracking
    const { data: tracking } = await supabase
      .from('vehicle_refresh_tracking')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .single();

    // If no tracking record, allow refresh
    if (!tracking) {
      return { canRefresh: true };
    }

    const now = new Date();
    const resetAt = new Date(tracking.manual_refresh_reset_at);
    const intervalMs = subscription.manualRefreshIntervalDays * 24 * 60 * 60 * 1000;

    // Check if reset period has passed
    if (now.getTime() - resetAt.getTime() >= intervalMs) {
      return { canRefresh: true };
    }

    // Check if user has used their refresh
    if (tracking.manual_refreshes_used >= 1) {
      const nextAvailable = new Date(resetAt.getTime() + intervalMs);
      const hoursUntil = (nextAvailable.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      return {
        canRefresh: false,
        reason: subscription.planType === 'pro' 
          ? 'You can refresh once per day. Try again tomorrow.'
          : 'Free plan allows 1 refresh per week. Upgrade to Pro for daily refreshes.',
        nextAvailableAt: nextAvailable,
        hoursUntilAvailable: Math.ceil(hoursUntil),
      };
    }

    return { canRefresh: true };
  } catch (error) {
    console.error('Error checking refresh eligibility:', error);
    return { canRefresh: false, reason: 'Error checking eligibility' };
  }
}

/**
 * Get refresh status for a vehicle
 */
export async function getVehicleRefreshStatus(
  userId: string,
  vehicleId: string
): Promise<RefreshStatus | null> {
  try {
    // Get tracking data
    const { data: tracking } = await supabase
      .from('vehicle_refresh_tracking')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .single();

    // Get vehicle data for market shift check
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('make, model, year, estimated_value')
      .eq('id', vehicleId)
      .single();

    // Check for active market shifts
    let marketShift: MarketShiftAlert | null = null;
    if (vehicle) {
      const { data: shifts } = await supabase
        .from('market_shift_alerts')
        .select('*')
        .eq('is_active', true)
        .or(`make.eq.${vehicle.make},segment.is.null`)
        .gte('expires_at', new Date().toISOString())
        .limit(1);

      if (shifts && shifts.length > 0) {
        marketShift = transformMarketShift(shifts[0]);
      }
    }

    const eligibility = await checkManualRefreshEligibility(userId, vehicleId);

    return {
      vehicleId,
      lastRefreshAt: tracking?.last_auto_refresh 
        ? new Date(tracking.last_auto_refresh) 
        : undefined,
      lastRefreshType: tracking?.last_auto_refresh ? 'auto_weekly' : undefined,
      nextScheduledAt: tracking?.next_scheduled_refresh 
        ? new Date(tracking.next_scheduled_refresh) 
        : undefined,
      manualRefreshEligibility: eligibility,
      currentValue: vehicle?.estimated_value,
      valueAtLastRefresh: tracking?.last_value,
      changePercent: tracking?.value_change_percent,
      hasActiveMarketShift: !!marketShift,
      marketShiftDetails: marketShift || undefined,
    };
  } catch (error) {
    console.error('Error getting refresh status:', error);
    return null;
  }
}

/**
 * Get user's overall refresh summary
 */
export async function getUserRefreshSummary(userId: string): Promise<UserRefreshSummary | null> {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription) return null;

    // Get vehicle counts by tier
    const { data: tracking } = await supabase
      .from('vehicle_refresh_tracking')
      .select('refresh_tier, manual_refreshes_used, manual_refresh_reset_at')
      .eq('user_id', userId);

    const dailyCount = tracking?.filter(t => t.refresh_tier === 'daily').length || 0;
    const weeklyCount = tracking?.filter(t => t.refresh_tier === 'weekly').length || 0;

    // Get vehicles due for refresh
    const { count: dueCount } = await supabase
      .from('vehicle_refresh_tracking')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('next_scheduled_refresh', new Date().toISOString());

    // Get active market shifts
    const { count: shiftCount } = await supabase
      .from('market_shift_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString());

    // Calculate manual refreshes available
    const now = new Date();
    const intervalMs = subscription.manualRefreshIntervalDays * 24 * 60 * 60 * 1000;
    let manualRefreshesAvailable = 1; // Default: 1 available
    let resetAt: Date | undefined;

    if (tracking && tracking.length > 0) {
      // Check if any vehicle has used a manual refresh in current period
      const recentRefresh = tracking.find(t => {
        const trackingReset = new Date(t.manual_refresh_reset_at);
        return now.getTime() - trackingReset.getTime() < intervalMs && t.manual_refreshes_used > 0;
      });

      if (recentRefresh) {
        manualRefreshesAvailable = 0;
        resetAt = new Date(new Date(recentRefresh.manual_refresh_reset_at).getTime() + intervalMs);
      }
    }

    return {
      planType: subscription.planType,
      totalVehicles: dailyCount + weeklyCount,
      dailyRefreshVehicles: dailyCount,
      weeklyRefreshVehicles: weeklyCount,
      vehiclesDueForRefresh: dueCount || 0,
      manualRefreshesAvailable,
      manualRefreshResetAt: resetAt,
      activeMarketShifts: shiftCount || 0,
    };
  } catch (error) {
    console.error('Error getting refresh summary:', error);
    return null;
  }
}

// ============================================================================
// REFRESH EXECUTION
// ============================================================================

/**
 * Perform manual refresh for a vehicle
 */
export async function performManualRefresh(
  userId: string,
  vehicleId: string,
  valuationFn: (vehicleId: string) => Promise<{ estimatedValue: number } | null>
): Promise<RefreshResponse> {
  try {
    // Check eligibility
    const eligibility = await checkManualRefreshEligibility(userId, vehicleId);
    if (!eligibility.canRefresh) {
      return {
        success: false,
        refreshType: 'manual',
        vehicleId,
        message: eligibility.reason,
        nextRefreshAvailable: eligibility.nextAvailableAt,
      };
    }

    // Get current value
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('estimated_value')
      .eq('id', vehicleId)
      .single();

    const valueBefore = vehicle?.estimated_value;

    // Perform valuation
    const valuation = await valuationFn(vehicleId);
    if (!valuation) {
      return {
        success: false,
        refreshType: 'manual',
        vehicleId,
        message: 'Failed to get valuation',
      };
    }

    const valueAfter = valuation.estimatedValue;
    const changeAmount = valueAfter - (valueBefore || 0);
    const changePercent = valueBefore ? (changeAmount / valueBefore) * 100 : 0;

    // Update tracking
    const now = new Date();
    await supabase
      .from('vehicle_refresh_tracking')
      .upsert({
        vehicle_id: vehicleId,
        user_id: userId,
        last_manual_refresh: now.toISOString(),
        last_value: valueAfter,
        previous_value: valueBefore,
        value_change_percent: changePercent,
        manual_refreshes_used: 1,
        manual_refresh_reset_at: now.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: 'vehicle_id' });

    // Log refresh history
    await supabase
      .from('refresh_history')
      .insert({
        vehicle_id: vehicleId,
        user_id: userId,
        refresh_type: 'manual',
        trigger_reason: 'user_request',
        value_before: valueBefore,
        value_after: valueAfter,
        change_amount: changeAmount,
        change_percent: changePercent,
      });

    // Calculate next available refresh
    const subscription = await getUserSubscription(userId);
    const intervalMs = (subscription?.manualRefreshIntervalDays || 7) * 24 * 60 * 60 * 1000;
    const nextAvailable = new Date(now.getTime() + intervalMs);

    return {
      success: true,
      refreshType: 'manual',
      vehicleId,
      valueBefore,
      valueAfter,
      changePercent: Math.round(changePercent * 100) / 100,
      nextRefreshAvailable: nextAvailable,
      message: `Value updated: ${valueAfter > (valueBefore || 0) ? '+' : ''}${changePercent.toFixed(1)}%`,
    };
  } catch (error) {
    console.error('Error performing manual refresh:', error);
    return {
      success: false,
      refreshType: 'manual',
      vehicleId,
      message: 'Error performing refresh',
    };
  }
}

/**
 * Perform scheduled auto-refresh for vehicles
 * This should be called by a cron job or scheduled function
 */
export async function performScheduledRefreshes(
  valuationFn: (vehicleId: string) => Promise<{ estimatedValue: number } | null>
): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    // Get vehicles due for refresh, prioritized
    const { data: dueVehicles } = await supabase
      .from('vehicle_refresh_tracking')
      .select('vehicle_id, user_id, refresh_tier, priority_queue, last_value')
      .lte('next_scheduled_refresh', new Date().toISOString())
      .order('priority_queue', { ascending: false })
      .order('next_scheduled_refresh', { ascending: true })
      .limit(100); // Process in batches

    if (!dueVehicles || dueVehicles.length === 0) {
      return { processed: 0, errors: 0 };
    }

    for (const vehicle of dueVehicles) {
      try {
        const valuation = await valuationFn(vehicle.vehicle_id);
        if (!valuation) {
          errors++;
          continue;
        }

        const valueAfter = valuation.estimatedValue;
        const valueBefore = vehicle.last_value;
        const changePercent = valueBefore 
          ? ((valueAfter - valueBefore) / valueBefore) * 100 
          : 0;

        // Calculate next refresh time
        const now = new Date();
        const nextRefresh = new Date(now);
        if (vehicle.refresh_tier === 'daily') {
          nextRefresh.setDate(nextRefresh.getDate() + 1);
        } else {
          nextRefresh.setDate(nextRefresh.getDate() + 7);
        }

        // Update tracking
        await supabase
          .from('vehicle_refresh_tracking')
          .update({
            last_auto_refresh: now.toISOString(),
            next_scheduled_refresh: nextRefresh.toISOString(),
            last_value: valueAfter,
            previous_value: valueBefore,
            value_change_percent: changePercent,
            updated_at: now.toISOString(),
          })
          .eq('vehicle_id', vehicle.vehicle_id);

        // Log history
        const refreshType: RefreshType = vehicle.refresh_tier === 'daily' ? 'auto_daily' : 'auto_weekly';
        await supabase
          .from('refresh_history')
          .insert({
            vehicle_id: vehicle.vehicle_id,
            user_id: vehicle.user_id,
            refresh_type: refreshType,
            trigger_reason: 'scheduled',
            value_before: valueBefore,
            value_after: valueAfter,
            change_amount: valueAfter - (valueBefore || 0),
            change_percent: changePercent,
          });

        // Check for market shift
        if (Math.abs(changePercent) >= MARKET_SHIFT_THRESHOLDS.minShiftPercent) {
          await checkAndCreateMarketShift(vehicle.vehicle_id, changePercent);
        }

        processed++;
      } catch (err) {
        console.error(`Error refreshing vehicle ${vehicle.vehicle_id}:`, err);
        errors++;
      }
    }

    return { processed, errors };
  } catch (error) {
    console.error('Error in scheduled refreshes:', error);
    return { processed, errors };
  }
}

// ============================================================================
// MARKET SHIFT DETECTION
// ============================================================================

/**
 * Check for and create market shift alerts
 */
async function checkAndCreateMarketShift(
  vehicleId: string,
  changePercent: number
): Promise<void> {
  try {
    // Get vehicle details
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('make, model, year')
      .eq('id', vehicleId)
      .single();

    if (!vehicle) return;

    // Check if similar shift already exists
    const { data: existingShift } = await supabase
      .from('market_shift_alerts')
      .select('id')
      .eq('make', vehicle.make)
      .eq('model', vehicle.model)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (existingShift) {
      // Update existing shift
      await supabase
        .from('market_shift_alerts')
        .update({
          affected_vehicles_count: supabase.rpc('increment', { x: 1 }),
        })
        .eq('id', existingShift.id);
      return;
    }

    // Create new market shift alert
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + MARKET_SHIFT_THRESHOLDS.alertDurationDays);

    await supabase
      .from('market_shift_alerts')
      .insert({
        make: vehicle.make,
        model: vehicle.model,
        year_start: vehicle.year - 2,
        year_end: vehicle.year + 2,
        shift_percent: Math.abs(changePercent),
        shift_direction: changePercent > 0 ? 'up' : 'down',
        source: 'valuation_change',
        affected_vehicles_count: 1,
        expires_at: expiresAt.toISOString(),
      });
  } catch (error) {
    console.error('Error checking market shift:', error);
  }
}

/**
 * Get active market shifts affecting a user's vehicles
 */
export async function getActiveMarketShifts(userId: string): Promise<MarketShiftAlert[]> {
  try {
    // Get user's vehicle makes/models
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('make, model')
      .eq('user_id', userId);

    if (!vehicles || vehicles.length === 0) return [];

    const makes = [...new Set(vehicles.map(v => v.make))];

    // Get active shifts for user's vehicles
    const { data: shifts } = await supabase
      .from('market_shift_alerts')
      .select('*')
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .in('make', makes);

    return (shifts || []).map(transformMarketShift);
  } catch (error) {
    console.error('Error getting market shifts:', error);
    return [];
  }
}

/**
 * Trigger market shift refresh for affected vehicles
 */
export async function triggerMarketShiftRefresh(
  shiftId: string,
  valuationFn: (vehicleId: string) => Promise<{ estimatedValue: number } | null>
): Promise<number> {
  try {
    // Get shift details
    const { data: shift } = await supabase
      .from('market_shift_alerts')
      .select('*')
      .eq('id', shiftId)
      .single();

    if (!shift) return 0;

    // Find affected vehicles
    let query = supabase
      .from('vehicles')
      .select('id, user_id');

    if (shift.make) {
      query = query.eq('make', shift.make);
    }
    if (shift.model) {
      query = query.eq('model', shift.model);
    }
    if (shift.year_start && shift.year_end) {
      query = query.gte('year', shift.year_start).lte('year', shift.year_end);
    }

    const { data: vehicles } = await query.limit(50);
    if (!vehicles) return 0;

    let refreshed = 0;
    for (const vehicle of vehicles) {
      try {
        const valuation = await valuationFn(vehicle.id);
        if (valuation) {
          // Log as market shift refresh
          await supabase
            .from('refresh_history')
            .insert({
              vehicle_id: vehicle.id,
              user_id: vehicle.user_id,
              refresh_type: 'market_shift',
              trigger_reason: `Market shift: ${shift.shift_direction} ${shift.shift_percent}%`,
              value_after: valuation.estimatedValue,
            });
          refreshed++;
        }
      } catch (err) {
        console.error(`Error refreshing vehicle ${vehicle.id}:`, err);
      }
    }

    // Update shift stats
    await supabase
      .from('market_shift_alerts')
      .update({
        refreshes_triggered: shift.refreshes_triggered + refreshed,
      })
      .eq('id', shiftId);

    return refreshed;
  } catch (error) {
    console.error('Error triggering market shift refresh:', error);
    return 0;
  }
}

// ============================================================================
// VEHICLE TRACKING INITIALIZATION
// ============================================================================

/**
 * Initialize refresh tracking for a new vehicle
 */
export async function initializeVehicleTracking(
  userId: string,
  vehicleId: string
): Promise<void> {
  try {
    const subscription = await getUserSubscription(userId);
    const isPro = subscription?.planType === 'pro';

    // Check if user has daily slots available
    let refreshTier: 'daily' | 'weekly' = 'weekly';
    if (isPro) {
      const { count } = await supabase
        .from('vehicle_refresh_tracking')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('refresh_tier', 'daily');

      if ((count || 0) < (subscription?.dailyRefreshVehicles || 0)) {
        refreshTier = 'daily';
      }
    }

    // Calculate next refresh
    const now = new Date();
    const nextRefresh = new Date(now);
    if (refreshTier === 'daily') {
      nextRefresh.setDate(nextRefresh.getDate() + 1);
    } else {
      nextRefresh.setDate(nextRefresh.getDate() + 7);
    }

    await supabase
      .from('vehicle_refresh_tracking')
      .insert({
        vehicle_id: vehicleId,
        user_id: userId,
        refresh_tier: refreshTier,
        priority_queue: isPro,
        next_scheduled_refresh: nextRefresh.toISOString(),
        manual_refresh_reset_at: now.toISOString(),
      });
  } catch (error) {
    console.error('Error initializing vehicle tracking:', error);
  }
}

/**
 * Remove tracking when vehicle is deleted
 */
export async function removeVehicleTracking(vehicleId: string): Promise<void> {
  try {
    await supabase
      .from('vehicle_refresh_tracking')
      .delete()
      .eq('vehicle_id', vehicleId);
  } catch (error) {
    console.error('Error removing vehicle tracking:', error);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function transformMarketShift(data: any): MarketShiftAlert {
  return {
    id: data.id,
    make: data.make,
    model: data.model,
    yearStart: data.year_start,
    yearEnd: data.year_end,
    segment: data.segment,
    shiftPercent: parseFloat(data.shift_percent),
    shiftDirection: data.shift_direction,
    detectedAt: new Date(data.detected_at),
    isActive: data.is_active,
    affectedVehiclesCount: data.affected_vehicles_count,
    refreshesTriggered: data.refreshes_triggered,
    source: data.source,
    notes: data.notes,
    createdAt: new Date(data.created_at),
    expiresAt: new Date(data.expires_at),
  };
}

export default {
  checkManualRefreshEligibility,
  getVehicleRefreshStatus,
  getUserRefreshSummary,
  performManualRefresh,
  performScheduledRefreshes,
  getActiveMarketShifts,
  triggerMarketShiftRefresh,
  initializeVehicleTracking,
  removeVehicleTracking,
};
