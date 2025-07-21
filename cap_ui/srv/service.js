const cds = require('@sap/cds');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });


/**
 * Build full metadata URL from base URL and service name.
 */
function buildUrl(base, service) {
  const b = base.endsWith('/') ? base : base + '/';
  const path = service.replace(/^\//, '');
  return `${b}${path}/$metadata`;
}

/**
 * Fetch metadata and return XML string.
 */
async function fetchMetadata(baseUrl, serviceName) {
  const url = buildUrl(baseUrl, serviceName);
  console.log(`Fetching metadata from ${url}`);

  const user = process.env.SAP_USER || process.env.ODATA_USER;
  const pass = process.env.SAP_PASS || process.env.ODATA_PASSWORD;
  const headers = {};
  if (user && pass) {
    const token = Buffer.from(`${user}:${pass}`).toString('base64');
    headers['Authorization'] = `Basic ${token}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch metadata: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  return { xml };
}


module.exports = srv => {
  const { ODataServices } = srv.entities;

  srv.before(['CREATE', 'UPDATE'], ODataServices, async req => {
    const data = req.data;
    if (!data) return;
    if (data.metadata) return;
    if (!(data.service_base_url && data.service_name)) return;

    const { xml } = await fetchMetadata(data.service_base_url, data.service_name);
    data.metadata = xml;
    data.last_updated = new Date();
  });
};

// Export for tests
module.exports.fetchMetadata = fetchMetadata;
