// Central offer configuration and pricing helpers.
// Keep this file as the single source of truth for active offers.

export const OFFERS = [
  {
    type: 'flat',
    disc: 50,
    min: 200,
    label: '₹50 off on ₹200+',
    active: true,
    newUserOnly: false,
  },
  {
    type: 'flat',
    disc: 20,
    min: 199,
    label: 'New user: ₹20 off on ₹199+',
    active: true,
    newUserOnly: true,
  },
];

const roundMoney = (value) => Math.round(Number(value || 0));

export function getEligibleOffers(offers = OFFERS, isNewUser = false) {
  return (offers || []).filter((offer) => {
    if (!offer?.active) return false;
    if (offer.newUserOnly && !isNewUser) return false;
    return true;
  });
}

export function getOfferFactor(offer) {
  if (!offer) return 1;

  if (offer.type === 'flat') {
    const min = Number(offer.min || 0);
    const disc = Number(offer.disc || 0);
    if (min <= 0 || disc <= 0) return 1;
    // Flat: factor = (min + disc) / min
    return (min + disc) / min;
  }

  if (offer.type === 'percent') {
    const percent = Number(offer.disc || 0);
    if (percent <= 0 || percent >= 100) return 1;
    // Percent: factor = 1 / (1 - x/100)
    return 1 / (1 - percent / 100);
  }

  return 1;
}

export function getInflationFactor(offers = OFFERS, isNewUser = false) {
  const eligible = getEligibleOffers(offers, isNewUser);
  if (!eligible.length) return 1;
  return eligible.reduce((maxFactor, offer) => Math.max(maxFactor, getOfferFactor(offer)), 1);
}

export function getInflatedPrice(originalPrice, offers = OFFERS, isNewUser = false) {
  const factor = getInflationFactor(offers, isNewUser);
  return Math.ceil(Number(originalPrice || 0) * factor);
}

export function applyOffer(offer, cartTotal) {
  if (!offer) return 0;

  const total = roundMoney(cartTotal);
  const minOrder = Number(offer.min || 0);
  if (total < minOrder) return 0;

  if (offer.type === 'flat') {
    return roundMoney(offer.disc);
  }

  if (offer.type === 'percent') {
    return roundMoney((total * Number(offer.disc || 0)) / 100);
  }

  return 0;
}

export function getBestOffer(cartTotal, offers = OFFERS, isNewUser = false) {
  const eligible = getEligibleOffers(offers, isNewUser);
  const applicable = eligible
    .map((offer) => ({ offer, discountAmount: applyOffer(offer, cartTotal) }))
    .filter((entry) => entry.discountAmount > 0)
    .sort((a, b) => {
      if (b.discountAmount !== a.discountAmount) return b.discountAmount - a.discountAmount;
      return Number(b.offer.min || 0) - Number(a.offer.min || 0);
    });

  return applicable[0]?.offer || null;
}
