const cds = require('@sap/cds');
const { SELECT, UPDATE } = cds;
const fetch = require('node-fetch');
const xml2js = require('xml2js');
const { URL } = require('url');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const AUTH_HEADER = (() => {
  const user = process.env.SAP_USER;
  const pass = process.env.SAP_PASS;
  if (user && pass) {
    const token = Buffer.from(`${user}:${pass}`).toString('base64');
    return { Authorization: `Basic ${token}` };
  }
  return {};
})();
function buildMetadataUrl(baseUrl, serviceName) {
  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  const path = `${serviceName.replace(/^\//, '')}/$metadata`;
  return new URL(path, base).toString();
}

function extractEntities(parsed) {
  const edmx = parsed['edmx:Edmx'] || parsed['edmx:edmx'] || {};
  const dataservices =
    (edmx['edmx:DataServices'] && edmx['edmx:DataServices'][0]) ||
    (edmx['edmx:dataservices'] && edmx['edmx:dataservices'][0]) || {};
  const schemas = dataservices.Schema || [];
  const entities = [];
  for (const schema of schemas) {
    const container = (schema.EntityContainer && schema.EntityContainer[0]) || {};
    const sets = container.EntitySet || [];
    for (const set of sets) {
      const name = set.$ && set.$.Name;
      if (name) entities.push({ name });
    }
    if (!sets.length && schema.EntityType) {
      for (const type of schema.EntityType) {
        const name = type.$ && type.$.Name;
        if (name) entities.push({ name });
      }
    }
  }
  return entities;
}

async function fetchMetadata(baseUrl, serviceName) {
  const url = buildMetadataUrl(baseUrl, serviceName);
  const res = await fetch(url, { headers: AUTH_HEADER });
  if (!res.ok) {
    throw new Error(`Failed to fetch metadata from ${url}: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  if (!xml.includes('<edmx:')) {
    throw new Error(`Invalid metadata response from ${url}`);
  }
  const obj = await xml2js.parseStringPromise(xml);
  const entities = extractEntities(obj);
  const json = JSON.stringify({ entities });
  const version = await parseVersion(xml);
  return { json, version, url };
}

async function parseVersion(xml) {
  try {
    const data = await xml2js.parseStringPromise(xml);
    const edmx = data['edmx:Edmx'] || data['edmx:edmx'] || {};
    const ver = edmx.$ ? edmx.$.Version : null;
    if (ver) {
      return ver.startsWith('4') ? 'v4' : `v${ver.split('.')[0]}`;
    }
  } catch (e) {
    /* ignore */
  }
  return null;
}

module.exports = srv => {
  const { ODataServices } = srv.entities;


  srv.before(['CREATE', 'UPDATE', 'NEW', 'PATCH'], ODataServices, async req => {
    try {
      if (
        !req.data.metadata_json &&
        req.data.service_base_url &&
        req.data.service_name
      ) {
        const { json, version, url } = await fetchMetadata(
          req.data.service_base_url,
          req.data.service_name
        );
        req.info(`Fetched metadata from ${url}`);
        req.data.metadata_json = json;
        req.data.odata_version = version;
        req.info('Metadata fetched successfully');
      }
      if (
        req.data.metadata_json &&
        !(req.data.service_base_url && req.data.service_name)
      ) {
        // metadata_json provided directly
        const parsed = await parseVersion(req.data.metadata_json);
        if (parsed) req.data.odata_version = parsed;
        req.info('Metadata updated from request');
      }
    } catch (e) {
      req.error(500, e.message);
    }
    req.data.last_updated = new Date();
    if (req.event === 'CREATE' || req.event === 'NEW') {
      req.data.created_at = new Date();
    }
  });

  // Manual refresh and toggle actions have been removed. Metadata is now
  // fetched automatically during create or update operations.
};
