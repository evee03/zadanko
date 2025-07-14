const axios = require('axios');
const Product = require('../models/Product');

const IDOSELL_API_KEY = process.env.IDOSSELL_API_KEY;
const IDOSELL_DOMAIN = 'zooart6.yourtechnicaldomain.com';

const API_HEADERS = {
  'X-API-KEY': IDOSELL_API_KEY,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

const CHUNK_SIZE = 100;

/**
 * @param {string} dateBegin
 * @param {string} dateEnd
 */
async function fetchAndSaveAllProductsWithDetails(dateBegin, dateEnd) {
  let page = 0;
  let totalPages = 1;
  let savedTotal = 0;
  const now = new Date();

  do {
    const apiUrl = `https://${IDOSELL_DOMAIN}/api/admin/v5/products/products/search`;
    const payload = {
      params: {
        limit: CHUNK_SIZE,
        resultsPage: page,
        returnElements: [
          'product_id',
          'retail_price',
          'wholesale_price',
          'minimal_price',
          'strikethrough_retail_price',
          'last_purchase_price',
          'deliverer_name',
          'producer_name'
        ],
        productDate: {
          productDateBegin: dateBegin,
          productDateEnd: dateEnd
        }
      }
    };

    let products;
    try {
      const response = await axios.post(apiUrl, payload, { headers: API_HEADERS, timeout: 60000 });
      products = response.data;
      if (page === 0) {
        totalPages = products.resultsNumberPage;
      }
    } catch (err) {
      console.error('[FETCHING PRODUCTS CRON] Fetch product prices failed:', err.message);
      break;
    }

    const productArr = products.results;
    if (productArr.length === 0) {
      page++;
      continue;
    }

    const ids = productArr.map(p => String(p.productId));
    let omnibusProducts = {};
    let strikethroughProducts = {};
    try {
      const [omnibusPricesResult, strikethroughPricesResult] = await Promise.all([
        fetchOmnibusPricesByProductIds(ids),
        fetchStrikethroughPricesByProductIds(ids)
      ]);
      omnibusProducts = omnibusPricesResult.products;
      strikethroughProducts = strikethroughPricesResult.products;
    } catch (err) {
      console.error('[FETCHING PRODUCTS CRON] Fetch detail prices failed:', err.message);
    }

    const productsToSave = productArr.map(product => {
      const productId = String(product.product_id || product.productId);
      const omnibusPrices = omnibusProducts['id:' + productId];
      const strikethroughPrices = strikethroughProducts['id:' + productId];
      return {
        productId,
        retail_price: product.retail_price,
        wholesale_price: product.wholesale_price,
        minimal_price: product.minimal_price,
        strikethrough_retail_price: product.strikethrough_retail_price,
        last_purchase_price: product.last_purchase_price,
        deliverer_name: product.deliverer_name,
        producer_name: product.producer_name,
        omnibusPrices,
        strikethroughPrices,
        checkedAt: now
      };
    });

    try {
      await Product.insertMany(productsToSave);
      savedTotal += productsToSave.length;
      console.log(`Save ${productsToSave.length} products from page ${page + 1}/${totalPages} (total: ${savedTotal})`);
    } catch (err) {
      console.error('DB save error:', err.message);
    }

    page++;
  } while (page < totalPages);

  return savedTotal;
}

async function fetchOmnibusPricesByProductIds(productIds) {
  const apiUrl = `https://${IDOSELL_DOMAIN}/api/admin/v5/products/omnibusPrices`;
  const params = {
    identType: 'id',
    products: productIds.join(',')
  };

  const response = await axios.get(apiUrl, {
    headers: API_HEADERS,
    params,
    timeout: 90000
  });
  return response.data;
}

async function fetchStrikethroughPricesByProductIds(productIds) {
  const apiUrl = `https://${IDOSELL_DOMAIN}/api/admin/v5/products/strikethroughPrices`;
  const params = {
    identType: 'id',
    products: productIds.join(',')
  };

  const response = await axios.get(apiUrl, {
    headers: API_HEADERS,
    params,
    timeout: 90000
  });
  return response.data;
}

module.exports = {
  fetchAndSaveAllProductsWithDetails
};