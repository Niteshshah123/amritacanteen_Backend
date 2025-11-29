const Order = require('../models/Order');
const { getIO } = require('../config/socket');

/* ------------------------------------------
   GET ALL ACTIVE KITCHEN ORDERS
---------------------------------------------*/
exports.getKitchenOrders = async (req, res, next) => {
  try {
    const { status } = req.query;

    const filter = {
      overallStatus: { $in: ["pending", "preparing", "ready"] },
    };

    if (status) filter.overallStatus = status;

    const orders = await Order.find(filter)
      .populate("userId", "fullName phone")
      .populate("items.statusUpdatedBy", "fullName")
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (error) {
    next(error);
  }
};

/* ------------------------------------------
   GET ORDER STATS
---------------------------------------------*/
exports.getOrderStats = async (req, res, next) => {
  try {
    const stats = await Order.aggregate([
      {
        $match: {
          overallStatus: { $in: ["pending", "preparing", "ready"] },
        }
      },
      {
        $group: {
          _id: "$overallStatus",
          count: { $sum: 1 },
        }
      }
    ]);

    const result = {
      pending: 0,
      preparing: 0,
      ready: 0,
    };

    stats.forEach(s => result[s._id] = s.count);

    res.json({ stats: result });
  } catch (error) {
    next(error);
  }
};

exports.rejectOrderItem = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const { staffId, reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.json({
        success: false,
        message: "Rejection reason is required. Please refresh and try again."
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.json({ success: false, message: "Order not found. Refresh page." });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.json({ success: false, message: "Item not found. Refresh page." });
    }

    // ❌ Prevent rejecting already cancelled items
    if (item.status === "cancelled") {
      return res.json({
        success: false,
        message: "This item is already cancelled by user. Refresh the page."
      });
    }

    const oldStatus = item.status;

    item.status = "rejected";
    item.statusUpdatedBy = staffId;
    item.rejectionMessage = reason;

    // --- UPDATE OVERALL STATUS ---
    const statuses = order.items.map(i => i.status);

    const allCancelled = statuses.every(s => s === "cancelled");
    const activeItems = order.items.filter(
      i => !["cancelled", "rejected"].includes(i.status)
    );

    if (allCancelled) {
      order.overallStatus = "cancelled";
    } else if (activeItems.length === 0) {
      order.overallStatus = "rejected";
    } else {
      const priority = { pending: 1, preparing: 2, ready: 3 };
      order.overallStatus = activeItems.sort(
        (a, b) => priority[a.status] - priority[b.status]
      )[0].status;
    }

    await order.save();
    await order.populate("items.statusUpdatedBy", "fullName");

    getIO().emit("order:item_update", {
      orderId,
      itemId,
      itemName: item.productName,
      oldStatus,
      newStatus: "rejected",
      staffName: item.statusUpdatedBy?.fullName,
      reason: item.rejectionMessage,
      overallStatus: order.overallStatus,
    });

    return res.json({
      success: true,
      message: "Item rejected successfully",
      order,
    });

  } catch (error) {
    next(error);
  }
};

exports.updateItemStatus = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const { status, staffId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.json({ success: false, message: "Order not found. Refresh page." });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.json({ success: false, message: "Item not found. Refresh page." });
    }

    // ❌ Do NOT update cancelled/rejected items
    if (item.status === "cancelled" || item.status === "rejected") {
      return res.json({
        success: false,
        message:
          "This item was cancelled or rejected. Please refresh to see updated order.",
      });
    }

    const oldStatus = item.status;

    item.status = status;
    item.statusUpdatedBy = staffId;

    // --- UPDATE OVERALL STATUS ---
    const statuses = order.items.map(i => i.status);

    const allCancelled = statuses.every(s => s === "cancelled");
    const activeItems = order.items.filter(
      i => !["cancelled", "rejected"].includes(i.status)
    );

    if (allCancelled) {
      order.overallStatus = "cancelled";
    } else if (activeItems.length === 0) {
      order.overallStatus = "rejected";
    } else {
      const priority = { pending: 1, preparing: 2, ready: 3 };
      order.overallStatus = activeItems.sort(
        (a, b) => priority[a.status] - priority[b.status]
      )[0].status;
    }

    await order.save();
    await order.populate("items.statusUpdatedBy", "fullName");

    getIO().emit("order:item_update", {
      orderId,
      itemId,
      itemName: item.productName,
      oldStatus,
      newStatus: status,
      staffName: item.statusUpdatedBy?.fullName,
      overallStatus: order.overallStatus,
    });

    return res.json({
      success: true,
      message: "Item status updated successfully",
      order,
    });

  } catch (error) {
    next(error);
  }
};

/* ------------------------------------------
   COMPLETE SINGLE ITEM (MARK READY)
---------------------------------------------*/
exports.completeOrderItem = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const { staffId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({ error: "Item not found" });

    item.status = "ready";
    item.statusUpdatedBy = staffId;

    const allReady = order.items.every(i => i.status === "ready" || i.status === "rejected");
    order.overallStatus = allReady ? "ready" : order.overallStatus;

    await order.save();
    await order.populate("items.statusUpdatedBy", "fullName");

    const remaining = order.items.filter(i => i.status !== "ready" && i.status !== "rejected").length;

    const io = getIO();
    io.emit("order:item_ready", {
      orderId,
      itemId,
      itemName: item.productName,
      remainingItems: remaining,
    });

    if (allReady) {
      io.emit("order:all_ready", {
        orderId,
        message: "Order ready for pickup",
      });
    }

    res.json({ message: "Item completed", order });
  } catch (error) {
    next(error);
  }
};
