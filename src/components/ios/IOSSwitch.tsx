/**
 * IOSSwitch - iOS-style switch
 * Replaces react-native-paper Switch
 */
import React from 'react';
import { Switch, Platform } from 'react-native';
import { MAROON } from './theme';

interface IOSSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const IOSSwitch: React.FC<IOSSwitchProps> = ({ value, onValueChange, disabled }) => {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: '#E5E5EA', true: MAROON }}
      thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : value ? '#FFFFFF' : '#F4F3F4'}
      ios_backgroundColor="#E5E5EA"
    />
  );
};
