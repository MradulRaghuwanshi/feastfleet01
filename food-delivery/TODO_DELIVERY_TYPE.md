# TODO: Separate Restaurants by Delivery Type

## Goal
Split restaurants into two sections:
1. **Own Delivery** — restaurant handles delivery, no platform fee, no external agent
2. **Platform Delivery** — platform assigns delivery partner, customer pays delivery fee

## Steps
- [x] 1. Read & analyze relevant files
- [ ] 2. Update backend data (`db.js`, `seed.js`) with `hasOwnDelivery` flag
- [ ] 3. Update backend order route (`orders.js`) — conditional fee & agent
- [ ] 4. Update `CartContext.js` — track `restaurantHasOwnDelivery`
- [ ] 5. Update `RestaurantCard.js` — delivery-type badge
- [ ] 6. Update `customer/Home.js` — two-section layout
- [ ] 7. Update `customer/RestaurantMenu.js` & `MenuItem.js` — pass flag to cart
- [ ] 8. Update `customer/Checkout.js` — conditional delivery fee logic
- [ ] 9. Update root `Checkout.js` & `RestaurantMenu.js` for consistency

