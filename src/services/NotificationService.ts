/**
 * Push Notification Service
 * Handles equity alerts and reminders
 * Syncs settings to Supabase for cross-device persistence
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';

const NOTIFICATION_SETTINGS_KEY = '@notification_settings';
const SCHEDULED_NOTIFICATIONS_KEY = '@scheduled_notifications';

export interface NotificationSettings {
  enabled: boolean;
  equityAlerts: boolean;
  priceDrops: boolean;
  reminders: boolean;
  marketUpdates: boolean;
}

export interface EquityAlert {
  vehicleId: string;
  vehicleName: string;
  equity: number;
  previousEquity: number;
}

export interface ScheduledNotification {
  id: string;
  vehicleId: string;
  vehicleName: string;
  scheduledDate: string;
  type: 'sell_reminder' | 'equity_check';
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  equityAlerts: true,
  priceDrops: true,
  reminders: true,
  marketUpdates: false,
};

class NotificationService {
  private settings: NotificationSettings = defaultSettings;
  private scheduledNotifications: ScheduledNotification[] = [];
  private initialized = false;
  private userId: string | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    this.userId = session?.user?.id || null;
    
    await this.loadSettings();
    await this.loadScheduledNotifications();
    this.initialized = true;
    console.log('[NotificationService] Initialized with settings:', this.settings);
  }

  setUserId(userId: string | null): void {
    this.userId = userId;
  }

  private async loadSettings(): Promise<void> {
    try {
      // Try to load from Supabase first if user is logged in
      if (this.userId) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('equity_alerts, payment_reminders, weekly_summary, marketing_emails')
          .eq('id', this.userId)
          .single();
        
        if (!error && data) {
          this.settings = {
            enabled: true,
            equityAlerts: data.equity_alerts ?? true,
            priceDrops: true, // Not in DB, keep local
            reminders: data.payment_reminders ?? true,
            marketUpdates: data.weekly_summary ?? false,
          };
          console.log('[NotificationService] Loaded settings from Supabase');
          return;
        }
      }
      
      // Fall back to local storage
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        this.settings = { ...defaultSettings, ...JSON.parse(stored) };
        console.log('[NotificationService] Loaded settings from local storage');
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }

  private async loadScheduledNotifications(): Promise<void> {
    try {
      // Scheduled notifications are device-specific, keep in local storage
      const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
      if (stored) {
        this.scheduledNotifications = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load scheduled notifications:', error);
    }
  }

  private async saveScheduledNotifications(): Promise<void> {
    try {
      await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(this.scheduledNotifications));
    } catch (error) {
      console.error('Failed to save scheduled notifications:', error);
    }
  }

  async saveSettings(settings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    
    try {
      // Save to local storage (for offline/quick access)
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(this.settings));
      
      // Save to Supabase if user is logged in
      if (this.userId) {
        const updateData: any = {
          id: this.userId,
          updated_at: new Date().toISOString(),
        };
        
        if (settings.equityAlerts !== undefined) {
          updateData.equity_alerts = settings.equityAlerts;
        }
        if (settings.reminders !== undefined) {
          updateData.payment_reminders = settings.reminders;
        }
        if (settings.marketUpdates !== undefined) {
          updateData.weekly_summary = settings.marketUpdates;
        }
        
        const { error } = await supabase
          .from('user_preferences')
          .upsert(updateData, { onConflict: 'id' });
        
        if (error) {
          console.error('[NotificationService] Error saving to Supabase:', error);
        } else {
          console.log('[NotificationService] Settings saved to Supabase');
        }
      }
      
      console.log('[NotificationService] Settings saved:', this.settings);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  // Reload settings (useful after login)
  async reloadSettings(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    this.userId = session?.user?.id || null;
    await this.loadSettings();
  }

  // Send positive equity alert (mock - logs to console)
  async sendPositiveEquityAlert(alert: EquityAlert): Promise<void> {
    if (!this.settings.enabled || !this.settings.equityAlerts) {
      console.log('[NotificationService] Equity alerts disabled, skipping');
      return;
    }

    console.log('[NotificationService] 🎉 POSITIVE EQUITY ALERT:', {
      title: 'Positive Equity Alert!',
      body: `Your ${alert.vehicleName} just hit positive equity! You could pocket $${alert.equity.toLocaleString()} if you sell now.`,
      vehicleId: alert.vehicleId,
    });
  }

  // Send equity milestone alert
  async sendEquityMilestoneAlert(vehicleName: string, milestone: number): Promise<void> {
    if (!this.settings.enabled || !this.settings.equityAlerts) return;

    console.log('[NotificationService] 📈 EQUITY MILESTONE:', {
      title: 'Equity Milestone!',
      body: `Your ${vehicleName} equity just passed $${milestone.toLocaleString()}!`,
    });
  }

  // Send price drop alert
  async sendPriceDropAlert(vehicleName: string, dropAmount: number): Promise<void> {
    if (!this.settings.enabled || !this.settings.priceDrops) return;

    console.log('[NotificationService] ⚠️ PRICE DROP ALERT:', {
      title: 'Value Change',
      body: `Your ${vehicleName} value dropped by $${dropAmount.toLocaleString()}. Tap to see updated equity.`,
    });
  }

  // Schedule a reminder for optimal sell time
  async scheduleOptimalSellReminder(vehicleId: string, vehicleName: string, monthsUntilOptimal: number): Promise<string> {
    if (!this.settings.enabled || !this.settings.reminders) return '';

    const scheduledDate = new Date();
    scheduledDate.setMonth(scheduledDate.getMonth() + monthsUntilOptimal);

    const notification: ScheduledNotification = {
      id: `reminder_${vehicleId}_${Date.now()}`,
      vehicleId,
      vehicleName,
      scheduledDate: scheduledDate.toISOString(),
      type: 'sell_reminder',
    };

    this.scheduledNotifications.push(notification);
    await this.saveScheduledNotifications();

    console.log('[NotificationService] 📅 REMINDER SCHEDULED:', {
      vehicleName,
      scheduledFor: scheduledDate.toLocaleDateString(),
      monthsUntilOptimal,
    });

    return notification.id;
  }

  // Cancel a scheduled reminder
  async cancelReminder(notificationId: string): Promise<void> {
    this.scheduledNotifications = this.scheduledNotifications.filter(n => n.id !== notificationId);
    await this.saveScheduledNotifications();
    console.log('[NotificationService] Reminder cancelled:', notificationId);
  }

  // Cancel all notifications
  async cancelAll(): Promise<void> {
    this.scheduledNotifications = [];
    await this.saveScheduledNotifications();
    console.log('[NotificationService] All notifications cancelled');
  }

  // Get all scheduled notifications
  async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    return [...this.scheduledNotifications];
  }

  // Check for due notifications (call this periodically or on app open)
  async checkDueNotifications(): Promise<ScheduledNotification[]> {
    const now = new Date();
    const dueNotifications = this.scheduledNotifications.filter(
      n => new Date(n.scheduledDate) <= now
    );

    if (dueNotifications.length > 0) {
      // Remove due notifications from scheduled list
      this.scheduledNotifications = this.scheduledNotifications.filter(
        n => new Date(n.scheduledDate) > now
      );
      await this.saveScheduledNotifications();

      console.log('[NotificationService] Due notifications:', dueNotifications);
    }

    return dueNotifications;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
