const cds = require('@sap/cds');
const { SELECT, UPDATE } = cds;
const crypto = require('crypto');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

module.exports = srv => {
  const { ODataServices } = srv.entities;

  function computeHash(data) {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  srv.before(['CREATE', 'UPDATE', 'NEW', 'PATCH'], ODataServices, async req => {
    if (req.data.metadata_json) {
      req.data.version_hash = computeHash(req.data.metadata_json);
    } else if (req.data.service_url) {
      const { json, version } = await fetchMetadata(req.data.service_url);
      req.data.metadata_json = json;
      req.data.version_hash = computeHash(json);
      req.data.odata_version = version;
    }
    req.data.last_updated = new Date();
    if ((req.event === 'CREATE' || req.event === 'NEW') && !req.data.created_at) {
      req.data.created_at = new Date();
    }
  });

  async function fetchMetadata(url) {
    const metaUrl = url.replace(/\/$/, '') + '/$metadata';
    const res = await fetch(metaUrl);
    const xml = await res.text();
    const match = xml.match(/<edmx:Edmx[^>]*Version="([^"]+)"/i);
    const version = match && match[1].startsWith('4') ? 'v4' : 'v2';
    const parsed = await xml2js.parseStringPromise(xml, { explicitArray: false });
    return { json: JSON.stringify(parsed), version };
  }

  srv.on('refreshMetadata', async req => {
    const { ID } = req.params[0];
    const srvTx = srv.tx(req);
    const service = await srvTx.run(SELECT.one.from(ODataServices).where({ ID }));
    if (!service) return req.error(404, 'Service not found');
    const { json, version } = await fetchMetadata(service.service_url);
    const versionHash = computeHash(json);
    await srvTx.run(
      UPDATE(ODataServices, ID).set({
        metadata_json: json,
        version_hash: versionHash,
        odata_version: version,
        last_updated: new Date()
      })
    );
    return srvTx.run(SELECT.one.from(ODataServices).where({ ID }));
  });
};
