const NON_VEG_WORDS = /\b(chicken|mutton|fish|prawn|egg|beef|pork|meat|non[-\s]?veg)\b/i;

export const isVegItem = (item = {}) => {
  if (item.isVeg === true || item.veg === true) return true;
  if (item.isVeg === false || item.veg === false) return false;

  const text = `${item.name || ''} ${item.category || ''} ${item.description || ''}`;
  if (NON_VEG_WORDS.test(text)) return false;
  return true;
};

export const hasVegItems = (items = []) => items.some(isVegItem);
