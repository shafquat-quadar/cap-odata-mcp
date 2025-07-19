using { db as my } from '../db/schema';

service AdminService {
  entity ODataServices as projection on my.ODataServices;
}
