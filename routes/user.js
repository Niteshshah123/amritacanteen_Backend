const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

// All user routes require authentication
router.use(requireAuth);

// Profile
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

// Addresses
router.post('/addresses', userController.addAddress);
router.put('/addresses/:id', userController.updateAddress);
router.delete('/addresses/:id', userController.deleteAddress);

// Favorites
router.get('/favorites', userController.getFavorites);
router.post('/favorites/:productId', userController.addFavorite);
router.delete('/favorites/:productId', userController.removeFavorite);

module.exports = router;

