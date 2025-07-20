const cds = require('@sap/cds');
const { SELECT, UPDATE } = cds.ql;
const fetch = require('node-fetch');
const xml2js = require('xml2js');
const { URL } = require('url');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
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

function parseNavigationProperties(navs = []) {
  const result = [];
  for (const nav of navs) {
    const n = nav.$ || {};
    result.push({
      name: n.Name,
      relationship: n.Relationship,
      fromRole: n.FromRole,
      toRole: n.ToRole,
      multiplicity: n.Multiplicity,
      type: n.Type,
    });
  }
  return result;
}

function parseEntityTypes(schema) {
  const types = schema.EntityType || [];
  const result = [];
  for (const et of types) {
    const t = et.$ || {};
    const entity = { name: t.Name, keys: [], properties: [], navigationProperties: [] };
    if (et.Key && et.Key[0] && et.Key[0].PropertyRef) {
      for (const ref of et.Key[0].PropertyRef) {
        if (ref.$ && ref.$.Name) entity.keys.push(ref.$.Name);
      }
    }
    if (et.Property) {
      for (const p of et.Property) {
        const a = p.$ || {};
        entity.properties.push({
          name: a.Name,
          type: a.Type,
          nullable: a.Nullable !== 'false',
          length: a.MaxLength,
          annotations: (p.Annotation || []).map((ann) => (ann.$ && ann.$.Term) || undefined).filter(Boolean),
        });
      }
    }
    if (et.NavigationProperty) {
      entity.navigationProperties = parseNavigationProperties(et.NavigationProperty);
    }
    result.push(entity);
  }
  return result;
}

function parseEntitySets(container = {}) {
  const sets = container.EntitySet || [];
  const result = [];
  for (const es of sets) {
    const a = es.$ || {};
    result.push({ name: a.Name, entityType: a.EntityType, url: a.Name });
  }
  return result;
}

function parseAssociations(schema) {
  const associations = schema.Association || [];
  const result = [];
  for (const as of associations) {
    const a = as.$ || {};
    const assoc = { name: a.Name, ends: [], referentialConstraints: [] };
    if (as.End) {
      for (const end of as.End) {
        const e = end.$ || {};
        assoc.ends.push({ role: e.Role, type: e.Type, multiplicity: e.Multiplicity });
      }
    }
    if (as.ReferentialConstraint && as.ReferentialConstraint[0]) {
      const rc = as.ReferentialConstraint[0];
      const principal = rc.Principal && rc.Principal[0];
      const dependent = rc.Dependent && rc.Dependent[0];
      assoc.referentialConstraints.push({
        principalRole: principal && principal.$ && principal.$.Role,
        dependentRole: dependent && dependent.$ && dependent.$.Role,
      });
    }
    result.push(assoc);
  }
  return result;
}

function parseComplexTypes(schema) {
  const types = schema.ComplexType || [];
  const result = [];
  for (const ct of types) {
    const c = ct.$ || {};
    const fields = [];
    if (ct.Property) {
      for (const p of ct.Property) {
        const a = p.$ || {};
        fields.push({ name: a.Name, type: a.Type, nullable: a.Nullable !== 'false' });
      }
    }
    result.push({ name: c.Name, fields });
  }
  return result;
}

function parseFunctions(schema) {
  const funcs = schema.Function || [];
  const result = [];
  for (const fn of funcs) {
    const f = fn.$ || {};
    const parameters = [];
    if (fn.Parameter) {
      for (const p of fn.Parameter) {
        const a = p.$ || {};
        parameters.push({ name: a.Name, type: a.Type });
      }
    }
    result.push({
      name: f.Name,
      parameters,
      returnType: fn.ReturnType && fn.ReturnType[0] && fn.ReturnType[0].$ && fn.ReturnType[0].$.Type,
      isBound: f.IsBound === 'true',
      bindingParameter: parameters.length ? parameters[0].name : undefined,
    });
  }
  return result;
}

function parseActions(schema) {
  const acts = schema.Action || [];
  const result = [];
  for (const ac of acts) {
    const a = ac.$ || {};
    const parameters = [];
    if (ac.Parameter) {
      for (const p of ac.Parameter) {
        const pa = p.$ || {};
        parameters.push({ name: pa.Name, type: pa.Type });
      }
    }
    result.push({
      name: a.Name,
      parameters,
      returnType: ac.ReturnType && ac.ReturnType[0] && ac.ReturnType[0].$ && ac.ReturnType[0].$.Type,
      isBound: a.IsBound === 'true',
      bindingParameter: parameters.length ? parameters[0].name : undefined,
    });
  }
  return result;
}

async function parseMetadata(xml) {
  const parsed = await xml2js.parseStringPromise(xml);
  const edmx = parsed['edmx:Edmx'] || parsed['edmx:edmx'] || {};
  const dataservices =
    (edmx['edmx:DataServices'] && edmx['edmx:DataServices'][0]) ||
    (edmx['edmx:dataservices'] && edmx['edmx:dataservices'][0]) || {};
  const schemas = dataservices.Schema || [];
  const result = {
    entities: [],
    entitySets: [],
    associations: [],
    complexTypes: [],
    functions: [],
    actions: [],
  };
  for (const schema of schemas) {
    result.entities.push(...parseEntityTypes(schema));
    const container = (schema.EntityContainer && schema.EntityContainer[0]) || {};
    result.entitySets.push(...parseEntitySets(container));
    result.associations.push(...parseAssociations(schema));
    result.complexTypes.push(...parseComplexTypes(schema));
    result.functions.push(...parseFunctions(schema));
    result.actions.push(...parseActions(schema));
  }
  return result;
}

function detectVersion(xml) {
  if (xml.includes('http://docs.oasis-open.org/odata/ns/edmx')) return '4.0';
  if (xml.includes('http://schemas.microsoft.com/ado/2007/06/edmx')) return '2.0';
  return null;
}

function saveMetadataToDb(version, json) {
  const dbPath = path.join(__dirname, '..', 'shared.sqlite');
  const db = new sqlite3.Database(dbPath);
  db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS db_odataservice (version TEXT, metadata_json TEXT)');
    const stmt = db.prepare('INSERT INTO db_odataservice (version, metadata_json) VALUES (?, ?)');
    stmt.run(version, json, () => {
      stmt.finalize();
      db.close();
    });
  });
}


async function fetchMetadata(baseUrl, serviceName) {
  const url = buildMetadataUrl(baseUrl, serviceName);
  console.log(`Fetching metadata from ${url}`);
  const res = await fetch(url, { headers: AUTH_HEADER });
  if (!res.ok) {
    throw new Error(`Failed to fetch metadata from ${url}: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  if (!xml.includes('<edmx:')) {
    throw new Error(`Invalid metadata response from ${url}`);
  }
  const metadata = await parseMetadata(xml);
  const version = detectVersion(xml) || (await parseVersion(xml));
  metadata.version = version;
  const json = JSON.stringify(metadata);
  saveMetadataToDb(version, json);
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

  async function applyMetadata(req) {
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
    if (req.event === 'CREATE') {
      req.data.created_at = new Date();
    }
  }

  srv.before('CREATE', ODataServices, applyMetadata);

  srv.after('PATCH', ODataServices, async (data, req) => {
    console.log('✅ PATCH after fired');
    await applyMetadata(req);
    await cds.run(
      UPDATE(ODataServices)
        .set({
          metadata_json: req.data.metadata_json,
          odata_version: req.data.odata_version,
          last_updated: req.data.last_updated,
        })
        .where({ ID: data.ID })
      );
    });

    // In managed draft mode PATCH isn't triggered on activation, so ensure
    // metadata is populated when records are read.
    srv.after('READ', ODataServices, async (data) => {
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (!item.metadata_json && item.service_base_url && item.service_name) {
          const { json, version, url } = await fetchMetadata(
            item.service_base_url,
            item.service_name
          );
          console.log(`Backfilled metadata from ${url}`);
          item.metadata_json = json;
          item.odata_version = version;
          item.last_updated = new Date();
          await cds.run(
            UPDATE(ODataServices)
              .set({
                metadata_json: json,
                odata_version: version,
                last_updated: item.last_updated,
              })
              .where({ ID: item.ID })
          );
        }
      }
    });

  // Manual refresh and toggle actions have been removed. Metadata is now
  // fetched automatically during create or update operations.
};
