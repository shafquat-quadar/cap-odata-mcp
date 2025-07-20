const cds = require('@sap/cds');
const { SELECT, UPDATE } = cds;
const fetch = require('node-fetch');
const xml2js = require('xml2js');

module.exports = srv => {
  const { ODataServices } = srv.entities;


  srv.before(['CREATE', 'UPDATE', 'NEW', 'PATCH'], ODataServices, async req => {
    if (!req.data.metadata_json && req.data.service_url) {
      const { json, version } = await fetchMetadata(req.data.service_url);
      req.data.metadata_json = json;
      req.data.odata_version = version;
    }
    req.data.last_updated = new Date();
    if ((req.event === 'CREATE' || req.event === 'NEW') && !req.data.created_at) {
      req.data.created_at = new Date();
    }
  });

  srv.on('refreshMetadata', async req => {
    const { ID } = req.params[0];
    const tx = srv.tx(req);
    const service = await tx.run(SELECT.one.from(ODataServices).where({ ID }));
    if (!service) return req.error(404, 'Service not found');
    try {
      const { json, version } = await fetchMetadata(service.service_url);
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

  srv.on('toggleActive', async req => {
    const { ID } = req.params[0];
    const tx = srv.tx(req);
    const service = await tx.run(SELECT.one.from(ODataServices).where({ ID }));
    if (!service) return req.error(404, 'Service not found');
    try {
      const { json, version } = await fetchMetadata(service.service_url);
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
