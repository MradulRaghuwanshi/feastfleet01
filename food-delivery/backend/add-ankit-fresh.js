const fetch = global.fetch || require('node-fetch');

const API = process.env.API_URL || 'http://localhost:5000/api';

async function addRestaurant() {
  const menu = [
    { category: 'Starters', name: 'Tandoori Chicken (Half)', price: 230 },
    { category: 'Starters', name: 'Tandoori Chicken (Full)', price: 420 },
    { category: 'Starters', name: 'Al Faham Chicken (Half)', price: 230 },
    { category: 'Starters', name: 'Al Faham Chicken (Full)', price: 420 },
    { category: 'Starters', name: 'Chicken Tikka (Half)', price: 190 },
    { category: 'Starters', name: 'Chicken Tikka (Full)', price: 370 },
    { category: 'Starters', name: 'Chicken Malai Tikka (Half)', price: 210 },
    { category: 'Starters', name: 'Chicken Malai Tikka (Full)', price: 410 },
    { category: 'Starters', name: 'Fried Chicken (Half)', price: 210 },
    { category: 'Starters', name: 'Fried Chicken (Full)', price: 400 },
    { category: 'Starters', name: 'Crunchy Fried Chicken (Half)', price: 220 },
    { category: 'Starters', name: 'Crunchy Fried Chicken (Full)', price: 410 },
    { category: 'Starters', name: 'Boneless Crunchy Fried Chicken (Half)', price: 230 },
    { category: 'Starters', name: 'Boneless Crunchy Fried Chicken (Full)', price: 420 },
    { category: 'Veg Starters', name: 'Chilli Paneer (Half)', price: 190 },
    { category: 'Veg Starters', name: 'Chilli Paneer (Full)', price: 360 },
    { category: 'Veg Starters', name: 'Paneer 65 (Half)', price: 190 },
    { category: 'Veg Starters', name: 'Paneer 65 (Full)', price: 360 },
    { category: 'Biryani', name: 'Hyderabadi Chicken Dum Biryani (Single)', price: 160 },
    { category: 'Biryani', name: 'Hyderabadi Chicken Dum Biryani (Full)', price: 530 },
    { category: 'Biryani', name: 'Royal Dum Biryani (Single)', price: 170 },
    { category: 'Biryani', name: 'Royal Dum Biryani (Full)', price: 550 },
    { category: 'Mandi', name: 'Hyderabadi Fried Chicken Mandi (1 PC)', price: 250 },
    { category: 'Mandi', name: 'Hyderabadi Fried Chicken Mandi (2 PC)', price: 480 },
    { category: 'Gravy', name: 'Butter Chicken (Quarter)', price: 170 },
    { category: 'Gravy', name: 'Butter Chicken (Half)', price: 280 },
    { category: 'Gravy', name: 'Butter Chicken (Full)', price: 480 },
    { category: 'Roti', name: 'Tandoori Roti', price: 20 },
    { category: 'Roti', name: 'Butter Naan', price: 40 },
    { category: 'Rice', name: 'Chicken Fried Rice (Half)', price: 160 },
    { category: 'Rice', name: 'Chicken Fried Rice (Full)', price: 190 },
    { category: 'Thali', name: 'Non Veg Thali', price: 160 },
    { category: 'Thali', name: 'Egg Thali', price: 140 },
    { category: 'Egg Items', name: 'Egg Curry (Half)', price: 90 },
    { category: 'Egg Items', name: 'Egg Curry (Full)', price: 190 },
    { category: 'Mutton', name: 'Mutton Juicy Biryani (Half)', price: 290 },
    { category: 'Mutton', name: 'Mutton Juicy Biryani (Full)', price: 410 },
    { category: 'Veg Items', name: 'Shahi Paneer (Half)', price: 160 },
    { category: 'Veg Items', name: 'Shahi Paneer (Full)', price: 260 },
  ];

  const payload = {
    name: 'Ankit Fresh Juise and fast Food',
    cuisine: 'Fast Food',
    address: 'Main Gate LPU, Kapurthala',
    image: '/images/ankit-first.png',
    menu
  };

  console.log('Posting restaurant to', `${API}/restaurants`);
  const res = await fetch(`${API}/restaurants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const body = await res.json();
  if (!res.ok) {
    console.error('Create restaurant failed', body);
    process.exit(1);
  }

  console.log('Restaurant created:', body.id || body.name || body);

  // Update images for existing restaurants if present
  await updateRestaurantImageByName('Lazeez Khana', '/images/lazeez-second.png');
  await updateRestaurantImageByName('Juice & Fast Food', '/images/juice-third.png');

  console.log('Done');
}

async function updateRestaurantImageByName(name, imagePath) {
  try {
    const listRes = await fetch(`${API}/restaurants`);
    const restaurants = await listRes.json();
    const found = restaurants.find(r => r.name && r.name.toLowerCase().includes(name.toLowerCase()));
    if (!found) {
      console.log(`Restaurant matching "${name}" not found, skipping image update.`);
      return;
    }
    const patchRes = await fetch(`${API}/restaurants/${found.id}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imagePath })
    });
    const pb = await patchRes.json();
    if (!patchRes.ok) console.warn('Image update returned non-OK', pb);
    else console.log(`Updated image for ${found.name} -> ${imagePath}`);
  } catch (err) {
    console.error('Update image error', err.message);
  }
}

addRestaurant().catch(err => {
  console.error(err);
  process.exit(1);
});
