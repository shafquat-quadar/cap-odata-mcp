const cds = require('@sap/cds');
const { UPDATE } = cds.ql;
const fetch = require('node-fetch');
const xml2js = require('xml2js');

/**
 * Build full metadata URL from base URL and service name.
 */
function buildUrl(base, service) {
  const b = base.endsWith('/') ? base : base + '/';
  const path = service.replace(/^\//, '');
  return `${b}${path}/$metadata`;
}

/**
 * Parse EDMX version from XML.
 */
async function parseVersion(xml) {
  try {
    const data = await xml2js.parseStringPromise(xml);
    const edmx = data['edmx:Edmx'] || data['edmx:edmx'] || {};
    const ver = edmx.$ && edmx.$.Version;
    if (ver) {
      if (ver.startsWith('4')) return 'v4';
      if (ver.startsWith('3')) return 'v3';
      if (ver.startsWith('2')) return 'v2';
    }
  } catch (_) { /* ignore */ }
  return null;
}

/**
 * Fetch metadata and return entity names and odata version.
 */
async function fetchMetadata(baseUrl, serviceName) {
  const url = buildUrl(baseUrl, serviceName);
  console.log(`Fetching metadata from ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch metadata: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  const parsed = await xml2js.parseStringPromise(xml);
  const edmx = parsed['edmx:Edmx'] || parsed['edmx:edmx'] || {};
  const dataservices = (edmx['edmx:DataServices'] && edmx['edmx:DataServices'][0]) ||
                      (edmx['edmx:dataservices'] && edmx['edmx:dataservices'][0]) || {};
  const schemas = dataservices.Schema || [];
  const names = [];
  for (const sch of schemas) {
    const container = (sch.EntityContainer && sch.EntityContainer[0]) || {};
    const sets = container.EntitySet || [];
    for (const es of sets) {
      if (es.$ && es.$.Name) names.push(es.$.Name);
    }
  }
  const version = await parseVersion(xml);
  return { names, version };
}

/**
 * Update metadata_json for a single item if required.
 */
async function metadataUpdate(item, tx, ODataServices) {
  if (!item) return;
  if (item.metadata_json) return;
  if (!(item.service_base_url && item.service_name)) return;

  const { names, version } = await fetchMetadata(item.service_base_url, item.service_name);
  const json = JSON.stringify({ entities: names });
  item.metadata_json = json;
  item.odata_version = version;
  item.last_updated = new Date();
  console.log(`Metadata updated for ${item.ID}`);
  await tx.run(
    UPDATE(ODataServices)
      .set({ metadata_json: json, odata_version: version, last_updated: item.last_updated })
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
