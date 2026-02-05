const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/Users')
  .then(() => console.log("Success: Connected to Local MongoDB"))
  .catch(err => console.error("Local connection error:", err));

// User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
});

const User = mongoose.model('User', userSchema);

const Order = mongoose.model("Order", new mongoose.Schema({
  total: Number,
  createdAt: { type: Date, default: Date.now }
}));

const Inventory = mongoose.model("Inventory", new mongoose.Schema({
  name: String,
  category: String,
  sold: Number
}));

const Reservation = mongoose.model("Reservation", new mongoose.Schema({
  customerName: String,
  time: String,
  status: String
}));

const Traffic = mongoose.model("Traffic", new mongoose.Schema({
  hour: String,
  visitors: Number
}));

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

app.get('/userinfo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'userinfo.html'));
});

app.get('/ownerhome', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ownerhome.html'));
});

// Sign-up route
app.post('/signup', async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ name });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new User({
      name,
      password: hashedPassword
    });

    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Sign-up error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

// Sign-in route
app.post('/signin', async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required' });
    }

    // Find user
    const user = await User.findOne({ name });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.status(200).json({ message: 'Sign-in successful' });
  } catch (error) {
    console.error('Sign-in error:', error);
    res.status(500).json({ message: 'Error during sign-in' });
  }
});

app.get("/api/user", async (req,res)=>{
  const email = req.query.email;

  const user = await User.findOne({email});

  res.json(user);
});

app.get("/api/summary", async (req,res)=>{
  const orders = await Order.find();
  const revenue = orders.reduce((a,b)=>a+b.total,0);

  const inventory = await Inventory.countDocuments();
  const categories = await Inventory.distinct("category");
  const reservations = await Reservation.find();

  res.json({
    todayRevenue: revenue,
    footTraffic: 356,
    totalInventory: inventory,
    inventoryCategories: categories.length,
    activeReservations: reservations.length,
    pendingReservations: reservations.filter(r=>r.status==="pending").length
  });
});

app.get("/api/weekly-revenue",(req,res)=>{
  const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  res.json(days.map(d=>({day:d,revenue:Math.floor(Math.random()*6000)})));
});

app.get("/api/hourly-traffic", async(req,res)=>{
  res.json(await Traffic.find());
});

app.get("/api/inventory", async(req,res)=>{
  const data = await Inventory.aggregate([
    {$group:{_id:"$category",count:{$sum:1}}}
  ]);
  res.json(data);
});

app.get("/api/top-products", async(req,res)=>{
  res.json(await Inventory.find().sort({sold:-1}).limit(3));
});

app.get("/api/reservations", async(req,res)=>{
  res.json(await Reservation.find());
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
