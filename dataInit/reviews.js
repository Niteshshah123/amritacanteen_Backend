const { ObjectId } = require('mongodb');

const reviews = [
  {
    _id: new ObjectId("68eba6004207804a11ff1ba0"),
    dishId: new ObjectId("68eba4004207804a11ff1b80"),
    userId: new ObjectId("68eba2f64207804a11ff1b63"),
    rating: 5,
    comment: "Best masala dosa in town! Crispy and flavorful.",
    likes: []
  },
  // Add all other reviews from the previous response...
];

module.exports = reviews;