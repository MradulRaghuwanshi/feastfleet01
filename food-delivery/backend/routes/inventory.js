const express = require('express');
const router = express.Router();
const { db } = require('../firebase/admin');

// In-memory fallback inventory
let memoryInventory = [
  { id: 'inv-1', restaurantId: 'r1', name: 'Chicken', quantity: 50, unit: 'kg' },
  { id: 'inv-2', restaurantId: 'r1', name: 'Rice', quantity: 100, unit: 'kg' },
];

// Get inventory for restaurant
router.get('/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;

    if (!db) {
      const items = memoryInventory.filter(item => item.restaurantId === restaurantId);
      return res.json(items);
    }

    const snap = await db.collection('restaurants').doc(restaurantId).collection('inventory').get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(items);
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add inventory item
router.post('/', async (req, res) => {
  try {
    const { restaurantId, name, quantity, unit } = req.body;

    if (!db) {
      const id = `inv-${Date.now()}`;
      const item = { id, restaurantId, name, quantity, unit };
      memoryInventory.push(item);
      return res.json({ id });
    }

    const ref = await db.collection('restaurants').doc(restaurantId).collection('inventory').add({
      name, quantity, unit, createdAt: new Date().toISOString()
    });

    res.json({ id: ref.id });
  } catch (error) {
    console.error('Add inventory error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update inventory
router.put('/:restaurantId/:id', async (req, res) => {
  try {
    const { restaurantId, id } = req.params;

    if (!db) {
      const index = memoryInventory.findIndex(item => item.id === id);
      if (index === -1) return res.status(404).json({ error: 'Not found' });
      memoryInventory[index] = { ...memoryInventory[index], ...req.body };
      return res.json({ success: true });
    }

    await db.collection('restaurants').doc(restaurantId).collection('inventory').doc(id).update(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;