const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const qrcode = require('qrcode'); // Import the qrcode library

// Initialize the app
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'your-secret-key', // Change this to something unique
  resave: false,
  saveUninitialized: true,
}));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/swiggyClone', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Error connecting to MongoDB:', err);
});

// Define the User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Define the Restaurant schema
const restaurantSchema = new mongoose.Schema({
  name: String,
  image: String,
});

const User = mongoose.model('User', userSchema);
const Restaurant = mongoose.model('Restaurant', restaurantSchema);

// Simulated list of restaurants (You can later use a database or dynamic data)
const restaurants = [
  { name: "Pizza Place", image: "https://plus.unsplash.com/premium_photo-1673439304183-8840bd0dc1bf?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", id: 1 },
  { name: "Sushi Spot", image: "https://plus.unsplash.com/premium_photo-1673439304183-8840bd0dc1bf?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", id: 2 },
  { name: "Burger Hub", image: "https://images.unsplash.com/photo-1508737027454-e6454ef45afd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8YnVyZ2VyfGVufDB8fDB8fHww", id: 3 },
];
// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next(); // User is authenticated, proceed to the next middleware
  } else {
    return res.redirect('/login'); // Redirect to login if not authenticated
  }
}

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Routes

// Home Route - Display list of restaurants
app.get('/', (req, res) => {
  res.render('index', { restaurants, userId: req.session.userId });
});

// Register route
app.get('/register', (req, res) => {
  res.render('register');
});

// Handle registration form submission
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.status(500).send('Something went wrong. Please try again.');
  }
});

// Login route
app.get('/login', (req, res) => {
  res.render('login');
});

// Handle login form submission
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (user && await bcrypt.compare(password, user.password)) {
      req.session.userId = user._id;  // Store user ID in session
      res.redirect('/checkout');  // Redirect to checkout after successful login
    } else {
      res.send('Invalid email or password');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Something went wrong, please try again later');
  }
});

// User logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Failed to logout');
    }
    res.redirect('/');
  });
});

// Add to cart route (using session)
let cart = [];
app.post('/add-to-cart', (req, res) => {
  const { restaurantId } = req.body;
  const restaurant = restaurants.find(r => r.id == restaurantId);

  if (restaurant) {
    const existingItem = cart.find(item => item.id === restaurant.id);
    if (existingItem) {
      existingItem.quantity += 1;  // Increase the quantity if the item already exists in the cart
    } else {
      cart.push({ ...restaurant, quantity: 1 });  // Add new item with quantity 1
    }
  }

  res.redirect('/');
});

// Update cart quantity
app.post('/update-quantity', (req, res) => {
  const { restaurantId, quantity } = req.body;
  const item = cart.find(item => item.id === Number(restaurantId));
  if (item && quantity > 0) {
    item.quantity = quantity;
  }
  res.redirect('/checkout');
});

// Checkout route - only accessible if the user is logged in
app.get('/checkout', isAuthenticated, (req, res) => {
  res.render('checkout', { cart, userId: req.session.userId });
});

app.get('/proceed-to-payment', isAuthenticated, (req, res) => {
  // Path to your pre-generated QR code image
  const qrCodeImagePath = '/images/your-qrcode.png'; // Update this path to the actual file location

  // Render the payment page with the QR code image path
  res.render('payment', { qrCodeUrl: qrCodeImagePath });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
