/**
 * Dropdown Picker Component
 * A simple, accessible dropdown for selecting from a list of options
 */

import React, { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from 'react-native';
import { ChevronDown, Check, X } from 'lucide-react-native';
import { Colors, Spacing, Radius, haptic } from '../constants/LinearDesign';
import { useThemeMode } from '../context/ThemeContext';

export default function DropdownPicker({
  label,
  value,
  options = [],
  onSelect,
  placeholder = 'Select...',
  disabled = false,
  hint = null,
}) {
  const { colors } = useThemeMode();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find(opt => 
    typeof opt === 'object' ? opt.value === value : opt === value
  );
  
  const displayValue = selectedOption 
    ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption)
    : null;

  const handleSelect = (option) => {
    const val = typeof option === 'object' ? option.value : option;
    console.log('DropdownPicker: Selected', val);
    haptic.light();
    onSelect(val);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.textTertiary }]}>{label}</Text>
      )}
      
      <Pressable
        onPress={() => {
          if (!disabled) {
            haptic.light();
            setModalVisible(true);
          }
        }}
        style={[
          styles.picker,
          { 
            backgroundColor: colors.backgroundTertiary, 
            borderColor: colors.border,
          },
          disabled && styles.pickerDisabled,
        ]}
      >
        <Text 
          style={[
            styles.pickerText, 
            { color: displayValue ? colors.text : colors.textQuaternary }
          ]}
          numberOfLines={1}
        >
          {displayValue || placeholder}
        </Text>
        <ChevronDown size={20} color={colors.textTertiary} />
      </Pressable>

      {hint && (
        <Text style={[styles.hint, { color: colors.textTertiary }]}>{hint}</Text>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={styles.modalBackdrop} 
            onPress={() => setModalVisible(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {label || 'Select Option'}
              </Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            
            <FlatList
              data={options}
              keyExtractor={(item, index) => {
                // Use explicit key if provided, otherwise use index to guarantee uniqueness
                if (typeof item === 'object' && item.key) return item.key;
                return `option-${index}`;
              }}
              renderItem={({ item }) => {
                const itemValue = typeof item === 'object' ? item.value : item;
                const itemLabel = typeof item === 'object' ? item.label : item;
                const isSelected = itemValue === value;
                
                return (
                  <Pressable
                    onPress={() => handleSelect(item)}
                    style={({ pressed }) => [
                      styles.option,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: colors.brandSubtle },
                      pressed && { backgroundColor: colors.backgroundTertiary, opacity: 0.8 }
                    ]}
                  >
                    <Text 
                      style={[
                        styles.optionText, 
                        { color: colors.text },
                        isSelected && { color: colors.brand, fontWeight: '600' }
                      ]}
                    >
                      {itemLabel}
                    </Text>
                    {isSelected && <Check size={20} color={colors.brand} />}
                  </Pressable>
                );
              }}
              style={styles.optionsList}
              showsVerticalScrollIndicator={true}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
    fontWeight: '600',
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 48,
  },
  pickerDisabled: {
    opacity: 0.5,
  },
  pickerText: {
    fontSize: 16,
    flex: 1,
  },
  hint: {
    fontSize: 12,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: Radius.md,
    overflow: 'hidden',
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  optionsList: {
    maxHeight: 400,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    minHeight: 52,
  },
  optionText: {
    fontSize: 16,
  },
});
