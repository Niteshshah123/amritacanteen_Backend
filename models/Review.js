const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  dishId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true,
    index: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  comment: { 
    type: String, 
    maxlength: 500 
  },
  likes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
}, { timestamps: true });

// Compound index for one review per product per user
reviewSchema.index({ dishId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);

