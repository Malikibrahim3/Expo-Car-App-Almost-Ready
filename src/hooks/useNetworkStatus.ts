/**
 * useNetworkStatus - Hook to monitor network connectivity
 * Returns online status and provides offline detection
 */

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

interface NetworkStatus {
  isOnline: boolean;
  isChecking: boolean;
}

// Simple connectivity check by pinging a reliable endpoint
const checkConnectivity = async (): Promise<boolean> => {
  try {
    // Use a lightweight endpoint that responds quickly
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok || response.status === 204;
  } catch {
    return false;
  }
};

export const useNetworkStatus = (): NetworkStatus => {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout;

    const checkNetwork = async () => {
      if (!mounted) return;
      
      const online = await checkConnectivity();
      
      if (mounted) {
        setIsOnline(online);
        setIsChecking(false);
      }
    };

    // Initial check
    checkNetwork();

    // For web, use native online/offline events
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        mounted = false;
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // For native, poll periodically (every 30 seconds)
    intervalId = setInterval(checkNetwork, 30000);

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return { isOnline, isChecking };
};

export default useNetworkStatus;
