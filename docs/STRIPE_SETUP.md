# Stripe Payment Setup Guide

This guide walks you through setting up Stripe for subscription payments in the app.

## 1. Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete the business verification (can use test mode while setting up)

## 2. Get API Keys

1. Go to [Stripe Dashboard > Developers > API Keys](https://dashboard.stripe.com/apikeys)
2. Copy your keys:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

## 3. Create Product & Price

1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
2. Click "Add Product"
3. Fill in:
   - **Name**: AutoTrack Pro
   - **Description**: Unlimited vehicles, daily updates, priority refresh
4. Add pricing:
   - **Monthly**: $4.99/month (recurring)
   - **Yearly**: $99.99/year (recurring) - optional
5. Copy the **Price ID** (starts with `price_`)

## 4. Set Up Webhook

1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your endpoint URL: `https://your-app.vercel.app/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)

## 5. Configure Customer Portal

1. Go to [Stripe Dashboard > Settings > Billing > Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
2. Enable the portal
3. Configure allowed actions:
   - ✅ Update payment methods
   - ✅ Cancel subscriptions
   - ✅ View invoices
4. Save changes

## 6. Add Environment Variables

Add these to your `.env` file and Vercel environment variables:

```bash
# Client-side (safe to expose)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
EXPO_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
EXPO_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID=price_xxx  # optional
EXPO_PUBLIC_API_URL=https://your-app.vercel.app

# Server-side only (keep secret!)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Vercel Setup

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add all the variables above
4. Make sure to add them for all environments (Production, Preview, Development)

## 7. Update Database Schema

Run this SQL in your Supabase SQL editor to add Stripe columns:

```sql
-- Add Stripe columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Add Stripe columns to user_subscriptions table
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer 
ON profiles(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe 
ON user_subscriptions(stripe_subscription_id);
```

## 8. Test the Integration

### Test Mode
1. Use test API keys (starting with `pk_test_` and `sk_test_`)
2. Use Stripe test card numbers:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - **Requires Auth**: `4000 0025 0000 3155`

### Test Flow
1. Sign up for a new account in the app
2. Go to Profile > Subscription
3. Click "Upgrade to Pro"
4. Complete checkout with test card
5. Verify subscription is active
6. Test cancellation flow

## 9. Go Live

When ready for production:

1. Complete Stripe account verification
2. Switch to live API keys
3. Update webhook endpoint to use live signing secret
4. Update environment variables in Vercel
5. Test with a real card (you can refund immediately)

## Troubleshooting

### Webhook not receiving events
- Check the webhook endpoint URL is correct
- Verify the signing secret matches
- Check Vercel function logs for errors

### Checkout not opening
- Verify publishable key is correct
- Check browser console for errors
- Ensure API URL is correct

### Subscription not updating after payment
- Check webhook logs in Stripe Dashboard
- Verify Supabase service role key is correct
- Check Vercel function logs

## Support

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing](https://stripe.com/docs/testing)
