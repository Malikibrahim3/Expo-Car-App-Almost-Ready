/**
 * Stripe Checkout Session API
 * 
 * Creates a Stripe Checkout session for subscription purchase.
 * Deploy to Vercel as a serverless function.
 * Requires authentication via Bearer token.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Verify JWT token and return authenticated user
 */
async function getAuthenticatedUser(authHeader: string | undefined): Promise<{ userId: string | null; email: string | null; error: string | null }> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, email: null, error: 'Missing or invalid authorization header' };
  }
  
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { userId: null, email: null, error: 'Invalid or expired token' };
  }
  
  return { userId: user.id, email: user.email || null, error: null };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate the request - get user from token, not from body
    const { userId, email: userEmail, error: authError } = await getAuthenticatedUser(req.headers.authorization);
    
    if (authError || !userId) {
      return res.status(401).json({ error: authError || 'Unauthorized' });
    }
    
    const { priceId, successUrl, cancelUrl } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'Missing required field: priceId' });
    }

    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    let customerId = profile?.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          supabase_user_id: userId,
        },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || 'https://yourapp.com/subscription?success=true',
      cancel_url: cancelUrl || 'https://yourapp.com/subscription?canceled=true',
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
        },
      },
      metadata: {
        supabase_user_id: userId,
      },
    });

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
