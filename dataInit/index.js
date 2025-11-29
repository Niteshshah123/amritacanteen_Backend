const mongoose = require('mongoose');
const products = require('./products');
const orders = require('./orders');
const reviews = require('./reviews');
const expenses = require('./expenses');

// Import your models
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Expense = require('../models/Expense');
const User = require('../models/User');

// MongoDB connection URL - update with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/canteen_management';

const initializeData = async () => {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB successfully');

    // Clear existing data (optional - be careful in production)
    console.log('🧹 Clearing existing data...');
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Review.deleteMany({});
    await Expense.deleteMany({});
    console.log('✅ Existing data cleared');

    // Step 1: Insert Products
    console.log('📦 Inserting products...');
    const insertedProducts = await Product.insertMany(products);
    console.log(`✅ ${insertedProducts.length} products inserted`);

    // Step 2: Insert Orders
    console.log('📦 Inserting orders...');
    const insertedOrders = await Order.insertMany(orders);
    console.log(`✅ ${insertedOrders.length} orders inserted`);

    // Step 3: Insert Reviews
    console.log('⭐ Inserting reviews...');
    const insertedReviews = await Review.insertMany(reviews);
    console.log(`✅ ${insertedReviews.length} reviews inserted`);

    // Step 4: Insert Expenses
    console.log('💰 Inserting expenses...');
    const insertedExpenses = await Expense.insertMany(expenses);
    console.log(`✅ ${insertedExpenses.length} expenses inserted`);

    // Step 5: Update Users with references
    console.log('👤 Updating users with references...');
    
    // Update Nitesh Kumar Sah
    await User.findByIdAndUpdate(
      '68eba2f64207804a11ff1b63',
      {
        $set: {
          orders: [
            '68eba5004207804a11ff1b90', // Order 1
            '68eba5004207804a11ff1b92'  // Order 3
          ],
          likedDishes: [
            '68eba4004207804a11ff1b80', // Masala Dosa
            '68eba4004207804a11ff1b87', // Masala Chai
            '68eba4004207804a11ff1b84'  // Paneer Butter Masala
          ],
          addresses: [
            {
              label: "Home",
              street: "MG Road",
              city: "Bangalore",
              state: "Karnataka",
              postalCode: "560001",
              country: "India"
            }
          ],
          cart: [
            {
              productId: '68eba4004207804a11ff1b82', // Veg Biryani
              quantity: 1
            }
          ]
        }
      }
    );

    // Update Anmol Kumar Sah
    await User.findByIdAndUpdate(
      '68eba3954207804a11ff1b75',
      {
        $set: {
          orders: [
            '68eba5004207804a11ff1b91' // Order 2
          ],
          likedDishes: [
            '68eba4004207804a11ff1b83', // Chicken Biryani
            '68eba4004207804a11ff1b89'  // Gulab Jamun
          ],
          addresses: [
            {
              label: "Work",
              street: "Brigade Road",
              city: "Bangalore",
              state: "Karnataka",
              postalCode: "560025",
              country: "India"
            }
          ],
          cart: [
            {
              productId: '68eba4004207804a11ff1b86', // Chicken Noodles
              quantity: 2
            }
          ]
        }
      }
    );

    console.log('✅ Users updated successfully');

    // Verify data insertion
    console.log('\n📊 Data Initialization Summary:');
    console.log(`🍽️  Products: ${await Product.countDocuments()}`);
    console.log(`📦 Orders: ${await Order.countDocuments()}`);
    console.log(`⭐ Reviews: ${await Review.countDocuments()}`);
    console.log(`💰 Expenses: ${await Expense.countDocuments()}`);
    
    const nitesh = await User.findById('68eba2f64207804a11ff1b63');
    const anmol = await User.findById('68eba3954207804a11ff1b75');
    
    console.log(`👤 Nitesh - Orders: ${nitesh.orders.length}, Favorites: ${nitesh.likedDishes.length}`);
    console.log(`👤 Anmol - Orders: ${anmol.orders.length}, Favorites: ${anmol.likedDishes.length}`);

    console.log('\n🎉 Data initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during data initialization:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('🔗 Database connection closed');
  }
};

// Run the initialization if this script is executed directly
if (require.main === module) {
  initializeData();
}

module.exports = initializeData;