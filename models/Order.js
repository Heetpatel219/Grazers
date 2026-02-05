const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Order",
  new mongoose.Schema({
    total: Number,
    createdAt: {
      type: Date,
      default: Date.now
    }
  })
);
