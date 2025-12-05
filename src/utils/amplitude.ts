import { Platform } from 'react-native';

// Load Amplitude key from environment
const AMPLITUDE_API_KEY = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY || '';

// Lazy load native SDK only when needed
let nativeAmplitude: any = null;
const getNativeAmplitude = () => {
  if (!nativeAmplitude && Platform.OS !== 'web') {
    nativeAmplitude = require('@amplitude/analytics-react-native');
  }
  return nativeAmplitude;
};

export const initAmplitude = async () => {
  // On web, Amplitude is already initialized via script tags in index.html
  if (Platform.OS === 'web') {
    console.log('✅ Amplitude initialized via web script tags');
    return;
  }
  
  // Initialize for native platforms (iOS/Android)
  const amplitude = getNativeAmplitude();
  if (amplitude) {
    try {
      await amplitude.init(AMPLITUDE_API_KEY, undefined, {
        // Disable cookie storage for React Native (use AsyncStorage instead)
        disableCookies: true,
        // Enable default tracking
        defaultTracking: {
          sessions: true,
          appLifecycles: true,
          screenViews: true,
        },
      });
      console.log('✅ Amplitude initialized successfully for', Platform.OS);
      
      // Send a test event to verify it's working
      amplitude.track('App Opened');
      console.log('📊 Sent test event: App Opened');
    } catch (error) {
      console.error('❌ Failed to initialize Amplitude:', error);
    }
  }
};

// Helper functions for common tracking events
export const trackEvent = (eventName: string, eventProperties?: Record<string, any>) => {
  try {
    if (Platform.OS === 'web' && (window as any).amplitude) {
      (window as any).amplitude.track(eventName, eventProperties);
      console.log('📊 Tracked event (web):', eventName, eventProperties);
    } else {
      const amplitude = getNativeAmplitude();
      if (amplitude) {
        amplitude.track(eventName, eventProperties);
        console.log('📊 Tracked event (native):', eventName, eventProperties);
      }
    }
  } catch (error) {
    console.error('❌ Failed to track event:', eventName, error);
  }
};

export const setUserId = (userId: string | undefined) => {
  try {
    if (Platform.OS === 'web' && (window as any).amplitude) {
      if (userId) {
        (window as any).amplitude.setUserId(userId);
        console.log('👤 Set user ID (web):', userId);
      } else {
        (window as any).amplitude.reset();
        console.log('👤 Reset user (web)');
      }
    } else {
      const amplitude = getNativeAmplitude();
      if (amplitude) {
        if (userId) {
          amplitude.setUserId(userId);
          console.log('👤 Set user ID (native):', userId);
        } else {
          amplitude.reset();
          console.log('👤 Reset user (native)');
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to set user ID:', error);
  }
};

export const setUserProperties = (properties: Record<string, any>) => {
  try {
    if (Platform.OS === 'web' && (window as any).amplitude) {
      const identifyEvent = new (window as any).amplitude.Identify();
      Object.entries(properties).forEach(([key, value]) => {
        identifyEvent.set(key, value);
      });
      (window as any).amplitude.identify(identifyEvent);
      console.log('👤 Set user properties (web):', properties);
    } else {
      const amplitude = getNativeAmplitude();
      if (amplitude) {
        const identifyEvent = new amplitude.Identify();
        Object.entries(properties).forEach(([key, value]) => {
          identifyEvent.set(key, value);
        });
        amplitude.identify(identifyEvent);
        console.log('👤 Set user properties (native):', properties);
      }
    }
  } catch (error) {
    console.error('❌ Failed to set user properties:', error);
  }
};

// Test function to verify Amplitude is working
export const testAmplitude = () => {
  console.log('🧪 Testing Amplitude...');
  trackEvent('Test Event', { 
    timestamp: new Date().toISOString(),
    platform: Platform.OS 
  });
};
