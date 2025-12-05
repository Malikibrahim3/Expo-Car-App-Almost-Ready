import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { LoadingSpinner } from '../src/components/LoadingSpinner';
import { supabase } from '../src/lib/supabaseClient';

export default function Index() {
  const { user, loading, isDemoMode } = useAuth() as any;
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    checkUserProfile();
  }, [user]);

  const checkUserProfile = async () => {
    console.log('🔍 Checking user profile:', { user: user?.email, isDemoMode });
    
    // Demo mode users skip onboarding check
    if (isDemoMode) {
      console.log('✅ Demo mode - skipping onboarding');
      setOnboardingComplete(true);
      setCheckingProfile(false);
      return;
    }

    if (!user?.id) {
      console.log('❌ No user - going to landing');
      setOnboardingComplete(null);
      setCheckingProfile(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      if (error) {
        console.log('⚠️ Profile check error:', error.message);
        // If profile doesn't exist, user needs onboarding
        setOnboardingComplete(false);
      } else {
        const completed = data?.onboarding_completed || false;
        console.log('✅ Profile found, onboarding completed:', completed);
        setOnboardingComplete(completed);
      }
    } catch (err) {
      console.error('❌ Error checking profile:', err);
      setOnboardingComplete(false);
    }
    setCheckingProfile(false);
  };

  if (loading || checkingProfile) {
    return <LoadingSpinner />;
  }

  // If user is logged in but hasn't completed onboarding, show onboarding
  if (user && onboardingComplete === false) {
    console.log('➡️ Redirecting to onboarding');
    return <Redirect href="/(auth)/onboarding" />;
  }

  // If user is logged in and completed onboarding, go to dashboard
  if (user && onboardingComplete === true) {
    console.log('➡️ Redirecting to dashboard');
    return <Redirect href="/(tabs)/dashboard" />;
  }

  // If no user, go to landing/auth
  console.log('➡️ Redirecting to landing');
  return <Redirect href="/(auth)/landing" />;
}
