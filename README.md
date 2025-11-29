# Canteen Management System - Backend

## Overview
This is the backend API for the Canteen Management System built with Express.js, MongoDB, and Socket.IO.

## Features
- User authentication with sessions
- Role-based access control (User, Admin, Kitchen Staff)
- Real-time order tracking with WebSocket
- Product management
- Order management with item-level tracking
- Review and rating system
- Cart and favorites
- Admin dashboard with analytics
- Kitchen staff order management

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)

### Steps
1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Update the `.env` file with your configuration:
   - Set `MONGODB_URI` to your MongoDB connection string
   - Set `SESSION_SECRET` to a secure random string
   - Set `FRONTEND_URL` to your frontend URL

4. Start MongoDB (if running locally):
   ```bash
   mongod
   ```

5. Start the server:
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/categories` - Get all categories

### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `POST /api/user/addresses` - Add address
- `PUT /api/user/addresses/:id` - Update address
- `DELETE /api/user/addresses/:id` - Delete address
- `GET /api/user/favorites` - Get favorites
- `POST /api/user/favorites/:productId` - Add to favorites
- `DELETE /api/user/favorites/:productId` - Remove from favorites

### Cart & Orders
- `GET /api/orders/cart` - Get cart
- `POST /api/orders/cart/items` - Add to cart
- `PUT /api/orders/cart/items/:productId` - Update cart item
- `DELETE /api/orders/cart/items/:productId` - Remove from cart
- `DELETE /api/orders/cart/clear` - Clear cart
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders/place` - Place order
- `POST /api/orders/:id/cancel` - Cancel order
- `POST /api/orders/payments/confirm` - Confirm payment

### Admin
- `GET /api/admin/dashboard/stats` - Get dashboard statistics
- `GET /api/admin/orders` - Get all orders
- `PUT /api/admin/orders/:id/status` - Update order status
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/:id` - Update product
- `PUT /api/admin/products/:id/availability` - Update availability
- `PUT /api/admin/products/:id/discount` - Update discount
- `POST /api/admin/staff` - Create staff
- `GET /api/admin/staff` - Get all staff
- `POST /api/admin/expenses` - Create expense
- `GET /api/admin/expenses` - Get all expenses

### Kitchen
- `GET /api/kitchen/orders` - Get kitchen orders
- `GET /api/kitchen/orders/stats` - Get order statistics
- `POST /api/kitchen/orders/:orderId/items/:itemId/accept` - Accept order item
- `POST /api/kitchen/orders/:orderId/items/:itemId/reject` - Reject order item
- `PUT /api/kitchen/orders/:orderId/items/:itemId/status` - Update item status
- `POST /api/kitchen/orders/:orderId/items/:itemId/complete` - Complete order item

### Reviews
- `GET /api/reviews/product/:productId` - Get product reviews
- `POST /api/reviews` - Create review
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review
- `POST /api/reviews/:id/like` - Like review

## WebSocket Events

### Order Events
- `order:new` - New order placed
- `order:update` - Order status updated
- `order:paid` - Payment confirmed
- `order:item_update` - Order item status updated
- `order:item_ready` - Order item ready
- `order:all_ready` - All order items ready

### Product Events
- `product:new` - New product added
- `product:update` - Product updated
- `discount:update` - Product discount updated

## Project Structure
```
backend/
├── config/          # Configuration files
├── controllers/     # Request handlers
├── models/          # Mongoose schemas
├── routes/          # API routes
├── middleware/      # Custom middleware
├── sockets/         # Socket.IO handlers
├── utils/           # Utility functions
└── app.js           # Main application file
```

## Default User Roles
- `user` - Regular customer
- `admin` - Administrator
- `kitchen_staff` - Kitchen staff member

## Security
- Passwords are hashed using bcrypt
- Session-based authentication
- Role-based access control
- Input validation using express-validator

## License
MIT

