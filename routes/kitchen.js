const express = require('express');
const router = express.Router();
const kitchenController = require('../controllers/kitchenController');
const { requireRole } = require('../middleware/auth');

// All kitchen routes require kitchen_staff or admin role
router.use(requireRole(['kitchen']));

router.get('/orders', kitchenController.getKitchenOrders);
router.get('/orders/stats', kitchenController.getOrderStats);
// router.post('/orders/:orderId/items/:itemId/accept', kitchenController.acceptOrderItem);
router.post('/orders/:orderId/items/:itemId/reject', kitchenController.rejectOrderItem);
router.put('/orders/:orderId/items/:itemId/status', kitchenController.updateItemStatus);
router.post('/orders/:orderId/items/:itemId/complete', kitchenController.completeOrderItem);

module.exports = router;

