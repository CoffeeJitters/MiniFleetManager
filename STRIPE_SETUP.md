# Stripe Billing Setup Guide

## Prerequisites

1. Stripe account created
2. API keys added to `.env`:
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE`
   - `STRIPE_WEBHOOK_SECRET` (get this after creating webhook)

## Step 1: Create Products and Prices in Stripe

1. Go to Stripe Dashboard → **Products**
2. Click **"+ Add product"**
3. Create your plans:

### Example Plan: Starter
- **Name**: Starter Plan
- **Description**: Perfect for small fleets
- **Pricing**: 
  - **Price**: $29.00
  - **Billing period**: Monthly
- Click **"Save product"**
- Copy the **Price ID** (starts with `price_`)

### Example Plan: Pro
- **Name**: Pro Plan
- **Description**: For growing fleets
- **Pricing**: 
  - **Price**: $79.00
  - **Billing period**: Monthly
- Click **"Save product"**
- Copy the **Price ID**

## Step 2: Add Plans to Database

After creating prices in Stripe, add them to your database:

```sql
-- Example: Add Starter plan
INSERT INTO plans (id, "stripePriceId", name, description, price, interval, "isActive", "createdAt", "updatedAt")
VALUES (
  'clx1234567890',
  'price_xxxxxxxxxxxxx',  -- Your Stripe Price ID
  'Starter Plan',
  'Perfect for small fleets',
  2900,  -- $29.00 in cents
  'month',
  true,
  NOW(),
  NOW()
);

-- Example: Add Pro plan
INSERT INTO plans (id, "stripePriceId", name, description, price, interval, "isActive", "createdAt", "updatedAt")
VALUES (
  'clx0987654321',
  'price_yyyyyyyyyyyyy',  -- Your Stripe Price ID
  'Pro Plan',
  'For growing fleets',
  7900,  -- $79.00 in cents
  'month',
  true,
  NOW(),
  NOW()
);
```

Or use Prisma Studio:
```bash
npx prisma studio
```

## Step 3: Set Up Webhook

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click **"+ Add endpoint"**
3. **Endpoint URL**: `https://yourdomain.com/api/billing/webhook`
   - For local testing: Use Stripe CLI (see below)
4. **Events to send**: Select these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to your `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

## Step 4: Local Webhook Testing (Optional)

For local development, use Stripe CLI:

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/billing/webhook`
4. Copy the webhook signing secret shown and add to `.env`

## Step 5: Run Database Migration

```bash
npx prisma db push
```

Or create a migration:
```bash
npx prisma migrate dev --name add_stripe_billing
```

## Testing

1. Start your dev server: `npm run dev`
2. Go to `/billing` page
3. Click "Upgrade" on a plan
4. Use Stripe test card: `4242 4242 4242 4242`
5. Any future expiry date, any CVC
6. Complete checkout
7. Check that subscription status updates in database

## Troubleshooting

- **Webhook not working**: Make sure `STRIPE_WEBHOOK_SECRET` is set correctly
- **Plans not showing**: Make sure plans are added to database with `isActive: true`
- **Checkout fails**: Verify Stripe API keys are correct and in test mode
- **Subscription not updating**: Check webhook endpoint is receiving events in Stripe dashboard


