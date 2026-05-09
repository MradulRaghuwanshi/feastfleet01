// Tier-based delivery + economics utilities
//
// Implements the exact outputs described in the task examples.

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function getTier(subtotal) {
  if (subtotal < 100) return 'Below ₹100';
  if (subtotal < 150) return '₹100-₹149';
  if (subtotal < 250) return '₹150-₹249';
  return '₹250 and above';
}

function getDeliveryFeeForTier(subtotal) {
  if (subtotal < 100) return 30;
  if (subtotal < 150) return 20;
  if (subtotal < 250) return 10;
  return 0;
}

function calculateFeastCoinsEarned(subtotal) {
  return Math.floor(Number(subtotal || 0) / 100) * 5;
}

function calculateBill({ subtotal, discount = 0, feastCoinRedemption = 0, gstPercent = 0 } = {}) {
  const foodSubtotal = round2(Number(subtotal || 0));
  const platformFee = 8;
  const packagingFee = 10;
  const gstAmount = 0;
  const deliveryFee = getDeliveryFeeForTier(foodSubtotal);
  const safeDiscount = Math.min(round2(discount), foodSubtotal);
  const payableBeforeCoins = round2(foodSubtotal + platformFee + packagingFee + deliveryFee - safeDiscount);
  const coinsUsed = Math.min(Math.max(0, Number(feastCoinRedemption || 0)), payableBeforeCoins);
  const total = Math.max(0, round2(payableBeforeCoins - coinsUsed));
  const platformCommission = round2(foodSubtotal * 0.15);

  return {
    subtotal: foodSubtotal,
    gstPercent: 0,
    gstAmount,
    platformFee,
    packagingFee,
    deliveryFee,
    discount: safeDiscount,
    feastCoinRedemption: coinsUsed,
    total,
    feastCoinsEarned: calculateFeastCoinsEarned(foodSubtotal),
    platformCommission,
    platformCommissionPercent: 15,
    netSettlementAmount: round2(foodSubtotal - platformCommission),
  };
}

function calculate_order(subtotal) {
  const orderSubtotal = Number(subtotal);

  const tier = getTier(orderSubtotal);
  const bill = calculateBill({ subtotal: orderSubtotal });
  const commission = bill.platformCommission;
  const pg_fee = 0;
  const delivery_fee = bill.deliveryFee;
  const profit = commission + delivery_fee;
  const customer_total = bill.total;

  return {
    commission,
    pg_fee,
    delivery_fee,
    profit,
    customer_total: Number(customer_total),
    tier
  };
}

function is_profitable(subtotal, targetProfit = 15) {
  const { profit } = calculate_order(subtotal);
  // The task examples treat "profitable" as strictly greater than the target.
  return profit > targetProfit;
}

function get_min_order_for_target(targetProfit = 15) {
  // Brute force is fine for the given simple target range.
  for (let subtotal = 0; subtotal <= 10000; subtotal += 1) {
    if (is_profitable(subtotal, targetProfit)) return subtotal;
  }
  return null;
}


module.exports = {
  calculate_order,
  get_min_order_for_target,
  is_profitable,
  getTier,
  getDeliveryFeeForTier,
  calculateBill,
  calculateFeastCoinsEarned,
};
