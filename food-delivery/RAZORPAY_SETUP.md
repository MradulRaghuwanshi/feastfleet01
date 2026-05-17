# Razorpay Setup Guide

## Getting Started with Razorpay Payment Integration

### Step 1: Create a Razorpay Account
1. Visit [razorpay.com](https://razorpay.com)
2. Sign up for a merchant account
3. Verify your email and phone number

### Step 2: Get Your Test Keys
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to **Settings** → **API Keys**
3. Make sure you're in **Test Mode** (toggle on the right)
4. Copy your **Key ID** (starts with `rzp_test_`)
5. Copy your **Key Secret** (keep this private!)

### Step 3: Configure Backend (Render)
1. Go to https://dashboard.render.com/
2. Select the `feastfleet-backend` service
3. Click **Settings** → **Environment**
4. Add/Update these variables:
   ```
   RAZORPAY_KEY_ID = rzp_test_XXXXXXXXXXXX
   RAZORPAY_KEY_SECRET = your_secret_key_here
   ```
5. Click **Save** - the backend will redeploy automatically

### Step 4: Verify Configuration
- Check the backend logs on Render to confirm it started successfully
- Test a payment on the frontend at https://feastfleet.tech

## Test Payment Details

Use these test card details in the Razorpay modal:

### Successful Payment
- Card: `4111 1111 1111 1111`
- Expiry: `12/25` (any future date)
- CVV: `123`

### Failed Payment
- Card: `4222 2222 2222 2200`
- Expiry: `12/25`
- CVV: `123`

## Troubleshooting

### "Payment Failed" Error
- ❌ Backend keys are not configured
- ✅ Solution: Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to Render environment

### "Something went wrong" Error
- ❌ Keys are invalid or expired
- ❌ Network connectivity issue
- ✅ Solution: Verify keys in Razorpay dashboard, check Render logs

### Payment Modal Not Opening
- ❌ Frontend key is not configured
- ✅ Check `REACT_APP_RAZORPAY_KEY_ID` in Vercel environment
- ✅ Verify the key starts with `rzp_test_` or `rzp_live_`

## Production Setup

When going live:
1. Switch to **Live Mode** in Razorpay Dashboard
2. Copy your **Live Key ID** (starts with `rzp_live_`)
3. Copy your **Live Key Secret**
4. Update Render environment variables with live keys
5. Update Vercel `REACT_APP_RAZORPAY_KEY_ID` with live key

⚠️ **IMPORTANT**: Never share your Key Secret or expose it in frontend code!

## Demo Mode

If Razorpay keys are not configured:
- Backend returns demo order IDs
- Razorpay modal will still open but payments will fail
- Use "Cash on Delivery" as fallback
