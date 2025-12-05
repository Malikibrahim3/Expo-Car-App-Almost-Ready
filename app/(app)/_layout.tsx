import { Stack, Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/src/context/AuthContext';
import { useThemeMode } from '@/src/context/ThemeContext';

export default function AppLayout() {
  const { user, loading, isDemoMode } = useAuth() as any;
  const { colors } = useThemeMode();
  
  // Show loading spinner while checking auth
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }
  
  // Redirect to login if not authenticated (allow demo mode)
  if (!user && !isDemoMode) {
    return <Redirect href="/(auth)/login" />;
  }
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="car-detail" />
      <Stack.Screen name="edit-car" />
      <Stack.Screen name="sell-options" />
      <Stack.Screen name="subscription" />
      <Stack.Screen name="export-data" />
      <Stack.Screen name="privacy-policy" />
      <Stack.Screen name="terms-of-service" />
    </Stack>
  );
}
