const chunk = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

const getTokensForUserIds = async (db, userIds) => {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const tokens = [];
  for (const ids of chunk(uniqueIds, 10)) {
    const snap = await db.collection('fcmTokens').where('userId', 'in', ids).get();
    snap.docs.forEach(doc => {
      const token = doc.data().token;
      if (token) tokens.push(token);
    });
  }
  return [...new Set(tokens)];
};

const sendToTokens = async (admin, tokens, message) => {
  if (!tokens.length || !admin.messaging) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  for (const tokenChunk of chunk(tokens, 500)) {
    const response = await admin.messaging().sendEachForMulticast({
      ...message,
      tokens: tokenChunk,
    });
    sent += response.successCount;
    failed += response.failureCount;
  }

  return { sent, failed };
};

const getDeliveryPartnerIds = async (db) => {
  const snap = await db.collection('users').where('role', '==', 'delivery').get();
  return snap.docs.map(doc => doc.id);
};

const getRestaurantOwnerIds = async (db, restaurantId) => {
  const snap = await db.collection('users')
    .where('role', '==', 'restaurant')
    .where('restaurantId', '==', restaurantId)
    .get();
  return snap.docs.map(doc => doc.id);
};

const isPlatformDeliveryOrder = (order) => {
  if (order.deliveryType) return order.deliveryType === 'platform';
  if (order.assignmentStatus) return order.assignmentStatus === 'broadcast';
  return order.deliveryAgentName !== 'Restaurant Delivery';
};

async function sendOrderPlacedNotifications({ db, admin, orderId, order }) {
  if (!db || !admin?.messaging || !orderId || !order) return { restaurant: { sent: 0, failed: 0 }, delivery: { sent: 0, failed: 0 } };

  const shortOrder = order.orderNumber || `#${String(orderId).slice(0, 6).toUpperCase()}`;
  const amount = Number(order.total || 0).toFixed(0);
  const commonData = {
    type: 'new_order',
    orderId,
    restaurantId: String(order.restaurantId || ''),
    restaurantName: String(order.restaurantName || ''),
    amount,
    click_action: 'OPEN_APP',
  };

  const restaurantOwnerIds = await getRestaurantOwnerIds(db, order.restaurantId);
  const restaurantTokens = await getTokensForUserIds(db, restaurantOwnerIds);
  const restaurant = await sendToTokens(admin, restaurantTokens, {
    notification: {
      title: 'New order placed',
      body: `${shortOrder} from ${order.customerName || 'Customer'} - Rs ${amount}`,
    },
    data: {
      ...commonData,
      audience: 'restaurant',
    },
  });

  let delivery = { sent: 0, failed: 0 };
  if (isPlatformDeliveryOrder(order)) {
    const deliveryPartnerIds = await getDeliveryPartnerIds(db);
    const deliveryTokens = await getTokensForUserIds(db, deliveryPartnerIds);
    delivery = await sendToTokens(admin, deliveryTokens, {
      notification: {
        title: 'New delivery request',
        body: `${shortOrder} from ${order.restaurantName || 'restaurant'} - Rs ${amount}`,
      },
      data: {
        ...commonData,
        audience: 'delivery',
      },
    });
  }

  return { restaurant, delivery };
}

module.exports = { sendOrderPlacedNotifications };
