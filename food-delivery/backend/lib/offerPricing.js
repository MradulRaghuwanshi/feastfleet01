const OFFERS = [
  { type: 'flat', disc: 50, min: 200, active: true, newUserOnly: false },
  { type: 'flat', disc: 20, min: 199, active: true, newUserOnly: true },
];

const roundMoney = (value) => Math.round(Number(value || 0));

function getEligibleOffers(isNewUser = false) {
  return OFFERS.filter((offer) => {
    if (!offer.active) return false;
    if (offer.newUserOnly && !isNewUser) return false;
    return true;
  });
}

function getOfferFactor(offer) {
  if (!offer) return 1;
  if (offer.type === 'flat') {
    const min = Number(offer.min || 0);
    const disc = Number(offer.disc || 0);
    return min > 0 && disc > 0 ? (min + disc) / min : 1;
  }
  if (offer.type === 'percent') {
    const percent = Number(offer.disc || 0);
    return percent > 0 && percent < 100 ? 1 / (1 - percent / 100) : 1;
  }
  return 1;
}

function getInflationFactor(isNewUser = false) {
  return getEligibleOffers(isNewUser).reduce((max, offer) => Math.max(max, getOfferFactor(offer)), 1);
}

function getInflatedPrice(price, isNewUser = false) {
  return Math.ceil(Number(price || 0) * getInflationFactor(isNewUser));
}

function applyOffer(offer, cartTotal) {
  if (!offer) return 0;
  const total = roundMoney(cartTotal);
  if (total < Number(offer.min || 0)) return 0;
  if (offer.type === 'flat') return roundMoney(offer.disc);
  if (offer.type === 'percent') return roundMoney((total * Number(offer.disc || 0)) / 100);
  return 0;
}

function getBestOffer(cartTotal, isNewUser = false) {
  return getEligibleOffers(isNewUser)
    .map(offer => ({ offer, discount: applyOffer(offer, cartTotal) }))
    .filter(entry => entry.discount > 0)
    .sort((a, b) => b.discount - a.discount || Number(b.offer.min || 0) - Number(a.offer.min || 0))[0]?.offer || null;
}

module.exports = {
  getInflatedPrice,
  applyOffer,
  getBestOffer,
};
