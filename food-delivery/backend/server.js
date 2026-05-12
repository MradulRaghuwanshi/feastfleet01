require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/restaurants',   require('./routes/restaurants'));
app.use('/api/orders',        require('./routes/orders'));
app.use('/api/promos',        require('./routes/promos'));
app.use('/api/reviews',       require('./routes/reviews'));
app.use('/api/favourites',    require('./routes/favourites'));
app.use('/api/search',        require('./routes/search'));
app.use('/api/tracking',      require('./routes/tracking'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/dashboard',     require('./routes/dashboard'));
app.use('/api/inventory',      require('./routes/inventory'));
app.use('/api/reports',        require('./routes/reports'));

app.get('/', (req, res) => res.json({ message: 'FoodDash API v3' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server → http://localhost:${PORT}`));
