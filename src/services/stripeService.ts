/**
 * Stripe Payment Service
 * 
 * Handles all Stripe-related operations for subscription payments.
 * Configure with your Stripe keys in .env:
 * - EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
 * - STRIPE_SECRET_KEY (server-side only)
 */

import { Platform } from 'react-native';

// ============================================================================
// CONFIGURATION
// ============================================================================

import logger from '../utils/logger';

// Stripe publishable key (safe for client-side, but should still come from env)
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!STRIPE_PUBLISHABLE_KEY) {
  logger.warn('⚠️ STRIPE_PUBLISHABLE_KEY not configured. Payments will be unavailable.');
}

// Price IDs from your Stripe Dashboard
export const STRIPE_PRICES = {
  PRO_MONTHLY: process.env.EXPO_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
  PRO_YEARLY: process.env.EXPO_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || '',
};

// API endpoint for your backend (Vercel serverless functions)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_BASE_URL) {
  logger.warn('⚠️ API_URL not configured. Stripe operations will fail.');
}

// ============================================================================
// TYPES
// ============================================================================

export interface CreateCheckoutSessionParams {
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface CustomerPortalResponse {
  url: string;
}

export interface SubscriptionStatus {
  subscriptionId: string;
  customerId: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  priceId: string;
}

// ============================================================================
// STRIPE SERVICE
// ============================================================================

class StripeService {
  private publishableKey: string;

  constructor() {
    this.publishableKey = STRIPE_PUBLISHABLE_KEY;
  }

  /**
   * Check if Stripe is configured
   */
  isConfigured(): boolean {
    return !!this.publishableKey && this.publishableKey !== '';
  }

  /**
   * Create a Stripe Checkout session for subscription
   * This calls your backend API which creates the session server-side
   */
  async createCheckoutSession(params: CreateCheckoutSessionParams, authToken: string): Promise<CheckoutSessionResponse> {
    const { priceId, successUrl, cancelUrl } = params;

    // Default URLs for mobile app
    const defaultSuccessUrl = Platform.OS === 'web' 
      ? `${window.location.origin}/subscription?success=true`
      : 'carvalue://subscription?success=true';
    
    const defaultCancelUrl = Platform.OS === 'web'
      ? `${window.location.origin}/subscription?canceled=true`
      : 'carvalue://subscription?canceled=true';

    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          priceId,
          successUrl: successUrl || defaultSuccessUrl,
          cancelUrl: cancelUrl || defaultCancelUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create checkout session');
      }

      return await response.json();
    } catch (error) {
      logger.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Open Stripe Customer Portal for managing subscription
   * Allows users to update payment method, cancel, etc.
   */
  async createCustomerPortalSession(authToken: string): Promise<CustomerPortalResponse> {
    const returnUrl = Platform.OS === 'web'
      ? `${window.location.origin}/subscription`
      : 'carvalue://subscription';

    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          returnUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create portal session');
      }

      return await response.json();
    } catch (error) {
      logger.error('Error creating portal session:', error);
      throw error;
    }
  }

  /**
   * Get current subscription status for a user
   */
  async getSubscriptionStatus(authToken: string): Promise<SubscriptionStatus | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/subscription-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No subscription found
        }
        const error = await response.json();
        throw new Error(error.message || 'Failed to get subscription status');
      }

      const data = await response.json();
      return {
        ...data,
        currentPeriodEnd: new Date(data.currentPeriodEnd),
      };
    } catch (error) {
      logger.error('Error getting subscription status:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(authToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel subscription');
      }

      return true;
    } catch (error) {
      logger.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Reactivate a canceled subscription (before period ends)
   */
  async reactivateSubscription(authToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/reactivate-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reactivate subscription');
      }

      return true;
    } catch (error) {
      logger.error('Error reactivating subscription:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const stripeService = new StripeService();
export default stripeService;
