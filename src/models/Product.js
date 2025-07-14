const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  retail_price: Number,
  wholesale_price: Number,
  minimal_price: Number,
  strikethrough_retail_price: Number,
  last_purchase_price: Number,
  deliverer_name: String,
  producer_name: String,
  omnibusPrices: { type: [mongoose.Schema.Types.Mixed], default: [] },
  strikethroughPrices: { type: [mongoose.Schema.Types.Mixed], default: [] },
  checkedAt: { type: Date, default: Date.now, index: true }
});

ProductSchema.index({ productId: 1, checkedAt: 1 }, { unique: true });

ProductSchema.index({ producer_name: 1 });

module.exports = mongoose.model('Product', ProductSchema);