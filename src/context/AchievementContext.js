import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { useCarContext } from './CarContext';
import storage from '../utils/storage';
import Toast from 'react-native-toast-message';

// Native celebration function
const celebrate = () => {
  Toast.show({
    type: 'success',
    text1: '🎉 Achievement Unlocked!',
    position: 'top',
    visibilityTime: 3000,
  });
};

const AchievementContext = createContext();

export const useAchievements = () => {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error('useAchievements must be used within AchievementProvider');
  }
  return context;
};

// Achievement definitions
const ACHIEVEMENTS = {
  FIRST_CAR: {
    id: 'first_car',
    title: 'Getting Started',
    description: 'Added your first vehicle',
    icon: '🚗',
    rarity: 'common',
  },
  FIRST_PROFIT: {
    id: 'first_profit',
    title: 'In the Green',
    description: 'First vehicle in profit',
    icon: '💚',
    rarity: 'uncommon',
  },
  PORTFOLIO_MASTER: {
    id: 'portfolio_master',
    title: 'Portfolio Master',
    description: 'Track 3 or more vehicles',
    icon: '🏆',
    rarity: 'rare',
  },
  EQUITY_KING: {
    id: 'equity_king',
    title: 'Equity King',
    description: 'Total equity over $10,000',
    icon: '👑',
    rarity: 'epic',
  },
  PROFIT_STREAK: {
    id: 'profit_streak',
    title: 'Winning Streak',
    description: 'All vehicles in profit',
    icon: '🔥',
    rarity: 'legendary',
  },
  EARLY_BIRD: {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Checked portfolio before 9 AM',
    icon: '🌅',
    rarity: 'common',
  },
  NIGHT_OWL: {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Checked portfolio after 10 PM',
    icon: '🦉',
    rarity: 'common',
  },
  WEEK_WARRIOR: {
    id: 'week_warrior',
    title: 'Week Warrior',
    description: 'Checked portfolio 7 days in a row',
    icon: '📅',
    rarity: 'rare',
  },
  BREAK_EVEN_HERO: {
    id: 'break_even_hero',
    title: 'Break-Even Hero',
    description: 'Reached break-even on a vehicle',
    icon: '⚖️',
    rarity: 'uncommon',
  },
  BIG_SPENDER: {
    id: 'big_spender',
    title: 'Big Spender',
    description: 'Portfolio value over $100,000',
    icon: '💎',
    rarity: 'legendary',
  },
};

const RARITY_COLORS = {
  common: '#94A3B8',
  uncommon: '#6B9080',
  rare: '#C93756',
  epic: '#A855F7',
  legendary: '#D4A574',
};

export const AchievementProvider = ({ children }) => {
  const carContext = useCarContext();
  const cars = carContext?.cars || [];
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [visitStreak, setVisitStreak] = useState({ count: 0, lastVisit: null });
  const [initialized, setInitialized] = useState(false);

  // Check if user is authenticated (has cars context available)
  const isAuthenticated = carContext !== null;

  // Load data from storage
  useEffect(() => {
    const loadData = async () => {
      const savedAchievements = await storage.getItem('achievements');
      const savedStreak = await storage.getItem('visitStreak');

      setUnlockedAchievements(savedAchievements ? JSON.parse(savedAchievements) : []);
      setVisitStreak(savedStreak ? JSON.parse(savedStreak) : { count: 0, lastVisit: null });
      setInitialized(true);
    };
    loadData();
  }, []);

  // Save achievements to storage
  useEffect(() => {
    if (!initialized || !isAuthenticated) return;
    storage.setItem('achievements', JSON.stringify(unlockedAchievements));
  }, [unlockedAchievements, isAuthenticated, initialized]);

  // Track visit streak
  useEffect(() => {
    if (!initialized || !isAuthenticated || cars.length === 0) return;

    const today = new Date().toDateString();
    const lastVisit = visitStreak.lastVisit;

    if (lastVisit !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      let newCount = 1;
      if (lastVisit === yesterdayStr) {
        newCount = visitStreak.count + 1;
      }

      const newStreak = { count: newCount, lastVisit: today };
      setVisitStreak(newStreak);
      storage.setItem('visitStreak', JSON.stringify(newStreak));

      // Check for week warrior achievement
      if (newCount >= 7) {
        unlockAchievement('week_warrior');
      }
    }
  }, [isAuthenticated, cars.length, initialized]);

  // Check time-based achievements
  useEffect(() => {
    if (!isAuthenticated || cars.length === 0) return;
    
    const hour = new Date().getHours();
    if (hour < 9) {
      unlockAchievement('early_bird');
    } else if (hour >= 22) {
      unlockAchievement('night_owl');
    }
  }, [isAuthenticated, cars.length]);

  // Check car-based achievements
  useEffect(() => {
    if (!isAuthenticated || cars.length === 0) return;

    // First car
    if (cars.length >= 1) {
      unlockAchievement('first_car');
    }

    // Portfolio master
    if (cars.length >= 3) {
      unlockAchievement('portfolio_master');
    }

    // Calculate metrics
    const totalValue = cars.reduce((sum, car) => sum + (car.apiCalibratedValue || car.purchasePrice || 0), 0);
    const totalOwed = cars.reduce((sum, car) => sum + (car.loanAmount || 0), 0);
    const totalEquity = totalValue - totalOwed;

    // Check for profit vehicles
    const profitCars = cars.filter(car => {
      const value = car.apiCalibratedValue || car.purchasePrice || 0;
      const owed = car.loanAmount || 0;
      const equity = value - owed;
      const deposit = car.deposit || 0;
      const monthlyPayment = car.monthlyPayment || 0;
      const startDate = new Date(car.startDate || car.purchaseDate);
      const monthsElapsed = Math.max(0, Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24 * 30)));
      const paymentsMade = monthlyPayment * monthsElapsed;
      const totalPaid = deposit + paymentsMade;
      const netPosition = equity - totalPaid;
      return netPosition > 500;
    });

    // First profit
    if (profitCars.length >= 1) {
      unlockAchievement('first_profit');
    }

    // All in profit
    if (profitCars.length === cars.length && cars.length > 0) {
      unlockAchievement('profit_streak');
    }

    // Equity king
    if (totalEquity > 10000) {
      unlockAchievement('equity_king');
    }

    // Big spender
    if (totalValue > 100000) {
      unlockAchievement('big_spender');
    }

    // Break-even hero
    const breakEvenCars = cars.filter(car => {
      const value = car.apiCalibratedValue || car.purchasePrice || 0;
      const owed = car.loanAmount || 0;
      const equity = value - owed;
      return Math.abs(equity) < 500;
    });
    if (breakEvenCars.length > 0) {
      unlockAchievement('break_even_hero');
    }
  }, [cars]);

  const unlockAchievement = (achievementId) => {
    if (!isAuthenticated) return; // Don't unlock achievements if not authenticated
    if (unlockedAchievements.includes(achievementId)) return;

    const achievement = Object.values(ACHIEVEMENTS).find(a => a.id === achievementId);
    if (!achievement) return;

    setUnlockedAchievements(prev => [...prev, achievementId]);

    // Show celebration (web only)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confetti) {
      const rarityColor = RARITY_COLORS[achievement.rarity];

      // Confetti based on rarity
      const particleCount = {
        common: 30,
        uncommon: 50,
        rare: 80,
        epic: 120,
        legendary: 200,
      }[achievement.rarity];

      // Show celebration
      celebrate();
      
      Toast.show({
        type: 'success',
        text1: `${achievement.icon} Achievement Unlocked!`,
        text2: achievement.title,
        position: 'top',
        visibilityTime: 5000,
      });
    }
  };

  const getProgress = () => {
    const total = Object.keys(ACHIEVEMENTS).length;
    const unlocked = unlockedAchievements.length;
    return { unlocked, total, percentage: (unlocked / total) * 100 };
  };

  const getAchievementsByRarity = (rarity) => {
    return Object.values(ACHIEVEMENTS)
      .filter(a => a.rarity === rarity)
      .map(a => ({
        ...a,
        unlocked: unlockedAchievements.includes(a.id),
      }));
  };

  const getAllAchievements = () => {
    return Object.values(ACHIEVEMENTS).map(a => ({
      ...a,
      unlocked: unlockedAchievements.includes(a.id),
      color: RARITY_COLORS[a.rarity],
    }));
  };

  return (
    <AchievementContext.Provider
      value={{
        unlockedAchievements,
        unlockAchievement,
        getProgress,
        getAchievementsByRarity,
        getAllAchievements,
        visitStreak,
        ACHIEVEMENTS,
        RARITY_COLORS,
      }}
    >
      {children}
    </AchievementContext.Provider>
  );
};
