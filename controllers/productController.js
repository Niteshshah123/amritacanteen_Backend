const Product = require('../models/Product');

exports.getAllProducts = async (req, res, next) => {
  try {
    const { 
      cuisine, 
      category, 
      isVegetarian, 
      isAvailable, 
      search,
      page = 1,
      limit = 20 
    } = req.query;

    const filter = {};

    if (cuisine) filter.cuisine = cuisine;
    if (category) filter.categories = category;
    if (isVegetarian !== undefined) filter['dietaryInfo.isVegetarian'] = isVegetarian === 'true';
    if (isAvailable !== undefined) filter['availability.isAvailable'] = isAvailable === 'true';
    if (search) filter.name = { $regex: search, $options: 'i' };

    const products = await Product.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Product.countDocuments(filter);

    res.json({
      products,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    next(error);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const cuisines = await Product.distinct('cuisine');
    const categories = await Product.distinct('categories');

    res.json({ cuisines, categories });
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const product = new Product(req.body);
    await product.save();

    // Emit socket event for new product
    const io = require('../config/socket').getIO();
    io.emit('product:new', {
      productId: product._id,
      name: product.name,
      price: product.price,
      discountPrice: product.discountPrice,
      imageUrl: product.imageUrl,
      category: product.categories[0],
    });

    res.status(201).json({ 
      message: 'Product created successfully', 
      product 
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Emit socket event for product update
    const io = require('../config/socket').getIO();
    io.emit('product:update', {
      productId: product._id,
      name: product.name,
      isAvailable: product.availability.isAvailable,
      updatedFields: Object.keys(req.body),
    });

    res.json({ 
      message: 'Product updated successfully', 
      product 
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAvailability = async (req, res, next) => {
  try {
    const { isAvailable } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { 'availability.isAvailable': isAvailable },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Emit socket event
    const io = require('../config/socket').getIO();
    io.emit('product:update', {
      productId: product._id,
      name: product.name,
      isAvailable: product.availability.isAvailable,
    });

    res.json({ 
      message: 'Availability updated successfully', 
      product 
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDiscount = async (req, res, next) => {
  try {
    const { discountPrice } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { discountPrice },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Emit socket event
    const io = require('../config/socket').getIO();
    const discountPercent = ((product.price - discountPrice) / product.price * 100).toFixed(0);
    
    io.emit('discount:update', {
      productId: product._id,
      name: product.name,
      oldPrice: product.price,
      newPrice: discountPrice,
      discountPercent,
    });

    res.json({ 
      message: 'Discount updated successfully', 
      product 
    });
  } catch (error) {
    next(error);
  }
};

