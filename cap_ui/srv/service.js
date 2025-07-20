const cds = require('@sap/cds');
const { UPDATE } = cds.ql;
const fetch = require('node-fetch');


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
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch metadata: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  return { xml };
}

/**
 * Update metadata for a single item if required.
 */
async function metadataUpdate(item, tx, ODataServices) {
  if (!item) return;
  if (item.metadata) return;
  if (!(item.service_base_url && item.service_name)) return;

  const { xml } = await fetchMetadata(item.service_base_url, item.service_name);
  item.metadata = xml;
  item.last_updated = new Date();
  console.log(`Metadata updated for ${item.ID}`);
  await tx.run(
    UPDATE(ODataServices)
      .set({ metadata: xml, last_updated: item.last_updated })
      .where({ ID: item.ID })
  );
}

module.exports = srv => {
  const { ODataServices } = srv.entities;

  srv.after('READ', ODataServices, async (data, req) => {
    console.log('READ triggered');
    const tx = cds.transaction(req);
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      await metadataUpdate(item, tx, ODataServices);
    }
  });

  srv.after('CREATE', ODataServices, async (data, req) => {
    console.log('CREATE after triggered');
    const tx = cds.transaction(req);
    await metadataUpdate(data, tx, ODataServices);
  });

  srv.after('UPDATE', ODataServices, async (data, req) => {
    console.log('UPDATE after triggered');
    const tx = cds.transaction(req);
    await metadataUpdate(data, tx, ODataServices);
  });
};

// Export for tests
module.exports.fetchMetadata = fetchMetadata;
module.exports.metadataUpdate = metadataUpdate;
