const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true // unique automatycznie tworzy indeks
  },
  products: [{
    productId: Number,
    productName: String,
    productCode: String,
    quantity: Number,
    price: Number,
    priceNet: Number,
    vat: Number
  }],
  delivery: {
    method: String,
    courierId: Number,
    deliveryDate: String,
    estimatedDeliveryDate: String
  },
  status: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true
  },
  orderCreatedAt: {
    type: Date,
    required: true
  },
  notes: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

orderSchema.index({ orderCreatedAt: -1 });
orderSchema.index({ status: 1, orderCreatedAt: -1 });
orderSchema.index({ notes: 1 });

module.exports = mongoose.model('Order', orderSchema);