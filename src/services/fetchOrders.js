const axios = require('axios');
const Order = require('../models/Order');
const LastFetch = require('../models/LastFetch');

class OrderFetcher {
  constructor() {
    this.apiKey = process.env.IDOSSELL_API_KEY;
    this.baseUrl = 'https://zooart6.yourtechnicaldomain.com/api/admin/v5/orders/orders/search';
    this.maxPages = 100;
    this.pageSize = 100;
    this.requestDelay = 200;
  }

  async fetchNewOrders() {
    console.log('[FETCHING ORDERS CRON] Starting order fetch process');
    let lastFetch = await LastFetch.findOne({ key: 'orders_last_fetch' });
    let lastFetchDate = lastFetch?.lastFetchDate || null;

    console.log(`[FETCHING ORDERS CRON] Last fetch date: ${lastFetchDate || 'none'}`);

    let totalSaved = 0;
    let currentPage = 0;
    let hasMoreData = true;
    let newestOrderDate = lastFetchDate ? new Date(lastFetchDate) : null;

    while (hasMoreData && currentPage < this.maxPages) {
      let orders;
      try {
        orders = await this.fetchOrdersPage(lastFetchDate, currentPage);
      } catch (error) {
        console.error(`[ ERROR - FETCHING ORDERS] API request failed for page ${currentPage}:`, error.message);
        break; 
      }
      if (!orders.length) break;

      const batchDates = orders.map(order =>
        new Date(order.orderDetails?.orderAddDate || order.orderDetails?.purchaseDate || Date.now())
      );
      const maxBatchDate = batchDates.length ? new Date(Math.max(...batchDates)) : null;
      if (maxBatchDate && (!newestOrderDate || maxBatchDate > newestOrderDate)) {
        newestOrderDate = maxBatchDate;
      }

      const savedCount = await this.saveOrdersToDatabase(orders);
      totalSaved += savedCount;
      console.log(`[FETCHING ORDERS CRON] Saved ${savedCount} orders from page ${currentPage}`);

      if (newestOrderDate) {
        await this.updateLastFetch(newestOrderDate);
      }

      if (orders.length < this.pageSize) {
        hasMoreData = false;
      } else {
        currentPage++;
        await this.delay(this.requestDelay);
      }
    }

    if (totalSaved === 0) {
      console.log('[FETCHING ORDERS CRON] No new orders found');
    } else {
      console.log(`[FETCHING ORDERS CRON] Process completed: ${totalSaved} orders saved`);
    }
    return { saved: totalSaved };

  }

  async fetchOrdersPage(lastFetchDate, page) {
    const response = await axios.post(this.baseUrl, {
      params: {
        resultsLimit: this.pageSize,
        resultsPage: page,
        orderBy: 'orderAddDate',
        orderDirection: 'asc'
      }
    }, {
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    const orders = response.data?.Results || [];
    if (orders.length === 0) return [];

    const filteredOrders = lastFetchDate
      ? orders.filter(order => {
          const orderDate = new Date(order.orderDetails?.orderAddDate || order.orderDetails?.purchaseDate);
          return orderDate > new Date(lastFetchDate);
        })
      : orders;

    return filteredOrders;
  }

  async saveOrdersToDatabase(orders) {
    if (!orders.length) return 0;
    const BATCH_SIZE = 1000;
    let savedCount = 0;

    for (let i = 0; i < orders.length; i += BATCH_SIZE) {
      const chunk = orders.slice(i, i + BATCH_SIZE);
      const ops = chunk.map(order => ({
        updateOne: {
          filter: { orderId: order.orderId },
          update: { $set: this.mapOrderData(order) },
          upsert: true
        }
      }));
      try {
        const res = await Order.bulkWrite(ops, { ordered: false });
        savedCount += res.upsertedCount + res.modifiedCount;
      } catch (error) {
        console.error(`[ERROR - FETCHING ORDERS] Bulk insert failed:`, error.message);
      }
    }
    return savedCount;
  }

  mapOrderData(order) {
    const orderDetails = order.orderDetails || {};
    const dispatch = orderDetails.dispatch || {};
    const products = orderDetails.productsResults || [];
    const orderSource = orderDetails.orderSourceResults?.orderSourceDetails || {};

    return {
      orderId: order.orderId,
      products: products.map(product => ({
        productId: product.productId,
        productName: product.productName,
        productCode: product.productCode,
        quantity: product.productQuantity,
        price: product.productOrderPrice,
        priceNet: product.productOrderPriceNet,
        vat: product.productVat
      })),
      delivery: {
        method: dispatch.courierName,
        courierId: dispatch.courierId,
        deliveryDate: dispatch.deliveryDate,
        estimatedDeliveryDate: dispatch.estimatedDeliveryDate
      },
      status: orderDetails.orderStatus || 'unknown',
      source: orderSource.orderSourceName || 'unknown',
      orderCreatedAt: new Date(orderDetails.orderAddDate || orderDetails.purchaseDate || Date.now())
    };
  }

  async updateLastFetch(date) {
    await LastFetch.updateOne(
      { key: 'orders_last_fetch' },
      { key: 'orders_last_fetch', lastFetchDate: date },
      { upsert: true }
    );
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = OrderFetcher;