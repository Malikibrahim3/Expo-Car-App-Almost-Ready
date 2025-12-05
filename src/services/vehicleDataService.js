/**
 * Vehicle Data Service
 * Fetches makes, models, trims, years from Supabase cache
 * Refreshes on the 2nd of each month when API limits reset
 */

import { supabase } from '../lib/supabaseClient';

// Cache in memory to avoid repeated DB calls during session
let memoryCache = {
  makes: null,
  models: {},
  trims: {},
  years: {},
  lastFetch: null
};

// Check if we should refresh (2nd of each month)
const shouldRefreshCache = () => {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const lastRefresh = memoryCache.lastFetch;
  
  // Refresh if it's the 2nd and we haven't refreshed today
  if (dayOfMonth === 2) {
    if (!lastRefresh) return true;
    const lastRefreshDate = new Date(lastRefresh);
    return lastRefreshDate.getDate() !== 2 || 
           lastRefreshDate.getMonth() !== now.getMonth() ||
           lastRefreshDate.getFullYear() !== now.getFullYear();
  }
  return false;
};

// Clear memory cache (call on 2nd of month or manually)
export const clearCache = () => {
  memoryCache = {
    makes: null,
    models: {},
    trims: {},
    years: {},
    lastFetch: null
  };
};

/**
 * Get all vehicle makes
 * @returns {Promise<Array<{value: string, label: string}>>}
 */
export const getMakes = async () => {
  try {
    // Check memory cache first
    if (memoryCache.makes && !shouldRefreshCache()) {
      return memoryCache.makes;
    }

    const { data, error } = await supabase
      .from('vehicle_makes')
      .select('make')
      .order('make');

    if (error) throw error;

    const makes = data.map(row => ({
      value: row.make,
      label: row.make
    }));

    // Update memory cache
    memoryCache.makes = makes;
    memoryCache.lastFetch = new Date().toISOString();

    return makes;
  } catch (error) {
    console.error('Error fetching makes:', error);
    return [];
  }
};

/**
 * Get models for a specific make
 * @param {string} make
 * @returns {Promise<Array<{value: string, label: string}>>}
 */
export const getModels = async (make) => {
  if (!make) return [];

  try {
    // Check memory cache first
    if (memoryCache.models[make] && !shouldRefreshCache()) {
      return memoryCache.models[make];
    }

    const { data, error } = await supabase
      .from('vehicle_models')
      .select('model')
      .eq('make', make)
      .order('model');

    if (error) throw error;

    const models = data.map(row => ({
      value: row.model,
      label: row.model
    }));

    // Update memory cache
    memoryCache.models[make] = models;

    return models;
  } catch (error) {
    console.error(`Error fetching models for ${make}:`, error);
    return [];
  }
};

/**
 * Get trims for a specific make and model
 * @param {string} make
 * @param {string} model
 * @returns {Promise<Array<{value: string, label: string}>>}
 */
export const getTrims = async (make, model) => {
  if (!make || !model) return [];

  try {
    const cacheKey = `${make}|${model}`;
    
    // Check memory cache first
    if (memoryCache.trims[cacheKey] && !shouldRefreshCache()) {
      return memoryCache.trims[cacheKey];
    }

    const { data, error } = await supabase
      .from('vehicle_trims')
      .select('trim')
      .eq('make', make)
      .eq('model', model)
      .order('trim');

    if (error) throw error;

    const trims = data.map(row => ({
      value: row.trim,
      label: row.trim
    }));

    // Update memory cache
    memoryCache.trims[cacheKey] = trims;

    return trims;
  } catch (error) {
    console.error(`Error fetching trims for ${make} ${model}:`, error);
    return [];
  }
};

/**
 * Get years for a specific make, model, and trim
 * @param {string} make
 * @param {string} model
 * @param {string} trim (optional - if not provided, gets all years for make/model)
 * @returns {Promise<Array<{value: string, label: string}>>}
 */
export const getYears = async (make, model, trim = null) => {
  if (!make || !model) return [];

  try {
    const cacheKey = `${make}|${model}|${trim || 'all'}`;
    
    // Check memory cache first
    if (memoryCache.years[cacheKey] && !shouldRefreshCache()) {
      return memoryCache.years[cacheKey];
    }

    let query = supabase
      .from('vehicle_years')
      .select('year')
      .eq('make', make)
      .eq('model', model);

    if (trim) {
      query = query.eq('trim', trim);
    }

    const { data, error } = await query.order('year', { ascending: false });

    if (error) throw error;

    // Get unique years (in case of duplicates from different trims)
    const uniqueYears = [...new Set(data.map(row => row.year))];
    
    const years = uniqueYears.map(year => ({
      value: year.toString(),
      label: year.toString()
    }));

    // Update memory cache
    memoryCache.years[cacheKey] = years;

    return years;
  } catch (error) {
    console.error(`Error fetching years for ${make} ${model}:`, error);
    return [];
  }
};

/**
 * Get all years available (for initial dropdown before make is selected)
 * @returns {Promise<Array<{value: string, label: string}>>}
 */
export const getAllYears = async () => {
  // Return static range 2014-2025 (matches our seeded data)
  const years = [];
  for (let year = 2025; year >= 2014; year--) {
    years.push({ value: year.toString(), label: year.toString() });
  }
  return years;
};

// Export colors (static, no need to fetch from DB)
export const CAR_COLORS = [
  { value: 'Black', label: 'Black' },
  { value: 'White', label: 'White' },
  { value: 'Silver', label: 'Silver' },
  { value: 'Gray', label: 'Gray' },
  { value: 'Red', label: 'Red' },
  { value: 'Blue', label: 'Blue' },
  { value: 'Navy Blue', label: 'Navy Blue' },
  { value: 'Green', label: 'Green' },
  { value: 'Brown', label: 'Brown' },
  { value: 'Beige', label: 'Beige' },
  { value: 'Gold', label: 'Gold' },
  { value: 'Orange', label: 'Orange' },
  { value: 'Yellow', label: 'Yellow' },
  { value: 'Purple', label: 'Purple' },
  { value: 'Pearl White', label: 'Pearl White' },
  { value: 'Midnight Black', label: 'Midnight Black' },
];
