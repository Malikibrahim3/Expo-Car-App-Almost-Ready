/**
 * Stripe Subscription Status API
 * 
 * Gets current subscription status for a user.
 * Requires authentication via Bearer token.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Verify JWT token and return authenticated user ID
 */
async function getAuthenticatedUserId(authHeader: string | undefined): Promise<{ userId: string | null; error: string | null }> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, error: 'Missing or invalid authorization header' };
  }
  
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { userId: null, error: 'Invalid or expired token' };
  }
  
  return { userId: user.id, error: null };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate the request
    const { userId, error: authError } = await getAuthenticatedUserId(req.headers.authorization);
    
    if (authError || !userId) {
      return res.status(401).json({ error: authError || 'Unauthorized' });
    }

    // Get user's subscription from database
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!subscription || !subscription.stripe_subscription_id) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    // Get live status from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    );

    return res.status(200).json({
      subscriptionId: stripeSubscription.id,
      customerId: stripeSubscription.customer,
      status: stripeSubscription.status,
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      priceId: stripeSubscription.items.data[0]?.price.id,
    });
  } catch (error: any) {
    console.error('Error getting subscription status:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
