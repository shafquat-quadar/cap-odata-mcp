using { db as my } from '../db/schema';

service AdminService {
  @odata.draft.enabled
  entity ODataServices as projection on my.ODataServices actions {
    action refreshMetadata();
  };
}
