const crypto = require('crypto');

module.exports = srv => {
  const { ODataServices } = srv.entities;

  function computeHash(data) {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  srv.before(['CREATE', 'UPDATE'], ODataServices, req => {
    if (req.data.metadata_json) {
      req.data.version_hash = computeHash(req.data.metadata_json);
    }
    req.data.last_updated = new Date();
    if (req.event === 'CREATE' && !req.data.created_at) {
      req.data.created_at = new Date();
    }
  });
};
