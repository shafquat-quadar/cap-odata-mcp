module.exports = srv => {
  const { ODataServices } = srv.entities;

  srv.before(['CREATE', 'UPDATE'], ODataServices, req => {
    req.data.last_updated = new Date();
    if (req.event === 'CREATE' && !req.data.created_at) {
      req.data.created_at = new Date();
    }
  });
};
