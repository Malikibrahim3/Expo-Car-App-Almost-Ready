/**
 * VIN Lookup Component (US Market)
 * Auto-fill vehicle details from VIN
 * Includes visual guide for finding VIN
 */

import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Search, Check, AlertCircle, HelpCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Shadows, haptic, Spacing } from '../constants/LinearDesign';
import { useThemeMode } from '../context/ThemeContext';
import { IOSText as Text } from './ios';
import VINVisualGuide from './VINVisualGuide';
import { decodeVIN } from '../services/newCarApi';

interface VehicleData {
  make: string;
  model: string;
  year: number;
  trim: string;
  fuelType: string;
  engineSize: string;
}

interface VINLookupProps {
  onVehicleFound: (data: VehicleData) => void;
  onManualEntry: () => void;
}

// Real VIN decoder using Marketcheck API
const lookupVIN = async (vin: string): Promise<VehicleData | null> => {
  // VIN must be 17 characters
  if (vin.length !== 17) return null;

  try {
    const result = await decodeVIN(vin);
    return {
      make: result.make || '',
      model: result.model || '',
      year: result.year || new Date().getFullYear(),
      trim: result.trim || '',
      fuelType: result.fuelType || 'Gas',
      engineSize: result.engine || '',
    };
  } catch (error) {
    console.error('VIN lookup failed:', error);
    return null;
  }
};

export default function VINLookup({ onVehicleFound, onManualEntry }: VINLookupProps) {
  const { colors } = useThemeMode();
  const [vin, setVin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundVehicle, setFoundVehicle] = useState<VehicleData | null>(null);
  const [showVINGuide, setShowVINGuide] = useState(false);

  const handleLookup = async () => {
    if (vin.length !== 17) {
      setError('VIN must be 17 characters');
      return;
    }

    setLoading(true);
    setError('');
    haptic.light();

    try {
      const result = await lookupVIN(vin);
      if (result && result.make && result.model) {
        setFoundVehicle(result);
        haptic.success();
      } else {
        setError('We couldn\'t find that VIN. Double-check for typos, or enter your car details manually.');
      }
    } catch {
      setError('Lookup failed. Try manual entry.');
    }

    setLoading(false);
  };

  const handleConfirm = () => {
    if (foundVehicle) {
      haptic.medium();
      onVehicleFound(foundVehicle);
    }
  };

  const formatVIN = (text: string) => {
    // VINs are alphanumeric, no I, O, Q
    return text.replace(/[^A-HJ-NPR-Za-hj-npr-z0-9]/g, '').toUpperCase().slice(0, 17);
  };

  if (foundVehicle) {
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <View style={[styles.successIcon, { backgroundColor: colors.positiveBg }]}>
            <Check size={24} color={colors.positive} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>Vehicle Found!</Text>
          
          <View style={[styles.vehicleDetails, { backgroundColor: colors.backgroundTertiary }]}>
            <Text style={[styles.vehicleName, { color: colors.text }]}>{foundVehicle.year} {foundVehicle.make} {foundVehicle.model}</Text>
            <Text style={[styles.vehicleTrim, { color: colors.textSecondary }]}>{foundVehicle.trim}</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Fuel</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{foundVehicle.fuelType}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Engine</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{foundVehicle.engineSize}</Text>
              </View>
            </View>
          </View>

          <Pressable onPress={handleConfirm} style={({ pressed }) => [styles.confirmButton, pressed && { opacity: 0.9 }]}>
            <LinearGradient colors={colors.gradientBrand} style={styles.confirmButtonGradient}>
              <Text style={styles.confirmButtonText}>Yes, This Is My Car</Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => setFoundVehicle(null)} style={styles.tryAgainButton}>
            <Text style={[styles.tryAgainText, { color: colors.textSecondary }]}>That's not right, let me try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VINVisualGuide visible={showVINGuide} onClose={() => setShowVINGuide(false)} />
      
      <Text style={[styles.title, { color: colors.text }]}>Enter Your Car's ID Number (VIN)</Text>
      
      {/* Where to find VIN - tappable help */}
      <Pressable 
        onPress={() => {
          haptic.light();
          setShowVINGuide(true);
        }}
        style={[styles.helpCard, { backgroundColor: colors.brandSubtle, borderColor: colors.borderAccent }]}
      >
        <HelpCircle size={18} color={colors.brand} />
        <View style={styles.helpContent}>
          <Text style={[styles.helpTitle, { color: colors.text }]}>Where do I find my VIN?</Text>
          <Text style={[styles.helpSubtitle, { color: colors.textSecondary }]}>
            Tap here to see where to look
          </Text>
        </View>
      </Pressable>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]}
          value={vin}
          onChangeText={(text) => setVin(formatVIN(text))}
          placeholder="1HGBH41JXMN109186"
          placeholderTextColor={colors.textQuaternary}
          autoCapitalize="characters"
          maxLength={17}
          autoCorrect={false}
        />
        
        <Pressable 
          onPress={handleLookup} 
          disabled={loading || vin.length !== 17} 
          style={[styles.lookupButton, { backgroundColor: colors.brand }, (loading || vin.length !== 17) && { backgroundColor: colors.textQuaternary }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Search size={20} color="white" />
          )}
        </Pressable>
      </View>

      <Text style={[styles.vinCounter, { color: colors.textTertiary }]}>{vin.length}/17 characters</Text>

      {error && (
        <View style={styles.errorRow}>
          <AlertCircle size={14} color={colors.negative} />
          <Text style={[styles.errorText, { color: colors.negative }]}>{error}</Text>
        </View>
      )}

      <Pressable onPress={onManualEntry} style={styles.manualButton}>
        <Text style={[styles.manualText, { color: colors.brand }]}>I'll type in my car info instead</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  
  helpCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: Spacing.sm, 
    padding: Spacing.md, 
    borderRadius: Radius.md, 
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  helpContent: { flex: 1 },
  helpTitle: { fontSize: 15, fontWeight: '600' },
  helpSubtitle: { fontSize: 13, marginTop: 2 },

  inputContainer: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  input: { 
    flex: 1, 
    fontSize: 15, 
    fontWeight: '600', 
    color: Colors.text, 
    backgroundColor: Colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 14, 
    paddingVertical: 14, 
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  lookupButton: { width: 52, backgroundColor: Colors.brand, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  lookupButtonDisabled: { backgroundColor: Colors.textQuaternary },

  vinCounter: { fontSize: 12, color: Colors.textTertiary, marginBottom: 12 },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  errorText: { fontSize: 13, color: Colors.negative },

  manualButton: { paddingVertical: 12 },
  manualText: { fontSize: 14, color: Colors.brand, textAlign: 'center' },

  successCard: { alignItems: 'center' },
  successIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.positiveBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 20 },
  vehicleDetails: { width: '100%', backgroundColor: Colors.backgroundTertiary, padding: 16, marginBottom: 20, alignItems: 'center' },
  vehicleName: { fontSize: 18, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  vehicleTrim: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16 },
  detailsGrid: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: 11, color: Colors.textTertiary, marginBottom: 4 },
  detailValue: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  confirmButton: { width: '100%', ...Shadows.brandGlow, marginBottom: 12 },
  confirmButtonGradient: { paddingVertical: 14, borderRadius: Radius.sm, alignItems: 'center' },
  confirmButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
  tryAgainButton: { paddingVertical: 8 },
  tryAgainText: { fontSize: 14, color: Colors.textSecondary },
});
