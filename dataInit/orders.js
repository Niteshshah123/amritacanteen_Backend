const { ObjectId } = require('mongodb');

const orders = [
  {
    _id: new ObjectId("68eba5004207804a11ff1b90"),
    userId: new ObjectId("68eba2f64207804a11ff1b63"),
    items: [
      {
        productId: new ObjectId("68eba4004207804a11ff1b80"),
        productName: "Masala Dosa",
        price: 70,
        quantity: 2,
        status: "ready",
        assignedStaff: null,
        preparationTime: 15
      },
      {
        productId: new ObjectId("68eba4004207804a11ff1b87"),
        productName: "Masala Chai",
        price: 15,
        quantity: 2,
        status: "ready",
        assignedStaff: null,
        preparationTime: 5
      }
    ],
    overallStatus: "ready",
    paymentStatus: "paid",
    totalAmount: 170,
    address: {
      street: "MG Road",
      city: "Bangalore",
      state: "Karnataka",
      postalCode: "560001",
      country: "India"
    }
  },
  // Add all other orders from the previous response...
];

module.exports = orders;