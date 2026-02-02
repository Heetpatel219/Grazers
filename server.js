const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const Shop = require('./models/Shop');
const Category = require('./models/Category');
const Product = require('./models/Product');
const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Session middleware
app.use(session({
  secret: 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/Users')
  .then(() => console.log("Success: Connected to Local MongoDB"))
  .catch(err => console.error("Local connection error:", err));

// User Schema
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
  password: {
    type: String,
    required: true
  },
  isOwner: {
    type: Boolean,
    default: false
  }
});

const User = mongoose.model('User', userSchema);

// API endpoint to check if user is logged in
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

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/signin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signin.html'));
});

// Middleware to protect owner routes
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

// Logout route
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

// Sign-up route
app.post('/signup', async (req, res) => {
  try {
    const { name, email, password, isOwner, phone, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    // Validate phone and address for owners
    if (isOwner) {
      if (!phone || !address) {
        return res.status(400).json({ message: 'Phone number and address are required for store owners' });
      }
    }

    // Check if user already exists by email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new User({
      name,
      email,
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

// Sign-in route (Updated for Email and Role-based access)
app.post('/signin', async (req, res) => {
  try {
    // 1. Destructure email instead of name
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // 2. Find user in MongoDB by email
    // 
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 3. Compare password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 4. Create session
    // We store the role/isOwner status so middleware can check it later
    req.session.userId = user._id;
    req.session.userName = user.name;
    req.session.userEmail = user.email;
    
    // Ensure this matches the field name in your MongoDB (isOwner or role)
    req.session.isOwner = user.isOwner || false;

    // 5. Return success with user type for frontend redirection
    // 
    res.status(200).json({ 
      message: 'Sign-in successful',
      isOwner: user.isOwner || false
    });

  } catch (error) {
    console.error('Sign-in error:', error);
    res.status(500).json({ message: 'Error during sign-in' });
  }
});

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





app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

