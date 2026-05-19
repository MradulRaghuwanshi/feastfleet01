const { db } = require('./firebase/admin');

const restaurantName = 'Ankit Fresh Juise and fast Food';

const menuItems = [
  { category: 'Shakes', name: 'Mango Shake (Medium)', price: 80 },
  { category: 'Shakes', name: 'Mango Shake (Large)', price: 110 },
  { category: 'Shakes', name: 'Banana Shake (Medium)', price: 80 },
  { category: 'Shakes', name: 'Banana Shake (Large)', price: 110 },
  { category: 'Shakes', name: 'Papaya Shake (Medium)', price: 80 },
  { category: 'Shakes', name: 'Papaya Shake (Large)', price: 110 },
  { category: 'Shakes', name: 'Mix Fruit Shake (Medium)', price: 80 },
  { category: 'Shakes', name: 'Mix Fruit Shake (Large)', price: 110 },
  { category: 'Shakes', name: 'Pineapple Shake (Medium)', price: 80 },
  { category: 'Shakes', name: 'Pineapple Shake (Large)', price: 110 },
  { category: 'Shakes', name: 'Kharbooza Shake (Medium)', price: 80 },
  { category: 'Shakes', name: 'Kharbooza Shake (Large)', price: 110 },
  { category: 'Shakes', name: 'Strawberry Shake (Medium)', price: 80 },
  { category: 'Shakes', name: 'Strawberry Shake (Large)', price: 110 },
  { category: 'Shakes', name: 'Chocolate Shake (Medium)', price: 80 },
  { category: 'Shakes', name: 'Chocolate Shake (Large)', price: 110 },
  { category: 'Shakes', name: 'Oreo Shake (Medium)', price: 80 },
  { category: 'Shakes', name: 'Oreo Shake (Large)', price: 110 },
  { category: 'Shakes', name: 'Kit Kat Shake (Medium)', price: 80 },
  { category: 'Shakes', name: 'Kit Kat Shake (Large)', price: 110 },
  { category: 'Shakes', name: 'Vanilla Shake (Medium)', price: 80 },
  { category: 'Shakes', name: 'Vanilla Shake (Large)', price: 110 },
  { category: 'Shakes', name: 'Black Currant Shake (Medium)', price: 80 },
  { category: 'Shakes', name: 'Black Currant Shake (Large)', price: 110 },
  { category: 'Shakes', name: 'Butterscotch Shake (Medium)', price: 80 },
  { category: 'Shakes', name: 'Butterscotch Shake (Large)', price: 110 },
  { category: 'Shakes', name: 'Litchi Shake (Medium)', price: 80 },
  { category: 'Shakes', name: 'Litchi Shake (Large)', price: 110 },
  { category: 'Juices', name: 'Mix Fruit Juice (Medium)', price: 80 },
  { category: 'Juices', name: 'Mix Fruit Juice (Large)', price: 110 },
  { category: 'Juices', name: 'Mosambi Juice (Medium)', price: 80 },
  { category: 'Juices', name: 'Mosambi Juice (Large)', price: 110 },
  { category: 'Juices', name: 'Pineapple Juice (Medium)', price: 80 },
  { category: 'Juices', name: 'Pineapple Juice (Large)', price: 110 },
  { category: 'Juices', name: 'Apple Juice (Medium)', price: 80 },
  { category: 'Juices', name: 'Apple Juice (Large)', price: 110 },
  { category: 'Juices', name: 'Beetroot Juice (Medium)', price: 80 },
  { category: 'Juices', name: 'Beetroot Juice (Large)', price: 110 },
  { category: 'Juices', name: 'Watermelon Juice (Medium)', price: 80 },
  { category: 'Juices', name: 'Watermelon Juice (Large)', price: 110 },
  { category: 'Special Items', name: 'Cold Coffee (Medium)', price: 80 },
  { category: 'Special Items', name: 'Cold Coffee (Large)', price: 110 },
  { category: 'Special Items', name: 'Lime Sweet Water (Medium)', price: 60 },
  { category: 'Special Items', name: 'Lime Sweet Water (Large)', price: 90 },
  { category: 'Special Items', name: 'Dry Fruits Milk Shake (Medium)', price: 110 },
  { category: 'Special Items', name: 'Dry Fruits Milk Shake (Large)', price: 160 },
  { category: 'Special Items', name: 'Mix Fruit Salad Box', price: 110 },
  { category: 'Maggi', name: 'Plain', price: 49 },
  { category: 'Maggi', name: 'Veg Masala', price: 62 },
  { category: 'Maggi', name: 'Double Egg', price: 88 },
  { category: 'Maggi', name: 'Chicken', price: 127 },
  { category: 'Noodles', name: 'Veg', price: 101 },
  { category: 'Noodles', name: 'Double Egg', price: 127 },
  { category: 'Noodles', name: 'Chicken', price: 140 },
  { category: 'Noodles', name: 'Paneer', price: 127 },
  { category: 'Noodles', name: 'Double Egg Chicken', price: 179 },
  { category: 'Rolls', name: 'Veg', price: 62 },
  { category: 'Rolls', name: 'Double Egg', price: 88 },
  { category: 'Rolls', name: 'Chicken Egg', price: 127 },
  { category: 'Rolls', name: 'Paneer', price: 101 },
  { category: 'Rolls', name: 'Egg Bhurji', price: 114 },
  { category: 'Rolls', name: 'Paneer Bhurji', price: 140 },
  { category: 'Special Items', name: 'Masala French Fries', price: 140 },
  { category: 'Special Items', name: 'Peri Peri Fries', price: 166 },
  { category: 'Special Items', name: 'Plain Omelette', price: 56 },
  { category: 'Special Items', name: 'Egg Bhurji', price: 69 },
  { category: 'Special Items', name: 'Boiled Egg', price: 23 },
  { category: 'Special Items', name: 'Bread Omelette', price: 62 },
  { category: 'Burger', name: 'Aloo Tikki', price: 75 },
  { category: 'Burger', name: 'Chicken', price: 114 },
  { category: 'Burger', name: 'Double Egg', price: 88 },
  { category: 'Burger', name: 'Cheese Slice', price: 114 },
  { category: 'Salad', name: 'Chicken', price: 166 },
  { category: 'Sandwich', name: 'Mix Veg', price: 114 },
  { category: 'Sandwich', name: 'Cheese Veg', price: 140 },
  { category: 'Sandwich', name: 'Paneer', price: 114 },
  { category: 'Sandwich', name: 'Chicken', price: 205 },
];

async function run() {
  if (!db) {
    throw new Error('Firestore is not configured in this environment.');
  }

  const snapshot = await db.collection('restaurants').where('name', '==', restaurantName).limit(1).get();
  if (snapshot.empty) {
    throw new Error(`Restaurant not found: ${restaurantName}`);
  }

  const restaurantDoc = snapshot.docs[0];
  const restaurantRef = restaurantDoc.ref;
  const menuRef = restaurantRef.collection('menu');
  const menuSnap = await menuRef.get();

  const existingDocs = menuSnap.docs;
  for (const doc of existingDocs) {
    await doc.ref.delete();
  }

  for (const item of menuItems) {
    const itemId = `${item.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    await menuRef.doc(itemId).set({
      name: item.name,
      description: '',
      price: item.price,
      category: item.category,
      image: '',
      available: true,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  await restaurantRef.update({ updatedAt: new Date().toISOString() });

  console.log(`Updated menu for ${restaurantName}`);
  console.log(`Restaurant ID: ${restaurantDoc.id}`);
  console.log(`Menu items: ${menuItems.length}`);
}

run().catch((error) => {
  console.error('Failed to update Ankit Fresh menu:', error.message);
  process.exit(1);
});
