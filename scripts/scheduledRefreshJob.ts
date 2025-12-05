/**
 * Scheduled Refresh Job
 * 
 * This script should be run as a cron job (e.g., via Supabase Edge Functions, 
 * Vercel Cron, or a dedicated scheduler) to perform automated vehicle valuations.
 * 
 * Recommended schedule:
 * - Run every hour to process daily refresh vehicles
 * - Run once daily (e.g., 3 AM) for weekly refresh vehicles
 * 
 * Usage:
 * - Deploy as Supabase Edge Function
 * - Or run via: npx ts-node scripts/scheduledRefreshJob.ts
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin access
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Maximum vehicles to process per run
  batchSize: 50,
  
  // Delay between API calls (ms) to avoid rate limiting
  apiDelay: 500,
  
  // Market shift threshold (%)
  marketShiftThreshold: 1.5,
  
  // How long market shift alerts stay active (days)
  marketShiftDuration: 7,
};

// ============================================================================
// TYPES
// ============================================================================

interface VehicleDueForRefresh {
  vehicle_id: string;
  user_id: string;
  refresh_tier: 'daily' | 'weekly';
  priority_queue: boolean;
  last_value: number | null;
  make: string;
  model: string;
  year: number;
  trim: string | null;
  mileage: number;
  condition: string;
}

interface RefreshResult {
  vehicleId: string;
  success: boolean;
  valueBefore?: number;
  valueAfter?: number;
  changePercent?: number;
  error?: string;
}

// ============================================================================
// MAIN JOB
// ============================================================================

async function runScheduledRefresh(): Promise<void> {
  console.log('🚀 Starting scheduled refresh job...');
  console.log(`📅 Time: ${new Date().toISOString()}`);
  
  const startTime = Date.now();
  const results: RefreshResult[] = [];
  
  try {
    // Get vehicles due for refresh
    const vehicles = await getVehiclesDueForRefresh();
    console.log(`📋 Found ${vehicles.length} vehicles due for refresh`);
    
    if (vehicles.length === 0) {
      console.log('✅ No vehicles need refreshing');
      return;
    }
    
    // Process vehicles
    for (const vehicle of vehicles) {
      try {
        const result = await refreshVehicle(vehicle);
        results.push(result);
        
        // Check for market shift
        if (result.success && result.changePercent && 
            Math.abs(result.changePercent) >= CONFIG.marketShiftThreshold) {
          await createMarketShiftAlert(vehicle, result.changePercent);
        }
        
        // Delay between API calls
        await sleep(CONFIG.apiDelay);
      } catch (error) {
        console.error(`❌ Error refreshing vehicle ${vehicle.vehicle_id}:`, error);
        results.push({
          vehicleId: vehicle.vehicle_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    // Log summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const duration = (Date.now() - startTime) / 1000;
    
    console.log('\n📊 Refresh Job Summary:');
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⏱️  Duration: ${duration.toFixed(1)}s`);
    
    // Log any significant market movements
    const significantChanges = results.filter(r => 
      r.success && r.changePercent && Math.abs(r.changePercent) >= CONFIG.marketShiftThreshold
    );
    
    if (significantChanges.length > 0) {
      console.log(`\n📈 Significant market movements detected: ${significantChanges.length}`);
      significantChanges.forEach(r => {
        const direction = (r.changePercent || 0) > 0 ? '↑' : '↓';
        console.log(`   ${direction} Vehicle ${r.vehicleId}: ${r.changePercent?.toFixed(1)}%`);
      });
    }
    
  } catch (error) {
    console.error('❌ Fatal error in refresh job:', error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getVehiclesDueForRefresh(): Promise<VehicleDueForRefresh[]> {
  const { data, error } = await supabase
    .from('vehicle_refresh_tracking')
    .select(`
      vehicle_id,
      user_id,
      refresh_tier,
      priority_queue,
      last_value,
      vehicles!inner (
        make,
        model,
        year,
        trim,
        mileage,
        condition
      )
    `)
    .lte('next_scheduled_refresh', new Date().toISOString())
    .order('priority_queue', { ascending: false })
    .order('next_scheduled_refresh', { ascending: true })
    .limit(CONFIG.batchSize);

  if (error) {
    console.error('Error fetching vehicles:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    vehicle_id: row.vehicle_id,
    user_id: row.user_id,
    refresh_tier: row.refresh_tier,
    priority_queue: row.priority_queue,
    last_value: row.last_value,
    make: row.vehicles.make,
    model: row.vehicles.model,
    year: row.vehicles.year,
    trim: row.vehicles.trim,
    mileage: row.vehicles.mileage,
    condition: row.vehicles.condition,
  }));
}

async function refreshVehicle(vehicle: VehicleDueForRefresh): Promise<RefreshResult> {
  console.log(`🔄 Refreshing: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
  
  // Get new valuation
  // In production, this would call your valuation API
  const valuation = await getValuation(vehicle);
  
  if (!valuation) {
    return {
      vehicleId: vehicle.vehicle_id,
      success: false,
      error: 'Failed to get valuation',
    };
  }
  
  const valueBefore = vehicle.last_value || 0;
  const valueAfter = valuation.estimatedValue;
  const changeAmount = valueAfter - valueBefore;
  const changePercent = valueBefore > 0 ? (changeAmount / valueBefore) * 100 : 0;
  
  // Calculate next refresh time
  const now = new Date();
  const nextRefresh = new Date(now);
  if (vehicle.refresh_tier === 'daily') {
    nextRefresh.setDate(nextRefresh.getDate() + 1);
  } else {
    nextRefresh.setDate(nextRefresh.getDate() + 7);
  }
  
  // Update vehicle valuation
  const { error: vehicleError } = await supabase
    .from('vehicles')
    .update({
      estimated_value: valuation.estimatedValue,
      trade_in_value: valuation.tradeInValue,
      private_party_value: valuation.privatePartyValue,
      valuation_confidence: valuation.confidence,
      last_valuation_date: now.toISOString(),
    })
    .eq('id', vehicle.vehicle_id);

  if (vehicleError) {
    console.error('Error updating vehicle:', vehicleError);
    return {
      vehicleId: vehicle.vehicle_id,
      success: false,
      error: 'Failed to update vehicle',
    };
  }
  
  // Update tracking
  const { error: trackingError } = await supabase
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

  if (trackingError) {
    console.error('Error updating tracking:', trackingError);
  }
  
  // Log history
  const refreshType = vehicle.refresh_tier === 'daily' ? 'auto_daily' : 'auto_weekly';
  await supabase
    .from('refresh_history')
    .insert({
      vehicle_id: vehicle.vehicle_id,
      user_id: vehicle.user_id,
      refresh_type: refreshType,
      trigger_reason: 'scheduled',
      value_before: valueBefore,
      value_after: valueAfter,
      change_amount: changeAmount,
      change_percent: changePercent,
    });
  
  return {
    vehicleId: vehicle.vehicle_id,
    success: true,
    valueBefore,
    valueAfter,
    changePercent,
  };
}

async function getValuation(vehicle: VehicleDueForRefresh): Promise<{
  estimatedValue: number;
  tradeInValue: number;
  privatePartyValue: number;
  confidence: string;
} | null> {
  // This is a placeholder - in production, call your actual valuation service
  // For example, using the advancedValuationService
  
  try {
    // Option 1: Call internal valuation service
    // const { getAdvancedValuation } = await import('../src/services/advancedValuationService');
    // return await getAdvancedValuation({ ... });
    
    // Option 2: Call external API
    // const response = await fetch('https://your-api.com/valuation', { ... });
    // return await response.json();
    
    // Placeholder: Return mock data for testing
    // Remove this in production!
    console.log('⚠️  Using mock valuation - implement real valuation service');
    const baseValue = 25000 + Math.random() * 10000;
    return {
      estimatedValue: Math.round(baseValue),
      tradeInValue: Math.round(baseValue * 0.88),
      privatePartyValue: Math.round(baseValue * 1.05),
      confidence: 'medium',
    };
  } catch (error) {
    console.error('Error getting valuation:', error);
    return null;
  }
}

async function createMarketShiftAlert(
  vehicle: VehicleDueForRefresh,
  changePercent: number
): Promise<void> {
  try {
    // Check if similar alert already exists
    const { data: existing } = await supabase
      .from('market_shift_alerts')
      .select('id, affected_vehicles_count')
      .eq('make', vehicle.make)
      .eq('model', vehicle.model)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (existing) {
      // Update existing alert
      await supabase
        .from('market_shift_alerts')
        .update({
          affected_vehicles_count: existing.affected_vehicles_count + 1,
        })
        .eq('id', existing.id);
      return;
    }

    // Create new alert
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CONFIG.marketShiftDuration);

    await supabase
      .from('market_shift_alerts')
      .insert({
        make: vehicle.make,
        model: vehicle.model,
        year_start: vehicle.year - 2,
        year_end: vehicle.year + 2,
        shift_percent: Math.abs(changePercent),
        shift_direction: changePercent > 0 ? 'up' : 'down',
        source: 'scheduled_refresh',
        affected_vehicles_count: 1,
        expires_at: expiresAt.toISOString(),
      });

    console.log(`📊 Created market shift alert for ${vehicle.make} ${vehicle.model}`);
  } catch (error) {
    console.error('Error creating market shift alert:', error);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// ENTRY POINT
// ============================================================================

// Run if executed directly
if (require.main === module) {
  runScheduledRefresh()
    .then(() => {
      console.log('\n✅ Refresh job completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Refresh job failed:', error);
      process.exit(1);
    });
}

// Export for use as module (e.g., in Supabase Edge Function)
export { runScheduledRefresh };
