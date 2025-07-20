namespace db;

@Capabilities.InsertRestrictions.Insertable : true
@Capabilities.UpdateRestrictions.Updatable   : true
@Capabilities.DeleteRestrictions.Deletable   : true
@UI: {
  HeaderInfo: {
    TypeNamePlural: 'OData Services',
    TypeName      : 'OData Service',
    Title         : { Value: service_url }
  },
  LineItem: [
    { Value: service_url,   Label: 'Service URL' },
    { Value: version_hash,  Label: 'Version Hash' },
    { Value: active,        Label: 'Active' },
    { Value: created_at,    Label: 'Created At' },
    { Value: last_updated,  Label: 'Last Updated' }
  ]
}
entity ODataServices {
  @UI.Hidden
  key ID           : UUID;
  service_url      : String;
  metadata_json    : LargeString;
  version_hash     : String;
  active           : Boolean default true;
  created_at       : Timestamp;
  last_updated     : Timestamp;
}
