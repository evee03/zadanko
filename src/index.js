require('dotenv').config();
const connectDB = require('./database/mongo');
const { startOrderCron } = require('./crons/orderFetcher');
const { startOrderStatusCron } = require('./crons/orderStatusUpdater');
const { startOrderNoteCron } = require('./crons/orderNoteCron');
const { startProductsCron } = require('./crons/productsInfoFetcher');

async function main() {
  try {
    await connectDB();
    //startOrderCron();
    //startOrderStatusCron();
    //startOrderNoteCron();
    startProductsCron();

    console.log('[START] Order Fetcher');

  } catch (error) {
    console.error('[ERROR] ', error.message);
    process.exit(1);
  }
}


main();