const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const Shop = require('./models/Shop');
const Category = require('./models/Category');
const ProductModel = require('./models/Product');

// Separate connection for the Grazers catalog database (product inventory)
const grazersConn = mongoose.createConnection('mongodb://127.0.0.1:27017/Grazers');
const Product = grazersConn.model('Product', ProductModel.schema);

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
  } else {
    // Redirect to signin if not logged in or not an owner
    return res.redirect('/signin');
  }
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
    const pointsToAdd = Math.floor(amount);
    const user = await User.findById(req.session.userId);
    user.loyaltyPoints = (user.loyaltyPoints || 0) + pointsToAdd;
    await user.save();
    res.json({ points: user.loyaltyPoints });
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

// Profile page (protected)
app.get('/profile', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

