const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Reservation",
  new mongoose.Schema({
    customerName: String,
    time: String,
    status: String
  })
);
