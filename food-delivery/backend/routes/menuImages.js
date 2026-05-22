const express = require('express');
const router = express.Router();
const { resolveMenuItemImage, resolveMenuItemImageOnline } = require('../utils/menuImages');

router.get('/resolve', async (req, res) => {
  const item = {
    name: req.query.name,
    title: req.query.title,
    category: req.query.category,
    image: req.query.image,
  };

  if (!String(item.name || item.title || '').trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const fallback = resolveMenuItemImage({ ...item, image: '' });
  const image = await resolveMenuItemImageOnline(item, { preferOnline: true });
  res.json({
    image,
    source: image === fallback ? 'fallback' : 'google',
    googleConfigured: Boolean(process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_CUSTOM_SEARCH_CX),
  });
});

module.exports = router;
