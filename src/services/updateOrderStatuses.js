const axios = require('axios');
const Order = require('../models/Order');

const finishedStatuses = ['finished', 'lost', 'false'];
const BATCH_SIZE = 100;

async function updateOrderStatuses() {
  const apiKey = process.env.IDOSSELL_API_KEY;
  const apiUrl = 'https://zooart6.yourtechnicaldomain.com/api/admin/v5/orders/orders/search';
  let totalUpdated = 0;
  let totalFinished = 0;
  let lastId = null;

  console.log('[ORDER STATUS CRON] Starting order status update...');

  while (true) {
    const query = lastId
      ? { status: { $nin: finishedStatuses }, _id: { $gt: lastId } }
      : { status: { $nin: finishedStatuses } };

    const orders = await Order.find(query, { orderId: 1, status: 1 })
      .sort({ _id: 1 })
      .limit(BATCH_SIZE)
      .lean();

    if (!orders.length) break;

    const orderIds = orders.map(order => order.orderId);

    try {
      const res = await axios.post(apiUrl, {
        params: { ordersIds: orderIds }
      }, {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      const apiResults = res.data?.Results || [];
      let batchUpdated = 0;
      let batchFinished = 0;

      for (const order of orders) {
        const apiOrder = apiResults.find(o => o.orderId === order.orderId);
        const apiStatus = apiOrder?.orderDetails?.orderStatus;
        if (apiStatus && apiStatus !== order.status) {
          await Order.updateOne({ orderId: order.orderId }, { $set: { status: apiStatus } });
          console.log(`[ORDER STATUS CRON] Updated order ${order.orderId}: "${order.status}" -> "${apiStatus}"`);
          batchUpdated++;
          totalUpdated++;
          if (finishedStatuses.includes(apiStatus)) {
            batchFinished++;
            totalFinished++;
          }
        }
      }
    } catch (err) {
      console.error(`[ORDER STATUS CRON] Error updating orders batch:`, err.message);
    }

    lastId = orders[orders.length - 1]._id;
  }

  console.log(`[ORDER STATUS CRON] Completed. Total orders updated: ${totalUpdated}, Total finished: ${totalFinished}`);
  if (totalUpdated === 0) {
    console.log('[ORDER STATUS CRON] No status changes detected');
  }

  return { totalUpdated, totalFinished };
}

module.exports = { updateOrderStatuses };