// ─── Sample Users ─────────────────────────────────────────────────────────────
const users = [
  { id: 'u1', name: 'Priya Sharma',      email: 'customer@demo.com',  password: 'password123', role: 'customer',   phone: '+91 98765 43210', avatar: '👩', wallet: 150.00, favourites: ['r1','r3'] },
  { id: 'u2', name: 'Rahul Verma',       email: 'customer2@demo.com', password: 'password123', role: 'customer',   phone: '+91 91234 56789', avatar: '👨', wallet: 75.00,  favourites: ['r2'] },
  { id: 'u3', name: 'Spice Garden HQ',   email: 'owner@demo.com',     password: 'password123', role: 'restaurant', restaurantId: 'r1', avatar: '🍛', wallet: 0, favourites: [] },
  { id: 'u4', name: 'Burger Junction HQ',email: 'owner2@demo.com',    password: 'password123', role: 'restaurant', restaurantId: 'r2', avatar: '🍔', wallet: 0, favourites: [] },
  { id: 'u5', name: 'Arjun Patel',       email: 'delivery@demo.com',  password: 'password123', role: 'delivery',   phone: '+91 99887 76655', avatar: '🚴', vehicle: 'Bike MH-12 AB 1234', wallet: 0, favourites: [] },
  { id: 'u6', name: 'Sneha Nair',        email: 'delivery2@demo.com', password: 'password123', role: 'delivery',   phone: '+91 88776 65544', avatar: '🛵', vehicle: 'Scooter KA-01 CD 5678', wallet: 0, favourites: [] },
];

// ─── Promo Codes ──────────────────────────────────────────────────────────────
const promoCodes = [
  { code: 'WELCOME50', type: 'percent', value: 50,  minOrder: 0,   description: '50% off your first order (up to ₹100)', active: true },
  { code: 'FLAT100',   type: 'flat',    value: 100, minOrder: 299, description: '₹100 off on orders above ₹299', active: true },
  { code: 'FREEDEL',   type: 'delivery',value: 0,   minOrder: 199, description: 'Free delivery on orders above ₹199', active: true },
  { code: 'SAVE20',    type: 'percent', value: 20,  minOrder: 149, description: '20% off on orders above ₹149', active: true },
];

// ─── Reviews ──────────────────────────────────────────────────────────────────
const reviews = [
  { id: 'rev-001', restaurantId: 'r1', userId: 'u2', userName: 'Rahul Verma',   avatar: '👨', rating: 5, comment: 'Best butter chicken in Mumbai! Dal makhani was absolutely divine.', createdAt: new Date(Date.now() - 3*24*60*60*1000).toISOString(), ownerReply: 'Shukriya Rahul bhai! Aate rehna 🙏', orderId: null },
  { id: 'rev-002', restaurantId: 'r1', userId: 'u1', userName: 'Priya Sharma',  avatar: '👩', rating: 4, comment: 'Paneer tikka was amazing. Delivery was slightly late but food was hot.', createdAt: new Date(Date.now() - 1*24*60*60*1000).toISOString(), ownerReply: null, orderId: 'ord-001' },
  { id: 'rev-003', restaurantId: 'r2', userId: 'u1', userName: 'Priya Sharma',  avatar: '👩', rating: 4, comment: 'Vada pav burger is a genius idea! Crispy and filling.', createdAt: new Date(Date.now() - 5*24*60*60*1000).toISOString(), ownerReply: 'Thank you Priya ji! 😊', orderId: null },
  { id: 'rev-004', restaurantId: 'r3', userId: 'u2', userName: 'Rahul Verma',   avatar: '👨', rating: 5, comment: 'Hyderabadi biryani is the real deal. Dum cooked to perfection!', createdAt: new Date(Date.now() - 2*24*60*60*1000).toISOString(), ownerReply: null, orderId: null },
  { id: 'rev-005', restaurantId: 'r4', userId: 'u1', userName: 'Priya Sharma',  avatar: '👩', rating: 3, comment: 'Dosa was good but chutney could be better. Will try again.', createdAt: new Date(Date.now() - 7*24*60*60*1000).toISOString(), ownerReply: null, orderId: null },
];

// ─── Restaurants ──────────────────────────────────────────────────────────────
const restaurants = [
  {
    id: 'r1', ownerId: 'u3',
    name: 'Spice Garden', cuisine: 'North Indian', rating: 4.5, reviewCount: 2,
    deliveryTime: '30-45 min', hasOwnDelivery: true, deliveryFee: 0, minOrder: 149,
    address: 'Shop 12, Linking Road, Bandra West, Mumbai - 400050',
    lat: 19.0596, lng: 72.8295,
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600',
    isOpen: true, isFeatured: true,
    tags: ['Best Seller', 'Top Rated'],
    offer: '50% off up to ₹100 on first order',
    menu: [
      { id: 'r1-1', name: 'Butter Chicken',      description: 'Tender chicken in rich tomato-cream gravy',    price: 299, image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=300', category: 'Main Course', available: true,  isPopular: true  },
      { id: 'r1-2', name: 'Dal Makhani',          description: 'Slow-cooked black lentils in buttery gravy',   price: 199, image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300', category: 'Main Course', available: true,  isPopular: true  },
      { id: 'r1-3', name: 'Paneer Tikka',         description: 'Tandoor-grilled cottage cheese with spices',   price: 249, image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=300', category: 'Starters',    available: true,  isPopular: true  },
      { id: 'r1-4', name: 'Chicken Biryani',      description: 'Fragrant basmati rice with spiced chicken',    price: 329, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300', category: 'Biryani',     available: true,  isPopular: true  },
      { id: 'r1-5', name: 'Garlic Naan',          description: 'Soft tandoor bread with garlic butter',        price: 59,  image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300', category: 'Breads',      available: true,  isPopular: false },
      { id: 'r1-6', name: 'Gulab Jamun (2 pcs)',  description: 'Soft milk dumplings in rose sugar syrup',      price: 79,  image: 'https://images.unsplash.com/photo-1666195966573-f8e5e5e5e5e5?w=300', category: 'Desserts',    available: true,  isPopular: false },
      { id: 'r1-7', name: 'Lassi (Sweet)',         description: 'Chilled thick yogurt drink',                  price: 69,  image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=300', category: 'Drinks',      available: true,  isPopular: false },
    ]
  },
  {
    id: 'r2', ownerId: 'u4',
    name: 'Burger Junction', cuisine: 'Fast Food', rating: 4.3, reviewCount: 1,
    deliveryTime: '20-30 min', hasOwnDelivery: true, deliveryFee: 0, minOrder: 99,
    address: '45 MG Road, Koramangala, Bengaluru - 560034',
    lat: 12.9352, lng: 77.6245,
    image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600',
    isOpen: true, isFeatured: true,
    tags: ['Fast Delivery', 'Trending'],
    offer: 'Free fries on orders above ₹299',
    menu: [
      { id: 'r2-1', name: 'Vada Pav Burger',      description: 'Mumbai-style spicy potato patty burger',       price: 99,  image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300', category: 'Burgers', available: true, isPopular: true  },
      { id: 'r2-2', name: 'Chicken Maharaja',      description: 'Double chicken patty with mint chutney',       price: 179, image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=300', category: 'Burgers', available: true, isPopular: true  },
      { id: 'r2-3', name: 'Paneer Tikka Burger',   description: 'Grilled paneer with tandoori mayo',            price: 149, image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=300', category: 'Burgers', available: true, isPopular: false },
      { id: 'r2-4', name: 'Masala Fries',          description: 'Crispy fries with chaat masala',               price: 79,  image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300', category: 'Sides',   available: true, isPopular: true  },
      { id: 'r2-5', name: 'Samosa (2 pcs)',        description: 'Crispy fried pastry with spiced potato',       price: 49,  image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300', category: 'Sides',   available: true, isPopular: false },
      { id: 'r2-6', name: 'Cold Coffee',           description: 'Thick blended cold coffee with ice cream',     price: 99,  image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=300', category: 'Drinks',  available: true, isPopular: false },
    ]
  },
  {
    id: 'r3', ownerId: null,
    name: 'Biryani House', cuisine: 'Hyderabadi', rating: 4.7, reviewCount: 2,
    deliveryTime: '35-50 min', hasOwnDelivery: false, deliveryFee: 39, minOrder: 199,
    address: '7 Nampally Station Road, Hyderabad - 500001',
    lat: 17.3850, lng: 78.4867,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600',
    isOpen: true, isFeatured: false,
    tags: ['Top Rated', 'Dum Cooked'],
    offer: null,
    menu: [
      { id: 'r3-1', name: 'Hyderabadi Dum Biryani',description: 'Authentic dum-cooked mutton biryani',          price: 399, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300', category: 'Biryani',  available: true, isPopular: true  },
      { id: 'r3-2', name: 'Chicken Dum Biryani',   description: 'Tender chicken layered with saffron rice',     price: 329, image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=300', category: 'Biryani',  available: true, isPopular: true  },
      { id: 'r3-3', name: 'Veg Biryani',           description: 'Mixed vegetables in aromatic basmati rice',    price: 249, image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=300', category: 'Biryani',  available: true, isPopular: false },
      { id: 'r3-4', name: 'Mirchi Ka Salan',       description: 'Spicy green chilli curry, biryani side',       price: 99,  image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300', category: 'Sides',    available: true, isPopular: false },
      { id: 'r3-5', name: 'Double Ka Meetha',      description: 'Hyderabadi bread pudding dessert',             price: 119, image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=300', category: 'Desserts', available: true, isPopular: false },
    ]
  },
  {
    id: 'r4', ownerId: null,
    name: 'South Tiffin', cuisine: 'South Indian', rating: 4.4, reviewCount: 1,
    deliveryTime: '20-35 min', hasOwnDelivery: false, deliveryFee: 25, minOrder: 99,
    address: '22 Anna Salai, T. Nagar, Chennai - 600017',
    lat: 13.0827, lng: 80.2707,
    image: 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=600',
    isOpen: true, isFeatured: false,
    tags: ['Budget Friendly', 'Pure Veg'],
    offer: 'Combo meals starting ₹99',
    menu: [
      { id: 'r4-1', name: 'Masala Dosa',           description: 'Crispy dosa with spiced potato filling',       price: 89,  image: 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=300', category: 'Dosas',    available: true, isPopular: true  },
      { id: 'r4-2', name: 'Idli Sambar (4 pcs)',   description: 'Steamed rice cakes with lentil soup',          price: 69,  image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300', category: 'Tiffin',   available: true, isPopular: true  },
      { id: 'r4-3', name: 'Medu Vada (2 pcs)',     description: 'Crispy lentil donuts with coconut chutney',    price: 59,  image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300', category: 'Tiffin',   available: true, isPopular: false },
      { id: 'r4-4', name: 'Uttapam',               description: 'Thick rice pancake with onion & tomato',       price: 99,  image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300', category: 'Dosas',    available: true, isPopular: false },
      { id: 'r4-5', name: 'Filter Coffee',         description: 'Strong South Indian decoction coffee',         price: 39,  image: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=300', category: 'Drinks',   available: true, isPopular: true  },
    ]
  },
  {
    id: 'r5', ownerId: null,
    name: 'Chaat Corner', cuisine: 'Street Food', rating: 4.6, reviewCount: 0,
    deliveryTime: '15-25 min', hasOwnDelivery: false, deliveryFee: 15, minOrder: 79,
    address: '3 Chandni Chowk Lane, Old Delhi - 110006',
    lat: 28.6562, lng: 77.2310,
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600',
    isOpen: true, isFeatured: false,
    tags: ['Street Food', 'Spicy'],
    offer: '₹30 off on orders above ₹199',
    menu: [
      { id: 'r5-1', name: 'Pani Puri (8 pcs)',     description: 'Crispy puris with tangy tamarind water',       price: 79,  image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300', category: 'Chaat',    available: true, isPopular: true  },
      { id: 'r5-2', name: 'Bhel Puri',             description: 'Puffed rice with chutneys and sev',            price: 69,  image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300', category: 'Chaat',    available: true, isPopular: true  },
      { id: 'r5-3', name: 'Aloo Tikki Chaat',      description: 'Crispy potato patties with yogurt & chutney',  price: 89,  image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=300', category: 'Chaat',    available: true, isPopular: false },
      { id: 'r5-4', name: 'Raj Kachori',           description: 'Giant puri stuffed with chaat fillings',       price: 99,  image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300', category: 'Chaat',    available: true, isPopular: false },
      { id: 'r5-5', name: 'Kulfi Falooda',         description: 'Rose falooda with pistachio kulfi',            price: 119, image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=300', category: 'Desserts', available: true, isPopular: false },
    ]
  },
  {
    id: 'r6', ownerId: null,
    name: 'Punjab Da Dhaba', cuisine: 'Punjabi', rating: 4.3, reviewCount: 0,
    deliveryTime: '30-40 min', hasOwnDelivery: false, deliveryFee: 29, minOrder: 149,
    address: 'GT Road, Sector 17, Chandigarh - 160017',
    lat: 30.7333, lng: 76.7794,
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600',
    isOpen: false, isFeatured: false,
    tags: ['Dhaba Style', 'Comfort Food'],
    offer: null,
    menu: [
      { id: 'r6-1', name: 'Sarson Da Saag',        description: 'Mustard greens with makki di roti',            price: 199, image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300', category: 'Main Course', available: true, isPopular: true  },
      { id: 'r6-2', name: 'Amritsari Kulcha',      description: 'Stuffed bread with chole masala',              price: 149, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300', category: 'Breads',      available: true, isPopular: true  },
      { id: 'r6-3', name: 'Lassi (Punjabi)',        description: 'Thick creamy yogurt drink in matka',           price: 89,  image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=300', category: 'Drinks',      available: true, isPopular: false },
      { id: 'r6-4', name: 'Pinni',                 description: 'Traditional wheat flour & jaggery sweet',      price: 99,  image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=300', category: 'Desserts',    available: true, isPopular: false },
    ]
  }
];

// ─── Pre-seeded Orders ────────────────────────────────────────────────────────
const orders = [
  {
    id: 'ord-001',
    customerId: 'u1', customerName: 'Priya Sharma',
    restaurantId: 'r1', restaurantName: 'Spice Garden',
    deliveryAgentId: 'u5', deliveryAgentName: 'Arjun Patel',
    items: [
      { id: 'r1-1', name: 'Butter Chicken', price: 299, quantity: 1, image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=300' },
      { id: 'r1-5', name: 'Garlic Naan',    price: 59,  quantity: 2, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300' },
    ],
    subtotal: 417, deliveryFee: 29, discount: 0, walletUsed: 0, total: 446,
    promoCode: null, deliveryAddress: 'Flat 4B, Sunrise Apartments, Andheri West, Mumbai - 400058',
    status: 'Delivered', reviewed: true,
    deliveryOtp: '1234',
    deliveryLat: 19.1197, deliveryLng: 72.8468,
    placedAt: new Date(Date.now() - 2*60*60*1000).toISOString(),
    statusHistory: [
      { status: 'Placed',           time: new Date(Date.now() - 120*60*1000).toISOString() },
      { status: 'Confirmed',        time: new Date(Date.now() - 115*60*1000).toISOString() },
      { status: 'Preparing',        time: new Date(Date.now() - 108*60*1000).toISOString() },
      { status: 'Out for Delivery', time: new Date(Date.now() -  95*60*1000).toISOString() },
      { status: 'Delivered',        time: new Date(Date.now() -  80*60*1000).toISOString() },
    ]
  },
  {
    id: 'ord-002',
    customerId: 'u1', customerName: 'Priya Sharma',
    restaurantId: 'r3', restaurantName: 'Biryani House',
    deliveryAgentId: 'u6', deliveryAgentName: 'Sneha Nair',
    items: [
      { id: 'r3-2', name: 'Chicken Dum Biryani', price: 329, quantity: 2, image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=300' },
    ],
    subtotal: 658, deliveryFee: 39, discount: 100, walletUsed: 0, total: 597,
    promoCode: 'FLAT100', deliveryAddress: 'Flat 4B, Sunrise Apartments, Andheri West, Mumbai - 400058',
    status: 'Out for Delivery', deliveryOtp: '5678',
    reviewed: false,
    deliveryLat: 19.1197, deliveryLng: 72.8468,
    placedAt: new Date(Date.now() - 35*60*1000).toISOString(),
    statusHistory: [
      { status: 'Placed',           time: new Date(Date.now() - 35*60*1000).toISOString() },
      { status: 'Confirmed',        time: new Date(Date.now() - 32*60*1000).toISOString() },
      { status: 'Preparing',        time: new Date(Date.now() - 25*60*1000).toISOString() },
      { status: 'Out for Delivery', time: new Date(Date.now() - 10*60*1000).toISOString() },
    ]
  }
];

module.exports = { users, restaurants, orders, reviews, promoCodes };
