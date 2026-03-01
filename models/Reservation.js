const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  productId: { type: Number, required: true }, // Product.id
  productTitle: { type: String, required: true },
  store_id: { type: String },
  store_name: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  userName: { type: String, required: true },
  quantity: { type: Number, default: 1, min: 1 },
  priceAtReservation: { type: Number, default: 0 }, // for revenue when confirmed
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  preferredDate: { type: Date }, // date customer wants to visit store
  preferredTime: { type: String }, // e.g. "14:00" or "2:00 PM"
  createdAt: { type: Date, default: Date.now },
  confirmedAt: { type: Date } // when owner confirms = purchase
});

const Reservation = mongoose.model('Reservation', reservationSchema);
module.exports = Reservation;
module.exports.schema = reservationSchema;

