const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  label: { 
    type: String, 
    enum: ['Home', 'Work', 'Other'], 
    default: 'Home' 
  },
  street: String,
  city: String,
  state: String,
  postalCode: String,
  country: String,
});

const cartItemSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product',
    required: true 
  },
  quantity: { 
    type: Number, 
    default: 1, 
    min: 1 
  },
});

const userSchema = new mongoose.Schema({
  fullName: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true 
  },
  phone: { 
    type: String, 
    required: true, 
    unique: true 
  },
  passwordHash: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'kitchen', 'staff', 'delivery'], 
    default: 'user' 
  },
  profileImage: String,
  
  addresses: [addressSchema],
  cart: [cartItemSchema],
  likedDishes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product' 
  }],
  orders: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order' 
  }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

