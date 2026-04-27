# Admin Fee Settings Implementation

## Steps

- [x] 1. Read all relevant files and understand architecture
- [x] 2. Update `backend/firebase/seed.js` — add fee fields to `appConfig/general`
- [x] 3. Update `frontend/src/firebase/services.js` — add `getAppConfig()` and `updateAppConfig()`
- [x] 4. Update `frontend/src/pages/admin/Dashboard.js` — add "Settings" tab with fee config form
- [x] 5. Update `frontend/src/pages/admin/Dashboard.module.css` — add Settings form styles
- [x] 6. Update `frontend/src/pages/customer/Checkout.js` — fetch appConfig, calculate & display all fees dynamically
- [x] 7. Update `backend/routes/orders.js` — accept and persist platformFee, gstAmount, packagingFee in order creation
- [x] 8. Update `frontend/src/pages/customer/OrderConfirmation.js` — show fee breakdown in order details
- [x] 9. Update `frontend/src/pages/customer/MyOrders.js` — show fee details / savings info
- [x] 10. Add CSS styles for fee breakdown displays

## Summary of Changes

### Admin Dashboard (Settings Tab)
- New **Settings** tab in admin sidebar with ⚙️ icon
- Editable fields: Platform Fee, GST %, Packaging Fee, Default Delivery Fee, Default Min Order
- Save button persists to Firestore `appConfig/general` document
- Success toast notification on save

### Customer Checkout
- Fetches `appConfig` from Firestore on mount
- Calculates fees dynamically:
  - `platformFee` (flat, default ₹10)
  - `packagingFee` (flat, default ₹15)
  - `gstAmount` = subtotal × gstPercent / 100 (default 5%)
  - `deliveryFee` from appConfig or restaurant data
- Bill summary shows all line items: Subtotal, Platform Fee, Packaging Fee, GST, Delivery Fee, Discount, Wallet, Total
- Order payload includes all fee fields for backend persistence

### Backend Orders API
- Accepts `platformFee`, `packagingFee`, `gstPercent`, `gstAmount` in POST `/api/orders`
- Includes fees in both in-memory fallback and Firebase order documents
- Total calculation: `subtotal + platformFee + packagingFee + gstAmount + deliveryFee - discount - walletUsed`

### Order Confirmation & My Orders
- Order confirmation page shows full fee breakdown (subtotal, fees, discounts, total)
- My Orders cards show a "+Fees" tag when applicable
- All fee data persisted and displayed across the order lifecycle

## Default Fee Values (in seed.js)
```js
platformFee: 10,
gstPercent: 5,
packagingFee: 15,
defaultDeliveryFee: 29,
defaultMinOrder: 149
```

## Next Steps for User
1. Re-seed the database OR manually update the `appConfig/general` document in Firestore to include the fee fields
2. Log in as admin (`admin@fooddash.in` / `admin@123`) and navigate to the **Settings** tab
3. Adjust fees as needed — changes reflect immediately on customer checkout

