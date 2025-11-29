const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const productController = require('../controllers/productController');
const { requireRole } = require('../middleware/auth');
const { productValidation } = require('../middleware/validation');

// All admin routes require admin role
router.use(requireRole(['admin']));

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// Order management
router.get('/orders', adminController.getAllOrders);
router.put('/orders/:id/status', adminController.updateOrderStatus);

// Product management
router.post('/products', productValidation, productController.createProduct);
router.put('/products/:id', productController.updateProduct);
router.put('/products/:id/availability', productController.updateAvailability);
router.put('/products/:id/discount', productController.updateDiscount);
router.delete('/products/:id', adminController.deleteProduct);

// Staff management
// router.post('/staff', adminController.createStaff);
// router.get('/staff', adminController.getAllStaff);

// Expense management
router.post('/expenses', adminController.createExpense);
router.get('/expenses', adminController.getAllExpenses);

// Refund
router.post("/refund", adminController.processRefund);
router.get('/orders/:id', adminController.getOrderById);
router.post('/orders/:id/refund', adminController.processRefund);

// Analytics
router.get('/analytics/top-customers', adminController.getTopCustomers);
router.get('/analytics/staff-performance', adminController.getStaffPerformance);


module.exports = router;

