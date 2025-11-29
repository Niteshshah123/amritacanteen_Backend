const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { requireAuth } = require('../middleware/auth');

// Public routes
router.get('/product/:productId', reviewController.getProductReviews);

// Protected routes
router.post('/', requireAuth, reviewController.createReview);
router.put('/:id', requireAuth, reviewController.updateReview);
router.delete('/:id', requireAuth, reviewController.deleteReview);
router.post('/:id/like', requireAuth, reviewController.likeReview);
router.get('/user/:userId/count', reviewController.getUserReviewCount);

module.exports = router;

