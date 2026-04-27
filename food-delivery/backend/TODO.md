# OTP Setup Removal Plan

## Steps:
- [x] 1. Create this TODO.md file (tracking progress)
- [x] 2. Edit food-delivery/backend/routes/orders.js:
  - Remove generateOTP() function
  - Remove deliveryOtp assignments in POST / (in-memory and Firebase)
  - Remove entire /verify-otp PATCH endpoint
- [x] 3. Verify edits with read_file
- [ ] 4. Test order creation (no deliveryOtp field)
- [ ] 5. Test delivery flow without OTP
- [ ] 6. Restart backend if needed and confirm
- [ ] 7. Mark complete and attempt_completion

Current: Starting edits...
