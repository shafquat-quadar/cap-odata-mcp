namespace db;

@Capabilities.InsertRestrictions.Insertable : true
@Capabilities.UpdateRestrictions.Updatable   : true
@Capabilities.DeleteRestrictions.Deletable   : true
@UI: {
  HeaderInfo: {
    TypeNamePlural: 'OData Services',
    TypeName      : 'OData Service',
    Title         : { Value: service_name }
  },
  Facets: [{
      $Type : 'UI.ReferenceFacet',
      Label : 'Service Name',
      Target: '@UI.Identification'
  }],
    LineItem: [
      { Value: service_base_url, Label: 'Base URL' },
      { Value: service_name,     Label: 'Service Name' },
      { Value: active,        Label: 'Active' },
      { Value: created_at,    Label: 'Created At' },
      { Value: last_updated,  Label: 'Last Updated' }
    ],
  Identification: [
    { Value: service_base_url, Label: 'Base URL' },
    { Value: service_name,     Label: 'Service Name' },
    { Value: active,           Label: 'Active' },
    { Value: created_at,       Label: 'Created At' },
      { Value: last_updated,     Label: 'Last Updated' },
      { Value: description,      Label: 'Description' }
  ]
}
entity ODataServices {
  @UI.Hidden: true
  key ID           : UUID;
  @UI.Identification
  service_base_url : String;
  @UI.Identification
  service_name     : String;
  @UI.Hidden: true
  metadata         : LargeString;
  @UI.Identification
  description      : LargeString;
  active           : Boolean default true;
  @Core.Computed
  @cds.on.insert : $now
  created_at       : Timestamp;
  @Core.Computed
  @cds.on.insert : $now
  @cds.on.update : $now
  last_updated     : Timestamp;
}

