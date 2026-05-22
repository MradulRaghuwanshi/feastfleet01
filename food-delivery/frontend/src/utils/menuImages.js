import { apiUrl } from './apiConfig';

const IMAGE_BY_KEYWORD = [
  ['mango', 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=500&auto=format&fit=crop&q=72'],
  ['banana', 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=500&auto=format&fit=crop&q=72'],
  ['papaya', 'https://images.unsplash.com/photo-1617112848923-cc2234396a8d?w=500&auto=format&fit=crop&q=72'],
  ['pineapple', 'https://images.unsplash.com/photo-1589820296156-2454bb8a6ad1?w=500&auto=format&fit=crop&q=72'],
  ['strawberry', 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=500&auto=format&fit=crop&q=72'],
  ['chocolate', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=72'],
  ['oreo', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=72'],
  ['kit kat', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=72'],
  ['vanilla', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=72'],
  ['black currant', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop&q=72'],
  ['butterscotch', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop&q=72'],
  ['litchi', 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=500&auto=format&fit=crop&q=72'],
  ['mosambi', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500&auto=format&fit=crop&q=72'],
  ['apple juice', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500&auto=format&fit=crop&q=72'],
  ['beetroot', 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=72'],
  ['watermelon', 'https://images.unsplash.com/photo-1526841535632-ef3be0b2f4d8?w=500&auto=format&fit=crop&q=72'],
  ['cold coffee', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&auto=format&fit=crop&q=72'],
  ['lime', 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=500&auto=format&fit=crop&q=72'],
  ['dry fruits', 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=500&auto=format&fit=crop&q=72'],
  ['fruit salad', 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=500&auto=format&fit=crop&q=72'],
  ['maggi', 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=500&auto=format&fit=crop&q=72'],
  ['noodles', 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=72'],
  ['roll', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=72'],
  ['fries', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=72'],
  ['omelette', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=72'],
  ['egg bhurji', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=72'],
  ['boiled egg', 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=500&auto=format&fit=crop&q=72'],
  ['burger', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=72'],
  ['salad', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=72'],
  ['sandwich', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=72'],
  ['tandoori chicken', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=72'],
  ['al faham', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=72'],
  ['chicken tikka', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=72'],
  ['malai tikka', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=72'],
  ['fried chicken', 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500&auto=format&fit=crop&q=72'],
  ['chilli paneer', 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=72'],
  ['paneer 65', 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=72'],
  ['biryani', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=72'],
  ['mandi', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=72'],
  ['butter chicken', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=72'],
  ['roti', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=72'],
  ['naan', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=72'],
  ['fried rice', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=72'],
  ['thali', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=72'],
  ['egg curry', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&auto=format&fit=crop&q=72'],
  ['mutton', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=72'],
  ['shahi paneer', 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=72'],
  ['paneer', 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=72'],
];

const IMAGE_BY_CATEGORY = {
  shakes: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=72',
  juices: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500&auto=format&fit=crop&q=72',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=72',
  burgers: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=72',
  rolls: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=500&auto=format&fit=crop&q=72',
  sandwich: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=72',
  biryani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=72',
  starters: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=72',
  maggi: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=500&auto=format&fit=crop&q=72',
  noodles: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=72',
  salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=72',
};

export const resolveMenuItemImage = (item = {}) => {
  if (item.image) return item.image;
  const text = `${item.name || ''} ${item.category || ''}`.toLowerCase();
  const match = IMAGE_BY_KEYWORD.find(([keyword]) => text.includes(keyword));
  if (match) return match[1];
  return IMAGE_BY_CATEGORY[String(item.category || '').toLowerCase()] || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=72';
};

export const withMenuItemImage = (item = {}) => ({
  ...item,
  image: resolveMenuItemImage(item),
});

export const fetchMenuItemImage = async (item = {}) => {
  const name = String(item.name || '').trim();
  if (!name) return resolveMenuItemImage(item);

  const params = new URLSearchParams({
    name,
    category: item.category || '',
  });

  try {
    const response = await fetch(apiUrl(`/menu-images/resolve?${params.toString()}`), {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Image lookup failed with status ${response.status}`);
    const data = await response.json();
    return data.image || resolveMenuItemImage({ ...item, image: '' });
  } catch (error) {
    console.warn('Menu image lookup failed:', error);
    return resolveMenuItemImage({ ...item, image: '' });
  }
};
