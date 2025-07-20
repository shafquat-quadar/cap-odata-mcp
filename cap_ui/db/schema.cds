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
    { Value: active,        Label: 'Active' },
    { Value: created_at,    Label: 'Created At' },
    { Value: last_updated,  Label: 'Last Updated' },
    {
      $Type  : 'UI.DataFieldForAction',
      Action : 'AdminService.ODataServices_refreshMetadata',
      Label  : 'Refresh Metadata'
    }
  ],
  Identification: [
    { Value: active,        Label: 'Active' },
    { Value: created_at,    Label: 'Created At' },
    { Value: last_updated,  Label: 'Last Updated' },
    { Value: odata_version, Label: 'OData Version' }
  ]
}
entity ODataServices {
  @UI.Hidden: true
  key ID           : UUID;
  service_url      : String;
  @UI.Hidden: true
  metadata_json    : LargeString;
  @UI.Identification
  @UI.LineItem
  odata_version    : String;
  active           : Boolean default true;
  created_at       : Timestamp @readonly default $now;
  last_updated     : Timestamp @readonly;
}

