/**
 * Car API Service - Direct Integration
 * 
 * This service integrates with the car API endpoints
 * for vehicle data, VIN decoding, and market information
 */

import logger from '../utils/logger';

// API Configuration - load from environment (no hardcoded fallbacks)
const BASE_URL = 'https://mc-api.marketcheck.com';
const API_KEY = process.env.EXPO_PUBLIC_MARKETCHECK_API_KEY || process.env.REACT_APP_CAR_API_KEY;

if (!API_KEY) {
  logger.warn('⚠️ CAR_API_KEY not configured. Some features may not work.');
}

/**
 * Helper function to make API requests with error handling
 */
const apiRequest = async (endpoint, options = {}) => {
  try {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`🔄 API Request: ${endpoint}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ API Response: ${endpoint}`, 'success');
    return data;
  } catch (error) {
    console.error(`❌ API Error: ${endpoint}`, error.message);
    throw error;
  }
};

/**
 * Auto-complete for car taxonomy terms
 * @param {string} query - Search query
 * @returns {Promise<Object>} Auto-complete suggestions
 */
export const getAutoComplete = async (query) => {
  try {
    const response = await apiRequest(`/v2/search/car/auto-complete?api_key=${API_KEY}&q=${encodeURIComponent(query)}`);
    return response;
  } catch (error) {
    console.error('Failed to get auto-complete:', error);
    return { suggestions: [] };
  }
};

/**
 * Get unique taxonomy terms for cars
 * @param {string} field - Field name (make, model, year, etc.)
 * @returns {Promise<Object>} Taxonomy terms
 */
export const getTaxonomyTerms = async (field) => {
  try {
    const response = await apiRequest(`/v2/specs/car/terms?api_key=${API_KEY}&field=${field}`);
    return response;
  } catch (error) {
    console.error(`Failed to get taxonomy terms for ${field}:`, error);
    return { terms: [] };
  }
};

/**
 * Get all vehicle makes (now uses cache)
 * @returns {Promise<Object>} Object with makes array
 */
export const getMakes = async () => {
  try {
    // Import cache service dynamically to avoid circular imports
    const { getMakes: getCachedMakes } = await import('./vehicleCacheService');
    const makes = await getCachedMakes();
    return { makes, cached: true };
  } catch (error) {
    console.error('Failed to fetch makes from cache, falling back to API:', error);
    
    // Fallback to direct API call
    try {
      const response = await getTaxonomyTerms('make');
      const makes = (response.terms || []).map(term => ({
        id: term,
        name: term,
        count: 0
      }));
      return { makes, cached: false };
    } catch (apiError) {
      console.error('API fallback also failed:', apiError);
      // Return hardcoded fallback data
      return {
        makes: [
          { id: 'Toyota', name: 'Toyota' },
          { id: 'Honda', name: 'Honda' },
          { id: 'Ford', name: 'Ford' },
          { id: 'Chevrolet', name: 'Chevrolet' },
          { id: 'BMW', name: 'BMW' },
          { id: 'Mercedes-Benz', name: 'Mercedes-Benz' },
          { id: 'Audi', name: 'Audi' },
          { id: 'Nissan', name: 'Nissan' },
          { id: 'Volkswagen', name: 'Volkswagen' },
          { id: 'Lexus', name: 'Lexus' },
        ],
        cached: false
      };
    }
  }
};

/**
 * Get models for a specific make (now uses cache)
 * @param {string} make - Vehicle make name
 * @returns {Promise<Object>} Object with models array
 */
export const getModels = async (make) => {
  try {
    // Import cache service dynamically to avoid circular imports
    const { getModels: getCachedModels } = await import('./vehicleCacheService');
    const models = await getCachedModels(make);
    return { models, cached: true };
  } catch (error) {
    console.error(`Failed to fetch models for ${make} from cache, falling back to API:`, error);
    
    // Fallback to direct API call
    try {
      const response = await getAutoComplete(`${make} `);
      const models = (response.suggestions || [])
        .filter(suggestion => suggestion.type === 'model')
        .map(suggestion => ({
          id: suggestion.value,
          name: suggestion.value,
          count: 0
        }));
      
      return { models, cached: false };
    } catch (apiError) {
      console.error('API fallback also failed:', apiError);
      // Return fallback data
      return {
        models: [
          { id: 'Model 1', name: 'Model 1' },
          { id: 'Model 2', name: 'Model 2' },
          { id: 'Model 3', name: 'Model 3' },
        ],
        cached: false
      };
    }
  }
};

/**
 * Get years for a specific make and model (now uses cache)
 * @param {string} make - Vehicle make name
 * @param {string} model - Vehicle model name
 * @param {string} trim - Vehicle trim (optional)
 * @returns {Promise<Object>} Object with years array
 */
export const getYears = async (make, model, trim = null) => {
  try {
    // Import cache service dynamically to avoid circular imports
    const { getYears: getCachedYears } = await import('./vehicleCacheService');
    const years = await getCachedYears(make, model, trim);
    return { years, cached: true };
  } catch (error) {
    console.error(`Failed to fetch years for ${make} ${model} from cache, falling back to API:`, error);
    
    // Fallback to direct API call
    try {
      const response = await getTaxonomyTerms('year');
      const years = (response.terms || [])
        .filter(year => !isNaN(year) && year >= 1990)
        .sort((a, b) => b - a)
        .map(year => ({
          year: parseInt(year),
          count: 0,
          avgPrice: null
        }));
      
      return { years, cached: false };
    } catch (apiError) {
      console.error('API fallback also failed:', apiError);
      // Return fallback data - last 10 years
      const currentYear = new Date().getFullYear();
      return {
        years: Array.from({ length: 10 }, (_, i) => ({ year: currentYear - i })),
        cached: false
      };
    }
  }
};

/**
 * Get trims for a specific make, model, and year (now uses cache)
 * @param {string} make - Vehicle make name
 * @param {string} model - Vehicle model name
 * @param {number} year - Vehicle year
 * @returns {Promise<Object>} Object with trims array
 */
export const getTrims = async (make, model, year) => {
  try {
    // Import cache service dynamically to avoid circular imports
    const { getTrims: getCachedTrims } = await import('./vehicleCacheService');
    const trims = await getCachedTrims(make, model);
    return { trims, cached: true };
  } catch (error) {
    console.error(`Failed to fetch trims for ${year} ${make} ${model} from cache, falling back to API:`, error);
    
    // Fallback to direct API call
    try {
      const response = await getTaxonomyTerms('trim');
      const trims = (response.terms || []).map(trim => ({
        id: trim,
        name: trim,
        version: null,
        bodyType: null,
        drivetrain: null,
        fuelType: null,
        engine: null,
        transmission: null,
        count: 0
      }));
      
      return { trims, cached: false };
    } catch (apiError) {
      console.error('API fallback also failed:', apiError);
      // Return empty array (trims are optional)
      return { trims: [], cached: false };
    }
  }
};

/**
 * Search active car listings
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} Search results
 */
export const searchVehicles = async (params) => {
  try {
    const searchParams = new URLSearchParams({ api_key: API_KEY, ...params });
    const response = await apiRequest(`/v2/search/car/active?${searchParams.toString()}`);
    return response;
  } catch (error) {
    console.error('Failed to search vehicles:', error);
    return { listings: [], num_found: 0 };
  }
};

/**
 * Get car listing by ID
 * @param {string} id - Listing ID
 * @returns {Promise<Object>} Listing details
 */
export const getListingById = async (id) => {
  try {
    const response = await apiRequest(`/v2/listing/car/${id}?api_key=${API_KEY}`);
    return response;
  } catch (error) {
    console.error(`Failed to get listing ${id}:`, error);
    throw error;
  }
};

/**
 * Get listing media (photos, videos)
 * @param {string} id - Listing ID
 * @returns {Promise<Object>} Media data
 */
export const getListingMedia = async (id) => {
  try {
    const response = await apiRequest(`/v2/listing/car/${id}/media?api_key=${API_KEY}`);
    return response;
  } catch (error) {
    console.error(`Failed to get media for listing ${id}:`, error);
    return { photos: [], videos: [] };
  }
};

/**
 * Get listing extras (options, features, comments)
 * @param {string} id - Listing ID
 * @returns {Promise<Object>} Extra data
 */
export const getListingExtras = async (id) => {
  try {
    const response = await apiRequest(`/v2/listing/car/${id}/extra?api_key=${API_KEY}`);
    return response;
  } catch (error) {
    console.error(`Failed to get extras for listing ${id}:`, error);
    return { options: [], features: [], comments: [] };
  }
};

/**
 * Decode VIN to specifications
 * @param {string} vin - Vehicle Identification Number
 * @returns {Promise<Object>} Vehicle specifications
 */
export const decodeVIN = async (vin) => {
  try {
    const response = await apiRequest(`/v2/decode/car/${vin}/specs?api_key=${API_KEY}`);
    return {
      make: response.make,
      model: response.model,
      year: response.year,
      trim: response.trim,
      engine: response.engine,
      transmission: response.transmission,
      drivetrain: response.drivetrain,
      fuelType: response.fuel_type,
      bodyType: response.body_type,
      vin: vin,
    };
  } catch (error) {
    console.error(`Failed to decode VIN ${vin}:`, error);
    throw new Error('VIN decode failed. Please enter vehicle details manually.');
  }
};

/**
 * Enhanced VIN decode using EPI
 * @param {string} vin - Vehicle Identification Number
 * @returns {Promise<Object>} Enhanced vehicle specifications
 */
export const decodeVINEnhanced = async (vin) => {
  try {
    const response = await apiRequest(`/v2/decode/car/epi/${vin}/specs?api_key=${API_KEY}`);
    return response;
  } catch (error) {
    console.error(`Failed to enhanced decode VIN ${vin}:`, error);
    // Fallback to basic decode
    return await decodeVIN(vin);
  }
};

/**
 * NeoVIN Enhanced VIN decode
 * @param {string} vin - Vehicle Identification Number
 * @returns {Promise<Object>} NeoVIN specifications
 */
export const decodeVINNeo = async (vin) => {
  try {
    const response = await apiRequest(`/v2/decode/car/neovin/${vin}/specs?api_key=${API_KEY}`);
    return response;
  } catch (error) {
    console.error(`Failed to NeoVIN decode VIN ${vin}:`, error);
    // Fallback to basic decode
    return await decodeVIN(vin);
  }
};

/**
 * Get VIN history
 * @param {string} vin - Vehicle Identification Number
 * @returns {Promise<Object>} VIN history data
 */
export const getVINHistory = async (vin) => {
  try {
    const response = await apiRequest(`/v2/history/car/${vin}?api_key=${API_KEY}`);
    return response;
  } catch (error) {
    console.error(`Failed to get VIN history for ${vin}:`, error);
    return { history: [] };
  }
};

/**
 * Get car price prediction
 * @param {Object} specs - Vehicle specifications
 * @returns {Promise<Object>} Price prediction
 */
export const getPricePrediction = async (specs) => {
  try {
    const response = await apiRequest(`/v2/predict/car/price?api_key=${API_KEY}`, {
      method: 'POST',
      body: JSON.stringify(specs)
    });
    return response;
  } catch (error) {
    console.error('Failed to get price prediction:', error);
    throw error;
  }
};

/**
 * Get estimated value with intelligent caching (now uses cache-first approach)
 * @param {string} make - Vehicle make name
 * @param {string} model - Vehicle model name
 * @param {number} year - Vehicle year
 * @param {number} mileage - Vehicle mileage (optional)
 * @param {string} trim - Vehicle trim (optional)
 * @returns {Promise<Object>} Valuation data
 */
export const getEstimatedValue = async (make, model, year, mileage, trim) => {
  try {
    // Try cache-first approach
    const { getVehicleValue } = await import('./vehicleCacheService');
    return await getVehicleValue(make, model, trim, year, mileage);
  } catch (error) {
    console.error(`Cache-first approach failed, falling back to direct API:`, error);
    
    // Fallback to direct API call
    try {
      const params = {
        make,
        model,
        year: year.toString(),
        rows: 50
      };
      
      if (mileage) params.mileage = mileage.toString();
      if (trim) params.trim = trim;
      
      const response = await searchVehicles(params);
      
      if (!response.listings || response.listings.length === 0) {
        throw new Error('No listings found for this vehicle');
      }
      
      // Calculate pricing statistics
      const prices = response.listings
        .map(listing => listing.price)
        .filter(price => price && price > 0)
        .sort((a, b) => a - b);
      
      if (prices.length === 0) {
        throw new Error('No valid pricing data found');
      }
      
      const minPrice = prices[0];
      const maxPrice = prices[prices.length - 1];
      const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      const medianPrice = prices[Math.floor(prices.length / 2)];
      
      // Apply mileage adjustment if provided
      let estimatedValue = avgPrice;
      if (mileage) {
        const avgMileage = response.listings
          .map(listing => listing.miles)
          .filter(miles => miles && miles > 0)
          .reduce((a, b, _, arr) => a + b / arr.length, 0);
        
        if (avgMileage) {
          const mileageDifference = mileage - avgMileage;
          const mileageAdjustment = mileageDifference * 0.10; // $0.10 per mile
          estimatedValue = Math.max(minPrice, avgPrice - mileageAdjustment);
        }
      }
      
      return {
        estimatedValue: Math.round(estimatedValue),
        priceRange: {
          min: minPrice,
          max: maxPrice,
          median: medianPrice,
          average: avgPrice
        },
        listingCount: response.listings.length,
        confidence: response.listings.length >= 10 ? 'high' : 
                   response.listings.length >= 5 ? 'medium' : 'low',
        dataSource: 'direct_api'
      };
    } catch (apiError) {
      console.error(`Direct API call also failed:`, apiError);
      throw apiError;
    }
  }
};

/**
 * Lookup vehicle by VIN
 * @param {string} vin - Vehicle Identification Number
 * @returns {Promise<Object>} Vehicle details
 */
export const lookupVIN = async (vin) => {
  try {
    const specs = await decodeVIN(vin);
    return specs;
  } catch (error) {
    console.error(`Failed to lookup VIN ${vin}:`, error);
    throw new Error('VIN lookup failed. Please enter vehicle details manually.');
  }
};

/**
 * Get market listings for a specific vehicle
 * @param {string} make - Vehicle make name
 * @param {string} model - Vehicle model name
 * @param {number} year - Vehicle year
 * @param {number} rows - Number of listings to fetch (default: 50)
 * @returns {Promise<Object>} Listings data
 */
export const getListings = async (make, model, year, rows = 50) => {
  try {
    const response = await searchVehicles({
      make,
      model,
      year: year.toString(),
      rows: rows.toString()
    });
    
    return {
      success: true,
      listings: response.listings || [],
      total: response.num_found || 0
    };
  } catch (error) {
    console.error(`Failed to fetch listings for ${year} ${make} ${model}:`, error);
    return { success: false, listings: [], total: 0 };
  }
};

/**
 * Check API health
 * @returns {Promise<Object>} Health status
 */
export const checkHealth = async () => {
  try {
    // Test with a simple taxonomy request to avoid unnecessary calls
    const response = await apiRequest(`/v2/specs/car/terms?api_key=${API_KEY}&field=make`);
    return { 
      status: 'ok', 
      message: 'Car API is operational',
      timestamp: new Date().toISOString(),
      apiKey: API_KEY.substring(0, 8) + '...'
    };
  } catch (error) {
    console.error('Car API health check failed:', error);
    return { status: 'error', message: error.message };
  }
};