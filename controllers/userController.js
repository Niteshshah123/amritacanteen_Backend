const User = require('../models/User');
const Product = require('../models/Product');

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId)
      .select('-passwordHash')
      .populate('cart.productId')
      .populate('likedDishes')
      .populate('orders');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName, phone, profileImage } = req.body;

    const user = await User.findByIdAndUpdate(
      req.session.userId,
      { fullName, phone, profileImage },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    res.json({ 
      message: 'Profile updated successfully', 
      user 
    });
  } catch (error) {
    next(error);
  }
};

exports.addAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);
    
    user.addresses.push(req.body);
    await user.save();

    res.json({ 
      message: 'Address added successfully', 
      addresses: user.addresses 
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);
    const address = user.addresses.id(req.params.id);

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    Object.assign(address, req.body);
    await user.save();

    res.json({ 
      message: 'Address updated successfully', 
      addresses: user.addresses 
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);
    user.addresses.pull(req.params.id);
    await user.save();

    res.json({ 
      message: 'Address deleted successfully', 
      addresses: user.addresses 
    });
  } catch (error) {
    next(error);
  }
};

// Cart operations
exports.getCart = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId).populate('cart.productId');
    res.json({ cart: user.cart });
  } catch (error) {
    next(error);
  }
};

exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const user = await User.findById(req.session.userId);
    const existingItem = user.cart.find(item => item.productId.toString() === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      user.cart.push({ productId, quantity });
    }

    await user.save();
    await user.populate('cart.productId');

    res.json({ 
      message: 'Item added to cart', 
      cart: user.cart 
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const user = await User.findById(req.session.userId);

    const cartItem = user.cart.find(item => item.productId.toString() === req.params.productId);
    
    if (!cartItem) {
      return res.status(404).json({ error: 'Item not in cart' });
    }

    cartItem.quantity = quantity;
    await user.save();
    await user.populate('cart.productId');

    res.json({ 
      message: 'Cart updated', 
      cart: user.cart 
    });
  } catch (error) {
    next(error);
  }
};

exports.removeFromCart = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);
    user.cart = user.cart.filter(item => item.productId.toString() !== req.params.productId);
    
    await user.save();
    await user.populate('cart.productId');

    res.json({ 
      message: 'Item removed from cart', 
      cart: user.cart 
    });
  } catch (error) {
    next(error);
  }
};

exports.clearCart = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);
    user.cart = [];
    await user.save();

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    next(error);
  }
};

// Favorites
exports.getFavorites = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId).populate('likedDishes');
    res.json({ favorites: user.likedDishes });
  } catch (error) {
    next(error);
  }
};

exports.addFavorite = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);
    
    if (!user.likedDishes.includes(req.params.productId)) {
      user.likedDishes.push(req.params.productId);
      await user.save();
    }

    await user.populate('likedDishes');
    res.json({ 
      message: 'Added to favorites', 
      favorites: user.likedDishes 
    });
  } catch (error) {
    next(error);
  }
};

exports.removeFavorite = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);
    user.likedDishes = user.likedDishes.filter(id => id.toString() !== req.params.productId);
    await user.save();

    await user.populate('likedDishes');
    res.json({ 
      message: 'Removed from favorites', 
      favorites: user.likedDishes 
    });
  } catch (error) {
    next(error);
  }
};

