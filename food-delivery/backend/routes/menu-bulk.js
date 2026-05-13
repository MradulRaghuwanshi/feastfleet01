const express = require('express');
const router = express.Router();
const { db } = require('../firebase/admin');

// POST /api/menu-bulk/import-csv
// Body: { restaurantId, csvData: [ { name, description, price, category, available } ] }
router.post('/import-csv', async (req, res) => {
  try {
    const { restaurantId, csvData } = req.body;

    if (!restaurantId || !csvData || !Array.isArray(csvData)) {
      return res.status(400).json({ error: 'restaurantId and csvData array are required' });
    }

    const restRef = db.collection('restaurants').doc(restaurantId);
    const restDoc = await restRef.get();
    if (!restDoc.exists()) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const menuRef = restRef.collection('menu');
    const importResults = { success: 0, failed: 0, errors: [] };

    for (const item of csvData) {
      try {
        if (!item.name || !item.price) {
          importResults.failed++;
          importResults.errors.push(`Row skipped: ${item.name || 'unknown'} - missing name or price`);
          continue;
        }

        const docId = item.id || `item_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
        await menuRef.doc(docId).set({
          name: item.name.trim(),
          description: item.description?.trim() || '',
          price: parseFloat(item.price),
          category: item.category?.trim() || 'General',
          available: item.available !== false && item.available !== 'false',
          veg: item.veg === 'yes' || item.veg === 'true' || item.veg === true,
          bestseller: item.bestseller === 'yes' || item.bestseller === 'true' || item.bestseller === true,
          spicy: item.spicy === 'yes' || item.spicy === 'true' || item.spicy === true,
          imageUrl: item.imageUrl?.trim() || '',
          prepTime: parseInt(item.prepTime) || 15,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        importResults.success++;
      } catch (itemError) {
        importResults.failed++;
        importResults.errors.push(`Failed to import ${item.name}: ${itemError.message}`);
      }
    }

    res.json({
      message: 'CSV import completed',
      ...importResults
    });
  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/menu-bulk/export-csv-template
router.get('/export-csv-template', (req, res) => {
  const template = `name,description,price,category,available,veg,bestseller,spicy,imageUrl,prepTime
Chicken Biryani,Fragrant rice with spices and tender chicken,299,Biryani,yes,no,yes,yes,,30
Paneer Butter Masala,Cottage cheese in rich creamy tomato sauce,249,Curries,yes,yes,yes,no,,25
Garlic Naan,Soft naan bread with garlic,40,Breads,yes,yes,no,no,,5`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="menu-template.csv"');
  res.send(template);
});

module.exports = router;
