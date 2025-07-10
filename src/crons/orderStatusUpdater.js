const cron = require('node-cron');
const { updateOrderStatuses } = require('../services/updateOrderStatuses');

function startOrderStatusCron() {
  const interval = process.env.CRON_INTERVAL;
  setTimeout(updateOrderStatuses, 3000);
  cron.schedule(interval, updateOrderStatuses);
}

module.exports = { startOrderStatusCron };