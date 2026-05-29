const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => {
  res.json([]);
});

router.post('/', (_req, res) => {
  res.status(410).json({ error: 'Reviews are disabled' });
});

router.patch('/:id/reply', (_req, res) => {
  res.status(410).json({ error: 'Reviews are disabled' });
});

module.exports = router;
