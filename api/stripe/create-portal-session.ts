/**
 * Stripe Customer Portal Session API
 * 
 * Creates a Stripe Customer Portal session for subscription management.
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate the request - ignore userId from body, use token
    const { userId, error: authError } = await getAuthenticatedUserId(req.headers.authorization);
    
    if (authError || !userId) {
      return res.status(401).json({ error: authError || 'Unauthorized' });
    }
    
    const { returnUrl } = req.body;

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!profile?.stripe_customer_id) {
      return res.status(404).json({ error: 'No Stripe customer found for this user' });
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl || 'https://yourapp.com/subscription',
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
