/**
 * Vehicle Valuation Service
 * Uses Marketcheck's price prediction API with condition adjustments
 * Caches results in Supabase for 30 days
 * 
 * Features:
 * - Smart API key rotation (switches when quota exhausted)
 * - Monthly reset of exhausted keys
 * - Fallback to depreciation formula when all keys unavailable
 */

import { supabase } from '../lib/supabaseClient';
import { rateLimiter } from '../utils/apiRateLimiter';
import { ApiKeyManager } from '../utils/apiKeyManager';
import logger from '../utils/logger';

const API_BASE = 'https://api.marketcheck.com';

// API credentials - loaded from env (no hardcoded fallbacks)
const API_KEY = process.env.EXPO_PUBLIC_MARKETCHECK_API_KEY;
const API_SECRET = process.env.EXPO_PUBLIC_MARKETCHECK_API_SECRET || '';

if (!API_KEY) {
  logger.warn('⚠️ MARKETCHECK_API_KEY not configured. Valuations will use fallback estimates.');
}

// For backward compatibility, also support comma-separated keys
const API_KEYS = process.env.EXPO_PUBLIC_MARKETCHECK_API_KEYS 
  ? process.env.EXPO_PUBLIC_MARKETCHECK_API_KEYS.split(',').filter(k => k.trim())
  : (API_KEY ? [API_KEY] : []);

// Initialize the key manager
const keyManager = new ApiKeyManager(API_KEYS);

// Condition adjustments (applied to predicted price)
const CONDITION_ADJUSTMENTS = {
  excellent: 1.05,  // +5%
  good: 1.0,        // Base price
  fair: 0.92,       // -8%
  poor: 0.80,       // -20%
};

/**
 * Get tiered pricing multipliers based on vehicle value
 * Luxury/exotic vehicles have tighter margins (dealers pay closer to retail)
 * Economy vehicles have wider margins
 */
const getTieredPricing = (value) => {
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

// Cache duration: 30 days
const CACHE_DAYS = 30;

/**
 * Get next available API key using the key manager
 */
const getApiKey = async () => {
  return await keyManager.getCurrentKey();
};

/**
 * Check if cached value is still valid
 */
const isCacheValid = (lastFetched) => {
  if (!lastFetched) return false;
  const cacheAge = Date.now() - new Date(lastFetched).getTime();
  const maxAge = CACHE_DAYS * 24 * 60 * 60 * 1000;
  return cacheAge < maxAge;
};

/**
 * Get cached valuation from Supabase
 */
const getCachedValuation = async (make, model, year, trim, mileage) => {
  try {
    const { data, error } = await supabase
      .from('car_values')
      .select('*')
      .eq('make', make)
      .eq('model', model)
      .eq('year', year)
      .eq('trim', trim || 'Base')
      .single();

    if (error || !data) return null;
    if (!isCacheValid(data.last_fetched)) return null;

    // Check if mileage is close enough (within 5000 miles)
    if (data.mileage && mileage) {
      const mileageDiff = Math.abs(data.mileage - mileage);
      if (mileageDiff > 5000) return null; // Mileage too different, refetch
    }

    return data;
  } catch (error) {
    console.error('Error checking cache:', error);
    return null;
  }
};

/**
 * Save valuation to cache
 */
const cacheValuation = async (make, model, year, trim, mileage, valuation) => {
  try {
    const { error } = await supabase
      .from('car_values')
      .upsert({
        make,
        model,
        year,
        trim: trim || 'Base',
        mileage,
        estimated_value: valuation.predictedPrice,
        price_low: valuation.priceRange.low,
        price_high: valuation.priceRange.high,
        confidence: valuation.confidence,
        last_fetched: new Date().toISOString(),
      }, {
        onConflict: 'make,model,year,trim'
      });

    if (error) console.error('Error caching valuation:', error);
  } catch (error) {
    console.error('Error caching valuation:', error);
  }
};

/**
 * Fetch valuation from Marketcheck API with smart key rotation
 */
const fetchFromApi = async (make, model, year, trim, mileage, color) => {
  const endpoint = 'marketcheck-valuation';
  
  // Check if we have any available keys
  const hasKeys = await keyManager.hasAvailableKeys();
  if (!hasKeys) {
    const status = await keyManager.getStatus();
    console.log(`⚠️ No API keys available. Status: ${status.exhausted} exhausted, ${status.invalid} invalid`);
    throw new Error('All API keys exhausted or invalid. Will reset next month.');
  }
  
  return rateLimiter.executeWithRetry(endpoint, async () => {
    const apiKey = await getApiKey();
    
    if (!apiKey) {
      throw new Error('No API key available');
    }
    
    const params = new URLSearchParams({
      api_key: apiKey,
      make,
      model,
      year: year.toString(),
      car_type: 'used',
      miles: (mileage || 50000).toString(),
    });
    
    // Add API secret if available (required for some endpoints)
    if (API_SECRET) {
      params.append('api_secret', API_SECRET);
    }
    
    if (trim) params.append('trim', trim);
    if (color) params.append('base_exterior_color', color);

    const url = `${API_BASE}/v2/predict/car/price?${params.toString()}`;
    
    console.log(`🔍 Fetching valuation for ${year} ${make} ${model} ${trim || ''}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `API error: ${response.status}`;
      
      // Handle specific error types
      if (errorMessage.includes('quota exhausted') || errorMessage.includes('Monthly API quota')) {
        console.log(`⚠️ API key quota exhausted, switching to next key...`);
        await keyManager.markExhausted();
        
        // Try again with next key
        const nextKey = await keyManager.getCurrentKey();
        if (nextKey) {
          throw new Error('RETRY_WITH_NEW_KEY');
        }
      } else if (errorMessage.includes('Invalid authentication') || response.status === 401) {
        console.log(`⚠️ API key invalid, switching to next key...`);
        await keyManager.markInvalid();
        
        // Try again with next key
        const nextKey = await keyManager.getCurrentKey();
        if (nextKey) {
          throw new Error('RETRY_WITH_NEW_KEY');
        }
      }
      
      const err = new Error(errorMessage);
      err.status = response.status;
      throw err;
    }
    
    // Success - mark the key as working
    await keyManager.markSuccess();
    
    const data = await response.json();
    
    return {
      predictedPrice: data.predicted_price,
      priceRange: {
        low: data.price_range?.lower_bound || data.predicted_price * 0.85,
        high: data.price_range?.upper_bound || data.predicted_price * 1.10,
      },
      confidence: data.price_range ? 'high' : 'medium',
      source: 'marketcheck',
    };
  });
};

/**
 * Get vehicle valuation with condition adjustment
 * 
 * @param {Object} vehicle - Vehicle details
 * @param {string} vehicle.make
 * @param {string} vehicle.model
 * @param {number} vehicle.year
 * @param {string} vehicle.trim
 * @param {number} vehicle.mileage
 * @param {string} vehicle.condition - 'excellent', 'good', 'fair', 'poor'
 * @returns {Promise<Object>} Valuation with ranges
 */
export const getVehicleValuation = async (vehicle) => {
  const { make, model, year, trim, mileage, condition = 'good', color } = vehicle;
  
  try {
    // Check cache first (color affects price, so skip cache if color provided)
    const cached = color ? null : await getCachedValuation(make, model, year, trim, mileage);
    
    let baseValuation;
    
    if (cached) {
      console.log('✅ Using cached valuation');
      baseValuation = {
        predictedPrice: cached.estimated_value,
        priceRange: {
          low: cached.price_low,
          high: cached.price_high,
        },
        confidence: cached.confidence || 'medium',
        source: 'cache',
      };
    } else {
      // Fetch from API (include color if provided)
      baseValuation = await fetchFromApi(make, model, year, trim, mileage, color);
      
      // Cache the result
      await cacheValuation(make, model, year, trim, mileage, baseValuation);
    }
    
    // Apply condition adjustment
    const conditionMultiplier = CONDITION_ADJUSTMENTS[condition] || 1.0;
    
    const adjustedPrice = Math.round(baseValuation.predictedPrice * conditionMultiplier);
    const adjustedLow = Math.round(baseValuation.priceRange.low * conditionMultiplier);
    const adjustedHigh = Math.round(baseValuation.priceRange.high * conditionMultiplier);
    
    // Get tiered pricing based on vehicle value
    // Luxury/exotic vehicles have tighter margins (dealers pay closer to retail)
    const pricingTier = getTieredPricing(adjustedPrice);
    
    return {
      // Main values (condition-adjusted with tiered pricing)
      estimatedValue: adjustedPrice,
      tradeInValue: Math.round(adjustedPrice * pricingTier.tradeIn),
      privatePartyValue: Math.round(adjustedPrice * pricingTier.private),
      
      // Ranges
      priceRange: {
        low: adjustedLow,
        high: adjustedHigh,
        median: adjustedPrice,
      },
      
      // Metadata
      condition,
      conditionAdjustment: conditionMultiplier,
      confidence: baseValuation.confidence,
      source: baseValuation.source,
      
      // For display
      displayRange: `$${adjustedLow.toLocaleString()} - $${adjustedHigh.toLocaleString()}`,
    };
  } catch (error) {
    console.error('Valuation error:', error);
    
    // Return estimate based on depreciation formula as fallback
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;
    const baseMSRP = 35000; // Assume average MSRP
    const depreciation = Math.pow(0.85, age); // 15% per year
    const mileageAdjustment = 1 - ((mileage || 50000) - 12000 * age) * 0.00001;
    const conditionMultiplier = CONDITION_ADJUSTMENTS[condition] || 1.0;
    
    const estimated = Math.round(baseMSRP * depreciation * mileageAdjustment * conditionMultiplier);
    const fallbackPricing = getTieredPricing(estimated);
    
    return {
      estimatedValue: estimated,
      tradeInValue: Math.round(estimated * fallbackPricing.tradeIn),
      privatePartyValue: Math.round(estimated * fallbackPricing.private),
      priceRange: {
        low: Math.round(estimated * 0.85),
        high: Math.round(estimated * 1.15),
        median: estimated,
      },
      condition,
      conditionAdjustment: conditionMultiplier,
      confidence: 'low',
      source: 'estimate',
      displayRange: `$${Math.round(estimated * 0.85).toLocaleString()} - $${Math.round(estimated * 1.15).toLocaleString()}`,
      error: error.message,
    };
  }
};

/**
 * Get quick estimate without API call (for previews)
 */
export const getQuickEstimate = (year, purchasePrice, mileage, condition = 'good') => {
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;
  
  // Depreciation: ~15% first year, ~10% subsequent years
  let depreciation = 0.85; // First year
  for (let i = 1; i < age; i++) {
    depreciation *= 0.90;
  }
  
  // Mileage adjustment: -$0.10 per mile over 12k/year average
  const expectedMileage = age * 12000;
  const mileageDiff = (mileage || expectedMileage) - expectedMileage;
  const mileageAdjustment = mileageDiff * -0.10;
  
  // Condition adjustment
  const conditionMultiplier = CONDITION_ADJUSTMENTS[condition] || 1.0;
  
  const estimated = Math.round((purchasePrice * depreciation + mileageAdjustment) * conditionMultiplier);
  
  return {
    estimatedValue: Math.max(1000, estimated),
    confidence: 'estimate',
  };
};

/**
 * Get API key status (for debugging/display)
 */
export const getApiKeyStatus = async () => {
  return await keyManager.getStatus();
};

/**
 * Reset all API keys (for testing - use with caution)
 */
export const resetApiKeys = async () => {
  await keyManager.resetAll();
};

export default {
  getVehicleValuation,
  getQuickEstimate,
  getApiKeyStatus,
  resetApiKeys,
};
