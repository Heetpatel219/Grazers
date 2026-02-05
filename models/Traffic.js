const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Traffic",
  new mongoose.Schema({
    hour: String,
    visitors: Number
  })
);
