# FeastFleet Changelog

## [1.1.0] - 2024-05-17

### Fixed
- **Razorpay Payment Modal**: Fixed issue where payment modal would not open
  - Added `data-razorpay-checkout` attribute to script tag in index.html
  - Improved `loadRazorpayScript()` with proper async handling and polling
  - Fixed race condition in script loading and `window.Razorpay` initialization
  - Applied fixes to both Checkout and customer Checkout pages

### Improved
- **Error Handling**: Enhanced error messages for payment flow
  - Added detailed error messages for payment API failures
  - Added verification that `window.Razorpay` exists before opening modal
  - Improved error handling for payment gateway initialization
  - Added console logging for debugging payment issues

### Fixed
- **Deployment Configuration**: Fixed YAML syntax error in render.yaml
  - Corrected indentation for Razorpay environment variables

### Changed
- **Version Management**: Added version tracking
  - Frontend updated to v1.1.0
  - Backend updated to v1.1.0
  - Added version utility for frontend
  - Added version display in startup logs

---

## [1.0.0] - 2024-05-10

### Initial Release
- Full food delivery platform with customer, restaurant, delivery, and admin dashboards
- Firebase Realtime Database integration
- Razorpay payment integration
- Real-time order tracking
- Feast Coins loyalty system
- Promotional codes and discounts
- Multi-role authentication (Customer, Restaurant, Delivery Partner, Admin)
