const { db } = require('./admin');

if (!db) {
  console.error('Firebase not configured. Add serviceAccountKey.json first.');
  process.exit(1);
}

const now = Date.now();

const orders = [
  {
    id: 'ord-001',
    customerId: 'u1',
    customerName: 'Priya Sharma',
    restaurantId: 'r1',
    restaurantName: 'Spice Garden',
    deliveryAgentId: 'u5',
    deliveryAgentName: 'Arjun Patel',
    items: [
      {
        id: 'r1-1',
        name: 'Butter Chicken',
        price: 299,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=300',
      },
      {
        id: 'r1-5',
        name: 'Garlic Naan',
        price: 59,
        quantity: 2,
        image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300',
      },
    ],
    subtotal: 417,
    deliveryFee: 29,
    discount: 0,
    walletUsed: 0,
    total: 446,
    promoCode: null,
    deliveryAddress: 'Flat 4B, Sunrise Apartments, Andheri West, Mumbai - 400058',
    deliveryLat: 19.1197,
    deliveryLng: 72.8468,
    status: 'Delivered',
    reviewed: true,
    placedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    statusHistory: [
      { status: 'Placed', time: new Date(now - 120 * 60 * 1000).toISOString() },
      { status: 'Confirmed', time: new Date(now - 115 * 60 * 1000).toISOString() },
      { status: 'Preparing', time: new Date(now - 108 * 60 * 1000).toISOString() },
      { status: 'Out for Delivery', time: new Date(now - 95 * 60 * 1000).toISOString() },
      { status: 'Delivered', time: new Date(now - 80 * 60 * 1000).toISOString() },
    ],
  },
  {
    id: 'ord-002',
    customerId: 'u1',
    customerName: 'Priya Sharma',
    restaurantId: 'r3',
    restaurantName: 'Biryani House',
    deliveryAgentId: 'u6',
    deliveryAgentName: 'Sneha Nair',
    items: [
      {
        id: 'r3-2',
        name: 'Chicken Dum Biryani',
        price: 329,
        quantity: 2,
        image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=300',
      },
    ],
    subtotal: 658,
    deliveryFee: 39,
    discount: 100,
    walletUsed: 0,
    total: 597,
    promoCode: 'FLAT100',
    deliveryAddress: 'Flat 4B, Sunrise Apartments, Andheri West, Mumbai - 400058',
    deliveryLat: 19.1197,
    deliveryLng: 72.8468,
    status: 'Out for Delivery',
    reviewed: false,
    placedAt: new Date(now - 35 * 60 * 1000).toISOString(),
    statusHistory: [
      { status: 'Placed', time: new Date(now - 35 * 60 * 1000).toISOString() },
      { status: 'Confirmed', time: new Date(now - 32 * 60 * 1000).toISOString() },
      { status: 'Preparing', time: new Date(now - 25 * 60 * 1000).toISOString() },
      { status: 'Out for Delivery', time: new Date(now - 10 * 60 * 1000).toISOString() },
    ],
  },
];

async function restoreOrders() {
  const batch = db.batch();

  for (const order of orders) {
    const { id, ...data } = order;
    batch.set(db.collection('orders').doc(id), data);
  }

  await batch.commit();
  console.log(`Restored ${orders.length} orders.`);
}

restoreOrders()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Failed to restore orders:', error.message);
    process.exit(1);
  });
