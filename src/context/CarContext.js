import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getVehicleValuation } from '../services/valuationService';

const CarContext = createContext();

// Demo mode user ID - used to detect demo mode
const DEMO_USER_ID = 'demo-user';

// Demo vehicles for "Try without signing up" mode
// Dates are calculated relative to "now" to ensure scenarios stay accurate
// Using December 2025 as reference point
const DEMO_VEHICLES = [
  {
    // 1. OPTIMAL NOW - Good net position, sell now for best outcome
    // 30 months into a 60-month loan = halfway through, positive equity
    id: 'demo-1',
    year: 2023,
    make: 'Toyota',
    model: 'RAV4',
    trim: 'XLE Premium',
    nickname: 'Family SUV',
    mileage: 35000,
    annualMileage: 14000,  // Above average driver
    purchasePrice: 38500,
    ownershipType: 'loan',
    monthlyPayment: 545,
    termMonths: 60,  // 5 year loan
    interestRate: 4.9,
    balloonPayment: 0,
    deposit: 5000,
    startDate: '2023-06-01',  // ~30 months in, 30 left
    condition: 'excellent',
    color: 'Lunar Rock',
    vin: '2T3P1RFV5MW123456',
    addedDate: '2024-01-10T10:00:00Z',
    estimatedValue: 32500,  // Toyotas hold value well
    tradeInValue: 30000,
    privatePartyValue: 34500,
    valuationConfidence: 'high',
    lastValuationDate: '2025-12-01T10:00:00Z',
  },
  {
    // 2. TOO EARLY - Deep negative, way too early to sell (just bought)
    // Only 4 months into a 72-month loan = underwater
    id: 'demo-2',
    year: 2025,
    make: 'Ford',
    model: 'Mustang',
    trim: 'GT Premium',
    nickname: 'Weekend Toy',
    mileage: 2500,
    annualMileage: 8000,  // Weekend car, low mileage
    purchasePrice: 55000,
    ownershipType: 'loan',
    monthlyPayment: 825,
    termMonths: 72,  // 6 year loan
    interestRate: 7.9,
    balloonPayment: 0,
    deposit: 5000,
    startDate: '2025-08-01',  // Only 4 months in, 68 left!
    condition: 'excellent',
    color: 'Grabber Blue',
    vin: '1FA6P8CF5N5123456',
    addedDate: '2025-08-15T14:30:00Z',
    estimatedValue: 48000,  // Already depreciated from $55k
    tradeInValue: 44000,
    privatePartyValue: 50500,
    valuationConfidence: 'high',
    lastValuationDate: '2025-12-01T10:00:00Z',
  },
  {
    // 3. BALLOON LOAN - Approaching optimal window with balloon payment
    // 18 months into 48-month balloon = building equity but balloon looms
    id: 'demo-3',
    year: 2024,
    make: 'BMW',
    model: 'X3',
    trim: 'xDrive30i',
    nickname: null,
    mileage: 18000,
    annualMileage: 12000,  // Average driver
    purchasePrice: 52000,
    ownershipType: 'balloon',
    monthlyPayment: 485,
    termMonths: 48,  // 4 year balloon loan
    interestRate: 5.5,
    balloonPayment: 18000,  // Big balloon at end
    deposit: 6000,
    startDate: '2024-06-01',  // ~18 months in, 30 left
    condition: 'good',
    color: 'Alpine White',
    vin: '5UXTY5C09N9123456',
    addedDate: '2024-06-01T09:15:00Z',
    estimatedValue: 42500,
    tradeInValue: 39000,
    privatePartyValue: 45000,
    valuationConfidence: 'high',
    lastValuationDate: '2025-12-01T10:00:00Z',
  },
  {
    // 4. WAIT FOR OPTIMAL - Negative now but optimal window coming
    // 12 months into 48-month balloon = still underwater, wait for better position
    id: 'demo-4',
    year: 2024,
    make: 'Mercedes-Benz',
    model: 'C300',
    trim: '4MATIC',
    nickname: "Dad's Benz",
    mileage: 10000,
    annualMileage: 10000,  // Below average
    purchasePrice: 49500,
    ownershipType: 'balloon',
    monthlyPayment: 445,
    termMonths: 48,
    interestRate: 6.5,
    balloonPayment: 16000,
    deposit: 5000,
    startDate: '2024-12-01',  // ~12 months in, 36 left
    condition: 'good',
    color: 'Obsidian Black',
    vin: 'W1KWF8DB5NR123456',
    addedDate: '2024-12-20T11:00:00Z',
    estimatedValue: 38500,
    tradeInValue: 35000,
    privatePartyValue: 41000,
    valuationConfidence: 'high',
    lastValuationDate: '2024-12-01T10:00:00Z',
  },
  {
    // 5. NEAR BREAK-EVEN - Close to zero, approaching positive territory
    // 18 months into 60-month loan = still slightly underwater but improving
    id: 'demo-5',
    year: 2024,
    make: 'Honda',
    model: 'Accord',
    trim: 'Sport 2.0T',
    nickname: 'Commuter',
    mileage: 22500,
    annualMileage: 15000,  // High mileage commuter
    purchasePrice: 35500,
    ownershipType: 'loan',
    monthlyPayment: 525,
    termMonths: 60,
    interestRate: 4.5,
    balloonPayment: 0,
    deposit: 4000,
    startDate: '2024-06-01',  // ~18 months in, 42 left - near break-even
    condition: 'good',
    color: 'Still Night Pearl',
    vin: '1HGCV2F34LA123456',
    addedDate: '2024-06-10T16:45:00Z',
    estimatedValue: 27500,  // Hondas hold value
    tradeInValue: 25000,
    privatePartyValue: 29500,
    valuationConfidence: 'high',
    lastValuationDate: '2025-12-01T10:00:00Z',
  },
];

export const useCarContext = () => {
  const context = useContext(CarContext);
  if (!context) {
    throw new Error('useCarContext must be used within a CarProvider');
  }
  return context;
};

export const CarProvider = ({ children, demoUser = null }) => {
  const [user, setUser] = useState(null);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  // Check if current user is in demo mode
  const isDemoMode = user?.id === DEMO_USER_ID || demoUser?.id === DEMO_USER_ID;

  // Handle demo user from AuthContext
  useEffect(() => {
    console.log('[CarContext] demoUser changed:', demoUser?.id, 'current user:', user?.id);
    if (demoUser?.id === DEMO_USER_ID) {
      console.log('[CarContext] 🎮 Demo mode activated via prop - loading demo vehicles');
      setUser(demoUser);
      setCars(DEMO_VEHICLES);
      setLoading(false);
      setInitialized(true);
    } else if (demoUser === null && user?.id === DEMO_USER_ID) {
      // Exiting demo mode - clear demo data
      console.log('[CarContext] 🎮 Exiting demo mode - clearing demo vehicles');
      setUser(null);
      setCars([]);
      setLoading(false);
      setInitialized(true);
    }
  }, [demoUser, user?.id]);

  // Listen for auth state changes directly from Supabase
  useEffect(() => {
    // Skip Supabase auth if in demo mode
    if (demoUser?.id === DEMO_USER_ID) {
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[CarContext] Initial session:', session?.user?.email);
      setUser(session?.user || null);
      if (session?.user?.id) {
        loadCarsForUser(session.user.id);
      } else {
        setLoading(false);
        setInitialized(true);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[CarContext] Auth state changed:', event, session?.user?.email);
      // Don't overwrite demo mode user/cars
      if (demoUser?.id === DEMO_USER_ID) {
        return;
      }
      setUser(session?.user || null);
      if (session?.user?.id) {
        loadCarsForUser(session.user.id);
      } else {
        setCars([]);
        setLoading(false);
        setInitialized(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [demoUser]);

  // Fetch valuations for cars in background
  const fetchValuationsForCars = async (carsToValue) => {
    for (const car of carsToValue) {
      // Skip if we have a recent valuation (less than 7 days old)
      if (car.lastValuationDate) {
        const daysSinceValuation = (Date.now() - new Date(car.lastValuationDate).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceValuation < 7) continue;
      }
      
      try {
        const valuation = await getVehicleValuation({
          make: car.make,
          model: car.model,
          year: car.year,
          trim: car.trim,
          mileage: car.mileage,
          condition: car.condition || 'good',
        });
        
        // Update local state
        setCars(prev => prev.map(c => 
          c.id === car.id ? {
            ...c,
            estimatedValue: valuation.estimatedValue,
            tradeInValue: valuation.tradeInValue,
            privatePartyValue: valuation.privatePartyValue,
            valuationConfidence: valuation.confidence,
            lastValuationDate: new Date().toISOString(),
          } : c
        ));
        
        // Update in Supabase (fire and forget)
        supabase
          .from('vehicles')
          .update({
            estimated_value: valuation.estimatedValue,
            trade_in_value: valuation.tradeInValue,
            private_party_value: valuation.privatePartyValue,
            valuation_confidence: valuation.confidence,
            last_valuation_date: new Date().toISOString(),
          })
          .eq('id', car.id)
          .then(({ error }) => {
            if (error) console.error('Error saving valuation:', error);
          });
          
      } catch (error) {
        console.error(`Error fetching valuation for ${car.year} ${car.make} ${car.model}:`, error);
      }
    }
  };

  const loadCarsForUser = async (userId) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      console.log('[CarContext] Loading cars for user:', userId);
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[CarContext] Error loading cars:', error);
        setCars([]);
      } else {
        console.log('[CarContext] Loaded cars:', data?.length || 0);
        // Transform Supabase data to app format
        const transformedCars = (data || []).map(vehicle => ({
          id: vehicle.id,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          trim: vehicle.trim || '',
          nickname: vehicle.notes || null,
          mileage: vehicle.mileage || 0,
          purchasePrice: parseFloat(vehicle.purchase_price) || 0,
          ownershipType: vehicle.ownership_type || 'cash',
          monthlyPayment: parseFloat(vehicle.monthly_payment) || 0,
          termMonths: vehicle.loan_term || 0,
          interestRate: parseFloat(vehicle.interest_rate) || 0,
          balloonPayment: parseFloat(vehicle.balloon_payment) || 0,
          deposit: parseFloat(vehicle.deposit) || 0,
          startDate: vehicle.start_date || null,
          condition: vehicle.condition || 'good',
          color: vehicle.color || '',
          vin: vehicle.vin || '',
          addedDate: vehicle.created_at,
          // Valuation fields (will be populated async)
          estimatedValue: parseFloat(vehicle.estimated_value) || null,
          tradeInValue: parseFloat(vehicle.trade_in_value) || null,
          privatePartyValue: parseFloat(vehicle.private_party_value) || null,
          valuationConfidence: vehicle.valuation_confidence || null,
          lastValuationDate: vehicle.last_valuation_date || null,
        }));
        setCars(transformedCars);
        
        // Fetch valuations for cars that don't have recent ones
        fetchValuationsForCars(transformedCars);
      }
    } catch (err) {
      console.error('[CarContext] Error loading cars:', err);
      setCars([]);
    }
    setLoading(false);
    setInitialized(true);
  };

  const addCar = async (car) => {
    // Get current session directly to ensure we have the latest user
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user || user;
    
    if (!currentUser?.id) {
      console.error('No user ID - cannot add car. User state:', { user, sessionUser: session?.user });
      return null;
    }

    // Demo mode: store locally only, don't write to Supabase
    if (currentUser.id === DEMO_USER_ID) {
      console.log('🎮 Demo mode: Adding car locally only');
      const newCar = {
        id: `demo-${Date.now()}`,
        ...car,
        addedDate: new Date().toISOString(),
      };
      setCars(prev => [newCar, ...prev]);
      return newCar;
    }

    try {
      console.log('Adding car to Supabase for user:', currentUser.id, car);
      
      const vehicleData = {
        user_id: currentUser.id,
        make: car.make,
        model: car.model,
        year: car.year,
        trim: car.trim || null,
        purchase_price: car.purchasePrice || 0,
        ownership_type: car.ownershipType || 'cash',
        monthly_payment: car.monthlyPayment || 0,
        loan_term: car.termMonths || 0,
        interest_rate: car.interestRate || 0,
        balloon_payment: car.balloonPayment || 0,
        deposit: car.deposit || 0,
        start_date: car.startDate || null,
        condition: car.condition || 'good',
        mileage: car.mileage || 0,
        color: car.color || null,
        vin: car.vin || null,
        notes: car.nickname || null,
        // Include valuation data if provided
        estimated_value: car.estimatedValue || null,
        trade_in_value: car.tradeInValue || null,
        private_party_value: car.privatePartyValue || null,
        valuation_confidence: car.valuationConfidence || null,
        last_valuation_date: car.lastValuationDate || null,
      };

      const { data, error } = await supabase
        .from('vehicles')
        .insert(vehicleData)
        .select()
        .single();

      if (error) {
        console.error('Error adding car:', error);
        return null;
      }

      console.log('Car added successfully:', data.id);
      
      // Transform and add to local state
      const newCar = {
        id: data.id,
        year: data.year,
        make: data.make,
        model: data.model,
        trim: data.trim || '',
        nickname: data.notes || null,
        mileage: data.mileage || 0,
        purchasePrice: parseFloat(data.purchase_price) || 0,
        ownershipType: data.ownership_type || 'cash',
        monthlyPayment: parseFloat(data.monthly_payment) || 0,
        termMonths: data.loan_term || 0,
        interestRate: parseFloat(data.interest_rate) || 0,
        balloonPayment: parseFloat(data.balloon_payment) || 0,
        deposit: parseFloat(data.deposit) || 0,
        startDate: data.start_date || null,
        condition: data.condition || 'good',
        color: data.color || '',
        vin: data.vin || '',
        addedDate: data.created_at,
        estimatedValue: parseFloat(data.estimated_value) || null,
        tradeInValue: parseFloat(data.trade_in_value) || null,
        privatePartyValue: parseFloat(data.private_party_value) || null,
        valuationConfidence: data.valuation_confidence || null,
        lastValuationDate: data.last_valuation_date || null,
      };
      
      setCars(prev => [newCar, ...prev]);
      
      // Only fetch valuation if we don't already have one
      if (!newCar.estimatedValue) {
        fetchValuationsForCars([newCar]);
      }
      
      return newCar;
    } catch (err) {
      console.error('Error adding car:', err);
      return null;
    }
  };

  const updateCar = async (id, updates) => {
    if (!user?.id) return;

    // Demo mode: update locally only
    if (user.id === DEMO_USER_ID) {
      console.log('🎮 Demo mode: Updating car locally only');
      setCars(prev => prev.map(car => 
        car.id === id ? { ...car, ...updates } : car
      ));
      return;
    }

    try {
      const updateData = {};
      if (updates.make !== undefined) updateData.make = updates.make;
      if (updates.model !== undefined) updateData.model = updates.model;
      if (updates.year !== undefined) updateData.year = updates.year;
      if (updates.trim !== undefined) updateData.trim = updates.trim;
      if (updates.purchasePrice !== undefined) updateData.purchase_price = updates.purchasePrice;
      if (updates.ownershipType !== undefined) updateData.ownership_type = updates.ownershipType;
      if (updates.monthlyPayment !== undefined) updateData.monthly_payment = updates.monthlyPayment;
      if (updates.termMonths !== undefined) updateData.loan_term = updates.termMonths;
      if (updates.interestRate !== undefined) updateData.interest_rate = updates.interestRate;
      if (updates.balloonPayment !== undefined) updateData.balloon_payment = updates.balloonPayment;
      if (updates.deposit !== undefined) updateData.deposit = updates.deposit;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.condition !== undefined) updateData.condition = updates.condition;
      if (updates.mileage !== undefined) updateData.mileage = updates.mileage;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.vin !== undefined) updateData.vin = updates.vin;
      if (updates.nickname !== undefined) updateData.notes = updates.nickname;
      updateData.updated_at = new Date().toISOString();
      
      // If mileage or condition changed, we should refetch valuation
      const shouldRefetchValuation = updates.mileage !== undefined || updates.condition !== undefined;

      const { error } = await supabase
        .from('vehicles')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating car:', error);
        return;
      }

      // Update local state
      setCars(prev => prev.map(car => 
        car.id === id ? { ...car, ...updates } : car
      ));
      
      // Refetch valuation if needed
      if (shouldRefetchValuation) {
        const updatedCar = cars.find(c => c.id === id);
        if (updatedCar) {
          fetchValuationsForCars([{ ...updatedCar, ...updates }]);
        }
      }
    } catch (err) {
      console.error('Error updating car:', err);
    }
  };

  const deleteCar = async (id) => {
    if (!user?.id) return;

    // Demo mode: delete locally only
    if (user.id === DEMO_USER_ID) {
      console.log('🎮 Demo mode: Deleting car locally only');
      setCars(prev => prev.filter(car => car.id !== id));
      return;
    }

    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting car:', error);
        return;
      }

      // Update local state
      setCars(prev => prev.filter(car => car.id !== id));
    } catch (err) {
      console.error('Error deleting car:', err);
    }
  };

  const refreshCars = useCallback(() => {
    if (user?.id) {
      loadCarsForUser(user.id);
    }
  }, [user?.id]);

  // Force refresh valuation for a specific car
  const refreshValuation = useCallback(async (carId) => {
    const car = cars.find(c => c.id === carId);
    if (!car) return null;
    
    try {
      const valuation = await getVehicleValuation({
        make: car.make,
        model: car.model,
        year: car.year,
        trim: car.trim,
        mileage: car.mileage,
        condition: car.condition || 'good',
      });
      
      // Update local state
      setCars(prev => prev.map(c => 
        c.id === carId ? {
          ...c,
          estimatedValue: valuation.estimatedValue,
          tradeInValue: valuation.tradeInValue,
          privatePartyValue: valuation.privatePartyValue,
          valuationConfidence: valuation.confidence,
          lastValuationDate: new Date().toISOString(),
        } : c
      ));
      
      // Update in Supabase
      await supabase
        .from('vehicles')
        .update({
          estimated_value: valuation.estimatedValue,
          trade_in_value: valuation.tradeInValue,
          private_party_value: valuation.privatePartyValue,
          valuation_confidence: valuation.confidence,
          last_valuation_date: new Date().toISOString(),
        })
        .eq('id', carId);
      
      return valuation;
    } catch (error) {
      console.error('Error refreshing valuation:', error);
      return null;
    }
  }, [cars]);

  const value = {
    cars,
    loading,
    initialized,
    addCar,
    updateCar,
    deleteCar,
    refreshCars,
    refreshValuation,
  };

  return <CarContext.Provider value={value}>{children}</CarContext.Provider>;
};
