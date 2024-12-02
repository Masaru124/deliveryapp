const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Check if the password matches
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create a model
const User = mongoose.model('User', userSchema);

module.exports = User;
