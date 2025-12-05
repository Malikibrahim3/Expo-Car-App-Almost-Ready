/**
 * CurrencyInput - Auto-formats numbers as currency
 * Makes entering prices and payments easier
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { DollarSign } from 'lucide-react-native';
import { Spacing, Radius } from '@/src/constants/LinearDesign';
import { useThemeMode } from '@/src/context/ThemeContext';

interface CurrencyInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
  suggestions?: number[];
  editable?: boolean;
}

const formatCurrency = (num: number): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

// Format value for display - pure function
const getDisplayValue = (value: string): string => {
  if (!value) return '';
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
  if (isNaN(numericValue)) return '';
  return formatCurrency(numericValue);
};

export default function CurrencyInput({
  value,
  onChangeText,
  placeholder = '$0',
  label,
  hint,
  suggestions,
  editable = true,
}: CurrencyInputProps) {
  const { colors } = useThemeMode();
  const [isFocused, setIsFocused] = useState(false);
  
  // Compute display value directly from prop - no internal state needed
  // This eliminates the sync issue between internal state and prop
  const displayValue = useMemo(() => getDisplayValue(value), [value]);

  const handleChangeText = useCallback((text: string) => {
    // Remove all non-numeric characters
    const numericOnly = text.replace(/[^0-9]/g, '');
    // Update the raw value (for form submission)
    onChangeText(numericOnly);
  }, [onChangeText]);

  const handleSuggestionPress = useCallback((amount: number) => {
    onChangeText(amount.toString());
  }, [onChangeText]);

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.textTertiary }]}>{label}</Text>
      )}
      
      <View style={[
        styles.inputContainer,
        { backgroundColor: colors.backgroundTertiary, borderColor: isFocused ? colors.brand : colors.border },
      ]}>
        <DollarSign size={20} color={colors.textTertiary} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={displayValue}
          onChangeText={handleChangeText}
          placeholder={placeholder.replace('$', '')}
          placeholderTextColor={colors.textQuaternary}
          keyboardType="number-pad"
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </View>

      {hint && (
        <Text style={[styles.hint, { color: colors.textTertiary }]}>{hint}</Text>
      )}

      {suggestions && suggestions.length > 0 && (
        <View style={styles.suggestions}>
          <Text style={[styles.suggestionsLabel, { color: colors.textTertiary }]}>
            Common amounts:
          </Text>
          <View style={styles.suggestionButtons}>
            {suggestions.map((amount, index) => (
              <Pressable
                key={index}
                onPress={() => handleSuggestionPress(amount)}
                style={[styles.suggestionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.suggestionText, { color: colors.text }]}>
                  ${formatCurrency(amount)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 14,
  },
  hint: {
    fontSize: 13,
    marginTop: 6,
  },
  suggestions: {
    marginTop: Spacing.sm,
  },
  suggestionsLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  suggestionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
