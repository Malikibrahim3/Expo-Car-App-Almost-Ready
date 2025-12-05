/**
 * Vehicle Cache Service
 * Handles caching of vehicle reference data and values using MarketCheck API + Supabase
 */

import * as api from './newCarApi';
import * as db from './supabaseService';

// Target makes to cache, grouped by category
const TARGET_MAKES = {
  'Luxury / Premium': ['BMW', 'Mercedes-Benz'],
  'Sports / Performance': ['Bugatti', 'Lamborghini'],
  'Mainstream / Mass Market': ['Toyota', 'Ford'],
  'Electric / EV': ['Tesla', 'NIO'],
  'SUV / Off-Road': ['Jeep', 'Land Rover']
};

const ALL_TARGET_MAKES = Object.values(TARGET_MAKES).flat();

/**
 * Initialize the caching system
 */
export const initializeCache = async () => {
  try {
    console.log('🚀 Initializing vehicle cache system...');
    
    // Initialize database tables
    const tablesReady = await db.initializeTables();
    if (!tablesReady) {
      throw new Error('Database tables not ready');
    }

    // Check if we already have cached data
    const stats = await db.getCacheStats();
    console.log('📊 Current cache stats:', stats);

    if (stats.makes === 0) {
      console.log('🔄 No cached data found. Starting initial cache population...');
      await populateInitialCache();
    } else {
      console.log('✅ Cache already populated');
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize cache:', error);
    return false;
  }
};

/**
 * Populate initial cache with all target makes, models, trims, and years
 */
export const populateInitialCache = async () => {
  try {
    console.log('🔄 Starting initial cache population...');
    let totalApiCalls = 0;

    // Step 1: Cache all target makes
    await db.cacheMakes(ALL_TARGET_MAKES);

    // Step 2: For each make, fetch and cache models
    for (const make of ALL_TARGET_MAKES) {
      try {
        console.log(`\n📋 Processing ${make}...`);
        
        const startTime = Date.now();
        const modelsResponse = await api.getModels(make);
        const responseTime = Date.now() - startTime;
        totalApiCalls++;

        await db.logApiCall('getModels', make, null, null, null, true, responseTime);

        if (modelsResponse.models && modelsResponse.models.length > 0) {
          const modelNames = modelsResponse.models.map(m => m.name || m.id);
          await db.cacheModels(make, modelNames);

          // Step 3: For each model, fetch and cache trims
          for (const model of modelNames.slice(0, 5)) { // Limit to first 5 models to conserve API calls
            try {
              const trimStartTime = Date.now();
              const trimsResponse = await api.getTrims(make, model, 2023); // Use 2023 as reference year
              const trimResponseTime = Date.now() - trimStartTime;
              totalApiCalls++;

              await db.logApiCall('getTrims', make, model, null, null, true, trimResponseTime);

              if (trimsResponse.trims && trimsResponse.trims.length > 0) {
                const trimNames = trimsResponse.trims.map(t => t.name || t.id);
                await db.cacheTrims(make, model, trimNames);

                // Step 4: For each trim, fetch and cache years
                for (const trim of trimNames.slice(0, 3)) { // Limit to first 3 trims
                  try {
                    const yearStartTime = Date.now();
                    const yearsResponse = await api.getYears(make, model);
                    const yearResponseTime = Date.now() - yearStartTime;
                    totalApiCalls++;

                    await db.logApiCall('getYears', make, model, trim, null, true, yearResponseTime);

                    if (yearsResponse.years && yearsResponse.years.length > 0) {
                      const yearNumbers = yearsResponse.years.map(y => y.year);
                      await db.cacheYears(make, model, trim, yearNumbers);
                    }
                  } catch (error) {
                    console.error(`❌ Failed to cache years for ${make} ${model} ${trim}:`, error);
                    await db.logApiCall('getYears', make, model, trim, null, false, 0);
                  }

                  // Rate limiting: small delay between calls
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              }
            } catch (error) {
              console.error(`❌ Failed to cache trims for ${make} ${model}:`, error);
              await db.logApiCall('getTrims', make, model, null, null, false, 0);
            }

            // Rate limiting: small delay between calls
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } catch (error) {
        console.error(`❌ Failed to cache models for ${make}:`, error);
        await db.logApiCall('getModels', make, null, null, null, false, 0);
      }

      // Rate limiting: delay between makes
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const finalStats = await db.getCacheStats();
    console.log('\n🎉 Initial cache population complete!');
    console.log('📊 Final cache stats:', finalStats);
    console.log(`📞 Total API calls made: ${totalApiCalls}`);

    return true;
  } catch (error) {
    console.error('❌ Failed to populate initial cache:', error);
    return false;
  }
};

/**
 * Get vehicle makes from cache
 */
export const getMakes = async () => {
  try {
    const cachedMakes = await db.getCachedMakes();
    
    if (cachedMakes.length === 0) {
      console.log('⚠️ No cached makes found, initializing cache...');
      await initializeCache();
      return await db.getCachedMakes();
    }

    return cachedMakes.map(make => ({ id: make, name: make }));
  } catch (error) {
    console.error('❌ Failed to get makes:', error);
    return [];
  }
};

/**
 * Get vehicle models from cache
 */
export const getModels = async (make) => {
  try {
    const cachedModels = await db.getCachedModels(make);
    return cachedModels.map(model => ({ id: model, name: model }));
  } catch (error) {
    console.error(`❌ Failed to get models for ${make}:`, error);
    return [];
  }
};

/**
 * Get vehicle trims from cache
 */
export const getTrims = async (make, model) => {
  try {
    const cachedTrims = await db.getCachedTrims(make, model);
    return cachedTrims.map(trim => ({ id: trim, name: trim }));
  } catch (error) {
    console.error(`❌ Failed to get trims for ${make} ${model}:`, error);
    return [];
  }
};

/**
 * Get vehicle years from cache
 */
export const getYears = async (make, model, trim) => {
  try {
    const cachedYears = await db.getCachedYears(make, model, trim);
    return cachedYears.map(year => ({ year, count: 0 }));
  } catch (error) {
    console.error(`❌ Failed to get years for ${make} ${model} ${trim}:`, error);
    return [];
  }
};

/**
 * Get vehicle value with intelligent caching
 * This is the main function that handles cache lookup, API fetch, and cache update
 */
export const getVehicleValue = async (make, model, trim, year, mileage = null) => {
  try {
    console.log(`🔍 Getting value for ${year} ${make} ${model} ${trim}`);

    // Step 1: Check cache first
    const cachedValue = await db.getCachedVehicleValue(make, model, trim, year);
    
    if (cachedValue) {
      console.log('✅ Returning cached value');
      return cachedValue;
    }

    // Step 2: Cache miss or expired - fetch from API
    console.log('🔄 Cache miss - fetching from API...');
    
    const startTime = Date.now();
    const apiValue = await api.getEstimatedValue(make, model, year, mileage, trim);
    const responseTime = Date.now() - startTime;

    // Step 3: Log API call
    await db.logApiCall('getEstimatedValue', make, model, trim, year, true, responseTime);

    // Step 4: Cache the result
    await db.cacheVehicleValue(make, model, trim, year, apiValue);

    console.log('✅ Value fetched and cached');
    return apiValue;

  } catch (error) {
    console.error(`❌ Failed to get vehicle value for ${year} ${make} ${model} ${trim}:`, error);
    
    // Log failed API call
    await db.logApiCall('getEstimatedValue', make, model, trim, year, false, 0);
    
    throw error;
  }
};

/**
 * Refresh expired cache entries in background
 */
export const refreshExpiredCache = async () => {
  try {
    console.log('🔄 Checking for expired cache entries...');
    
    // Get all cached values older than 7 days
    const { supabase } = await import('../lib/supabaseClient');
    const { data: expiredEntries } = await supabase
      .from('car_values')
      .select('*')
      .lt('last_fetched', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (!expiredEntries || expiredEntries.length === 0) {
      console.log('✅ No expired cache entries found');
      return;
    }

    console.log(`🔄 Found ${expiredEntries.length} expired entries, refreshing...`);

    // Refresh each expired entry
    for (const entry of expiredEntries.slice(0, 10)) { // Limit to 10 to conserve API calls
      try {
        await getVehicleValue(entry.make, entry.model, entry.trim, entry.year);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`❌ Failed to refresh ${entry.year} ${entry.make} ${entry.model} ${entry.trim}:`, error);
      }
    }

    console.log('✅ Cache refresh complete');
  } catch (error) {
    console.error('❌ Failed to refresh expired cache:', error);
  }
};

/**
 * Get cache statistics and API usage
 */
export const getCacheStatistics = async () => {
  try {
    const stats = await db.getCacheStats();
    
    // Get API call statistics for today
    const { supabase } = await import('../lib/supabaseClient');
    const today = new Date().toISOString().split('T')[0];
    const { data: todaysCalls } = await supabase
      .from('api_call_log')
      .select('*')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`);

    const successfulCalls = todaysCalls?.filter(call => call.success).length || 0;
    const failedCalls = todaysCalls?.filter(call => !call.success).length || 0;

    return {
      cache: stats,
      apiUsage: {
        today: {
          total: (todaysCalls?.length || 0),
          successful: successfulCalls,
          failed: failedCalls
        },
        remaining: Math.max(0, 500 - successfulCalls) // Assuming 500 daily limit
      }
    };
  } catch (error) {
    console.error('❌ Failed to get cache statistics:', error);
    return null;
  }
};

/**
 * Manual cache population for specific vehicle
 */
export const cacheSpecificVehicle = async (make, model, trim, year) => {
  try {
    console.log(`🔄 Manually caching ${year} ${make} ${model} ${trim}...`);
    
    // Cache the reference data
    await db.cacheMakes([make]);
    await db.cacheModels(make, [model]);
    await db.cacheTrims(make, model, [trim]);
    await db.cacheYears(make, model, trim, [year]);
    
    // Cache the value
    await getVehicleValue(make, model, trim, year);
    
    console.log('✅ Vehicle cached successfully');
    return true;
  } catch (error) {
    console.error(`❌ Failed to cache ${year} ${make} ${model} ${trim}:`, error);
    return false;
  }
};