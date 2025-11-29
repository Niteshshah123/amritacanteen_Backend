const mongoose = require('mongoose');

/* -------------------------------
   ORDER ITEM SCHEMA (Subdocument)
--------------------------------*/
const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    /* ITEM STATUS */
    status: {
      type: String,
      enum: ["pending", "preparing", "ready", "rejected", "cancelled"],
      default: "pending",
    },

    /* STAFF WHO LAST UPDATED STATUS (tracking performance) */
    statusUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    rejectionMessage: {
      type: String,
      default: null,
    },

    preparationTime: Number,
  },
  { _id: true }
);

/* -------------------------------
   ORDER SCHEMA (Main Document)
--------------------------------*/
const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: [orderItemSchema],

    /* OVERALL ORDER STATUS */
    overallStatus: {
      type: String,
      enum: ["pending", "preparing", "ready", "cancelled", "rejected", "completed"],
      default: "pending",
      index: true,
    },

    /* If ADMIN rejects the entire order */
    rejectionMessage: {
      type: String,
      default: null,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
