(async () => {
  const base = 'https://feastfleet-backend-0ozz.onrender.com/api';
  try {
    if (typeof fetch === 'undefined') {
      console.error('FETCH_UNAVAILABLE: Node runtime does not expose fetch.');
      process.exit(2);
    }

    const uR = await fetch(base + '/users', { headers: { 'Content-Type': 'application/json' } });
    const users = await uR.json();
    console.log('USERS_COUNT', Array.isArray(users) ? users.length : 'unexpected');

    const admin = Array.isArray(users) ? users.find(u => u.role === 'admin') : null;
    console.log('ADMIN_ID', admin ? admin.id : null);

    const restBody = {
      name: 'E2E Test Restaurant',
      address: '123 Test Lane',
      cuisine: 'Test',
      isOpen: true,
      openingTime: '09:00',
      closingTime: '21:00',
      deliveryFee: 30,
      minOrder: 100,
      createdAt: new Date().toISOString()
    };

    const rRes = await fetch(base + '/restaurants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(restBody) });
    const rJson = await rRes.json();
    console.log('CREATE_RESTAURANT_STATUS', rRes.status, JSON.stringify(rJson));

    const restaurantId = rJson.id || rJson.ID || null;

    const userId = 'rst_test_' + Date.now().toString(36).slice(2, 8);
    const userBody = {
      id: userId,
      name: restBody.name + ' Owner',
      email: '',
      role: 'restaurant',
      restaurantId: restaurantId,
      wallet: 0,
      favourites: [],
      avatar: '🍽️',
      createdAt: new Date().toISOString()
    };

    const uRes = await fetch(base + '/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userBody) });
    const uJson = await uRes.json();
    console.log('CREATE_USER_STATUS', uRes.status, JSON.stringify(uJson));

    const adminId = admin ? admin.id : userId;
    const email = `e2e+${Date.now()}@example.com`;
    const credResp = await fetch(`${base}/users/${userId}/credentials`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, email, username: email, password: 'Test1234' })
    });
    const credText = await credResp.text();
    console.log('CREDENTIAL_PATCH_STATUS', credResp.status, credText);

    console.log('\n--- Completed E2E test');
  } catch (err) {
    console.error('SCRIPT_ERROR', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
