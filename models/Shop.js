const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  store_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  image: { type: String, default: 'https://via.placeholder.com/1200x400' },
  hours: {
    monday: { type: String, default: '9:00 AM - 9:00 PM' },
    tuesday: { type: String, default: '9:00 AM - 9:00 PM' },
    wednesday: { type: String, default: '9:00 AM - 9:00 PM' },
    thursday: { type: String, default: '9:00 AM - 9:00 PM' },
    friday: { type: String, default: '9:00 AM - 9:00 PM' },
    saturday: { type: String, default: '10:00 AM - 8:00 PM' },
    sunday: { type: String, default: '10:00 AM - 6:00 PM' }
  }
});

module.exports = mongoose.model('Shop', shopSchema);
