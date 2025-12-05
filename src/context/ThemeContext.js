/**
 * Theme Context - Dark/Light Mode Support
 * 
 * This context manages theme state and provides colors to components.
 * Syncs theme preference to Supabase for cross-device persistence.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setThemeColors, DarkColors, LightColors } from '../constants/LinearDesign';
import { supabase } from '../lib/supabaseClient';

const THEME_STORAGE_KEY = '@app_theme_mode';

const ThemeContext = createContext();

// Default fallback value - defined outside to prevent new object creation on each render
const DEFAULT_THEME_VALUE = {
  isDark: false,
  themeMode: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
  colors: LightColors,
  isLoaded: false,
};

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return stable default values if used outside provider
    return DEFAULT_THEME_VALUE;
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('light'); // Always start with 'light'
  const [isDark, setIsDark] = useState(false); // Always start with light mode
  const [isLoaded, setIsLoaded] = useState(false);
  const [userId, setUserId] = useState(null);
  
  // Get current colors based on theme - memoized to prevent unnecessary re-renders
  const colors = React.useMemo(() => isDark ? DarkColors : LightColors, [isDark]);
  
  // Listen for auth changes to get user ID
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id || null);
    });
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  // Always start in light mode - ignore saved preferences
  useEffect(() => {
    // Force light mode on mount
    setThemeMode('light');
    setIsDark(false);
    setThemeColors(false);
    setIsLoaded(true);
    console.log('[ThemeContext] App started in light mode (forced)');
  }, []);
  
  // Update when system theme changes (if using system mode)
  useEffect(() => {
    if (themeMode === 'system') {
      const newIsDark = systemColorScheme === 'dark';
      setIsDark(newIsDark);
      setThemeColors(newIsDark);
    }
  }, [systemColorScheme, themeMode]);
  
  const setTheme = useCallback(async (mode) => {
    setThemeMode(mode);
    
    // Save to local storage (for offline/quick access)
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    
    // Save to Supabase if user is logged in
    if (userId) {
      try {
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            id: userId,
            theme: mode,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id'
          });
        
        if (error) {
          console.error('[ThemeContext] Error saving theme to Supabase:', error);
        } else {
          console.log('[ThemeContext] Theme saved to Supabase:', mode);
        }
      } catch (err) {
        console.error('[ThemeContext] Error saving theme:', err);
      }
    }
    
    let newIsDark = true;
    if (mode === 'light') {
      newIsDark = false;
    } else if (mode === 'dark') {
      newIsDark = true;
    } else {
      newIsDark = systemColorScheme === 'dark';
    }
    
    setIsDark(newIsDark);
    setThemeColors(newIsDark);
  }, [systemColorScheme, userId]);
  
  const toggleTheme = useCallback(() => {
    const newMode = isDark ? 'light' : 'dark';
    setTheme(newMode);
  }, [isDark, setTheme]);
  
  // Memoize context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    isDark,
    themeMode,
    setTheme,
    toggleTheme,
    colors,
    isLoaded,
  }), [isDark, themeMode, setTheme, toggleTheme, colors, isLoaded]);
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};
