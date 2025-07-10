const cron = require('node-cron');
const { addNoteToNewOrders } = require('../services/orderNoteService');

function startOrderNoteCron() {
  const interval = process.env.CRON_INTERVAL;
  setTimeout(() => addNoteToNewOrders(), 3000);
  cron.schedule(interval, addNoteToNewOrders);
}

module.exports = { startOrderNoteCron };