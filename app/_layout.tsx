import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CarProvider } from '../src/context/CarContext';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { AchievementProvider } from '../src/context/AchievementContext';
import { SubscriptionProvider } from '../src/context/SubscriptionContext';
import { ThemeProvider, useThemeMode } from '../src/context/ThemeContext';
import { lightTheme, darkTheme } from '../src/theme/theme';
import Toast from 'react-native-toast-message';
import ErrorBoundary from '../src/components/ErrorBoundary';
import OfflineIndicator from '../src/components/OfflineIndicator';
import { initAmplitude, setUserId } from '../src/utils/amplitude';

// Import global CSS for web
if (Platform.OS === 'web') {
  require('../app.css');
}

// Wrapper to pass demo user from AuthContext to providers
function ProvidersWithAuth({ children }: { children: React.ReactNode }) {
  const { user, isDemoMode } = useAuth();
  // Pass demo user to providers so they can detect demo mode
  const demoUser = isDemoMode ? user : null;
  
  // Set Amplitude user ID when user changes
  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    }
  }, [user?.id]);
  
  return (
    <SubscriptionProvider demoUser={demoUser}>
      <CarProvider demoUser={demoUser}>
        {children}
      </CarProvider>
    </SubscriptionProvider>
  );
}

function AppContent() {
  const { isDark, colors } = useThemeMode();
  
  // Use theme based on user preference
  const theme = isDark ? darkTheme : lightTheme;
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <ErrorBoundary>
          <AuthProvider>
            <ProvidersWithAuth>
              <AchievementProvider>
                  {/* Status Bar adapts to theme */}
                  <StatusBar style={isDark ? 'light' : 'dark'} />
                  {/* Offline indicator at top */}
                  <OfflineIndicator />
                  {/* Background adapts to theme */}
                  <View style={{ flex: 1, backgroundColor: colors.background }}>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: colors.background },
                        animation: 'fade',
                      }}
                    >
                      <Stack.Screen name="index" />
                      <Stack.Screen name="(auth)" />
                      <Stack.Screen name="(app)" />
                      <Stack.Screen name="(tabs)" />
                    </Stack>
                  </View>
                  <Toast />
                </AchievementProvider>
              </ProvidersWithAuth>
          </AuthProvider>
        </ErrorBoundary>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  // Initialize Amplitude on app start
  useEffect(() => {
    initAmplitude();
  }, []);
  
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
