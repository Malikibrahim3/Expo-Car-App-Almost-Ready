/**
 * GDPR Data Export Service
 * Allows users to export all their personal data for compliance
 */

import { supabase } from '../lib/supabaseClient';
import { Share, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ExportedUserData {
  exportDate: string;
  exportVersion: string;
  user: {
    id: string;
    email: string;
    createdAt: string;
    lastSignIn: string | null;
  };
  vehicles: ExportedVehicle[];
  preferences: ExportedPreferences | null;
  valuationHistory: ExportedValuation[];
}

export interface ExportedVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  trim: string | null;
  vin: string | null;
  mileage: number;
  condition: string;
  color: string | null;
  purchasePrice: number;
  ownershipType: string;
  monthlyPayment: number;
  loanTerm: number;
  interestRate: number;
  balloonPayment: number;
  deposit: number;
  startDate: string | null;
  estimatedValue: number | null;
  tradeInValue: number | null;
  privatePartyValue: number | null;
  valuationConfidence: string | null;
  lastValuationDate: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ExportedPreferences {
  equityAlerts: boolean;
  paymentReminders: boolean;
  weeklySummary: boolean;
  marketingEmails: boolean;
  theme: string;
}

export interface ExportedValuation {
  vehicleId: string;
  vehicleName: string;
  value: number;
  confidence: string;
  source: string;
  timestamp: string;
}

class DataExportService {
  /**
   * Export all user data as JSON
   */
  async exportUserData(): Promise<ExportedUserData | null> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('No authenticated user');
        return null;
      }

      // Fetch all user vehicles
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (vehiclesError) {
        console.error('Error fetching vehicles:', vehiclesError);
      }

      // Fetch user preferences
      const { data: preferences, error: prefsError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('id', user.id)
        .single();

      if (prefsError && prefsError.code !== 'PGRST116') {
        console.error('Error fetching preferences:', prefsError);
      }

      // Fetch valuation history from car_values (cached valuations)
      const { data: valuations, error: valError } = await supabase
        .from('car_values')
        .select('*')
        .order('last_fetched', { ascending: false })
        .limit(100);

      // Build export object
      const exportData: ExportedUserData = {
        exportDate: new Date().toISOString(),
        exportVersion: '1.0',
        user: {
          id: user.id,
          email: user.email || '',
          createdAt: user.created_at || '',
          lastSignIn: user.last_sign_in_at || null,
        },
        vehicles: (vehicles || []).map(v => ({
          id: v.id,
          make: v.make,
          model: v.model,
          year: v.year,
          trim: v.trim,
          vin: v.vin,
          mileage: v.mileage || 0,
          condition: v.condition || 'good',
          color: v.color,
          purchasePrice: parseFloat(v.purchase_price) || 0,
          ownershipType: v.ownership_type || 'cash',
          monthlyPayment: parseFloat(v.monthly_payment) || 0,
          loanTerm: v.loan_term || 0,
          interestRate: parseFloat(v.interest_rate) || 0,
          balloonPayment: parseFloat(v.balloon_payment) || 0,
          deposit: parseFloat(v.deposit) || 0,
          startDate: v.start_date,
          estimatedValue: v.estimated_value ? parseFloat(v.estimated_value) : null,
          tradeInValue: v.trade_in_value ? parseFloat(v.trade_in_value) : null,
          privatePartyValue: v.private_party_value ? parseFloat(v.private_party_value) : null,
          valuationConfidence: v.valuation_confidence,
          lastValuationDate: v.last_valuation_date,
          createdAt: v.created_at,
          updatedAt: v.updated_at,
        })),
        preferences: preferences ? {
          equityAlerts: preferences.equity_alerts ?? true,
          paymentReminders: preferences.payment_reminders ?? true,
          weeklySummary: preferences.weekly_summary ?? false,
          marketingEmails: preferences.marketing_emails ?? false,
          theme: preferences.theme || 'system',
        } : null,
        valuationHistory: (valuations || []).map(v => ({
          vehicleId: `${v.make}-${v.model}-${v.year}`,
          vehicleName: `${v.year} ${v.make} ${v.model}`,
          value: v.estimated_value || 0,
          confidence: v.confidence || 'unknown',
          source: 'marketcheck',
          timestamp: v.last_fetched,
        })),
      };

      return exportData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      return null;
    }
  }

  /**
   * Export data and share via native share sheet
   */
  async exportAndShare(): Promise<boolean> {
    try {
      const data = await this.exportUserData();
      if (!data) {
        return false;
      }

      // Format as pretty JSON
      const jsonString = JSON.stringify(data, null, 2);
      
      // Save to AsyncStorage as backup
      const date = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(`@data_export_${date}`, jsonString);

      // Use native share
      const result = await Share.share({
        message: jsonString,
        title: `AutoTrack Data Export - ${date}`,
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Error exporting and sharing:', error);
      return false;
    }
  }

  /**
   * Get raw export data as string (for clipboard or display)
   */
  async getExportString(): Promise<string | null> {
    const data = await this.exportUserData();
    if (!data) return null;
    return JSON.stringify(data, null, 2);
  }

  /**
   * Generate a human-readable summary for display
   */
  async generateSummary(): Promise<string> {
    const data = await this.exportUserData();
    if (!data) {
      return 'Unable to load your data.';
    }

    const lines = [
      `Data Export Summary`,
      `Generated: ${new Date(data.exportDate).toLocaleDateString()}`,
      ``,
      `Account`,
      `  Email: ${data.user.email}`,
      `  Member since: ${new Date(data.user.createdAt).toLocaleDateString()}`,
      ``,
      `Vehicles: ${data.vehicles.length}`,
    ];

    data.vehicles.forEach((v, i) => {
      lines.push(`  ${i + 1}. ${v.year} ${v.make} ${v.model}`);
      lines.push(`     Value: $${(v.estimatedValue || 0).toLocaleString()}`);
      lines.push(`     Mileage: ${v.mileage.toLocaleString()} miles`);
    });

    if (data.preferences) {
      lines.push(``);
      lines.push(`Notification Preferences`);
      lines.push(`  Equity Alerts: ${data.preferences.equityAlerts ? 'On' : 'Off'}`);
      lines.push(`  Payment Reminders: ${data.preferences.paymentReminders ? 'On' : 'Off'}`);
    }

    return lines.join('\n');
  }
}

export const dataExportService = new DataExportService();
export default dataExportService;
