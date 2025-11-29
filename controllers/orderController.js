const Order = require('../models/Order');
const User = require('../models/User');
const { getIO } = require('../config/socket');

exports.getUserOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.session.userId })
      .populate('items.productId')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    next(error);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.productId')
      .populate('userId', 'fullName email phone');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user owns this order or is admin/kitchen staff
    if (order.userId._id.toString() !== req.session.userId && 
        !['admin', 'kitchen_staff'].includes(req.session.userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
};

exports.placeOrder = async (req, res, next) => {
  try {
    const { items, totalAmount, address } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // Create order
    const order = new Order({
      userId: req.session.userId,
      items: items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        status: 'pending',
      })),
      totalAmount,
      address,
      overallStatus: 'pending',
      paymentStatus: 'pending',
    });

    await order.save();

    // Add order to user's orders
    await User.findByIdAndUpdate(req.session.userId, {
      $push: { orders: order._id },
      $set: { cart: [] }, // Clear cart
    });

    // Populate order for response
    await order.populate('userId', 'fullName email phone');

    // Emit socket event for new order
    const io = getIO();
    io.emit('order:new', {
      orderId: order._id,
      userId: order.userId._id,
      userName: order.userId.fullName,
      items: order.items,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
    });

    res.status(201).json({ 
      message: 'Order placed successfully', 
      order 
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelOrder = async (req, res, next) => {
  try {
    const { items: selectedItemIds, reason } = req.body;

    if (!selectedItemIds || selectedItemIds.length === 0) {
      return res.status(400).json({ error: "Select at least one item to cancel" });
    }

    if (!reason || reason.trim() === "") {
      return res.status(400).json({ error: "Cancellation reason is required" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderUserId = order.userId?.toString();
    const currentUserId = req.session.userId?.toString();

    if (orderUserId !== currentUserId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (["delivered", "cancelled", "rejected"].includes(order.overallStatus)) {
      return res.status(400).json({ error: "Cannot cancel this order" });
    }

    // ----------------------------------------------------
    // CANCEL SELECTED ITEMS
    // ----------------------------------------------------
    let cancelledCount = 0;

    order.items.forEach(item => {
      if (selectedItemIds.includes(item._id.toString())) {
        item.status = "cancelled";
        item.rejectionMessage = reason;
        cancelledCount++;
      }
    });

    if (cancelledCount === 0) {
      return res.status(400).json({ error: "No valid items found to cancel" });
    }

    // ----------------------------------------------------
    // UPDATE OVERALL STATUS (Corrected Logic)
    // ----------------------------------------------------
    const statuses = order.items.map(i => i.status);

    // Case 1: ALL items cancelled
    const allCancelled = statuses.every(s => s === "cancelled");

    // Case 2: ALL items are either cancelled or rejected
    const allRejectedOrCancelled = statuses.every(
      s => s === "cancelled" || s === "rejected"
    );

    // ACTIVE ITEMS (pending/preparing/ready)
    const activeItems = order.items.filter(
      i => !["cancelled", "rejected"].includes(i.status)
    );

    if (allCancelled) {
      // CASE 1 → all cancelled
      order.overallStatus = "cancelled";
    } 
    else if (activeItems.length === 0) {
      // CASE 2 → all items are rejected or cancelled
      order.overallStatus = "rejected";
    } 
    else {
      // CASE 3 → determine lowest priority active status
      const priority = { pending: 1, preparing: 2, ready: 3 };

      const lowestActive = activeItems.sort(
        (a, b) => priority[a.status] - priority[b.status]
      )[0].status;

      order.overallStatus = lowestActive;
    }


    await order.save();

    // SOCKET EMIT
    const io = getIO();
    io.emit("order:cancelled", {
      orderId: order._id,
      cancelledItems: selectedItemIds,
      reason,
      user: req.session.userId,
      updatedAt: new Date(),
      overallStatus: order.overallStatus,
    });

    return res.json({
      message: "Selected items cancelled successfully",
      order,
    });

  } catch (error) {
    next(error);
  }
};

exports.confirmPayment = async (req, res, next) => {
  try {
    const { orderId, paymentId, status } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.paymentStatus = status;
    await order.save();

    if (status === 'paid') {
      // Emit socket event for payment confirmation
      const io = getIO();
      io.emit('order:paid', {
        orderId: order._id,
        userId: order.userId,
        amount: order.totalAmount,
        paymentMethod: 'online',
        paidAt: new Date(),
      });
    }

    res.json({ 
      message: 'Payment status updated', 
      order 
    });
  } catch (error) {
    next(error);
  }
};

