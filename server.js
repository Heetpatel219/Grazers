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

// Separate connection for the Grazers catalog database (product inventory)
const grazersConn = mongoose.createConnection('mongodb://127.0.0.1:27017/Grazers');
const Product = grazersConn.model('Product', ProductModel.schema);
const Reservation = grazersConn.model('Reservation', ReservationModel.schema);
const Review = grazersConn.model('Review', ReviewModel.schema);

const app = express();
const PORT = 3000;

// Core Express middleware for parsing requests and serving static assets
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Session middleware for tracking logged-in users
app.use(session({
  secret: 'mysecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Primary MongoDB connection for user accounts and owner data
mongoose.connect('mongodb://127.0.0.1:27017/Users')
  .then(() => console.log("Success: Connected to Local MongoDB"))
  .catch(err => console.error("Local connection error:", err));

// User Schema: customers and store owners share the same collection
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

// Require login for protected routes (HTML redirects; API responds with 401)
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) return next();
  if (req.path.startsWith('/api')) return res.status(401).json({ error: 'Unauthorized' });
  res.redirect('/signin');
};

// Static loyalty reward catalog (can be moved to DB later if needed)
const LOYALTY_REWARDS = [
  { id: '5-off', points: 500, name: '$5 off your next purchase' },
  { id: '10-off', points: 1000, name: '$10 off your next purchase' },
  { id: 'free-item', points: 2000, name: 'Free item under $25' }
];

// Helper to add loyalty points (1 point per $1, rounded down)
async function addLoyaltyPoints(userId, amount) {
  const user = await User.findById(userId);
  if (!user) return null;
  const pointsToAdd = Math.floor(Number(amount) || 0);
  if (pointsToAdd <= 0) return user.loyaltyPoints || 0;
  user.loyaltyPoints = (user.loyaltyPoints || 0) + pointsToAdd;
  await user.save();
  return user.loyaltyPoints;
}

// Lightweight endpoint used by the frontend to check current auth/session state
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

// Public page routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/signin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signin.html'));
});

// Middleware to protect owner-only routes (e.g., analytics dashboard)
const requireOwner = (req, res, next) => {
  if (req.session && req.session.isOwner) {
    return next();
  }
  if (req.path.startsWith('/api')) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/signin');
};

app.get('/ownerhome.html', requireOwner, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ownerhome.html'));
});

// Logout route destroys the session and returns a simple JSON status
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

// Sign-up route: creates a new user (optionally marked as store owner)
app.post('/signup', async (req, res) => {
  try {
    const { name, email, password, isOwner, phone, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    // For owners, phone and address must be present (checked again on the client)
    if (isOwner) {
      if (!phone || !address) {
        return res.status(400).json({ message: 'Phone number and address are required for store owners' });
      }
    }

    // Enforce unique email at the application level before hitting the unique index
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password before persisting user credentials
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Derive a username from the email (or a slugified version of the name)
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
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    res.status(500).json({ message: 'Error creating user' });
  }
});

// Sign-in route: validates credentials and initializes the session
app.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user in MongoDB by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare plaintext password against stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Persist minimal user state in the session for later authorization checks
    req.session.userId = user._id;
    req.session.userName = user.name;
    req.session.userEmail = user.email;

    req.session.isOwner = user.isOwner || false;

    // Return success flag and owner role so the client can redirect appropriately 
    res.status(200).json({
      message: 'Sign-in successful',
      isOwner: user.isOwner || false
    });

  } catch (error) {
    console.error('Sign-in error:', error);
    res.status(500).json({ message: 'Error during sign-in' });
  }
});

app.post('/api/random-price-drop', async (req, res) => {
  try {
    // 1. Find a random product using aggregation
    const randomProducts = await Product.aggregate([{ $sample: { size: 1 } }]);
    if (!randomProducts || randomProducts.length === 0) {
      return res.status(404).json({ error: 'No products available.' });
    }

    const doc = randomProducts[0];

    // 2. Fetch the mongoose model to save it
    const product = await Product.findById(doc._id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // 3. Determine drop
    const dropPercentage = Math.floor(Math.random() * 41) + 10; // Random drop between 10% and 50%
    const currentPrice = product.price;

    // Save original price if not previously saved
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

// Products API backed by the Grazers DB; supports search, featured flag, shop and category filters
app.get('/api/products', async (req, res) => {
  try {
    const { featured, shop, category, q } = req.query;
    let query = {};
    if (featured === 'true') query.is_featured = true;
    if (shop) query.store_name = new RegExp(shop, 'i');
    if (category) query.category = new RegExp(category, 'i');
    if (q && q.trim()) {
      // Escape special characters before building a case-insensitive regex
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

// Product detail endpoint with ratings, reviews and related products
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

// Edit product endpoint (Owner only)
app.put('/api/products/:id', requireOwner, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid product id' });
    }

    const { price, description } = req.body;
    const updateData = {};
    if (price !== undefined) updateData.price = Number(price);
    if (description !== undefined) updateData.description = String(description).trim();

    // Verify ownership by checking if the session store_id matches the product's store_id?
    // the system currently seems to track overall isOwner without a single store restriction in the session, 
    // so here we'll just allow it if isOwner since the frontend hides the button otherwise. 
    // In a strict app, we would verify `product.store_id === req.session.ownedStoreId`
    // but the session currently only sets `isOwner`.

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

// Derive unique shops directly from product data so "Browse by Shop" stays in sync with inventory
app.get('/api/shops-from-products', async (req, res) => {
  try {
    const shops = await Product.aggregate([
      { $group: { _id: '$store_name', store_id: { $first: '$store_id' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { name: '$_id', store_id: 1, productCount: '$count', _id: 0 } }
    ]);
    res.json(shops);
  } catch (err) {
    console.error('Shops-from-products API error:', err);
    res.status(500).json({ error: 'Failed to fetch shops' });
  }
});

// Create a bundled reservation for multiple items from a single store
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

    // Pre-flight check: verify inventory for all items before committing anything
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

    // Deduct inventory
    for (const update of productsToUpdate) {
      update.product.quantity = (update.product.quantity || 0) - update.deductQty;
      await update.product.save();
    }

    // Create the bundled reservation
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

// Create a single reservation and decrement central inventory (legacy, kept just in case)
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

// Customer: list my reservations (for real-time status)
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

// Owner: list reservations for a given store
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

// Owner: confirm a pending reservation (marks as purchase, awards loyalty points)
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

// Owner: gross revenue data for chart (week=7 days, month=30 days, year=12 months)
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
          .filter(r => r.confirmedAt && new Date(r.confirmedAt) >= d && new Date(r.confirmedAt) < next)
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
          .filter(r => r.confirmedAt && new Date(r.confirmedAt) >= d && new Date(r.confirmedAt) < next)
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
          .filter(r => r.confirmedAt && new Date(r.confirmedAt) >= d && new Date(r.confirmedAt) < next)
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

app.get('/api/shops', async (req, res) => {
  try {
    const shops = await Shop.find();

    const result = [];

    // For each shop, count and embed its categories (kept simple for now)
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

// --- Profile & Favorites (require auth) ---
app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const favoriteIds = user.favorites || [];
    const products = [];
    // Resolve the user's favorite product IDs into full product documents
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

app.get('/api/favorites', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('favorites').lean();
    res.json({ favoriteIds: user?.favorites || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load favorites' });
  }
});

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

// --- Cart ---
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

// --- Loyalty ---
app.get('/api/loyalty/rewards', (req, res) => {
  res.json(LOYALTY_REWARDS);
});

app.get('/api/loyalty/balance', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('loyaltyPoints').lean();
    res.json({ points: user?.loyaltyPoints ?? 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// Increment loyalty balance: 1 point per dollar spent (rounded down)
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

// Add product review
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

// Add store-only review
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

// Owner reply to a review
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

// Owner: analytics for a specific store based on real activity
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

// Profile page (protected)
app.get('/profile', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

