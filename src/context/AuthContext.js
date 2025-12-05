import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check active Supabase session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Supabase session check failed:', error);
          setLoading(false);
          return;
        }

        setUser(session?.user ?? null);
        setLoading(false);

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          console.log('Auth state changed:', _event);
          setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Auth init error:', error);
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const signUp = async (email, password, fullName) => {
    try {
      console.log('📝 Attempting signup for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.log('❌ Signup failed:', error.message);
        // Map Supabase errors to user-friendly messages
        const errorMsg = error.message?.toLowerCase() || '';
        
        // Check for "already registered" variations
        if (errorMsg.includes('already') || errorMsg.includes('registered') || errorMsg.includes('exists')) {
          throw new Error('This email is already registered. Try signing in instead.');
        }
        // Check for "signups disabled" - email auth is disabled in Supabase dashboard
        if (errorMsg.includes('signup') && errorMsg.includes('disabled')) {
          throw new Error('Sign up is temporarily unavailable. Please try again later.');
        }
        // Password too short
        if (errorMsg.includes('password') && errorMsg.includes('6')) {
          throw new Error('Password must be at least 6 characters long.');
        }
        // Invalid email
        if (errorMsg.includes('invalid') && errorMsg.includes('email')) {
          throw new Error('Please enter a valid email address.');
        }
        // Database trigger error - the signup trigger is failing
        if (errorMsg.includes('database error') && errorMsg.includes('user')) {
          console.log('⚠️ Database trigger error detected - trigger needs to be fixed in Supabase');
          throw new Error('Account creation is temporarily unavailable. Please try again in a few minutes.');
        }
        
        throw new Error(error.message);
      }
      
      // Supabase returns a user with empty identities if email already exists
      // This is a security feature to prevent email enumeration
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        console.log('⚠️ Email already registered:', email);
        throw new Error('This email is already registered. Try signing in instead.');
      }
      
      // If user was created successfully, ensure they have a subscription record
      // This handles cases where the database trigger might have failed silently
      if (data.user?.id) {
        try {
          await ensureUserSubscription(data.user.id);
        } catch (subError) {
          console.log('⚠️ Could not create subscription record:', subError.message);
          // Don't fail signup if subscription creation fails - it will be created on-demand
        }
      }
      
      // Check if email confirmation is required
      if (data.user && !data.session) {
        console.log('⚠️ Email confirmation required for:', email);
        // User created but needs to confirm email
        return { 
          data, 
          error: null, 
          needsEmailConfirmation: true 
        };
      }
      
      console.log('✅ Signup successful for:', data.user?.email);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };
  
  // Helper to ensure user has a subscription record
  const ensureUserSubscription = async (userId) => {
    try {
      // Check if subscription exists
      const { data: existing } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (!existing) {
        // Create default free subscription
        await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            plan_type: 'free',
            max_vehicles: 1,
            daily_refresh_vehicles: 0,
            manual_refresh_interval_days: 7,
            is_active: true,
          });
        console.log('✅ Created default subscription for user:', userId);
      }
    } catch (error) {
      // Silently fail - subscription will be created on-demand when needed
      console.log('⚠️ Subscription check/create skipped:', error.message);
    }
  };

  const signIn = async (email, password) => {
    try {
      console.log('🔐 Attempting Supabase login for:', email);
      
      // Supabase authentication - validates against auth.users table
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log('❌ Login failed:', error.message);
        // Map Supabase errors to user-friendly messages
        const friendlyErrors = {
          'Invalid login credentials': 'Email or password is incorrect. Please try again.',
          'Email not confirmed': 'Please verify your email address before logging in.',
          'User not found': 'No account found with this email address.',
        };
        
        const friendlyMessage = friendlyErrors[error.message] || error.message;
        throw new Error(friendlyMessage);
      }
      
      console.log('✅ Login successful for:', data.user?.email);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = Platform.OS === 'web'
        ? `${window.location.origin}/dashboard`
        : 'carvalue://dashboard';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signInWithApple = async () => {
    try {
      // For web, use OAuth flow
      if (Platform.OS === 'web') {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
        return { data, error: null };
      }

      // For iOS, use native Apple Authentication
      console.log('🍎 Starting Apple Sign In...');
      
      // Generate a random nonce for security
      const rawNonce = Crypto.getRandomBytes(32);
      const nonce = Array.from(rawNonce).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Hash the nonce for Apple
      const hashedNonceBuffer = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce
      );

      // Request Apple credentials
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonceBuffer,
      });

      console.log('🍎 Apple credential received');

      // Sign in with Supabase using the Apple ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: nonce,
      });

      if (error) {
        console.log('❌ Apple Sign In failed:', error.message);
        throw error;
      }

      console.log('✅ Apple Sign In successful');
      return { data, error: null };
    } catch (error) {
      // Handle user cancellation
      if (error.code === 'ERR_REQUEST_CANCELED') {
        return { data: null, error: { message: 'Sign in was cancelled' } };
      }
      console.error('❌ Apple Sign In error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setIsDemoMode(false);
      console.log('✅ Signed out successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ Sign out error:', error);
      return { error };
    }
  };

  // Demo mode - for testing without real account
  const enterDemoMode = () => {
    console.log('🎮 Entering demo mode');
    setIsDemoMode(true);
    setUser({
      id: 'demo-user',
      email: 'demo@example.com',
      user_metadata: { full_name: 'Demo User' },
    });
  };

  const exitDemoMode = () => {
    console.log('🎮 Exiting demo mode');
    setIsDemoMode(false);
    setUser(null);
  };

  const resetPassword = async (email) => {
    try {
      const redirectUrl = Platform.OS === 'web'
        ? `${window.location.origin}/reset-password`
        : 'carvalue://reset-password';

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const value = {
    user,
    loading,
    isAdmin,
    isDemoMode,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithApple,
    signOut,
    resetPassword,
    enterDemoMode,
    exitDemoMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
