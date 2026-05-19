require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { version } = require('./package.json');
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/restaurants',   require('./routes/restaurants'));
app.use('/api/orders',        require('./routes/orders'));
app.use('/api/promos',        require('./routes/promos'));
app.use('/api/reviews',       require('./routes/reviews'));
app.use('/api/favourites',    require('./routes/favourites'));
app.use('/api/search',        require('./routes/search'));
app.use('/api/tracking',      require('./routes/tracking'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/payments',      require('./routes/payments'));
// Backward compatibility for older frontend bundles that call /payments/* without /api.
app.use('/payments',          require('./routes/payments'));
app.use('/api/dashboard',     require('./routes/dashboard'));
app.use('/api/inventory',      require('./routes/inventory'));
app.use('/api/reports',        require('./routes/reports'));
app.use('/api/menu-bulk',      require('./routes/menu-bulk'));
app.use('/api/debug',          require('./routes/debug'));

const healthPayload = () => ({
  ok: true,
  message: 'FeastFleet API is healthy',
  version,
  environment: process.env.NODE_ENV || 'development',
  timestamp: new Date().toISOString(),
});

app.get('/api/health', (_req, res) => res.json(healthPayload()));
app.get('/health', (_req, res) => res.json(healthPayload()));

app.get('/', (req, res) => res.json({ 
  message: 'FeastFleet API',
  version: version,
  environment: process.env.NODE_ENV || 'development',
  timestamp: new Date().toISOString()
}));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 FeastFleet Backend v${version}`);
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
