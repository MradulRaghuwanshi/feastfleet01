const NON_VEG_WORDS = /\b(chicken|mutton|fish|prawn|egg|beef|pork|meat|non[-\s]?veg)\b/i;
const VEG_WORDS = /\b(veg|vegetarian|paneer|dal|salad|juice|fruit|chaat|dosa|idli|roti|naan|paratha|samosa|coffee|lassi)\b/i;

export const isVegItem = (item = {}) => {
  if (item.isVeg === true || item.veg === true) return true;
  if (item.isVeg === false || item.veg === false) return false;

  const text = `${item.name || ''} ${item.category || ''} ${item.description || ''}`;
  if (NON_VEG_WORDS.test(text)) return false;
  return VEG_WORDS.test(text);
};

export const hasVegItems = (items = []) => items.some(isVegItem);
