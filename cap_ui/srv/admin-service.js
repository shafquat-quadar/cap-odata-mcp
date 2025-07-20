const cds = require('@sap/cds');
const { SELECT, UPDATE } = cds;
const fetch = require('node-fetch');
const xml2js = require('xml2js');
require('dotenv').config();

const authHeader = process.env.BASIC_USER && process.env.BASIC_PASS
  ? 'Basic ' + Buffer.from(`${process.env.BASIC_USER}:${process.env.BASIC_PASS}`).toString('base64')
  : null;

async function fetchMetadata(baseUrl, serviceName) {
  const url = `${baseUrl.replace(/\/$/, '')}/${serviceName.replace(/^\//, '')}/metadata`;
  const opts = authHeader ? { headers: { Authorization: authHeader } } : {};
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Failed to fetch metadata: ${res.statusText}`);
  const xml = await res.text();
  const json = JSON.stringify(await xml2js.parseStringPromise(xml));
  const version = await parseVersion(xml);
  return { json, version };
}

async function parseVersion(xml) {
  try {
    const data = await xml2js.parseStringPromise(xml);
    const edmx = data['edmx:Edmx'] || {};
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
    if (!req.data.metadata_json && req.data.base_url && req.data.service_name) {
      const { json, version } = await fetchMetadata(req.data.base_url, req.data.service_name);
      req.data.metadata_json = json;
      req.data.odata_version = version;
    }
    if (req.data.metadata_json && (!req.data.base_url || !req.data.service_name)) {
      // metadata_json provided directly
      const parsed = await parseVersion(req.data.metadata_json);
      if (parsed) req.data.odata_version = parsed;
    }
    req.data.last_updated = new Date();
    if (req.event === 'CREATE' || req.event === 'NEW') {
      req.data.created_at = new Date();
    }
  });

  srv.on('refreshMetadata', async req => {
    const { ID } = req.params[0];
    const tx = srv.tx(req);
    const service = await tx.run(SELECT.one.from(ODataServices).where({ ID }));
    if (!service) return req.error(404, 'Service not found');
    try {
      const { json, version } = await fetchMetadata(service.base_url, service.service_name);
      await tx.run(
        UPDATE(ODataServices, ID).set({
          metadata_json: json,
          odata_version: version,
          last_updated: new Date()
        })
      );
      req.info('Metadata updated successfully');
      return tx.run(SELECT.one.from(ODataServices).where({ ID }));
    } catch (e) {
      req.error(500, e.message);
      return;
    }
  });

  srv.on('toggleActive', async req => {
    const { ID } = req.params[0];
    const tx = srv.tx(req);
    const service = await tx.run(SELECT.one.from(ODataServices).where({ ID }));
    if (!service) return req.error(404, 'Service not found');
    try {
      const { json, version } = await fetchMetadata(service.base_url, service.service_name);
      await tx.run(
        UPDATE(ODataServices, ID).set({
          metadata_json: json,
          odata_version: version,
          last_updated: new Date()
        })
      );
      return tx.run(SELECT.one.from(ODataServices).where({ ID }));
    } catch (e) {
      return req.error(500, e.message);
    }
  });
};
