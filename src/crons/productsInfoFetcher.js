const cron = require('node-cron');
const { fetchAndSaveAllProductsWithDetails } = require('../services/fetchProductsWithPrices');

function startProductsCron() {
  const interval = '0 2 * * *';
  setTimeout(() => {
    fetchAndSaveAllProductsWithDetails('2025-05-01', '2025-07-14');
  }, 3000);
  cron.schedule(interval, () => {
    fetchAndSaveAllProductsWithDetails('2025-05-01', '2025-07-14');
  });
}

module.exports = { startProductsCron };