/**
 * Supabase Database Service
 * Handles all database operations for vehicle caching with separate tables
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Initialize database tables
 */
export const initializeTables = async () => {
  try {
    // Check if separate tables exist
    const { error: makesError } = await supabase
      .from('vehicle_makes')
      .select('id')
      .limit(1);
    
    const { error: modelsError } = await supabase
      .from('vehicle_models')
      .select('id')
      .limit(1);
    
    const { error: trimsError } = await supabase
      .from('vehicle_trims')
      .select('id')
      .limit(1);
    
    const { error: yearsError } = await supabase
      .from('vehicle_years')
      .select('id')
      .limit(1);
    
    const { error: valError } = await supabase
      .from('car_values')
      .select('id')
      .limit(1);

    if (makesError || modelsError || trimsError || yearsError || valError) {
      console.log('⚠️ Database tables need to be created. Please run the SQL script in fix-database-schema-separate-tables.sql');
      return false;
    }

    console.log('✅ Database tables are ready');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
};

/**
 * Vehicle Reference Data Operations with Separate Tables
 */

// Insert makes
export const cacheMakes = async (makes) => {
  try {
    const makeData = makes.map(make => ({
      make: make
    }));

    const { error } = await supabase
      .from('vehicle_makes')
      .upsert(makeData, { 
        onConflict: 'make',
        ignoreDuplicates: true 
      });

    if (error) throw error;
    console.log(`✅ Cached ${makes.length} makes`);
    return true;
  } catch (error) {
    console.error('❌ Failed to cache makes:', error);
    return false;
  }
};

// Insert models for a make
export const cacheModels = async (make, models) => {
  try {
    const modelData = models.map(model => ({
      make: make,
      model: model
    }));

    const { error } = await supabase
      .from('vehicle_models')
      .upsert(modelData, { 
        onConflict: 'make,model',
        ignoreDuplicates: true 
      });

    if (error) throw error;
    console.log(`✅ Cached ${models.length} models for ${make}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to cache models for ${make}:`, error);
    return false;
  }
};

// Insert trims for a make/model
export const cacheTrims = async (make, model, trims) => {
  try {
    const trimData = trims.map(trim => ({
      make: make,
      model: model,
      trim: trim
    }));

    const { error } = await supabase
      .from('vehicle_trims')
      .upsert(trimData, { 
        onConflict: 'make,model,trim',
        ignoreDuplicates: true 
      });

    if (error) throw error;
    console.log(`✅ Cached ${trims.length} trims for ${make} ${model}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to cache trims for ${make} ${model}:`, error);
    return false;
  }
};

// Insert years for a make/model/trim
export const cacheYears = async (make, model, trim, years) => {
  try {
    const yearData = years.map(year => ({
      make: make,
      model: model,
      trim: trim,
      year: year
    }));

    const { error } = await supabase
      .from('vehicle_years')
      .upsert(yearData, { 
        onConflict: 'make,model,trim,year',
        ignoreDuplicates: true 
      });

    if (error) throw error;
    console.log(`✅ Cached ${years.length} years for ${make} ${model} ${trim}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to cache years for ${make} ${model} ${trim}:`, error);
    return false;
  }
};

/**
 * Retrieve cached reference data from separate tables
 */

// Get all cached makes
export const getCachedMakes = async () => {
  try {
    const { data, error } = await supabase
      .from('vehicle_makes')
      .select('make')
      .order('make');

    if (error) throw error;
    return data.map(row => row.make);
  } catch (error) {
    console.error('❌ Failed to get cached makes:', error);
    return [];
  }
};

// Get cached models for a make
export const getCachedModels = async (make) => {
  try {
    const { data, error } = await supabase
      .from('vehicle_models')
      .select('model')
      .eq('make', make)
      .order('model');

    if (error) throw error;
    return data.map(row => row.model);
  } catch (error) {
    console.error(`❌ Failed to get cached models for ${make}:`, error);
    return [];
  }
};

// Get cached trims for a make/model
export const getCachedTrims = async (make, model) => {
  try {
    const { data, error } = await supabase
      .from('vehicle_trims')
      .select('trim')
      .eq('make', make)
      .eq('model', model)
      .order('trim');

    if (error) throw error;
    return data.map(row => row.trim);
  } catch (error) {
    console.error(`❌ Failed to get cached trims for ${make} ${model}:`, error);
    return [];
  }
};

// Get cached years for a make/model/trim
export const getCachedYears = async (make, model, trim) => {
  try {
    const { data, error } = await supabase
      .from('vehicle_years')
      .select('year')
      .eq('make', make)
      .eq('model', model)
      .eq('trim', trim)
      .order('year', { ascending: false });

    if (error) throw error;
    return data.map(row => row.year);
  } catch (error) {
    console.error(`❌ Failed to get cached years for ${make} ${model} ${trim}:`, error);
    return [];
  }
};

/**
 * Vehicle Values Cache Operations
 */

// Cache vehicle value
export const cacheVehicleValue = async (make, model, trim, year, valueData) => {
  try {
    const { error } = await supabase
      .from('car_values')
      .upsert({
        make,
        model,
        trim,
        year,
        cached_value: valueData,
        last_fetched: new Date().toISOString()
      }, {
        onConflict: 'make,model,trim,year'
      });

    if (error) throw error;
    console.log(`✅ Cached value for ${year} ${make} ${model} ${trim}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to cache value for ${year} ${make} ${model} ${trim}:`, error);
    return false;
  }
};

// Get cached vehicle value
export const getCachedVehicleValue = async (make, model, trim, year) => {
  try {
    const { data, error } = await supabase
      .from('car_values')
      .select('*')
      .eq('make', make)
      .eq('model', model)
      .eq('trim', trim)
      .eq('year', year)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        return null;
      }
      throw error;
    }

    // Check if cache is still valid (30 days)
    const lastFetched = new Date(data.last_fetched);
    const now = new Date();
    const daysDiff = (now - lastFetched) / (1000 * 60 * 60 * 24);

    if (daysDiff > 30) {
      console.log(`⏰ Cache expired for ${year} ${make} ${model} ${trim} (${daysDiff.toFixed(1)} days old)`);
      return null;
    }

    console.log(`✅ Cache hit for ${year} ${make} ${model} ${trim}`);
    return data.cached_value;
  } catch (error) {
    console.error(`❌ Failed to get cached value for ${year} ${make} ${model} ${trim}:`, error);
    return null;
  }
};

/**
 * API Call Logging
 */
export const logApiCall = async (endpoint, make, model, trim, year, success, responseTime) => {
  try {
    const { error } = await supabase
      .from('api_call_log')
      .insert({
        endpoint,
        make,
        model,
        trim,
        year,
        success,
        response_time_ms: responseTime
      });

    if (error) throw error;
  } catch (error) {
    console.error('❌ Failed to log API call:', error);
  }
};

/**
 * Cache Statistics for separate tables
 */
export const getCacheStats = async () => {
  try {
    const [makesResult, modelsResult, trimsResult, yearsResult, valuesResult] = await Promise.all([
      supabase.from('vehicle_makes').select('id', { count: 'exact' }),
      supabase.from('vehicle_models').select('id', { count: 'exact' }),
      supabase.from('vehicle_trims').select('id', { count: 'exact' }),
      supabase.from('vehicle_years').select('id', { count: 'exact' }),
      supabase.from('car_values').select('id', { count: 'exact' })
    ]);

    return {
      makes: makesResult.count || 0,
      models: modelsResult.count || 0,
      trims: trimsResult.count || 0,
      years: yearsResult.count || 0,
      values: valuesResult.count || 0
    };
  } catch (error) {
    console.error('❌ Failed to get cache stats:', error);
    return { makes: 0, models: 0, trims: 0, years: 0, values: 0 };
  }
};