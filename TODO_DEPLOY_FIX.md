# Fix Deployed Version Loading Issue

## Problem
Restaurant data and promos load on localhost but show "Loading..." forever on deployed version.

## Root Cause
`customer/Home.js` uses `fetch('/api/restaurants')` which works locally via `package.json` proxy, but fails silently in production because there's no backend deployed alongside the frontend. `setLoading(false)` was only called in `.then()`, so the spinner never disappeared.

## Plan
- [x] Step 1: Fix `customer/Home.js` - Use Firebase services instead of REST API + add error handling
- [x] Step 2: Fix `pages/Home.js` - Same fix for consistency
- [x] Step 3: Create `src/utils/apiConfig.js` - Centralized API config for remaining REST calls
- [x] Step 4: Update Netlify `_redirects` files - Add API proxy rules
- [ ] Step 5: Rebuild and redeploy

## Changes Made

### 1. `food-delivery/frontend/src/pages/customer/Home.js`
- Replaced `fetch('/api/restaurants')` → `getRestaurants(cuisine)` from Firebase
- Replaced `fetch('/api/promos')` → `getActivePromos()` from Firebase
- Added `.catch()` and `.finally()` so loading spinner never hangs

### 2. `food-delivery/frontend/src/pages/Home.js`
- Same fix: replaced `fetch('/api/restaurants')` → `getRestaurants()` from Firebase
- Added `.catch()` and `.finally()` for robust error handling

### 3. `food-delivery/frontend/src/utils/apiConfig.js` (NEW)
- Centralized API base URL config
- Reads `REACT_APP_API_URL` env var, falls back to `/api`
- Helper `apiUrl(path)` to build full URLs for remaining backend-dependent features

### 4. Netlify Redirects Updated
- `build/_redirects` and `netlify-ready/_redirects` now include API proxy rule:
  `/api/*  https://your-backend-url.herokuapp.com/api/:splat  200`
- **Note:** Replace `your-backend-url.herokuapp.com` with your actual deployed backend URL, or remove the line if you don't have a backend deployed.

## What Remains (Backend-Dependent Features)
These features still need a deployed backend to work fully:
- OTP verification (`/api/orders/:id/verify-otp`) — Delivery partner dashboard
- Live order tracking (`/api/tracking/:id`) — Map data
- Push notification token saving (`/api/notifications/save-token`)
- Admin promo broadcast notifications (`/api/notifications/promo`)
- Admin dashboard overview (`/api/dashboard/overview`)

The **customer restaurant browsing, menu viewing, checkout, order history, and favourites** now all work directly via Firebase Firestore in the deployed build.

