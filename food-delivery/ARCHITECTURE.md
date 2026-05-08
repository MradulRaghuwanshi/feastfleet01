# FeastFleet Production Architecture

## Runtime Topology

- Customer App, Restaurant Dashboard, Delivery Partner App, and Admin Panel use the same React shell with role-based routing.
- Firestore realtime listeners power the current deployment path. For a production Node stack, mirror the same events through Socket.IO rooms:
  - `customer:{customerId}`
  - `restaurant:{restaurantId}`
  - `delivery:{partnerId}`
  - `admin:orders`
- All state-changing order operations must run through transactional backend APIs or Firestore transactions. Never update assignment, OTP, earnings, or settlements with blind writes.

## Canonical Order Lifecycle

1. `Order Placed`
2. `Restaurant Accepted`
3. `Delivery Partner Assigned`
4. `Pickup OTP Verified`
5. `Order Picked Up`
6. `On The Way`
7. `Delivered`

Order status is linear, but restaurant acceptance and driver assignment are also stored as independent timestamps so a driver can accept while the restaurant is still reviewing the order.

## Conflict Prevention

- Delivery acceptance uses a transaction that checks `deliveryAgentId` before writing.
- Admin reassignment is the only path that can overwrite an existing assignment.
- OTP verification stores attempt counters, lock windows, expiry, verification timestamp, and status history in one transaction.
- Delivery earnings and restaurant settlements are posted once per order using the order id as the ledger document id.

## Pricing Rules

- Platform fee: INR 8 fixed.
- Packaging fee: INR 10 fixed.
- Delivery fee:
  - subtotal below INR 100: INR 30
  - subtotal below INR 150: INR 20
  - subtotal below INR 250: INR 10
  - subtotal INR 250 or above: free
- Restaurant commission: 15% of food subtotal.
- Delivery partner earning: INR 40 per delivered order.
- Feast Coins: 5 coins per INR 100 food subtotal, 1 coin = INR 1, redemption starts at 100 coins.

## Feast Coins

- Wallets reset monthly.
- Previous month balances are archived under each wallet.
- Transactions are append-only records with earn/redeem entries and balance snapshots.
- Checkout recalculates redemption on every cart/promo change and prevents negative balances.

## OTP Security

- Customer-facing order reads strip OTP fields.
- Pickup OTP is encrypted at rest and separately hashed for verification.
- OTP visibility is limited in UI to restaurant, assigned delivery partner, and admin.
- Production deployments should move OTP generation/decryption to the Node API so encryption keys never ship to browsers.

## Recommended Backend API Surface

- `POST /api/orders` creates order, OTP, wallet transactions, and broadcast event.
- `POST /api/orders/:id/restaurant-accept` records restaurant acceptance.
- `POST /api/orders/:id/accept` atomically assigns a delivery partner.
- `POST /api/orders/:id/reassign` admin-only reassignment.
- `PATCH /api/orders/:id/verify-pickup-otp` verifies OTP and starts delivery.
- `PATCH /api/orders/:id/status` advances lifecycle and posts ledgers on delivery.
- `GET /api/wallets/:customerId` returns balance and history.
- `POST /api/wallets/monthly-refresh` scheduled monthly archive/reset.
- `GET /api/admin/revenue` returns commission, delivery liability, settlements, and coin analytics.
