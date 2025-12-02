require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const http = require('http');
const path = require('path');

const connectDB = require('./config/database');
const sessionConfig = require('./config/session');
const { initializeSocket } = require('./config/socket');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const kitchenRoutes = require('./routes/kitchen');
const reviewRoutes = require('./routes/reviews');
const uploadRoutes = require('./routes/upload');
const adminStaffRoutes = require('./routes/adminStaffRoutes');

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Initialize Socket.IO
initializeSocket(server);

app.set("trust proxy", 1);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session(sessionConfig));

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Canteen Management System API',
    version: '1.0.0',
    status: 'running'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', uploadRoutes);
app.use('/api/admin/staff', adminStaffRoutes);

// Serve static files from public directory
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;