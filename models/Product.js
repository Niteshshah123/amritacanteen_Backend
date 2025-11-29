const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  description: String,
  imageUrl: { 
    type: String, 
    required: true 
  },
  price: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  discountPrice: { // price after discount is subtracted
    type: Number, 
    min: 0 
  },
  currency: { 
    type: String, 
    default: 'INR' 
  },
  
  rating: {
    average: { 
      type: Number, 
      default: 0, 
      min: 0, 
      max: 5 
    },
    count: { 
      type: Number, 
      default: 0 
    },
  },
  
  cuisine: {
    type: String,
    required: true,
    enum: [
      'South Indian',
      'North Indian',
      'Chinese',
      'Italian',
      'Mexican',
      'Continental',
      'Arabian',
      'Beverages',
      'Desserts'
    ],
  },
  
  categories: [{
    type: String,
    required: true,
    enum: [
      'Breakfast',
      'Lunch',
      'Dinner',
      'Snacks',
      'Beverages',
      'Desserts',
      'Main Course',
      'Rice Items',
      'Bread Items',
      'Thali'
    ],
  }],
  
  dietaryInfo: {
    isVegetarian: { type: Boolean, default: false },
    isVegan: { type: Boolean, default: false },
    isGlutenFree: { type: Boolean, default: false },
    isEggless: { type: Boolean, default: false },
    isJain: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
  },
  
  availability: {
    isAvailable: { type: Boolean, default: true },
    availableDays: {
      type: [String],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);

