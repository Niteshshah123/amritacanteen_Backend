const { ObjectId } = require('mongodb');

const products = [
  {
    _id: new ObjectId("68eba4004207804a11ff1b80"),
    name: "Masala Dosa",
    description: "Crispy rice crepe filled with spiced potatoes, served with sambar and chutney",
    imageUrl: "/images/masala-dosa.jpg",
    price: 80,
    discountPrice: 70,
    currency: "INR",
    rating: { average: 4.5, count: 24 },
    cuisine: "South Indian",
    categories: ["Breakfast", "Main Course"],
    dietaryInfo: {
      isVegetarian: true,
      isVegan: true,
      isGlutenFree: false,
      isEggless: true,
      isJain: false,
      isBestSeller: true
    },
    availability: {
      isAvailable: true,
      availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    }
  },
  {
    _id: new ObjectId("68eba4004207804a11ff1b81"),
    name: "Idli Sambar",
    description: "Soft steamed rice cakes served with lentil soup and coconut chutney",
    imageUrl: "/images/idli-sambar.jpg",
    price: 60,
    discountPrice: 50,
    currency: "INR",
    rating: { average: 4.3, count: 18 },
    cuisine: "South Indian",
    categories: ["Breakfast"],
    dietaryInfo: {
      isVegetarian: true,
      isVegan: true,
      isGlutenFree: true,
      isEggless: true,
      isJain: true,
      isBestSeller: true
    },
    availability: {
      isAvailable: true,
      availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    }
  },
  // Add all other products from the previous response...
];

module.exports = products;