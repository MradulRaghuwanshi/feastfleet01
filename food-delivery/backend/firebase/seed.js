/**
 * Full database seed — run once:
 *   node food-delivery/backend/firebase/seed.js
 *
 * Creates:
 *   Firebase Auth  → 6 users with email/password
 *   Firestore      → users, restaurants (+ menu subcollection),
 *                    orders, reviews, promoCodes, loginCredentials
 */
const { db, authAdmin } = require('./admin');

if (!db) {
  console.error('❌ Firebase not configured. Add serviceAccountKey.json first.');
  process.exit(1);
}

// ─── Raw data ─────────────────────────────────────────────────────────────────
const USERS = [
  { id: 'u1', name: 'Priya Sharma',       email: 'customer@demo.com',  password: 'password123', role: 'customer',   phone: '+91 98765 43210', avatar: '👩', wallet: 150, feastCoins: 150, favourites: ['r1','r3'] },
  { id: 'u2', name: 'Rahul Verma',        email: 'customer2@demo.com', password: 'password123', role: 'customer',   phone: '+91 91234 56789', avatar: '👨', wallet: 75,  feastCoins: 75, favourites: ['r2'] },
  { id: 'u3', name: 'Spice Garden HQ',    email: 'owner@demo.com',     password: 'password123', role: 'restaurant', restaurantId: 'r1',       avatar: '🍛', wallet: 0,   favourites: [] },
  { id: 'u4', name: 'Burger Junction HQ', email: 'owner2@demo.com',    password: 'password123', role: 'restaurant', restaurantId: 'r2',       avatar: '🍔', wallet: 0,   favourites: [] },
  { id: 'u5', name: 'Arjun Patel',        email: 'delivery@demo.com',  password: 'password123', role: 'delivery',   phone: '+91 99887 76655', avatar: '🚴', vehicle: 'Bike MH-12 AB 1234', wallet: 0, favourites: [] },
  { id: 'u6', name: 'Sneha Nair',         email: 'delivery2@demo.com', password: 'password123', role: 'delivery',   phone: '+91 88776 65544', avatar: '🛵', vehicle: 'Scooter KA-01 CD 5678', wallet: 0, favourites: [] },
  { id: 'admin1', name: 'Admin',          email: 'admin@fooddash.in',  password: 'admin@123',   role: 'admin',      phone: '+91 90000 00001', avatar: '👑', wallet: 0,   favourites: [] },
];

const PROMOS = [
  { code: 'WELCOME50', type: 'percent', value: 50,  minOrder: 0,   description: '50% off your first order (up to ₹100)', active: true },
  { code: 'FLAT100',   type: 'flat',    value: 100, minOrder: 299, description: '₹100 off on orders above ₹299', active: true },
  { code: 'FREEDEL',   type: 'delivery',value: 0,   minOrder: 199, description: 'Free delivery on orders above ₹199', active: true },
  { code: 'SAVE20',    type: 'percent', value: 20,  minOrder: 149, description: '20% off on orders above ₹149', active: true },
];

const RESTAURANTS = [
  {
    id: 'r1', ownerId: 'u3', name: 'Spice Garden', cuisine: 'North Indian',
    rating: 4.5, reviewCount: 2, deliveryTime: '30-45 min', hasOwnDelivery: true, deliveryFee: 0,
    minOrder: 149, address: 'Shop 12, Linking Road, Bandra West, Mumbai - 400050',
    lat: 19.0596, lng: 72.8295,
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600',
    isOpen: true, isFeatured: true, tags: ['Best Seller','Top Rated'],
    offer: '50% off up to ₹100 on first order',
    menu: [
      { id:'r1-1', name:'Butter Chicken',     description:'Tender chicken in rich tomato-cream gravy',  price:299, category:'Main Course', available:true, isPopular:true,  image:'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=300' },
      { id:'r1-2', name:'Dal Makhani',        description:'Slow-cooked black lentils in buttery gravy', price:199, category:'Main Course', available:true, isPopular:true,  image:'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300' },
      { id:'r1-3', name:'Paneer Tikka',       description:'Tandoor-grilled cottage cheese with spices', price:249, category:'Starters',    available:true, isPopular:true,  image:'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=300' },
      { id:'r1-4', name:'Chicken Biryani',    description:'Fragrant basmati rice with spiced chicken',  price:329, category:'Biryani',     available:true, isPopular:true,  image:'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300' },
      { id:'r1-5', name:'Garlic Naan',        description:'Soft tandoor bread with garlic butter',      price:59,  category:'Breads',      available:true, isPopular:false, image:'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300' },
      { id:'r1-6', name:'Gulab Jamun (2pcs)', description:'Soft milk dumplings in rose sugar syrup',    price:79,  category:'Desserts',    available:true, isPopular:false, image:'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=300' },
      { id:'r1-7', name:'Lassi (Sweet)',      description:'Chilled thick yogurt drink',                 price:69,  category:'Drinks',      available:true, isPopular:false, image:'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=300' },
    ]
  },
  {
    id: 'r2', ownerId: 'u4', name: 'Burger Junction', cuisine: 'Fast Food',
    rating: 4.3, reviewCount: 1, deliveryTime: '20-30 min', hasOwnDelivery: true, deliveryFee: 0,
    minOrder: 99, address: '45 MG Road, Koramangala, Bengaluru - 560034',
    lat: 12.9352, lng: 77.6245,
    image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600',
    isOpen: true, isFeatured: true, tags: ['Fast Delivery','Trending'],
    offer: 'Free fries on orders above ₹299',
    menu: [
      { id:'r2-1', name:'Vada Pav Burger',    description:'Mumbai-style spicy potato patty burger',    price:99,  category:'Burgers', available:true, isPopular:true,  image:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300' },
      { id:'r2-2', name:'Chicken Maharaja',   description:'Double chicken patty with mint chutney',    price:179, category:'Burgers', available:true, isPopular:true,  image:'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=300' },
      { id:'r2-3', name:'Paneer Tikka Burger',description:'Grilled paneer with tandoori mayo',         price:149, category:'Burgers', available:true, isPopular:false, image:'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=300' },
      { id:'r2-4', name:'Masala Fries',       description:'Crispy fries with chaat masala',            price:79,  category:'Sides',   available:true, isPopular:true,  image:'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300' },
      { id:'r2-5', name:'Samosa (2pcs)',      description:'Crispy fried pastry with spiced potato',    price:49,  category:'Sides',   available:true, isPopular:false, image:'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300' },
      { id:'r2-6', name:'Cold Coffee',        description:'Thick blended cold coffee with ice cream',  price:99,  category:'Drinks',  available:true, isPopular:false, image:'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=300' },
    ]
  },
  {
    id: 'r3', ownerId: null, name: 'Biryani House', cuisine: 'Hyderabadi',
    rating: 4.7, reviewCount: 2, deliveryTime: '35-50 min', hasOwnDelivery: false, deliveryFee: 39,
    minOrder: 199, address: '7 Nampally Station Road, Hyderabad - 500001',
    lat: 17.3850, lng: 78.4867,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600',
    isOpen: true, isFeatured: false, tags: ['Top Rated','Dum Cooked'], offer: null,
    menu: [
      { id:'r3-1', name:'Hyderabadi Dum Biryani', description:'Authentic dum-cooked mutton biryani',        price:399, category:'Biryani',  available:true, isPopular:true,  image:'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300' },
      { id:'r3-2', name:'Chicken Dum Biryani',    description:'Tender chicken layered with saffron rice',   price:329, category:'Biryani',  available:true, isPopular:true,  image:'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=300' },
      { id:'r3-3', name:'Veg Biryani',            description:'Mixed vegetables in aromatic basmati rice',  price:249, category:'Biryani',  available:true, isPopular:false, image:'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=300' },
      { id:'r3-4', name:'Mirchi Ka Salan',        description:'Spicy green chilli curry, biryani side',     price:99,  category:'Sides',    available:true, isPopular:false, image:'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300' },
      { id:'r3-5', name:'Double Ka Meetha',       description:'Hyderabadi bread pudding dessert',           price:119, category:'Desserts', available:true, isPopular:false, image:'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=300' },
    ]
  },
  {
    id: 'r4', ownerId: null, name: 'South Tiffin', cuisine: 'South Indian',
    rating: 4.4, reviewCount: 1, deliveryTime: '20-35 min', hasOwnDelivery: false, deliveryFee: 25,
    minOrder: 99, address: '22 Anna Salai, T. Nagar, Chennai - 600017',
    lat: 13.0827, lng: 80.2707,
    image: 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=600',
    isOpen: true, isFeatured: false, tags: ['Budget Friendly','Pure Veg'],
    offer: 'Combo meals starting ₹99',
    menu: [
      { id:'r4-1', name:'Masala Dosa',        description:'Crispy dosa with spiced potato filling',    price:89, category:'Dosas',  available:true, isPopular:true,  image:'https://images.unsplash.com/photo-1630383249896-424e482df921?w=300' },
      { id:'r4-2', name:'Idli Sambar (4pcs)', description:'Steamed rice cakes with lentil soup',       price:69, category:'Tiffin', available:true, isPopular:true,  image:'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300' },
      { id:'r4-3', name:'Medu Vada (2pcs)',   description:'Crispy lentil donuts with coconut chutney', price:59, category:'Tiffin', available:true, isPopular:false, image:'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300' },
      { id:'r4-4', name:'Uttapam',            description:'Thick rice pancake with onion & tomato',    price:99, category:'Dosas',  available:true, isPopular:false, image:'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300' },
      { id:'r4-5', name:'Filter Coffee',      description:'Strong South Indian decoction coffee',      price:39, category:'Drinks', available:true, isPopular:true,  image:'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=300' },
    ]
  },
  {
    id: 'r5', ownerId: null, name: 'Chaat Corner', cuisine: 'Street Food',
    rating: 4.6, reviewCount: 0, deliveryTime: '15-25 min', hasOwnDelivery: false, deliveryFee: 15,
    minOrder: 79, address: '3 Chandni Chowk Lane, Old Delhi - 110006',
    lat: 28.6562, lng: 77.2310,
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600',
    isOpen: true, isFeatured: false, tags: ['Street Food','Spicy'],
    offer: '₹30 off on orders above ₹199',
    menu: [
      { id:'r5-1', name:'Pani Puri (8pcs)',  description:'Crispy puris with tangy tamarind water',      price:79,  category:'Chaat',    available:true, isPopular:true,  image:'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300' },
      { id:'r5-2', name:'Bhel Puri',         description:'Puffed rice with chutneys and sev',           price:69,  category:'Chaat',    available:true, isPopular:true,  image:'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300' },
      { id:'r5-3', name:'Aloo Tikki Chaat',  description:'Crispy potato patties with yogurt & chutney', price:89,  category:'Chaat',    available:true, isPopular:false, image:'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=300' },
      { id:'r5-4', name:'Raj Kachori',       description:'Giant puri stuffed with chaat fillings',      price:99,  category:'Chaat',    available:true, isPopular:false, image:'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300' },
      { id:'r5-5', name:'Kulfi Falooda',     description:'Rose falooda with pistachio kulfi',           price:119, category:'Desserts', available:true, isPopular:false, image:'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=300' },
    ]
  },
];

const REVIEWS = [
  { id:'rev-001', restaurantId:'r1', userId:'u2', userName:'Rahul Verma',  avatar:'👨', rating:5, comment:'Best butter chicken in Mumbai! Dal makhani was absolutely divine.', ownerReply:'Shukriya Rahul bhai! Aate rehna 🙏', orderId:null },
  { id:'rev-002', restaurantId:'r1', userId:'u1', userName:'Priya Sharma', avatar:'👩', rating:4, comment:'Paneer tikka was amazing. Delivery was slightly late but food was hot.', ownerReply:null, orderId:'ord-001' },
  { id:'rev-003', restaurantId:'r2', userId:'u1', userName:'Priya Sharma', avatar:'👩', rating:4, comment:'Vada pav burger is a genius idea! Crispy and filling.', ownerReply:'Thank you Priya ji! 😊', orderId:null },
  { id:'rev-004', restaurantId:'r3', userId:'u2', userName:'Rahul Verma',  avatar:'👨', rating:5, comment:'Hyderabadi biryani is the real deal. Dum cooked to perfection!', ownerReply:null, orderId:null },
];

const ORDERS = [
  {
    id:'ord-001', customerId:'u1', customerName:'Priya Sharma',
    restaurantId:'r1', restaurantName:'Spice Garden',
    deliveryAgentId:'u5', deliveryAgentName:'Arjun Patel',
    items:[
      { id:'r1-1', name:'Butter Chicken', price:299, quantity:1, image:'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=300' },
      { id:'r1-5', name:'Garlic Naan',    price:59,  quantity:2, image:'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300' },
    ],
    subtotal:417, deliveryFee:29, discount:0, walletUsed:0, total:446,
    promoCode:null, deliveryAddress:'Flat 4B, Sunrise Apartments, Andheri West, Mumbai - 400058',
    deliveryLat:19.1197, deliveryLng:72.8468,
    status:'Delivered', reviewed:true,
    placedAt: new Date(Date.now() - 2*60*60*1000).toISOString(),
    statusHistory:[
      { status:'Placed',           time: new Date(Date.now()-120*60*1000).toISOString() },
      { status:'Confirmed',        time: new Date(Date.now()-115*60*1000).toISOString() },
      { status:'Preparing',        time: new Date(Date.now()-108*60*1000).toISOString() },
      { status:'Out for Delivery', time: new Date(Date.now()-95*60*1000).toISOString()  },
      { status:'Delivered',        time: new Date(Date.now()-80*60*1000).toISOString()  },
    ]
  },
  {
    id:'ord-002', customerId:'u1', customerName:'Priya Sharma',
    restaurantId:'r3', restaurantName:'Biryani House',
    deliveryAgentId:'u6', deliveryAgentName:'Sneha Nair',
    items:[
      { id:'r3-2', name:'Chicken Dum Biryani', price:329, quantity:2, image:'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=300' },
    ],
    subtotal:658, deliveryFee:39, discount:100, walletUsed:0, total:597,
    promoCode:'FLAT100', deliveryAddress:'Flat 4B, Sunrise Apartments, Andheri West, Mumbai - 400058',
    deliveryLat:19.1197, deliveryLng:72.8468,
    status:'Out for Delivery', reviewed:false,
    placedAt: new Date(Date.now() - 35*60*1000).toISOString(),
    statusHistory:[
      { status:'Placed',           time: new Date(Date.now()-35*60*1000).toISOString() },
      { status:'Confirmed',        time: new Date(Date.now()-32*60*1000).toISOString() },
      { status:'Preparing',        time: new Date(Date.now()-25*60*1000).toISOString() },
      { status:'Out for Delivery', time: new Date(Date.now()-10*60*1000).toISOString() },
    ]
  },
];

// ─── Seed function ─────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱 Seeding complete FoodDash database...\n');

  // 1. Firebase Auth users
  console.log('👤 Creating Auth users...');
  for (const user of USERS) {
    try {
      await authAdmin.createUser({ uid: user.id, email: user.email, password: user.password, displayName: user.name });
      console.log(`  ✅ ${user.email} (${user.role})`);
    } catch (e) {
      if (e.code === 'auth/uid-already-exists' || e.code === 'auth/email-already-exists') {
        console.log(`  ℹ️  Already exists: ${user.email}`);
      } else {
        console.warn(`  ⚠️  ${user.email}: ${e.message}`);
      }
    }
  }

  const batch = db.batch();

  // 2. Users collection (Firestore profile)
  console.log('\n📁 Writing users collection...');
  for (const user of USERS) {
    const { password, ...safeUser } = user;
    batch.set(db.collection('users').doc(user.id), safeUser);
  }

  // 3. loginCredentials collection (for reference/display)
  console.log('📁 Writing loginCredentials collection...');
  for (const user of USERS) {
    batch.set(db.collection('loginCredentials').doc(user.id), {
      uid:      user.id,
      email:    user.email,
      password: user.password,   // stored for demo showcase only
      role:     user.role,
      name:     user.name,
      avatar:   user.avatar,
    });
  }

  // 4. Restaurants + menu subcollection
  console.log('📁 Writing restaurants collection...');
  for (const r of RESTAURANTS) {
    const { menu, ...restData } = r;
    batch.set(db.collection('restaurants').doc(r.id), restData);
    for (const item of menu) {
      batch.set(db.collection('restaurants').doc(r.id).collection('menu').doc(item.id), item);
    }
  }

  // 5. Orders
  console.log('📁 Writing orders collection...');
  for (const order of ORDERS) {
    batch.set(db.collection('orders').doc(order.id), order);
  }

  // 6. Reviews
  console.log('📁 Writing reviews collection...');
  for (const review of REVIEWS) {
    batch.set(db.collection('reviews').doc(review.id), { ...review, createdAt: new Date().toISOString() });
  }

  // 7. Promo codes
  console.log('📁 Writing promoCodes collection...');
  for (const promo of PROMOS) {
    batch.set(db.collection('promoCodes').doc(promo.code), promo);
  }

  // 8. App config (useful metadata + fee settings)
  batch.set(db.collection('appConfig').doc('general'), {
    appName:         'FoodDash',
    currency:        'INR',
    currencySymbol:  '₹',
    supportEmail:    'support@fooddash.in',
    version:         '1.0.0',
    seededAt:        new Date().toISOString(),
    
    // Fee Configuration (Admin editable)
    platformFee:       4,     // ₹4 flat platform fee per order
    gstPercent:        0,
    packagingFee:      5,     // ₹5 packaging charge
    defaultDeliveryFee:30,    // Maximum tier delivery fee
    defaultMinOrder:   149,   // Default minimum order value
  });

  await batch.commit();

  console.log('\n✅ Database seeded successfully!\n');
  console.log('📊 Collections created:');
  console.log('   • users              (6 documents)');
  console.log('   • loginCredentials   (6 documents)');
  console.log('   • restaurants        (5 documents + menu subcollections)');
  console.log('   • orders             (2 documents)');
  console.log('   • reviews            (4 documents)');
  console.log('   • promoCodes         (4 documents)');
  console.log('   • appConfig          (1 document)');
  console.log('\n🔑 Demo login credentials:');
  console.log('   customer@demo.com   / password123  (Customer)');
  console.log('   owner@demo.com      / password123  (Restaurant Owner)');
  console.log('   delivery@demo.com   / password123  (Delivery Agent)');
  console.log('\n🌐 View your database:');
  console.log('   https://console.firebase.google.com/project/feastfleet-54b7e/firestore\n');
  process.exit(0);
}

seed().catch(e => { console.error('❌ Seed failed:', e.message); process.exit(1); });
