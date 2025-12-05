/**
 * Stripe Webhook Handler
 * 
 * Handles Stripe webhook events to sync subscription status.
 * Configure webhook in Stripe Dashboard pointing to: /api/stripe/webhook
 * 
 * Events to enable:
 * - checkout.session.completed
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.paid
 * - invoice.payment_failed
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Initialize Supabase with service role key for admin access
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Webhook secret from Stripe Dashboard
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export const config = {
  api: {
    bodyParser: false, // Stripe requires raw body for signature verification
  },
};

// Helper to get raw body
async function getRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'] as string;

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    console.log('Received Stripe event:', event.type);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Handle successful checkout - upgrade user to Pro
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error('No user ID in checkout session metadata');
    return;
  }

  console.log(`Checkout completed for user ${userId}, subscription ${subscriptionId}`);

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Update user subscription in database
  await updateUserSubscription(userId, {
    planType: 'pro',
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    billingCycleStart: new Date(subscription.current_period_start * 1000),
    billingCycleEnd: new Date(subscription.current_period_end * 1000),
    isActive: true,
  });
}

/**
 * Handle subscription updates (plan changes, renewals)
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id;
  
  if (!userId) {
    // Try to find user by customer ID
    const customerId = subscription.customer as string;
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();
    
    if (!profile) {
      console.error('Could not find user for subscription:', subscription.id);
      return;
    }
    
    await updateSubscriptionStatus(profile.id, subscription);
    return;
  }

  await updateSubscriptionStatus(userId, subscription);
}

/**
 * Handle subscription deletion (cancellation completed)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Find user by customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('Could not find user for deleted subscription');
    return;
  }

  console.log(`Subscription deleted for user ${profile.id}`);

  // Downgrade to free plan
  await updateUserSubscription(profile.id, {
    planType: 'free',
    stripeSubscriptionId: null,
    billingCycleEnd: null,
    isActive: true,
  });
}

/**
 * Handle successful invoice payment (subscription renewal)
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) return;

  // Find user
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) return;

  // Get updated subscription
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  // Update billing cycle
  await updateUserSubscription(profile.id, {
    billingCycleStart: new Date(subscription.current_period_start * 1000),
    billingCycleEnd: new Date(subscription.current_period_end * 1000),
    isActive: true,
  });

  console.log(`Invoice paid for user ${profile.id}`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find user
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) return;

  console.log(`Payment failed for user ${profile.id}`);

  // You could send an email notification here
  // Or update subscription status to 'past_due'
}

/**
 * Update subscription status based on Stripe subscription object
 */
async function updateSubscriptionStatus(userId: string, subscription: Stripe.Subscription) {
  const status = subscription.status;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;

  let planType: 'free' | 'pro' = 'pro';
  let isActive = true;

  // Determine plan status
  if (status === 'canceled' || status === 'unpaid') {
    planType = 'free';
    isActive = true;
  } else if (status === 'past_due') {
    // Keep pro but mark as past due (grace period)
    planType = 'pro';
    isActive = true;
  }

  await updateUserSubscription(userId, {
    planType,
    stripeSubscriptionId: subscription.id,
    billingCycleStart: new Date(subscription.current_period_start * 1000),
    billingCycleEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd,
    isActive,
  });
}

/**
 * Update user subscription in database
 */
async function updateUserSubscription(userId: string, data: {
  planType?: 'free' | 'pro';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string | null;
  billingCycleStart?: Date;
  billingCycleEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  isActive?: boolean;
}) {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (data.planType !== undefined) {
    updateData.plan_type = data.planType;
    // Update limits based on plan
    if (data.planType === 'pro') {
      updateData.max_vehicles = -1; // Unlimited
      updateData.daily_refresh_vehicles = 10;
      updateData.manual_refresh_interval_days = 1;
    } else {
      updateData.max_vehicles = 1;
      updateData.daily_refresh_vehicles = 0;
      updateData.manual_refresh_interval_days = 7;
    }
  }

  if (data.stripeCustomerId) updateData.stripe_customer_id = data.stripeCustomerId;
  if (data.stripeSubscriptionId !== undefined) updateData.stripe_subscription_id = data.stripeSubscriptionId;
  if (data.billingCycleStart) updateData.billing_cycle_start = data.billingCycleStart.toISOString();
  if (data.billingCycleEnd !== undefined) {
    updateData.billing_cycle_end = data.billingCycleEnd?.toISOString() || null;
  }
  if (data.cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = data.cancelAtPeriodEnd;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;

  // Upsert subscription record
  const { error } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      ...updateData,
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }

  console.log(`Updated subscription for user ${userId}:`, updateData);
}
