/**
 * Native Loading Spinner Component - Linear Dark Theme
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { IOSText as Text } from './ios';
import { Colors } from '../constants/LinearDesign';

export function LoadingSpinner({ message = 'Loading...', size = 'large' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={Colors.brand} />
      {message && (
        <Text variant="bodyMedium" style={styles.message}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.background,
  },
  message: {
    marginTop: 16,
    color: Colors.textSecondary,
  },
});

export default LoadingSpinner;
