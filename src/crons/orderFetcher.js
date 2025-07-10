const cron = require('node-cron');
const OrderFetcher = require('../services/fetchOrders');

function startOrderCron() {
  const interval = process.env.CRON_INTERVAL;
  const fetcher = new OrderFetcher(); 
  setTimeout(() => fetcher.fetchNewOrders(), 3000);
  cron.schedule(interval, () => fetcher.fetchNewOrders());
}

module.exports = { startOrderCron };