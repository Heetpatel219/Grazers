const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Inventory",
  new mongoose.Schema({
    name: String,
    category: String,
    sold: Number
  })
);
