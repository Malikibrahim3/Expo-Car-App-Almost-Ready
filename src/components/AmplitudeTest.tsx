import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { testAmplitude, trackEvent } from '../utils/amplitude';

export const AmplitudeTest = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Amplitude Test</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => testAmplitude()}
      >
        <Text style={styles.buttonText}>Send Test Event</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => trackEvent('Button Clicked', { button: 'custom_test' })}
      >
        <Text style={styles.buttonText}>Send Custom Event</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    marginVertical: 5,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
});
