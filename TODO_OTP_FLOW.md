# TODO_OTP_FLOW

- [x] Update backend order creation to generate `deliveryOtp` and store `deliveryOtpVerified=false`.
- [ ] For platform-delivery restaurants, set `deliveryAgentId=null` at order creation (do not assign random agent).
- [ ] Add backend endpoint `PATCH /api/orders/:orderId/accept` to accept an order and set `deliveryAgentId`.
- [ ] Add backend endpoint `PATCH /api/orders/:orderId/verify-otp` to verify OTP, set `deliveryOtpVerified=true`, update status, and send customer notification.
- [x] Add endpoints to accept order and verify OTP (customer notified after OTP).
- [x] Restrict tracking endpoint so pickup/drop/route are only returned to the accepted `deliveryAgentId`.
- [ ] Update frontend delivery dashboard to show Pickup/Drop/OTP only after accept.

- [ ] Quick test: place order → only one agent sees it after accept → accepted agent sees route + OTP → OTP verify triggers customer notification.


