const Order = require('../models/Order');

const NOTE_TEXT = 'zamówienie w systemie idoMods';
const BATCH_SIZE = 500;

async function addNoteToNewOrders() {
  let total = 0;
  let processed;
  do {
    const orders = await Order.find({
      notes: { $ne: NOTE_TEXT }
    }, { _id: 1, notes: 1 })
      .limit(BATCH_SIZE);

    processed = orders.length;
    if (!processed) break;

    const ops = orders.map(order => {
      let newNotes;
      if (Array.isArray(order.notes)) {
        newNotes = [...order.notes, NOTE_TEXT];
      } else if (typeof order.notes === 'string' && order.notes.length > 0) {
        newNotes = [order.notes, NOTE_TEXT];
      } else {
        newNotes = [NOTE_TEXT];
      }
      return {
        updateOne: {
          filter: { _id: order._id },
          update: { $set: { notes: newNotes } }
        }
      };
    });

    if (ops.length) {
      await Order.bulkWrite(ops, { ordered: false });
      total += ops.length;
      console.log(`[ORDER NOTE CRON] Added notes to ${ops.length} orders (total: ${total})`);
    }
  } while (processed === BATCH_SIZE);

  if (total === 0) {
    console.log('[ORDER NOTE CRON] No new orders found');
  } else {
    console.log(`[ORDER NOTE CRON] Completed. Added notes to ${total} orders.`);
  }
  return total;
}

module.exports = { addNoteToNewOrders };