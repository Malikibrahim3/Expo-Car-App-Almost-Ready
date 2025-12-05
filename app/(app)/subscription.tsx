/**
 * Subscription Management Screen
 * 
 * Full-page subscription management with upgrade/downgrade options.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { X } from 'lucide-react-native';
import { SubscriptionManager } from '@/src/components/SubscriptionManager';
import { useThemeMode } from '@/src/context/ThemeContext';
import { haptic } from '@/src/constants/LinearDesign';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { colors } = useThemeMode();

  const handleClose = () => {
    haptic.light();
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Subscription',
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable 
              onPress={handleClose} 
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <SubscriptionManager onClose={handleClose} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginLeft: 8,
  },
});
