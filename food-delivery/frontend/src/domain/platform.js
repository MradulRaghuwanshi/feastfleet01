export const ORDER_STATUS = {
  PLACED: 'Order Placed',
  RESTAURANT_ACCEPTED: 'Restaurant Accepted',
  DELIVERY_ASSIGNED: 'Delivery Partner Assigned',
  PICKUP_VERIFIED: 'Pickup OTP Verified',
  ORDER_PICKED: 'Order Picked Up',
  ON_THE_WAY: 'On The Way',
  DELIVERED: 'Delivered',
};

export const ORDER_FLOW = [
  ORDER_STATUS.PLACED,
  ORDER_STATUS.RESTAURANT_ACCEPTED,
  ORDER_STATUS.DELIVERY_ASSIGNED,
  ORDER_STATUS.PICKUP_VERIFIED,
  ORDER_STATUS.ORDER_PICKED,
  ORDER_STATUS.ON_THE_WAY,
  ORDER_STATUS.DELIVERED,
];

export const LEGACY_STATUS_MAP = {
  Placed: ORDER_STATUS.PLACED,
  Confirmed: ORDER_STATUS.RESTAURANT_ACCEPTED,
  Preparing: ORDER_STATUS.RESTAURANT_ACCEPTED,
  'Out for Delivery': ORDER_STATUS.ON_THE_WAY,
  Delivered: ORDER_STATUS.DELIVERED,
};

export const PLATFORM_FEES = {
  platformFee: 8,
  packagingFee: 10,
  deliveryEarning: 40,
  restaurantCommissionPercent: 15,
  gstPercent: 0,
  minimumCoinRedemption: 100,
};

export function normalizeOrderStatus(status) {
  return LEGACY_STATUS_MAP[status] || status || ORDER_STATUS.PLACED;
}

export function getDeliveryFee(subtotal) {
  const value = Number(subtotal || 0);
  if (value < 100) return 30;
  if (value < 150) return 20;
  if (value < 250) return 10;
  return 0;
}

export function getDeliveryFeeLabel(subtotal) {
  const value = Number(subtotal || 0);
  if (value < 100) return 'Below ₹100';
  if (value < 150) return '₹100-₹149';
  if (value < 250) return '₹150-₹249';
  return '₹250+';
}

export function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function getFoodSubtotal(items = []) {
  return roundMoney(items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0));
}

export function calculateFeastCoinsEarned(subtotal) {
  return Math.floor(Number(subtotal || 0) / 100) * 5;
}

export function calculateRestaurantSettlement(subtotal) {
  const gross = roundMoney(subtotal);
  const platformCommission = roundMoney(gross * PLATFORM_FEES.restaurantCommissionPercent / 100);
  return {
    grossFoodAmount: gross,
    platformCommission,
    netSettlementAmount: roundMoney(gross - platformCommission),
    commissionPercent: PLATFORM_FEES.restaurantCommissionPercent,
  };
}

export function calculateBill({
  items,
  subtotal,
  promo,
  feastCoinBalance = 0,
  redeemFeastCoins = false,
  gstPercent = PLATFORM_FEES.gstPercent,
} = {}) {
  const foodSubtotal = roundMoney(subtotal ?? getFoodSubtotal(items));
  const platformFee = PLATFORM_FEES.platformFee;
  const packagingFee = PLATFORM_FEES.packagingFee;
  const gstAmount = 0;
  let deliveryFee = getDeliveryFee(foodSubtotal);
  let discount = 0;

  if (promo) {
    if (promo.type === 'percent') {
      discount = Math.min(roundMoney(foodSubtotal * Number(promo.value || 0) / 100), 100);
    } else if (promo.type === 'flat') {
      discount = Number(promo.value || 0);
    } else if (promo.type === 'delivery') {
      deliveryFee = 0;
    }
  }

  discount = Math.min(roundMoney(discount), foodSubtotal);

  const payableBeforeCoins = Math.max(0, roundMoney(
    foodSubtotal + platformFee + packagingFee + deliveryFee - discount
  ));

  const availableCoins = Math.floor(Number(feastCoinBalance || 0));
  const feastCoinRedemption = redeemFeastCoins && availableCoins >= PLATFORM_FEES.minimumCoinRedemption
    ? Math.min(availableCoins, Math.floor(payableBeforeCoins))
    : 0;

  const finalPayable = Math.max(0, roundMoney(payableBeforeCoins - feastCoinRedemption));
  const coinsEarned = calculateFeastCoinsEarned(foodSubtotal);
  const settlement = calculateRestaurantSettlement(foodSubtotal);

  return {
    subtotal: foodSubtotal,
    gstPercent: 0,
    gstAmount,
    platformFee,
    packagingFee,
    deliveryFee,
    discount,
    feastCoinRedemption,
    finalPayable,
    payableBeforeCoins,
    coinsEarned,
    ...settlement,
  };
}

export function getMonthKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function getMonthEndIso(date = new Date()) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999)).toISOString();
}
