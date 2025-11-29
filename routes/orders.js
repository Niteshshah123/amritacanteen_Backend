const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

// All order routes require authentication
router.use(requireAuth);

// Cart routes
router.get('/cart', userController.getCart);
router.post('/cart/items', userController.addToCart);
router.put('/cart/items/:productId', userController.updateCartItem);
router.delete('/cart/items/:productId', userController.removeFromCart);
router.delete('/cart/clear', userController.clearCart);

// Order routes
router.get('/', orderController.getUserOrders);
router.get('/:id', orderController.getOrderById);
router.post('/place', orderController.placeOrder);
router.post('/:id/cancel', orderController.cancelOrder);

// Payment routes
router.post('/payments/confirm', orderController.confirmPayment);

module.exports = router;

