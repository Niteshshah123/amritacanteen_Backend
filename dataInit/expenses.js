const { ObjectId } = require('mongodb');

const expenses = [
  {
    _id: new ObjectId("68eba7004207804a11ff1bb0"),
    type: "inventory",
    amount: 5000,
    date: new Date("2024-10-10T00:00:00Z"),
    note: "Vegetables and groceries purchase",
    recordedBy: new ObjectId("68eba2f64207804a11ff1b63")
  },
  // Add all other expenses from the previous response...
];

module.exports = expenses;