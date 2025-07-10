const mongoose = require('mongoose');

const lastFetchSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  lastFetchDate: {
    type: Date
  },
  totalFetched: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LastFetch', lastFetchSchema);