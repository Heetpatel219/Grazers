const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    store_id: String,
    store_name: String,
    title: String,
    category: String,
    keywords: [String],
    images: String,
    price: { type: Number, required: true },
    original_price: { type: Number },
    quantity: { type: Number, default: 0 },
    description: String,
    is_featured: { type: Boolean, default: false },
    is_best_seller: { type: Boolean, default: false }
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
module.exports.schema = productSchema;