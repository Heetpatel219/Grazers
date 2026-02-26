const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: { type: Number }, // optional: product-level review
  store_id: { type: String },  // optional: store-level review
  store_name: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  storeReply: { type: String, default: '' },
  storeReplyAt: { type: Date }
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
module.exports.schema = reviewSchema;

