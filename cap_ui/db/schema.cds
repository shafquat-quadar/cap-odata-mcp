namespace db;

entity ODataServices {
  key ID           : UUID;
  service_url      : String;
  metadata_json    : LargeString;
  version_hash     : String;
  active           : Boolean default true;
  created_at       : Timestamp;
  last_updated     : Timestamp;
}
