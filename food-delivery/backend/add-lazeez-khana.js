const http = require('http');

const baseURL = 'http://localhost:5000';

function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseURL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseData) });
        } catch {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function addRestaurantWithMenu() {
  const menuItems = [
    // Starters
    { name: 'Tandoori Chicken (Half)', price: 230, category: 'Starters', description: 'Tender tandoori chicken pieces' },
    { name: 'Tandoori Chicken (Full)', price: 420, category: 'Starters', description: 'Full tandoori chicken pieces' },
    { name: 'Al Faham Chicken (Half)', price: 230, category: 'Starters', description: 'Spiced Al Faham chicken' },
    { name: 'Al Faham Chicken (Full)', price: 420, category: 'Starters', description: 'Full Al Faham chicken' },
    { name: 'Chicken Tikka (Half)', price: 190, category: 'Starters', description: 'Marinated chicken tikka' },
    { name: 'Chicken Tikka (Full)', price: 370, category: 'Starters', description: 'Full chicken tikka' },
    { name: 'Chicken Malai Tikka (Half)', price: 210, category: 'Starters', description: 'Creamy malai tikka' },
    { name: 'Chicken Malai Tikka (Full)', price: 410, category: 'Starters', description: 'Full malai tikka' },
    { name: 'Fried Chicken (Half)', price: 210, category: 'Starters', description: 'Crispy fried chicken' },
    { name: 'Fried Chicken (Full)', price: 400, category: 'Starters', description: 'Full fried chicken' },
    { name: 'Crunchy Fried Chicken (Half)', price: 220, category: 'Starters', description: 'Extra crispy fried chicken' },
    { name: 'Crunchy Fried Chicken (Full)', price: 410, category: 'Starters', description: 'Full crunchy fried chicken' },
    { name: 'Boneless Crunchy Fried Chicken (Half)', price: 230, category: 'Starters', description: 'Boneless crispy chicken' },
    { name: 'Boneless Crunchy Fried Chicken (Full)', price: 420, category: 'Starters', description: 'Full boneless crispy chicken' },
    
    // Veg Starters
    { name: 'Chilli Paneer (Half)', price: 190, category: 'Veg Starters', description: 'Spicy paneer cubes' },
    { name: 'Chilli Paneer (Full)', price: 360, category: 'Veg Starters', description: 'Full chilli paneer' },
    { name: 'Paneer 65 (Half)', price: 190, category: 'Veg Starters', description: 'South Indian style paneer' },
    { name: 'Paneer 65 (Full)', price: 360, category: 'Veg Starters', description: 'Full paneer 65' },
    
    // Biryani
    { name: 'Hyderabadi Chicken Dum Biryani (Single)', price: 160, category: 'Biryani', description: 'Fragrant single portion' },
    { name: 'Hyderabadi Chicken Dum Biryani (Full)', price: 530, category: 'Biryani', description: 'Full Hyderabadi biryani' },
    { name: 'Royal Dum Biryani (Single)', price: 170, category: 'Biryani', description: 'Premium single portion' },
    { name: 'Royal Dum Biryani (Full)', price: 550, category: 'Biryani', description: 'Full royal biryani' },
    
    // Mandi
    { name: 'Hyderabadi Fried Chicken Mandi (1 PC)', price: 250, category: 'Mandi', description: 'Aromatic mandi with chicken' },
    { name: 'Hyderabadi Fried Chicken Mandi (2 PC)', price: 480, category: 'Mandi', description: 'Mandi with 2 pieces chicken' },
    
    // Gravy
    { name: 'Butter Chicken (Quarter)', price: 170, category: 'Gravy', description: 'Creamy butter chicken quarter' },
    { name: 'Butter Chicken (Half)', price: 280, category: 'Gravy', description: 'Butter chicken half' },
    { name: 'Butter Chicken (Full)', price: 480, category: 'Gravy', description: 'Full butter chicken' },
    
    // Roti
    { name: 'Tandoori Roti', price: 20, category: 'Roti', description: 'Traditional tandoori roti' },
    { name: 'Butter Naan', price: 40, category: 'Roti', description: 'Soft naan with butter' },
    
    // Rice
    { name: 'Chicken Fried Rice (Half)', price: 160, category: 'Rice', description: 'Flavorful fried rice' },
    { name: 'Chicken Fried Rice (Full)', price: 190, category: 'Rice', description: 'Full portion fried rice' },
    
    // Thali
    { name: 'Non Veg Thali', price: 160, category: 'Thali', description: 'Complete non-veg meal' },
    { name: 'Egg Thali', price: 140, category: 'Thali', description: 'Complete egg meal' },
    
    // Egg Items
    { name: 'Egg Curry (Half)', price: 90, category: 'Egg Items', description: 'Spiced egg curry' },
    { name: 'Egg Curry (Full)', price: 190, category: 'Egg Items', description: 'Full egg curry' },
    
    // Mutton
    { name: 'Mutton Juicy Biryani (Half)', price: 290, category: 'Mutton', description: 'Tender mutton biryani' },
    { name: 'Mutton Juicy Biryani (Full)', price: 410, category: 'Mutton', description: 'Full mutton biryani' },
    
    // Veg Items
    { name: 'Shahi Paneer (Half)', price: 160, category: 'Veg Items', description: 'Royal paneer curry' },
    { name: 'Shahi Paneer (Full)', price: 260, category: 'Veg Items', description: 'Full shahi paneer' }
  ];

  // Generate credentials
  const restaurantName = 'Lazeez Khana';
  const slug = 'lazeez-khana';
  const timestamp = Date.now().toString().slice(-4);
  const randomStr = Math.random().toString(36).slice(2, 6);
  const email = `${slug}-${timestamp}${randomStr}@feastfleet.local`;
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*()';
  let password = '';
  for (let i = 0; i < 10; i++) password += chars[Math.floor(Math.random() * chars.length)];

  try {
    console.log('🍽️  Creating restaurant: Lazeez Khana...');
    
    // Step 1: Create Restaurant
    const restaurantRes = await makeRequest('POST', '/api/restaurants', {
      name: restaurantName,
      cuisine: 'North Indian',
      address: 'Maingate, LPU',
      deliveryFee: 40,
      minOrder: 200,
      deliveryTime: '30-45 min',
      rating: 4.5,
      isOpen: true,
      isFeatured: true,
      image: 'https://via.placeholder.com/300x200?text=Lazeez+Khana',
      offer: '10% off on orders above ₹500',
      tags: ['North Indian', 'Non-Veg', 'Biryani', 'Mandi'],
      menu: menuItems
    });

    if (restaurantRes.status !== 201) {
      console.error('❌ Failed to create restaurant:', restaurantRes.data);
      return;
    }

    const restaurantId = restaurantRes.data.id;
    console.log('✅ Restaurant created! ID:', restaurantId);
    console.log(`📋 Added ${menuItems.length} menu items`);

    // Step 2: Create Restaurant User Account
    const userId = `rst_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    console.log('\n👤 Creating restaurant owner account...');
    const userRes = await makeRequest('POST', '/api/users', {
      id: userId,
      name: 'Lazeez Khana Owner',
      email: email,
      role: 'restaurant',
      restaurantId: restaurantId,
      password: password,
      wallet: 0,
      favourites: [],
      avatar: '🍽️',
      createdAt: new Date().toISOString()
    });

    if (userRes.status !== 201) {
      console.error('❌ Failed to create user:', userRes.data);
      return;
    }

    console.log('✅ Restaurant owner account created! ID:', userId);

    // Step 3: Get Admin User to use for credentials update
    console.log('\n🔐 Setting up login credentials...');
    const usersRes = await makeRequest('GET', '/api/users', null);
    const adminUser = usersRes.data?.find(u => u.role === 'admin');
    
    if (!adminUser) {
      console.warn('⚠️  No admin found in system, using fallback admin ID');
      var adminId = 'admin';
    } else {
      var adminId = adminUser.id;
    }

    const credRes = await makeRequest('PATCH', `/api/users/${userId}/credentials`, {
      adminId: adminId,
      email: email,
      username: email,
      password: password
    });

    if (credRes.status !== 200) {
      console.warn('⚠️  Credentials update returned:', credRes.status);
      console.log('   Note: Credentials were created during user account creation');
    } else {
      console.log('✅ Login credentials configured!');
    }

    // Display Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 RESTAURANT SUCCESSFULLY CREATED!');
    console.log('='.repeat(60));
    console.log('\n📍 RESTAURANT DETAILS:');
    console.log('   Name:', restaurantName);
    console.log('   Address:', 'Maingate, LPU');
    console.log('   Restaurant ID:', restaurantId);
    console.log('   Cuisine:', 'North Indian');
    console.log('   Menu Items:', menuItems.length);
    console.log('   Delivery Fee:', '₹40');
    console.log('   Min Order:', '₹200');

    console.log('\n👤 OWNER ACCOUNT:');
    console.log('   User ID:', userId);
    console.log('   Name: Lazeez Khana Owner');

    console.log('\n🔐 LOGIN CREDENTIALS:');
    console.log('   Email/Username:', email);
    console.log('   Password:', password);

    console.log('\n' + '='.repeat(60));
    console.log('✅ READY TO USE!');
    console.log('='.repeat(60));
    console.log('\nIMPORTANT: Save these credentials securely!');
    console.log('The restaurant owner can now log in to manage the menu.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
addRestaurantWithMenu();
