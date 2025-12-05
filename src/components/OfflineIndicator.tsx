/**
 * OfflineIndicator - Shows a banner when the app is offline
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface OfflineIndicatorProps {
  style?: object;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ style }) => {
  const { isOnline, isChecking } = useNetworkStatus();

  // Don't show anything while checking or when online
  if (isChecking || isOnline) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <WifiOff size={16} color="#FAFAFA" />
      <Text style={styles.text}>You're offline</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#71717A',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FAFAFA',
  },
});

export default OfflineIndicator;
