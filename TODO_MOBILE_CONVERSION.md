# FeastFleet Mobile Conversion — Next.js + Capacitor

## Goal
Convert the existing React (CRA) web app into a native Android application using Next.js + Capacitor.

---

## Phase 1: Project Setup & Configuration ✅
- [x] Create `food-delivery/mobile/` directory structure
- [x] Create `package.json` with Next.js + Capacitor dependencies
- [x] Create `next.config.js` (static export for Capacitor)
- [x] Create `capacitor.config.ts` (appId: `com.feastfleet.app`)
- [x] Create `jsconfig.json` for path aliases
- [x] Create `.gitignore`

## Phase 2: Core Next.js Files ✅
- [x] Create `src/pages/_app.js` (global layout, auth routing logic)
- [x] Create `src/pages/_document.js` (HTML head, viewport, fonts)
- [x] Create `src/styles/globals.css` (from existing `index.css`)

## Phase 3: Page Migration (react-router → next/router) ✅
- [x] `src/pages/index.js` — Home / role-based redirect
- [x] `src/pages/login.js` — Login (copied as-is)
- [x] `src/pages/restaurant.js` — RestaurantMenu (`useParams` → `router.query.id`)
- [x] `src/pages/checkout.js` — Checkout (`useNavigate` → `useRouter`)
- [x] `src/pages/order-confirmation.js` — OrderConfirmation (`useParams` → `router.query.id`)
- [x] `src/pages/orders.js` — MyOrders (`useNavigate` → `useRouter`)
- [x] `src/pages/favourites.js` — Favourites
- [x] `src/pages/admin/dashboard.js` — AdminDashboard (copied as-is)
- [x] `src/pages/restaurant/dashboard.js` — RestaurantDashboard (copied as-is)
- [x] `src/pages/restaurant/pos.js` — POS (copied as-is)
- [x] `src/pages/delivery/dashboard.js` — DeliveryDashboard (copied as-is)

## Phase 4: Component Migration ✅
- [x] `src/components/Navbar.js` — Replace `Link`/`useNavigate` with `next/link`/`useRouter`
- [x] `src/components/BottomNav.js` — Replace `NavLink` with `next/link` + `useRouter`
- [x] `src/components/RestaurantCard.js` — Replace `Link` with `next/link`
- [x] Copy all other components as-is (MenuItem, ReviewSection, LocationBar, LocationPicker, NotificationBanner, NotificationToast, ReviewModal, LiveTrackingMap)

## Phase 5: Context & Utilities Migration ✅
- [x] `src/context/AuthContext.js` — Updated for Next.js (Capacitor Preferences + localStorage fallback)
- [x] `src/context/CartContext.js` — Copied as-is
- [x] `src/context/LocationContext.js` — Copied as-is
- [x] `src/firebase/config.js` — Added SSR safety checks
- [x] `src/firebase/services.js` — Copied as-is
- [x] `src/hooks/useNotifications.js` — Updated env var prefix to `NEXT_PUBLIC_`
- [x] `src/utils/apiConfig.js` — Updated env var prefix to `NEXT_PUBLIC_`

## Phase 6: Mobile-Specific Utilities ✅
- [x] Create `src/lib/capacitor.js` — Plugin wrappers with web fallbacks
- [x] Create `src/lib/preferences.js` — localStorage → Capacitor Preferences adapter
- [x] Create `src/lib/clipboard.js` — navigator.clipboard → Capacitor Clipboard adapter

## Phase 7: Capacitor Android Integration ✅
- [x] Install npm dependencies (`npm install`)
- [x] Add Capacitor Android platform (`npx cap add android`)
- [x] Build static export (`next build`)
- [x] Sync to Android (`npx cap sync`)
- [x] Configure `AndroidManifest.xml`
- [x] Add app icons and splash screen assets
- [x] Configure status bar and safe area
- [x] Add network security config for API calls

## Phase 8: Build & Test ✅
- [x] Build debug APK (`./gradlew assembleDebug`)
- [ ] Build signed release AAB/APK
- [x] Provide testing instructions

---

## Key Design Decisions

1. **Query params for dynamic routes**: Since Next.js static export doesn't support `fallback` dynamic routes, restaurant IDs and order IDs are passed as query parameters (`?id=xxx`) rather than path segments (`/xxx`). This is invisible to users in the native app.

2. **Pages Router over App Router**: The migration from `react-router-dom` is more straightforward with Next.js Pages Router. All existing patterns (context providers, hooks) map directly.

3. **Separate `mobile/` directory**: The existing `frontend/` is preserved untouched. The new `mobile/` directory contains the Next.js + Capacitor codebase.

4. **Capacitor plugin wrappers**: All native plugin calls are wrapped with web fallbacks so the app still works in browser during development.

