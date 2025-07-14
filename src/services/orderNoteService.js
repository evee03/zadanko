const axios = require('axios');
const Order = require('../models/Order');

const NOTE_TEXT = 'zamówienie w systemie idoMods';
const BATCH_SIZE = 100; 
const IDOSELL_API_KEY = process.env.IDOSSELL_API_KEY;
const IDOSELL_DOMAIN = 'zooart6.yourtechnicaldomain.com';

async function addNoteToOrderInIdoSell(orderId, noteText = NOTE_TEXT) {
  try {
    const response = await axios.put(
      `https://${IDOSELL_DOMAIN}/api/admin/v5/orders/orders`,
      {
        params: {
          orders: [
            {
              orderId: orderId,
              orderNote: noteText
            }
          ]
        }
      },
      {
        headers: {
          'X-API-Key': IDOSELL_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      }
    );
    return true;
  } catch (err) {
    console.error(`[IDOSELL API] PUT order note failed for order ${orderId}:`, err.response?.data || err.message);
    return false;
  }
}

async function addNoteToNewOrders() {
  let total = 0;
  let processed;
  do {
    const orders = await Order.find({
      notes: { $ne: NOTE_TEXT }
    }, { _id: 1, orderId: 1, notes: 1 }) 
      .limit(BATCH_SIZE);

    processed = orders.length;
    if (!processed) break;

    for (const order of orders) {
      const idoRes = await addNoteToOrderInIdoSell(order.orderId);
      if (idoRes) {

        let newNotes;
        if (Array.isArray(order.notes)) {
          newNotes = [...order.notes, NOTE_TEXT];
        } else if (typeof order.notes === 'string' && order.notes.length > 0) {
          newNotes = [order.notes, NOTE_TEXT];
        } else {
          newNotes = [NOTE_TEXT];
        }
        await Order.updateOne({ _id: order._id }, { $set: { notes: newNotes } });
        total++;
        console.log(`[ORDER NOTE CRON] Note added to order ${order.orderId}`);
      } else {
        console.warn(`[ORDER NOTE CRON] Note NOT added to order ${order.orderId}, skipping db update`);
      }
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