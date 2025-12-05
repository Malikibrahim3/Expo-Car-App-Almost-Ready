/**
 * usePrediction Hook
 * 
 * React hook for accessing the advanced prediction engine
 * Provides easy-to-use interface for vehicle valuations and predictions
 */

import { useState, useCallback, useEffect } from 'react';
import {
  getAdvancedValuation,
  getQuickValuation,
  getDepreciationForecast,
  ValuationRequest,
  ValuationResponse,
} from '../services/advancedValuationService';
import { PredictionAlert } from '../types/prediction';

interface UsePredictionState {
  valuation: ValuationResponse | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface UsePredictionReturn extends UsePredictionState {
  // Actions
  getValuation: (request: ValuationRequest) => Promise<ValuationResponse | null>;
  getQuickValue: (make: string, model: string, year: number, mileage: number) => Promise<number | null>;
  getForecast: (make: string, model: string, year: number, mileage: number) => Promise<any>;
  refresh: () => Promise<void>;
  clearError: () => void;
  
  // Computed values
  currentValue: number | null;
  tradeInValue: number | null;
  privatePartyValue: number | null;
  confidence: 'high' | 'medium' | 'low' | null;
  alerts: PredictionAlert[];
  hasEquityData: boolean;
  isPositiveEquity: boolean;
}

/**
 * Hook for vehicle predictions and valuations
 */
export function usePrediction(initialRequest?: ValuationRequest): UsePredictionReturn {
  const [state, setState] = useState<UsePredictionState>({
    valuation: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });
  
  const [lastRequest, setLastRequest] = useState<ValuationRequest | null>(initialRequest || null);

  // Get full valuation
  const getValuation = useCallback(async (request: ValuationRequest): Promise<ValuationResponse | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    setLastRequest(request);
    
    try {
      const result = await getAdvancedValuation(request);
      setState({
        valuation: result,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get valuation';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return null;
    }
  }, []);

  // Get quick value (faster, less detailed)
  const getQuickValue = useCallback(async (
    make: string,
    model: string,
    year: number,
    mileage: number
  ): Promise<number | null> => {
    try {
      const result = await getQuickValuation(make, model, year, mileage);
      return result.estimated;
    } catch (err) {
      console.error('Quick valuation error:', err);
      return null;
    }
  }, []);

  // Get depreciation forecast
  const getForecast = useCallback(async (
    make: string,
    model: string,
    year: number,
    mileage: number
  ) => {
    try {
      return await getDepreciationForecast(make, model, year, mileage);
    } catch (err) {
      console.error('Forecast error:', err);
      return null;
    }
  }, []);

  // Refresh current valuation
  const refresh = useCallback(async () => {
    if (lastRequest) {
      await getValuation(lastRequest);
    }
  }, [lastRequest, getValuation]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-fetch on initial request
  useEffect(() => {
    if (initialRequest && !state.valuation && !state.loading) {
      getValuation(initialRequest);
    }
  }, [initialRequest, state.valuation, state.loading, getValuation]);

  // Computed values
  const currentValue = state.valuation?.currentValue.estimated ?? null;
  const tradeInValue = state.valuation?.currentValue.tradeIn ?? null;
  const privatePartyValue = state.valuation?.currentValue.privateParty ?? null;
  const confidence = state.valuation?.currentValue.confidence ?? null;
  const alerts = (state.valuation?.alerts ?? []) as PredictionAlert[];
  const hasEquityData = !!state.valuation?.equity;
  const isPositiveEquity = state.valuation?.equity?.status === 'positive';

  return {
    ...state,
    getValuation,
    getQuickValue,
    getForecast,
    refresh,
    clearError,
    currentValue,
    tradeInValue,
    privatePartyValue,
    confidence,
    alerts,
    hasEquityData,
    isPositiveEquity,
  };
}

/**
 * Hook for tracking multiple vehicles
 */
export function useMultiVehiclePrediction() {
  const [valuations, setValuations] = useState<Map<string, ValuationResponse>>(new Map());
  const [loading, setLoading] = useState(false);

  const addVehicle = useCallback(async (id: string, request: ValuationRequest) => {
    setLoading(true);
    try {
      const result = await getAdvancedValuation(request);
      setValuations(prev => new Map(prev).set(id, result));
    } catch (err) {
      console.error(`Error adding vehicle ${id}:`, err);
    }
    setLoading(false);
  }, []);

  const removeVehicle = useCallback((id: string) => {
    setValuations(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const getVehicle = useCallback((id: string) => valuations.get(id), [valuations]);

  const totalValue = Array.from(valuations.values())
    .reduce((sum, v) => sum + v.currentValue.estimated, 0);

  const totalEquity = Array.from(valuations.values())
    .reduce((sum, v) => sum + (v.equity?.currentEquity ?? 0), 0);

  return {
    valuations,
    loading,
    addVehicle,
    removeVehicle,
    getVehicle,
    totalValue,
    totalEquity,
    vehicleCount: valuations.size,
  };
}

export default usePrediction;
