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
  Facets: [{
      $Type : 'UI.ReferenceFacet',
      Label : 'Details',
      Target: '@UI.Identification'
  }],
  LineItem: [
    { Value: service_url,   Label: 'Service URL' },
    { Value: odata_version, Label: 'OData Version' },
    { Value: version_hash,  Label: 'Version Hash' },
    { Value: active,        Label: 'Active' },
    { Value: created_at,    Label: 'Created At' },
    { Value: last_updated,  Label: 'Last Updated' }
  ],
  Identification: [
    { Value: version_hash,  Label: 'Version Hash' },
    { Value: active,        Label: 'Active' },
    { Value: created_at,    Label: 'Created At' },
    { Value: last_updated,  Label: 'Last Updated' },
    { Value: odata_version, Label: 'OData Version' }
  ]
}
entity ODataServices {
  @UI.Hidden
  key ID           : UUID;
  service_url      : String;
  @UI.Hidden
  metadata_json    : LargeString;
  @UI.Identification
  @UI.LineItem
  odata_version    : String;
  @UI.Identification
  @UI.LineItem
  version_hash     : String;
  active           : Boolean default true;
  created_at       : Timestamp;
  last_updated     : Timestamp;
}
