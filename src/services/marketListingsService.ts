/**
 * Market Listings Service
 * 
 * Fetches and aggregates real-world vehicle listings from multiple sources.
 * This service provides the "real market data" that gets blended with
 * the theoretical depreciation model.
 * 
 * Data Sources:
 * - MarketCheck API (primary - aggregates from multiple sources)
 * - Cached historical data from Supabase
 * 
 * Features:
 * - Intelligent caching (7-day TTL for listings)
 * - Mileage-adjusted comparisons
 * - Regional filtering
 * - Price trend analysis
 */

import { supabase } from '../lib/supabaseClient';
import { rateLimiter } from '../utils/apiRateLimiter';
import { MarketListing } from './predictionEngine';
import logger from '../utils/logger';

const API_BASE = 'https://mc-api.marketcheck.com';
const API_KEY = process.env.EXPO_PUBLIC_MARKETCHECK_API_KEY;

if (!API_KEY) {
  logger.warn('⚠️ MARKETCHECK_API_KEY not configured. Market listings will be unavailable.');
}

// Cache duration: 7 days for listings
const LISTINGS_CACHE_DAYS = 7;

// ============================================================================
// TYPES
// ============================================================================

export interface ListingsSearchParams {
  make: string;
  model: string;
  year: number;
  trim?: string;
  zipCode?: string;
  radius?: number; // miles
  maxResults?: number;
  minMileage?: number;
  maxMileage?: number;
  minPrice?: number;
  maxPrice?: number;
}

export interface ListingsResponse {
  listings: MarketListing[];
  totalFound: number;
  searchParams: ListingsSearchParams;
  fromCache: boolean;
  cacheAge?: number; // hours
}

export interface MarketStats {
  averagePrice: number;
  medianPrice: number;
  priceRange: { low: number; high: number };
  averageMileage: number;
  averageDaysOnMarket: number;
  listingsCount: number;
  pricePerMile: number;
  marketTrend: 'rising' | 'stable' | 'falling';
  lastUpdated: Date;
}

export interface PriceHistory {
  date: Date;
  averagePrice: number;
  listingsCount: number;
  medianMileage: number;
}

// ============================================================================
// CACHE FUNCTIONS
// ============================================================================

/**
 * Get cached listings from Supabase
 */
async function getCachedListings(params: ListingsSearchParams): Promise<ListingsResponse | null> {
  try {
    const cacheKey = generateCacheKey(params);
    
    const { data, error } = await supabase
      .from('market_listings_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .single();
    
    if (error || !data) return null;
    
    // Check if cache is still valid
    const cacheAge = Date.now() - new Date(data.cached_at).getTime();
    const maxAge = LISTINGS_CACHE_DAYS * 24 * 60 * 60 * 1000;
    
    if (cacheAge > maxAge) return null;
    
    return {
      listings: data.listings as MarketListing[],
      totalFound: data.total_found,
      searchParams: params,
      fromCache: true,
      cacheAge: Math.round(cacheAge / (60 * 60 * 1000)), // hours
    };
  } catch (error) {
    console.error('Error checking listings cache:', error);
    return null;
  }
}

/**
 * Save listings to cache
 */
async function cacheListings(params: ListingsSearchParams, listings: MarketListing[], totalFound: number): Promise<void> {
  try {
    const cacheKey = generateCacheKey(params);
    
    await supabase
      .from('market_listings_cache')
      .upsert({
        cache_key: cacheKey,
        make: params.make,
        model: params.model,
        year: params.year,
        trim: params.trim || null,
        zip_code: params.zipCode || null,
        listings: listings,
        total_found: totalFound,
        cached_at: new Date().toISOString(),
      }, {
        onConflict: 'cache_key'
      });
  } catch (error) {
    console.error('Error caching listings:', error);
  }
}

/**
 * Generate cache key from search params
 */
function generateCacheKey(params: ListingsSearchParams): string {
  return `${params.make}_${params.model}_${params.year}_${params.trim || 'all'}_${params.zipCode || 'national'}`.toLowerCase().replace(/\s+/g, '_');
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch listings from MarketCheck API
 */
async function fetchListingsFromAPI(params: ListingsSearchParams): Promise<{ listings: MarketListing[]; totalFound: number }> {
  const endpoint = 'market-listings';
  
  return rateLimiter.executeWithRetry(endpoint, async () => {
    const searchParams = new URLSearchParams({
      api_key: API_KEY,
      make: params.make,
      model: params.model,
      year: params.year.toString(),
      car_type: 'used',
      rows: (params.maxResults || 50).toString(),
      sort_by: 'price',
      sort_order: 'asc',
    });
    
    if (params.trim) searchParams.append('trim', params.trim);
    if (params.zipCode) {
      searchParams.append('zip', params.zipCode);
      searchParams.append('radius', (params.radius || 100).toString());
    }
    if (params.minMileage) searchParams.append('miles_range', `${params.minMileage}-${params.maxMileage || 200000}`);
    if (params.minPrice) searchParams.append('price_range', `${params.minPrice}-${params.maxPrice || 500000}`);
    
    const url = `${API_BASE}/v2/search/car/active?${searchParams.toString()}`;
    
    console.log(`🔍 Fetching listings for ${params.year} ${params.make} ${params.model}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform API response to our MarketListing format
    const listings: MarketListing[] = (data.listings || []).map((listing: any) => ({
      price: listing.price || 0,
      mileage: listing.miles || 0,
      daysOnMarket: listing.dom || listing.days_on_market || 30,
      dealerType: listing.dealer?.dealer_type === 'independent' ? 'dealer' : 
                  listing.seller_type === 'private' ? 'private' : 'dealer',
      distance: listing.dist || 0,
      condition: listing.condition || 'good',
      trim: listing.trim || params.trim,
      year: listing.year || params.year,
      source: 'marketcheck',
    })).filter((l: MarketListing) => l.price > 0);
    
    return {
      listings,
      totalFound: data.num_found || listings.length,
    };
  });
}

/**
 * Fetch price history for trend analysis
 */
async function fetchPriceHistory(params: ListingsSearchParams): Promise<PriceHistory[]> {
  try {
    // Check if we have historical data in our cache
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('make', params.make)
      .eq('model', params.model)
      .eq('year', params.year)
      .order('recorded_at', { ascending: false })
      .limit(12); // Last 12 data points
    
    if (error || !data || data.length === 0) {
      return [];
    }
    
    return data.map(row => ({
      date: new Date(row.recorded_at),
      averagePrice: row.average_price,
      listingsCount: row.listings_count,
      medianMileage: row.median_mileage,
    }));
  } catch (error) {
    console.error('Error fetching price history:', error);
    return [];
  }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get market listings with caching
 */
export async function getMarketListings(params: ListingsSearchParams): Promise<ListingsResponse> {
  // Check cache first
  const cached = await getCachedListings(params);
  if (cached) {
    console.log(`✅ Using cached listings (${cached.cacheAge}h old)`);
    return cached;
  }
  
  // Fetch from API
  try {
    const { listings, totalFound } = await fetchListingsFromAPI(params);
    
    // Cache the results
    await cacheListings(params, listings, totalFound);
    
    return {
      listings,
      totalFound,
      searchParams: params,
      fromCache: false,
    };
  } catch (error) {
    console.error('Error fetching listings:', error);
    
    // Return empty response on error
    return {
      listings: [],
      totalFound: 0,
      searchParams: params,
      fromCache: false,
    };
  }
}

/**
 * Get comprehensive market statistics
 */
export async function getMarketStats(params: ListingsSearchParams): Promise<MarketStats | null> {
  const { listings } = await getMarketListings(params);
  
  if (listings.length === 0) {
    return null;
  }
  
  // Calculate statistics
  const prices = listings.map(l => l.price).sort((a, b) => a - b);
  const mileages = listings.map(l => l.mileage);
  const daysOnMarket = listings.map(l => l.daysOnMarket);
  
  const averagePrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const medianPrice = prices[Math.floor(prices.length / 2)];
  const averageMileage = Math.round(mileages.reduce((a, b) => a + b, 0) / mileages.length);
  const averageDaysOnMarket = Math.round(daysOnMarket.reduce((a, b) => a + b, 0) / daysOnMarket.length);
  
  // Calculate price per mile
  const pricePerMile = calculatePricePerMile(listings);
  
  // Determine market trend from price history
  const history = await fetchPriceHistory(params);
  const marketTrend = determineMarketTrend(history);
  
  return {
    averagePrice,
    medianPrice,
    priceRange: {
      low: prices[0],
      high: prices[prices.length - 1],
    },
    averageMileage,
    averageDaysOnMarket,
    listingsCount: listings.length,
    pricePerMile,
    marketTrend,
    lastUpdated: new Date(),
  };
}

/**
 * Get comparable listings for a specific vehicle
 */
export async function getComparableListings(
  make: string,
  model: string,
  year: number,
  mileage: number,
  trim?: string,
  zipCode?: string
): Promise<{
  exactMatches: MarketListing[];
  similarMatches: MarketListing[];
  stats: MarketStats | null;
}> {
  // Define mileage range for comparables (±20%)
  const mileageRange = mileage * 0.2;
  const minMileage = Math.max(0, mileage - mileageRange);
  const maxMileage = mileage + mileageRange;
  
  // Fetch listings
  const { listings } = await getMarketListings({
    make,
    model,
    year,
    trim,
    zipCode,
    radius: 150,
    maxResults: 100,
  });
  
  // Separate exact matches (same trim, similar mileage) from similar matches
  const exactMatches = listings.filter(l => 
    (!trim || l.trim === trim) &&
    l.mileage >= minMileage &&
    l.mileage <= maxMileage
  );
  
  const similarMatches = listings.filter(l => 
    !exactMatches.includes(l) &&
    (l.mileage >= minMileage * 0.5 && l.mileage <= maxMileage * 1.5)
  );
  
  // Get stats
  const stats = await getMarketStats({ make, model, year, trim, zipCode });
  
  return {
    exactMatches,
    similarMatches,
    stats,
  };
}

/**
 * Get regional price variations
 */
export async function getRegionalPriceVariations(
  make: string,
  model: string,
  year: number
): Promise<Record<string, { averagePrice: number; listingsCount: number }>> {
  const regions: Record<string, string[]> = {
    northeast: ['10001', '02101', '19101'], // NYC, Boston, Philadelphia
    southeast: ['30301', '33101', '28201'], // Atlanta, Miami, Charlotte
    midwest: ['60601', '48201', '55401'],   // Chicago, Detroit, Minneapolis
    southwest: ['85001', '75201', '77001'], // Phoenix, Dallas, Houston
    west: ['80201', '84101', '89101'],      // Denver, Salt Lake, Las Vegas
    pacific: ['90001', '94101', '98101'],   // LA, SF, Seattle
  };
  
  const results: Record<string, { averagePrice: number; listingsCount: number }> = {};
  
  for (const [region, zips] of Object.entries(regions)) {
    // Use first zip as representative
    const stats = await getMarketStats({
      make,
      model,
      year,
      zipCode: zips[0],
      radius: 200,
    });
    
    if (stats) {
      results[region] = {
        averagePrice: stats.averagePrice,
        listingsCount: stats.listingsCount,
      };
    }
  }
  
  return results;
}

/**
 * Record current prices for historical tracking
 */
export async function recordPriceSnapshot(
  make: string,
  model: string,
  year: number,
  stats: MarketStats
): Promise<void> {
  try {
    await supabase
      .from('price_history')
      .insert({
        make,
        model,
        year,
        average_price: stats.averagePrice,
        median_price: stats.medianPrice,
        price_low: stats.priceRange.low,
        price_high: stats.priceRange.high,
        listings_count: stats.listingsCount,
        median_mileage: stats.averageMileage,
        avg_days_on_market: stats.averageDaysOnMarket,
        recorded_at: new Date().toISOString(),
      });
  } catch (error) {
    console.error('Error recording price snapshot:', error);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate price per mile from listings
 */
function calculatePricePerMile(listings: MarketListing[]): number {
  if (listings.length < 2) return 0.10;
  
  // Linear regression
  const n = listings.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (const listing of listings) {
    sumX += listing.mileage;
    sumY += listing.price;
    sumXY += listing.mileage * listing.price;
    sumX2 += listing.mileage * listing.mileage;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return Math.abs(slope) || 0.10;
}

/**
 * Determine market trend from price history
 */
function determineMarketTrend(history: PriceHistory[]): 'rising' | 'stable' | 'falling' {
  if (history.length < 2) return 'stable';
  
  // Compare recent average to older average
  const recentPrices = history.slice(0, Math.ceil(history.length / 2));
  const olderPrices = history.slice(Math.ceil(history.length / 2));
  
  const recentAvg = recentPrices.reduce((a, b) => a + b.averagePrice, 0) / recentPrices.length;
  const olderAvg = olderPrices.reduce((a, b) => a + b.averagePrice, 0) / olderPrices.length;
  
  const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  if (changePercent > 3) return 'rising';
  if (changePercent < -3) return 'falling';
  return 'stable';
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getMarketListings,
  getMarketStats,
  getComparableListings,
  getRegionalPriceVariations,
  recordPriceSnapshot,
};
