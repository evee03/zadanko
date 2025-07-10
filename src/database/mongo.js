const mongoose = require('mongoose');

async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('[DATABASE] MongoDB connected successfully');
  } catch (error) {
    console.error('[DATABASE] MongoDB connection error:', error.message);
    throw error;
  }
}

module.exports = connectDB;