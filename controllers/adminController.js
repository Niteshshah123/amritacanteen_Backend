const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Expense = require('../models/Expense');
const Review = require('../models/Review');
const { getIO } = require('../config/socket');
const path = require('path');
const fs = require('fs').promises;

exports.getDashboardStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // ---------------------------
    // CURRENT PERIOD FILTER
    // ---------------------------
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // ---------------------------
    // LAST MONTH DATE RANGE
    // ---------------------------
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const firstDayLastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

    const lastDayLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0
    );

    const lastMonthDateFilter = {
      createdAt: {
        $gte: firstDayLastMonth,
        $lte: lastDayLastMonth,
      },
    };

    // ---------------------------
    // CURRENT METRICS

    const revenueData = await Order.aggregate([
      { $match: { ...dateFilter, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = revenueData[0]?.total || 0;

    const totalOrders = await Order.countDocuments(dateFilter);

    const ordersByStatus = await Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$overallStatus', count: { $sum: 1 } } },
    ]);

    const topProducts = await Order.aggregate([
      { $match: { ...dateFilter, overallStatus: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: '$items.quantity' },
          revenue: {
            $sum: { $multiply: ['$items.price', '$items.quantity'] },
          },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]);

    await Product.populate(topProducts, {
      path: '_id',
      select: 'name imageUrl',
    });

    const totalCustomers = await User.countDocuments({ role: 'user' });

    const expenseData = await Expense.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalExpenses = expenseData[0]?.total || 0;

    // ---------------------------
    // LAST MONTH METRICS
    // ---------------------------

    const lastMonthRevenueData = await Order.aggregate([
      { $match: { ...lastMonthDateFilter, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const lastMonthRevenue = lastMonthRevenueData[0]?.total || 0;

    const lastMonthOrders = await Order.countDocuments(lastMonthDateFilter);

    const lastMonthExpensesData = await Expense.aggregate([
      {
        $match: {
          date: {
            $gte: firstDayLastMonth,
            $lte: lastDayLastMonth,
          },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const lastMonthExpenses = lastMonthExpensesData[0]?.total || 0;

    const lastMonthProfit = lastMonthRevenue - lastMonthExpenses;

    // Customers last month → count users who placed at least one order last month
    const lastMonthCustomerIds = await Order.distinct('userId', lastMonthDateFilter);
    const lastMonthCustomers = lastMonthCustomerIds.length;

    // ---------------------------
    // FINAL RESPONSE
    // ---------------------------
    res.json({
      // Current stats
      totalRevenue,
      totalOrders,
      totalCustomers,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      ordersByStatus,
      topProducts,

      // Last month stats (for frontend comparison)
      lastMonthRevenue,
      lastMonthOrders,
      lastMonthCustomers,
      lastMonthExpenses,
      lastMonthProfit,
    });
  } catch (error) {
    next(error);
  }
};


exports.getAllOrders = async (req, res, next) => {
  try {
    const { status, paymentStatus, page = 1, limit = 20, range } = req.query;

    const filter = {};

    if (status) filter.overallStatus = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    // -------------------------------
    // 🔥 DATE RANGE FILTER
    // -------------------------------
    if (range) {
      const now = new Date();
      let startDate;

      if (range === "today") {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } 
      else if (range === "7days") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } 
      else if (range === "30days") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      if (startDate) {
        filter.createdAt = { $gte: startDate };
      }
    }

    const orders = await Order.find(filter)
      .populate("userId", "fullName email phone")
      .populate("items.productId", "name imageUrl")
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

      
      const count = await Order.countDocuments(filter);

    res.json({
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, rejectionMessage, activeCount } = req.body;
    const orderId = req.params.id;

    let order = await Order.findById(orderId).populate("userId", "fullName");
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const oldStatus = order.overallStatus;

    /* -------------------------------------------------------
         🔥 CHECK REALTIME ITEM STATE
         Count items that admin is ALLOWED to modify
    ------------------------------------------------------- */

    const currentActiveCount = order.items.filter(
      (i) => i.status !== "cancelled" && i.status !== "rejected"
    ).length;

    // If admin’s view is outdated → reject
    if (currentActiveCount !== activeCount) {
      return res.status(409).json({
        error: "Some items were cancelled or rejected. Please refresh the page.",
      });
    }

    /* -------------------------------------------------------
         🔥 ADMIN REJECTION
    ------------------------------------------------------- */

    if (status === "rejected") {
      if (!rejectionMessage || !rejectionMessage.trim()) {
        return res.status(400).json({ error: "Rejection message is required" });
      }

      order.overallStatus = "rejected";
      order.rejectionMessage = rejectionMessage;
    } 
    else {
      // COMPLETED or READY or DELIVERED etc.
      order.overallStatus = status;
      order.rejectionMessage = null;
    }

    await order.save();

    /* -------------------------------------------------------
         SOCKET
    ------------------------------------------------------- */
    getIO().emit("order:update", {
      orderId: order._id,
      userId: order.userId._id,
      oldStatus,
      newStatus: order.overallStatus,
      updatedBy: "admin",
      timestamp: new Date(),
    });

    res.json({ message: "Order updated", order });

  } catch (error) {
    next(error);
  }
};


exports.createStaff = async (req, res, next) => {
  try {
    const bcrypt = require('bcryptjs');
    const { fullName, email, phone, password, role } = req.body;

    if (!['admin', 'kitchen_staff'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const staff = new User({
      fullName,
      email,
      phone,
      passwordHash,
      role,
    });

    await staff.save();

    res.status(201).json({ 
      message: 'Staff created successfully', 
      staff: {
        id: staff._id,
        fullName: staff.fullName,
        email: staff.email,
        role: staff.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllStaff = async (req, res, next) => {
  try {
    const staff = await User.find({ 
      role: { $in: ['admin', 'kitchen_staff'] } 
    }).select('-passwordHash');

    res.json({ staff });
  } catch (error) {
    next(error);
  }
};

exports.createExpense = async (req, res, next) => {
  try {
    const expense = new Expense({
      ...req.body,
      recordedBy: req.session.userId,
    });

    await expense.save();

    res.status(201).json({ 
      message: 'Expense recorded successfully', 
      expense 
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllExpenses = async (req, res, next) => {
  try {
    const { startDate, endDate, type } = req.query;

    const filter = {};
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    if (type) filter.type = type;

    const expenses = await Expense.find(filter)
      .populate('recordedBy', 'fullName')
      .sort({ date: -1 });

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    res.json({ expenses, total });
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete the image file if it exists
    if (product.imageUrl) {
      try {
        const filename = product.imageUrl.split('/').pop();
        const imagePath = path.join(__dirname, '../public/images', filename);
        await fs.unlink(imagePath);
        console.log(`🗑️  Deleted image file: ${filename}`);
      } catch (error) {
        console.warn('⚠️  Could not delete image file:', error.message);
        // Continue with product deletion even if image deletion fails
      }
    }

    // Optional: Check if product has active orders before deletion
    // You might want to add this check based on your order system

    // Delete all reviews associated with this product
    await Review.deleteMany({ productId: req.params.id });

    // Delete the product
    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting product',
      error: error.message
    });
  }
};

exports.processRefund = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const orderId = req.params.id;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.paymentStatus !== "paid") {
      return res.status(400).json({ error: "Order was not paid" });
    }

    const refundAmount = Number(amount) || 0;

    order.totalAmount = Math.max(0, order.totalAmount - refundAmount);

    order.paymentStatus = "refunded";

    const allRejectedOrCancelled = order.items.every(
      i => i.status === "rejected" || i.status === "cancelled"
    );

    order.overallStatus = allRejectedOrCancelled ? "rejected" : "completed";

    await order.save();

    // -------------------------------------------------------
    // 🔥 SOCKET EMIT
    // -------------------------------------------------------
    const io = getIO();
    io.emit("order:refund", {
      orderId,
      amount: refundAmount,
      newTotal: order.totalAmount,
      status: order.overallStatus,
      refundedAt: new Date(),
    });

    return res.json({
      message: "Refund processed successfully",
      refundedAmount: refundAmount,
      newTotalAmount: order.totalAmount,
      order,
    });

  } catch (error) {
    next(error);
  }
};


exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'fullName email phone')
      .populate('items.productId', 'name imageUrl');

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
};

// Small helper: build dateFilter from ?range=
function buildDateFilterFromRange(range) {
  if (!range || range === 'all') return {};

  const now = new Date();
  const start = new Date(now); // copy

  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
    return { createdAt: { $gte: start, $lte: now } };
  }

  if (range === '7days') {
    start.setDate(start.getDate() - 7);
    return { createdAt: { $gte: start, $lte: now } };
  }

  if (range === '30days') {
    start.setDate(start.getDate() - 30);
    return { createdAt: { $gte: start, $lte: now } };
  }

  return {};
}

/* -----------------------------------------
   TOP CUSTOMERS (by total spent)
   GET /admin/analytics/top-customers?range=7days&page=1&limit=10
------------------------------------------*/
exports.getTopCustomers = async (req, res, next) => {
  try {
    const { range = '30days', page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    const dateFilter = buildDateFilterFromRange(range);

    // Only consider PAID orders
    const matchStage = {
      paymentStatus: 'paid',
      ...dateFilter,
    };

    const aggPipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$userId',
          totalSpent: { $sum: '$totalAmount' },
          ordersCount: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
    ];

    const allResults = await Order.aggregate(aggPipeline);

    const total = allResults.length;
    const totalPages = Math.ceil(total / limitNum);

    const pagedResults = allResults.slice(
      (pageNum - 1) * limitNum,
      pageNum * limitNum
    );

    // Populate user info
    await User.populate(pagedResults, {
      path: '_id',
      select: 'fullName email phone',
    });

    const customers = pagedResults.map((c) => ({
      user: c._id,
      totalSpent: c.totalSpent,
      ordersCount: c.ordersCount,
    }));

    res.json({
      customers,
      total,
      totalPages,
      currentPage: pageNum,
    });
  } catch (err) {
    next(err);
  }
};

/* -----------------------------------------
   STAFF PERFORMANCE
   GET /admin/analytics/staff-performance?range=7days
------------------------------------------*/
exports.getStaffPerformance = async (req, res, next) => {
  try {
    const { range = '30days' } = req.query;

    const dateFilter = buildDateFilterFromRange(range);

    const matchStage = {
      ...dateFilter,
    };

    const pipeline = [
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $match: {
          'items.status': 'ready',             // only items that reached "ready"
          'items.statusUpdatedBy': { $ne: null },
        },
      },
      {
        $group: {
          _id: '$items.statusUpdatedBy',
          itemsPrepared: { $sum: 1 },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: {
            $sum: { $multiply: ['$items.price', '$items.quantity'] },
          },
          totalPrepTime: { $sum: { $ifNull: ['$items.preparationTime', 0] } },
        },
      },
      { $sort: { itemsPrepared: -1 } },
    ];

    const results = await Order.aggregate(pipeline);

    // Populate staff info
    await User.populate(results, {
      path: '_id',
      select: 'fullName email phone role',
    });

    const staff = results.map((s) => ({
      staff: s._id,
      itemsPrepared: s.itemsPrepared,
      totalQuantity: s.totalQuantity,
      totalRevenue: s.totalRevenue,
      totalPrepTime: s.totalPrepTime,
      avgPrepTimePerItem:
        s.itemsPrepared > 0 ? s.totalPrepTime / s.itemsPrepared : 0,
    }));

    res.json({ staff });
  } catch (err) {
    next(err);
  }
};
