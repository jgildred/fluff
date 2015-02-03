
// PAGE RESOURCE PREPROCESSOR

var app   = require('../app'),
    Fluff = app.Fluff;

var schema = "{ \n\
  name           : String, \n\
  path           : { type: String, index: { unique: true } }, \n\
  view_id        : ObjectId, \n\
  content        : String, \n\
  cursor : { \n\
    row          : { type: Number, default: 0 }, \n\
    column       : { type: Number, default: 0 } \n\
  }, \n\
  access         : { type: String, enum: [ 'Public', 'Users', 'Owner', 'Admins' ], default: 'Public', required: true }, \n\
  status         : { type: String, enum: [ 'Published', 'Unpublished' ],  default: 'Unpublished', required: true }, \n\
  publication    : { type: Date, default: Date.now }, \n\
  creator_id     : ObjectId, \n\
  lastupdater_id : ObjectId, \n\
  creation       : { type: Date, default: Date.now }, \n\
  lastupdate     : { type: Date, default: Date.now } \n\
}";
exports.schema = schema;

var display_columns = [{
  name:  'name',
  title: 'Name',
  size:  20
},
{
  name:  'path',
  title: 'Path',
  size:  20
},
{
  name:  'status',
  title: 'Status',
  size:  10
}];

var sort_column = { name:'name', order:true };

// Searchable fields
var match_fields = ['name', 'path'];
exports.match_fields = match_fields;

// Preprocessor for GET /pages/info
exports.getinfo = function(req, res){
  app.doIfHasAccess(req, res, 'Admins', app.Page, function(){
    var data = {
      schema_data     : schema,
      display_columns : display_columns,
      sort_column     : sort_column,
      match_fields    : match_fields
    }
    res.json(data);
  });
};