const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');

exports.getProductReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ dishId: req.params.productId })
      .populate('userId', 'fullName profileImage')
      .sort({ createdAt: -1 });

    res.json({ reviews });
  } catch (error) {
    next(error);
  }
};

exports.createReview = async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Create review
    const review = new Review({
      dishId: productId,
      userId: req.session.userId,
      rating,
      comment,
    });

    await review.save();

    // Update product rating
    const allReviews = await Review.find({ dishId: productId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    product.rating.average = avgRating;
    product.rating.count = allReviews.length;
    await product.save();

    await review.populate('userId', 'fullName profileImage');

    res.status(201).json({ 
      message: 'Review submitted successfully', 
      review 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'You have already reviewed this product' });
    }
    next(error);
  }
};

exports.updateReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    const review = await Review.findOne({
      _id: req.params.id,
      userId: req.session.userId,
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    review.rating = rating;
    review.comment = comment;
    await review.save();

    // Update product rating
    const allReviews = await Review.find({ dishId: review.dishId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await Product.findByIdAndUpdate(review.dishId, {
      'rating.average': avgRating,
      'rating.count': allReviews.length,
    });

    res.json({ 
      message: 'Review updated successfully', 
      review 
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      userId: req.session.userId,
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const productId = review.dishId;
    await review.deleteOne();

    // Update product rating
    const allReviews = await Review.find({ dishId: productId });
    const avgRating = allReviews.length > 0 
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length 
      : 0;

    await Product.findByIdAndUpdate(productId, {
      'rating.average': avgRating,
      'rating.count': allReviews.length,
    });

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.likeReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    const userId = req.session.userId;

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userIdStr = userId.toString();
    const userHasLiked = review.likes.some(likeId => likeId.toString() === userIdStr);
    
    if (userHasLiked) {
      // User is unliking (was liked, now unliking)
      review.likes = review.likes.filter(likeId => likeId.toString() !== userIdStr);
    } else {
      // User is liking (was not liked, now liking)
      review.likes.push(userId);
    }

    await review.save();

    res.json({ 
      message: userHasLiked ? 'Review unliked' : 'Review liked', 
      likesCount: review.likes.length,
      hasLiked: !userHasLiked // This should be the NEW state after the operation
    });
  } catch (error) {
    next(error);
  }
};

// Get review count for a specific user
exports.getUserReviewCount = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    
    // Validate userId
    if (!userId || userId === 'undefined' || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        error: 'Valid user ID is required' 
      });
    }
    
    const reviewCount = await Review.countDocuments({ 
      userId: new mongoose.Types.ObjectId(userId) 
    });
    
    res.json({ 
      userId,
      reviewCount 
    });
  } catch (error) {
    next(error);
  }
};

