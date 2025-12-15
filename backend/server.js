const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const db = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
const authRoutes = require('./routes/authRoutes');
const dishRoutes = require('./routes/dishRoutes');
const groupRoutes = require('./routes/groupRoutes');
const gachaRoutes = require('./routes/gachaRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/gacha', gachaRoutes);

// Test Route
app.get('/', (req, res) => {
    res.send('Restaurant Gacha API is running...');
});

// Test DB Connection
app.get('/api/test-db', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 + 1 AS solution');
        res.json({ message: 'Database connected successfully', result: rows[0].solution });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Database connection failed', error: error.message });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
