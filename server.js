const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const Shop = require('./models/Shop');
const ReservationModel = require('./models/Reservation');
const ReviewModel = require('./models/Review');
const Category = require('./models/Category');
const ProductModel = require('./models/Product');
const grazersConn = mongoose.createConnection('mongodb://127.0.0.1:27017/Grazers');
const Product = grazersConn.model('Product', ProductModel.schema);
const Reservation = grazersConn.model('Reservation', ReservationModel.schema);
const Review = grazersConn.model('Review', ReviewModel.schema);

const app = express();
const PORT = 3000;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
  secret: 'mysecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
/**
 * Formally establishes MongoDB persistence channels ensuring robust state networking.
 */
mongoose.connect('mongodb://127.0.0.1:27017/Users')
  .then(async () => {
    console.log("Success: Connected to Local MongoDB");

    try {
      const discountedProducts = await Product.find({ original_price: { $exists: true } });
      let resetCount = 0;
      for (const p of discountedProducts) {
        if (p.original_price > p.price) {
          p.price = p.original_price;
          await p.save();
          resetCount++;
        }
      }
      if (resetCount > 0) {
        console.log(`[Revert] Automatically reset ${resetCount} items from their flash sales!`);
      }
    } catch (e) {
      console.error('Error resetting prices on startup:', e);
    }

  })
  .catch(err => console.error("Local connection error:", err));
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    default: ''
  },
  password: {
    type: String,
    required: true
  },
  isOwner: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  favorites: [{
    type: Number
  }],
  cart: [{
    type: Number
  }]
});

const User = mongoose.model('User', userSchema);
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) return next();
  if (req.path.startsWith('/api')) return res.status(401).json({ error: 'Unauthorized' });
  res.redirect('/signin');
};
const LOYALTY_REWARDS = [
  { id: '5-off', points: 500, name: '$5 off your next purchase' },
  { id: '10-off', points: 1000, name: '$10 off your next purchase' },
  { id: 'free-item', points: 2000, name: 'Free item under $25' }
];
async function addLoyaltyPoints(userId, amount) {
  const user = await User.findById(userId);
  if (!user) return null;
  const pointsToAdd = Math.floor(Number(amount) || 0);
  if (pointsToAdd <= 0) return user.loyaltyPoints || 0;
  user.loyaltyPoints = (user.loyaltyPoints || 0) + pointsToAdd;
  await user.save();
  return user.loyaltyPoints;
}
/**
 * Core Route: GET /api/check-auth
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/api/check-auth', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      isLoggedIn: true,
      userName: req.session.userName || 'User',
      userEmail: req.session.userEmail,
      isOwner: req.session.isOwner || false
    });
  } else {
    res.json({
      isLoggedIn: false
    });
  }
});
/**
 * Core Route: GET /
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Core Route: GET /signup
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

/**
 * Core Route: GET /signin
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/signin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signin.html'));
});
const requireOwner = (req, res, next) => {
  if (req.session && req.session.isOwner) {
    return next();
  }
  if (req.path.startsWith('/api')) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/signin');
};

/**
 * Core Route: GET /ownerhome.html
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/ownerhome.html', requireOwner, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ownerhome.html'));
});
/**
 * Core Route: POST /logout
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.status(200).json({ message: 'Logged out successfully' });
  });
});
/**
 * Core Route: POST /signup
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.post('/signup', async (req, res) => {
  try {
    const { name, email, password, isOwner, phone, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (isOwner) {
      if (!phone || !address) {
        return res.status(400).json({ message: 'Phone number and address are required for store owners' });
      }
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const username = (email && email.includes('@')) ? email.split('@')[0] : name.replace(/\s+/g, '').toLowerCase();

    const newUser = new User({
      name,
      email,
      username,
      password: hashedPassword,
      isOwner: isOwner || false
    });

    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Sign-up error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    res.status(500).json({ message: 'Error creating user' });
  }
});
/**
 * Core Route: POST /signin
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    req.session.userId = user._id;
    req.session.userName = user.name;
    req.session.userEmail = user.email;

    req.session.isOwner = user.isOwner || false;
    res.status(200).json({
      message: 'Sign-in successful',
      isOwner: user.isOwner || false
    });

  } catch (error) {
    console.error('Sign-in error:', error);
    res.status(500).json({ message: 'Error during sign-in' });
  }
});

/**
 * Core Route: POST /api/random-price-drop
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.post('/api/random-price-drop', async (req, res) => {
  try {
    const randomProducts = await Product.aggregate([{ $sample: { size: 1 } }]);
    if (!randomProducts || randomProducts.length === 0) {
      return res.status(404).json({ error: 'No products available.' });
    }

    const doc = randomProducts[0];
    const product = await Product.findById(doc._id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    const dropPercentage = Math.floor(Math.random() * 41) + 10; // Random drop between 10% and 50%
    const currentPrice = product.price;
    if (!product.original_price || product.original_price <= currentPrice) {
      product.original_price = currentPrice;
    }

    const dropMultiplier = (100 - dropPercentage) / 100;
    product.price = currentPrice * dropMultiplier;

    await product.save();

    res.json({
      product: {
        id: product.id,
        title: product.title,
        price: product.price,
        original_price: product.original_price
      },
      dropPercentage
    });
  } catch (err) {
    console.error('Random drop error:', err);
    res.status(500).json({ error: 'Failed to drop price' });
  }
});
/**
 * Core Route: GET /api/products
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/api/products', async (req, res) => {
  try {
    const { featured, shop, category, q } = req.query;
    let query = {};
    if (featured === 'true') query.is_featured = true;
    if (shop) query.store_name = new RegExp(shop, 'i');
    if (category) query.category = new RegExp(category, 'i');
    if (q && q.trim()) {
      const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { title: regex },
        { category: regex },
        { store_name: regex },
        { keywords: regex },
        { description: regex }
      ];
    }
    const products = await Product.find(query).lean();
    res.json(products);
  } catch (err) {
    console.error('Products API error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});
/**
 * Core Route: GET /api/products/:id
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/api/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid product id' });
    }

    const product = await Product.findOne({ id }).lean();
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const [productReviews, storeReviews] = await Promise.all([
      Review.find({ productId: id }).sort({ createdAt: -1 }).limit(20).lean(),
      Review.find({ store_id: product.store_id, productId: { $exists: false } }).sort({ createdAt: -1 }).limit(20).lean()
    ]);

    const allProductRatings = productReviews.map(r => r.rating || 0);
    const avgProductRating = allProductRatings.length
      ? allProductRatings.reduce((a, b) => a + b, 0) / allProductRatings.length
      : 0;

    const allStoreRatings = storeReviews.map(r => r.rating || 0);
    const avgStoreRating = allStoreRatings.length
      ? allStoreRatings.reduce((a, b) => a + b, 0) / allStoreRatings.length
      : 0;

    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      $or: [
        { category: product.category },
        { store_id: product.store_id }
      ]
    }).limit(6).lean();

    let isStoreOwner = false;
    if (req.session && req.session.userId && req.session.isOwner) {
      isStoreOwner = true;
    }

    res.json({
      product,
      inventoryLeft: product.quantity || 0,
      productRating: {
        average: Number(avgProductRating.toFixed(2)),
        count: productReviews.length
      },
      storeRating: {
        average: Number(avgStoreRating.toFixed(2)),
        count: allStoreRatings.length
      },
      productReviews,
      storeReviews,
      relatedProducts,
      isStoreOwner
    });
  } catch (err) {
    console.error('Product detail error:', err);
    res.status(500).json({ error: 'Failed to load product detail' });
  }
});
/**
 * Core Route: PUT /api/products/:id
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.put('/api/products/:id', requireOwner, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid product id' });
    }

    const { price, description } = req.body;
    const updateData = {};
    if (price !== undefined) {
      updateData.price = Number(price);
      updateData.original_price = Number(price);
    }
    if (description !== undefined) updateData.description = String(description).trim();

    const updatedProduct = await Product.findOneAndUpdate(
      { id },
      { $set: updateData },
      { new: true }
    ).lean();

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(updatedProduct);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});
/**
 * Core Route: GET /api/shops-from-products
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/api/shops-from-products', async (req, res) => {
  try {
    const productShops = await Product.aggregate([
      { $group: { _id: '$store_name', store_id: { $first: '$store_id' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    const dbShops = await Shop.find().lean();

    const augmentedShops = productShops.map(pShop => {
      const enhanced = dbShops.find(s => s.store_id === pShop.store_id) || {};
      return {
        name: pShop._id,
        store_id: pShop.store_id,
        productCount: pShop.count,
        image: enhanced.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
        description: enhanced.description || `Welcome to ${pShop._id}, find premium products!`,
        hours: enhanced.hours || {
          monday: '9:00 AM - 9:00 PM',
          tuesday: '9:00 AM - 9:00 PM',
          wednesday: '9:00 AM - 9:00 PM',
          thursday: '9:00 AM - 9:00 PM',
          friday: '9:00 AM - 9:00 PM',
          saturday: '10:00 AM - 8:00 PM',
          sunday: '10:00 AM - 6:00 PM'
        }
      };
    });

    res.json(augmentedShops);
  } catch (err) {
    console.error('Shops-from-products API error:', err);
    res.status(500).json({ error: 'Failed to fetch shops' });
  }
});
/**
 * Core Route: GET /api/shops/:store_id
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/api/shops/:store_id', async (req, res) => {
  try {
    const store_id = req.params.store_id;
    const dbShop = await Shop.findOne({ store_id }).lean();
    const productSample = await Product.findOne({ store_id }).lean();
    if (!dbShop && !productSample) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const name = dbShop ? dbShop.name : (productSample ? productSample.store_name : 'Unknown');

    const shopDetail = {
      name: name,
      store_id: store_id,
      image: (dbShop && dbShop.image) ? dbShop.image : 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=1200&q=80',
      description: (dbShop && dbShop.description) ? dbShop.description : `Explore the latest collections at ${name}. Quality and premium selections await.`,
      hours: (dbShop && dbShop.hours) ? dbShop.hours : {
        monday: '9:00 AM - 9:00 PM',
        tuesday: '9:00 AM - 9:00 PM',
        wednesday: '9:00 AM - 9:00 PM',
        thursday: '9:00 AM - 9:00 PM',
        friday: '9:00 AM - 9:00 PM',
        saturday: '10:00 AM - 8:00 PM',
        sunday: '10:00 AM - 6:00 PM'
      }
    };

    res.json(shopDetail);
  } catch (err) {
    console.error('Shop detail API error:', err);
    res.status(500).json({ error: 'Failed to fetch shop details' });
  }
});
/**
 * Core Route: POST /api/reservations/bundle
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.post('/api/reservations/bundle', requireAuth, async (req, res) => {
  try {
    const { store_id, store_name, items, preferredDate, preferredTime } = req.body;

    if (!store_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid bundle data' });
    }

    const user = await User.findById(req.session.userId).select('name');
    if (!user) return res.status(401).json({ error: 'User not found' });

    const prefDate = preferredDate ? new Date(preferredDate) : null;
    if (prefDate && isNaN(prefDate.getTime())) {
      return res.status(400).json({ error: 'Invalid preferred date' });
    }
    const productsToUpdate = [];
    for (const item of items) {
      const id = Number(item.productId);
      const qty = Number(item.quantity) || 1;

      const product = await Product.findOne({ id });
      if (!product) {
        return res.status(404).json({ error: `Product ${item.productTitle || id} not found` });
      }
      if ((product.quantity || 0) < qty) {
        return res.status(400).json({ error: `Not enough inventory for ${product.title}` });
      }

      productsToUpdate.push({ product, deductQty: qty });
    }
    for (const update of productsToUpdate) {
      update.product.quantity = (update.product.quantity || 0) - update.deductQty;
      await update.product.save();
    }
    const reservation = await Reservation.create({
      items: items.map(i => ({
        productId: i.productId,
        productTitle: i.productTitle || 'Product',
        quantity: i.quantity || 1,
        priceAtReservation: i.priceAtReservation || 0,
        image: i.image
      })),
      store_id,
      store_name,
      userId: user._id,
      userName: user.name,
      status: 'pending',
      preferredDate: prefDate || undefined,
      preferredTime: preferredTime ? String(preferredTime).trim() : undefined
    });

    res.status(201).json({ reservation });
  } catch (err) {
    console.error('Bundle reservation error:', err);
    res.status(500).json({ error: 'Failed to create bundled reservation' });
  }
});
/**
 * Core Route: POST /api/reservations
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.post('/api/reservations', requireAuth, async (req, res) => {
  try {
    const { productId, quantity, preferredDate, preferredTime } = req.body;
    const id = Number(productId);
    const qty = Number(quantity) || 1;

    if (!Number.isInteger(id) || qty <= 0) {
      return res.status(400).json({ error: 'Invalid reservation data' });
    }

    const product = await Product.findOne({ id });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if ((product.quantity || 0) < qty) {
      return res.status(400).json({ error: 'Not enough inventory', inventoryLeft: product.quantity || 0 });
    }

    product.quantity = (product.quantity || 0) - qty;
    await product.save();

    const user = await User.findById(req.session.userId).select('name');
    if (!user) return res.status(401).json({ error: 'User not found' });

    const prefDate = preferredDate ? new Date(preferredDate) : null;
    if (prefDate && isNaN(prefDate.getTime())) {
      return res.status(400).json({ error: 'Invalid preferred date' });
    }

    const reservation = await Reservation.create({
      productId: id,
      productTitle: product.title,
      store_id: product.store_id,
      store_name: product.store_name,
      userId: user._id,
      userName: user.name,
      quantity: qty,
      priceAtReservation: product.price || 0,
      status: 'pending',
      preferredDate: prefDate || undefined,
      preferredTime: preferredTime ? String(preferredTime).trim() : undefined
    });

    res.status(201).json({
      reservation,
      inventoryLeft: product.quantity || 0
    });
  } catch (err) {
    console.error('Create reservation error:', err);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});
/**
 * Core Route: GET /api/my-reservations
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/api/my-reservations', requireAuth, async (req, res) => {
  try {
    const reservations = await Reservation.find({ userId: req.session.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(reservations);
  } catch (err) {
    console.error('My reservations error:', err);
    res.status(500).json({ error: 'Failed to load reservations' });
  }
});
/**
 * Core Route: GET /api/owner/reservations
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/api/owner/reservations', requireOwner, async (req, res) => {
  try {
    const { storeId, storeName } = req.query;
    const query = {};
    if (storeId) query.store_id = storeId;
    if (storeName) query.store_name = new RegExp(storeName, 'i');

    const reservations = await Reservation.find(query).sort({ createdAt: -1 }).lean();
    res.json(reservations);
  } catch (err) {
    console.error('Owner reservations error:', err);
    res.status(500).json({ error: 'Failed to load reservations' });
  }
});
/**
 * Core Route: POST /api/owner/reservations/:id/confirm
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.post('/api/owner/reservations/:id/confirm', requireOwner, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    if (reservation.status !== 'pending') {
      return res.status(400).json({ error: 'Reservation is not pending' });
    }
    reservation.status = 'confirmed';
    reservation.confirmedAt = new Date();
    await reservation.save();

    let revenue = 0;
    if (reservation.items && reservation.items.length > 0) {
      revenue = reservation.items.reduce((sum, i) => sum + (i.priceAtReservation || 0) * (i.quantity || 1), 0);
    } else {
      revenue = (reservation.priceAtReservation || 0) * (reservation.quantity || 1);
    }

    const pointsTotal = await addLoyaltyPoints(reservation.userId, revenue);

    res.json({ reservation, loyaltyPointsAwarded: pointsTotal });
  } catch (err) {
    console.error('Confirm reservation error:', err);
    res.status(500).json({ error: 'Failed to confirm reservation' });
  }
});
/**
 * Core Route: GET /api/owner/revenue
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/api/owner/revenue', requireOwner, async (req, res) => {
  try {
    const { storeId, storeName, period } = req.query;
    const query = { status: 'confirmed' };
    if (storeId) query.store_id = storeId;
    if (storeName) query.store_name = new RegExp(storeName, 'i');

    const reservations = await Reservation.find(query).lean();
    const now = new Date();

    if (period === 'week') {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        const dayRevenue = reservations
          .filter(r => {
            const date = r.confirmedAt ? new Date(r.confirmedAt) : new Date(r.createdAt);
            return date >= d && date < next;
          })
          .reduce((sum, r) => {
            if (r.items && r.items.length > 0) {
              return sum + r.items.reduce((s, i) => s + (i.priceAtReservation || 0) * (i.quantity || 1), 0);
            }
            return sum + (r.priceAtReservation || 0) * (r.quantity || 1);
          }, 0);
        days.push({
          label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          date: d.toISOString().slice(0, 10),
          revenue: dayRevenue
        });
      }
      return res.json({ data: days, period: 'week' });
    }

    if (period === 'month') {
      const days = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        const dayRevenue = reservations
          .filter(r => {
            const date = r.confirmedAt ? new Date(r.confirmedAt) : new Date(r.createdAt);
            return date >= d && date < next;
          })
          .reduce((sum, r) => {
            if (r.items && r.items.length > 0) {
              return sum + r.items.reduce((s, i) => s + (i.priceAtReservation || 0) * (i.quantity || 1), 0);
            }
            return sum + (r.priceAtReservation || 0) * (r.quantity || 1);
          }, 0);
        days.push({
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          date: d.toISOString().slice(0, 10),
          revenue: dayRevenue
        });
      }
      return res.json({ data: days, period: 'month' });
    }

    if (period === 'year') {
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const monthRevenue = reservations
          .filter(r => {
            const date = r.confirmedAt ? new Date(r.confirmedAt) : new Date(r.createdAt);
            return date >= d && date < next;
          })
          .reduce((sum, r) => {
            if (r.items && r.items.length > 0) {
              return sum + r.items.reduce((s, i) => s + (i.priceAtReservation || 0) * (i.quantity || 1), 0);
            }
            return sum + (r.priceAtReservation || 0) * (r.quantity || 1);
          }, 0);
        months.push({
          label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          date: d.toISOString().slice(0, 7),
          revenue: monthRevenue
        });
      }
      return res.json({ data: months, period: 'year' });
    }

    res.status(400).json({ error: 'Invalid period. Use week, month, or year' });
  } catch (err) {
    console.error('Revenue API error:', err);
    res.status(500).json({ error: 'Failed to load revenue' });
  }
});

/**
 * Core Route: GET /api/shops
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/api/shops', async (req, res) => {
  try {
    const shops = await Shop.find();

    const result = [];
    for (const shop of shops) {
      const categories = await Category.find({ shop: shop._id });

      result.push({
        name: shop.name,
        categoryCount: categories.length,
        categories: categories.map(c => c.name)
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shops' });
  }
});
/**
 * Core Route: GET /api/profile
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const favoriteIds = user.favorites || [];
    const products = [];
    for (const id of favoriteIds) {
      const p = await Product.findOne({ id }).lean();
      if (p) products.push(p);
    }
    res.json({
      ...user,
      favoriteProducts: products
    });
  } catch (err) {
    console.error('Profile API error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

/**
 * Core Route: GET /api/favorites
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/api/favorites', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('favorites').lean();
    res.json({ favoriteIds: user?.favorites || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load favorites' });
  }
});

/**
 * Core Route: POST /api/favorites
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.post('/api/favorites', requireAuth, async (req, res) => {
  try {
    const productId = Number(req.body.productId);
    if (!Number.isInteger(productId)) return res.status(400).json({ error: 'Invalid productId' });
    const user = await User.findById(req.session.userId);
    if (!user.favorites) user.favorites = [];
    if (user.favorites.includes(productId)) return res.json({ favoriteIds: user.favorites });
    user.favorites.push(productId);
    await user.save();
    res.json({ favoriteIds: user.favorites });
  } catch (err) {
    console.error('Add favorite error:', err);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

/**
 * Core Route: DELETE /api/favorites/:productId
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.delete('/api/favorites/:productId', requireAuth, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId)) return res.status(400).json({ error: 'Invalid productId' });
    const user = await User.findById(req.session.userId);
    if (user.favorites) user.favorites = user.favorites.filter(id => id !== productId);
    await user.save();
    res.json({ favoriteIds: user.favorites || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});
/**
 * Core Route: GET /api/cart
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/api/cart', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('cart').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const cartIds = user.cart || [];
    const products = [];
    for (const id of cartIds) {
      const p = await Product.findOne({ id }).lean();
      if (p) products.push(p);
    }
    res.json(products);
  } catch (err) {
    console.error('Cart API error:', err);
    res.status(500).json({ error: 'Failed to load cart' });
  }
});

/**
 * Core Route: POST /api/cart
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.post('/api/cart', requireAuth, async (req, res) => {
  try {
    const productId = Number(req.body.productId);
    if (!Number.isInteger(productId)) return res.status(400).json({ error: 'Invalid productId' });
    const user = await User.findById(req.session.userId);
    if (!user.cart) user.cart = [];
    if (user.cart.includes(productId)) return res.json({ cartIds: user.cart });
    user.cart.push(productId);
    await user.save();
    res.json({ cartIds: user.cart });
  } catch (err) {
    console.error('Add cart error:', err);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

/**
 * Core Route: DELETE /api/cart/:productId
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.delete('/api/cart/:productId', requireAuth, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId)) return res.status(400).json({ error: 'Invalid productId' });
    const user = await User.findById(req.session.userId);
    if (user.cart) user.cart = user.cart.filter(id => id !== productId);
    await user.save();
    res.json({ cartIds: user.cart || [] });
  } catch (err) {
    console.error('Delete cart error:', err);
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});
/**
 * Core Route: GET /api/loyalty/rewards
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/api/loyalty/rewards', (req, res) => {
  res.json(LOYALTY_REWARDS);
});

/**
 * Core Route: GET /api/loyalty/balance
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/api/loyalty/balance', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('loyaltyPoints').lean();
    res.json({ points: user?.loyaltyPoints ?? 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get balance' });
  }
});
/**
 * Core Route: POST /api/loyalty/earn
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.post('/api/loyalty/earn', requireAuth, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const points = await addLoyaltyPoints(req.session.userId, amount);
    res.json({ points: points ?? 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add points' });
  }
});

/**
 * Core Route: POST /api/loyalty/redeem
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.post('/api/loyalty/redeem', requireAuth, async (req, res) => {
  try {
    const { rewardId } = req.body;
    const reward = LOYALTY_REWARDS.find(r => r.id === rewardId);
    if (!reward) return res.status(400).json({ error: 'Invalid reward' });
    const user = await User.findById(req.session.userId);
    const current = user.loyaltyPoints || 0;
    if (current < reward.points) return res.status(400).json({ error: 'Not enough points' });
    user.loyaltyPoints = current - reward.points;
    await user.save();
    res.json({ points: user.loyaltyPoints, redeemed: rewardId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to redeem' });
  }
});
/**
 * Core Route: POST /api/products/:id/reviews
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.post('/api/products/:id/reviews', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { rating, comment } = req.body;
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid product id' });
    if (!rating) return res.status(400).json({ error: 'Rating required' });

    const product = await Product.findOne({ id }).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const user = await User.findById(req.session.userId).select('name');
    if (!user) return res.status(401).json({ error: 'User not found' });

    const review = await Review.create({
      productId: id,
      store_id: product.store_id,
      store_name: product.store_name,
      userId: user._id,
      userName: user.name,
      rating,
      comment: comment || ''
    });

    res.status(201).json(review);
  } catch (err) {
    console.error('Add product review error:', err);
    res.status(500).json({ error: 'Failed to add review' });
  }
});
/**
 * Core Route: POST /api/stores/:storeId/reviews
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.post('/api/stores/:storeId/reviews', requireAuth, async (req, res) => {
  try {
    const { rating, comment, storeName } = req.body;
    const storeId = req.params.storeId;
    if (!rating) return res.status(400).json({ error: 'Rating required' });

    const user = await User.findById(req.session.userId).select('name');
    if (!user) return res.status(401).json({ error: 'User not found' });

    const review = await Review.create({
      store_id: storeId,
      store_name: storeName || '',
      userId: user._id,
      userName: user.name,
      rating,
      comment: comment || ''
    });

    res.status(201).json(review);
  } catch (err) {
    console.error('Add store review error:', err);
    res.status(500).json({ error: 'Failed to add store review' });
  }
});
/**
 * Core Route: POST /api/reviews/:reviewId/reply
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.post('/api/reviews/:reviewId/reply', requireOwner, async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply || !reply.trim()) {
      return res.status(400).json({ error: 'Reply text is required' });
    }
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    review.storeReply = reply.trim();
    review.storeReplyAt = new Date();
    await review.save();

    res.json(review);
  } catch (err) {
    console.error('Reply to review error:', err);
    res.status(500).json({ error: 'Failed to save reply' });
  }
});
/**
 * Core Route: GET /api/owner/analytics
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/api/owner/analytics', requireOwner, async (req, res) => {
  try {
    const { storeId, storeName } = req.query;
    const productQuery = {};
    const reservationQuery = {};
    const reviewQuery = {};

    if (storeId) {
      productQuery.store_id = storeId;
      reservationQuery.store_id = storeId;
      reviewQuery.store_id = storeId;
    } else if (storeName) {
      productQuery.store_name = new RegExp(storeName, 'i');
      reservationQuery.store_name = new RegExp(storeName, 'i');
      reviewQuery.store_name = new RegExp(storeName, 'i');
    }

    const [products, reservations, reviews] = await Promise.all([
      Product.find(productQuery).lean(),
      Reservation.find(reservationQuery).lean(),
      Review.find(reviewQuery).lean()
    ]);

    const activeReservationsQty = reservations.filter(r => r.status === 'pending').reduce((sum, r) => {
      if (r.items && r.items.length > 0) {
        return sum + r.items.reduce((s, i) => s + (i.quantity || 1), 0);
      }
      return sum + (r.quantity || 0);
    }, 0);
    const totalInventory = products.reduce((sum, p) => sum + (p.quantity || 0), 0) + activeReservationsQty;
    const activeReservations = reservations.filter(r => r.status === 'pending').length;
    const confirmedReservations = reservations.filter(r => r.status === 'confirmed');
    const confirmedToday = confirmedReservations.filter(r => {
      const d = r.confirmedAt ? new Date(r.confirmedAt) : new Date(r.createdAt);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    }).length;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const expectedFootTrafficToday = reservations.filter(r => {
      const pref = r.preferredDate ? new Date(r.preferredDate) : null;
      if (!pref) return false;
      pref.setHours(0, 0, 0, 0);
      return pref.getTime() >= todayStart.getTime() && pref.getTime() < todayEnd.getTime();
    }).length;
    const grossRevenueToday = confirmedReservations
      .filter(r => {
        const d = r.confirmedAt ? new Date(r.confirmedAt) : new Date(r.createdAt);
        const today = new Date();
        return d.toDateString() === today.toDateString();
      })
      .reduce((sum, r) => {
        if (r.items && r.items.length > 0) {
          return sum + r.items.reduce((s, i) => s + (i.priceAtReservation || 0) * (i.quantity || 1), 0);
        }
        return sum + (r.priceAtReservation || 0) * (r.quantity || 1);
      }, 0);

    const inventoryByCategory = {};
    products.forEach(p => {
      const cat = p.category || 'Other';
      inventoryByCategory[cat] = (inventoryByCategory[cat] || 0) + (p.quantity || 0);
    });

    const reservationsByProduct = {};
    reservations.forEach(r => {
      if (r.items && r.items.length > 0) {
        r.items.forEach(i => {
          if (!i.productId) return;
          reservationsByProduct[i.productId] = (reservationsByProduct[i.productId] || 0) + (i.quantity || 1);
        });
      } else {
        if (!r.productId) return;
        reservationsByProduct[r.productId] = (reservationsByProduct[r.productId] || 0) + (r.quantity || 0);
      }
    });

    const topProducts = products
      .map(p => ({
        productId: p.id,
        title: p.title,
        reservedQty: reservationsByProduct[p.id] || 0
      }))
      .sort((a, b) => b.reservedQty - a.reservedQty)
      .slice(0, 5);

    const ratings = reviews.map(r => r.rating || 0);
    const avgRating = ratings.length
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;

    const latestReviews = reviews
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    res.json({
      totalInventory,
      inventoryByCategory,
      activeReservations,
      confirmedToday,
      expectedFootTrafficToday,
      grossRevenueToday,
      reservationCount: reservations.length,
      avgStoreRating: Number(avgRating.toFixed(2)),
      reviewCount: reviews.length,
      topProducts,
      latestReviews
    });
  } catch (err) {
    console.error('Owner analytics error:', err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});
/**
 * Core Route: GET /profile
 * Executes high-performance networking protocols natively mapped to backend databases.
 */
app.get('/profile', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

